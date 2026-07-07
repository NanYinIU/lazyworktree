import React, { useState, useEffect, useRef, useCallback } from 'react';
import path from 'node:path';
import process from 'node:process';
import { Box, Text, useInput } from 'ink';
import type {
  GitProject,
  PlanItem,
  ExecutionResult,
  ToastMessage,
  Screen as ScreenState,
  WorktreeGroup,
  PruneResult,
  CleanupResult,
  CleanupItemResult,
  RepairResult,
} from './types.js';
import { scanGitProjects, getWorktreeRoot, featureToDirectoryName, getRootName } from './fs-layout.js';
import { buildPlan } from './planner.js';
import { executePlan } from './executor.js';
import { discoverWorktreeGroups } from './worktree-manager.js';
import { executeSafePrune, executeCleanup, executeForceRetry, executeBranchDeletion, executeRepair } from './manage-executor.js';
import type { ActivityTask } from './activity.js';
import { t } from './i18n.js';
import { Home } from './components/Home.js';
import { ProjectPicker } from './components/ProjectPicker.js';
import { FeatureInput } from './components/FeatureInput.js';
import { TargetDirInput } from './components/TargetDirInput.js';
import { BranchOverrides } from './components/BranchOverrides.js';
import { PlanPreview } from './components/PlanPreview.js';
import { ToastHost } from './components/ToastHost.js';
import { GroupList } from './components/GroupList.js';
import { Activity } from './components/Activity.js';
import { ActivityComplete, type ActivityPhase } from './components/ActivityComplete.js';
import { Settings } from './components/Settings.js';
import { Screen } from './components/ui/Screen.js';
import { HelpOverlay } from './components/HelpOverlay.js';
import { getHelpKeybindingGroups, getScreenKeybindings, isKey } from './keybindings.js';
import type { AppConfig } from './config.js';

interface AppProps {
  prefilledProjects: { name: string; branch?: string }[];
  prefilledFeature: string;
  startMode: 'menu' | 'create';
  config: AppConfig;
}

/** 每屏面包屑，对齐目标 IA：Home hub → Create / Groups / Activity / Settings。 */
const SCREEN_BREADCRUMB: Record<ScreenState, string> = {
  home: 'worktree',
  projectPicker: 'worktree / create',
  featureInput: 'worktree / create',
  targetDirInput: 'worktree / create',
  branchOverrides: 'worktree / create',
  planPreview: 'worktree / create',
  activity: 'worktree / activity',
  groupList: 'worktree / groups',
  settings: 'worktree / settings',
};

/** 把 force-retry 结果合并进既有 CleanupResult（取代原 handleForceRetryComplete 内联逻辑）。 */
function mergeForceResult(
  prev: CleanupResult,
  r: { newlyRemoved: CleanupItemResult[]; stillFailed: CleanupItemResult[]; removedGroups: string[]; rootSymlinksRemoved: string[] },
  groups: WorktreeGroup[]
): CleanupResult {
  const newBranches: { projectName: string; branch: string }[] = [];
  for (const nr of r.newlyRemoved) {
    if (!nr.branch) continue;
    for (const g of groups) {
      const item = g.items.find((i) => i.projectName === nr.projectName && i.branch === nr.branch);
      if (item?.mergedToBase) {
        newBranches.push({ projectName: nr.projectName, branch: nr.branch });
        break;
      }
    }
  }
  const existing = new Set(prev.branchesToDelete.map((b) => `${b.projectName}:${b.branch}`));
  return {
    ...prev,
    removed: [...prev.removed, ...r.newlyRemoved],
    failed: r.stillFailed,
    removedGroups: [...prev.removedGroups, ...r.removedGroups],
    rootSymlinksRemoved: [...prev.rootSymlinksRemoved, ...r.rootSymlinksRemoved],
    branchesToDelete: [...prev.branchesToDelete, ...newBranches.filter((b) => !existing.has(`${b.projectName}:${b.branch}`))],
  };
}

function buildProjectPaths(groups: WorktreeGroup[]): Map<string, string> {
  const m = new Map<string, string>();
  for (const g of groups) {
    for (const item of g.items) m.set(item.projectName, item.projectPath);
  }
  return m;
}

export function App({ prefilledProjects, prefilledFeature, startMode, config }: AppProps): React.ReactElement {
  const initialScreen: ScreenState = startMode === 'create' ? 'projectPicker' : 'home';
  const [screen, setScreen] = useState<ScreenState>(initialScreen);
  const [projects, setProjects] = useState<GitProject[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<GitProject[]>([]);
  const [feature, setFeature] = useState(prefilledFeature);
  const [targetDirName, setTargetDirName] = useState('');
  const [overrides, setOverrides] = useState<Map<string, string>>(
    new Map(prefilledProjects.filter((p) => p.branch).map((p) => [p.name, p.branch!]))
  );
  const [plan, setPlan] = useState<PlanItem[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [loading, setLoading] = useState(startMode === 'create');
  const [helpOpen, setHelpOpen] = useState(false);
  const [showBottomLine, setShowBottomLine] = useState(config.gui.showBottomLine);
  const [symlinkNames, setSymlinkNames] = useState<string[]>(config.symlinks.names);

  // Activity state — 统一运行屏
  const [activityTask, setActivityTask] = useState<ActivityTask | null>(null);
  const [activityPhase, setActivityPhase] = useState<ActivityPhase>('create');
  const [activitySeq, setActivitySeq] = useState(0);

  // Management state
  const [groups, setGroups] = useState<WorktreeGroup[]>([]);
  const [selectedGroupRoots, setSelectedGroupRoots] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [pruneResult, setPruneResult] = useState<PruneResult | null>(null);
  const [cleanupResult, setCleanupResult] = useState<CleanupResult | null>(null);
  const [deletedBranches, setDeletedBranches] = useState<{ projectName: string; branch: string }[]>([]);
  const [failedBranches, setFailedBranches] = useState<{ projectName: string; branch: string; reason: string }[]>([]);
  const [repairResult, setRepairResult] = useState<RepairResult | null>(null);

  // ref 让 force/branch 任务闭包读到最新 cleanupResult（避免闭包陈旧）
  const cleanupResultRef = useRef<CleanupResult | null>(null);
  useEffect(() => { cleanupResultRef.current = cleanupResult; }, [cleanupResult]);

  const rootDir = process.cwd();
  const rootName = getRootName(rootDir);
  const parentDir = path.dirname(rootDir);
  const worktreeRoot = targetDirName ? getWorktreeRoot(parentDir, targetDirName) : '';
  const currentBindings = getScreenKeybindings(screen, config);
  const helpGroups = getHelpKeybindingGroups(screen, config);

  const addToast = useCallback((text: string, level: ToastMessage['level'] = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, level }]);
  }, []);

  useInput((input) => {
    if (isKey(input, config.keybindings.universal.help)) setHelpOpen((value) => !value);
    if (isKey(input, config.keybindings.universal.quit)) {
      process.exit(0);
    }
  });

  useEffect(() => {
    if (startMode === 'create') {
      const found = scanGitProjects(rootDir);
      setProjects(found);
      setLoading(false);
    }
  }, [rootDir, startMode]);

  const backToHome = useCallback(() => {
    setScreen('home');
    setGroups([]);
    setSelectedGroupRoots(new Set());
    setResult(null);
    setPruneResult(null);
    setCleanupResult(null);
    setDeletedBranches([]);
    setFailedBranches([]);
    setRepairResult(null);
    setActivityTask(null);
  }, []);

  const handleHomeSelect = useCallback((action: 'create' | 'groups' | 'settings') => {
    if (action === 'create') {
      setLoading(true);
      const found = scanGitProjects(rootDir);
      setProjects(found);
      setLoading(false);
      setScreen('projectPicker');
    } else if (action === 'groups') {
      setLoading(true);
      discoverWorktreeGroups(rootDir).then((found) => {
        setGroups(found);
        setLoading(false);
        setScreen('groupList');
      });
    } else {
      setScreen('settings');
    }
  }, [rootDir]);

  const startCreateFlow = useCallback(() => {
    setLoading(true);
    const found = scanGitProjects(rootDir);
    setProjects(found);
    setLoading(false);
    setScreen('projectPicker');
  }, [rootDir]);

  const refreshGroups = useCallback(async () => {
    setLoading(true);
    const found = await discoverWorktreeGroups(rootDir);
    setGroups(found);
    setLoading(false);
    addToast(t('dashboardRefreshDone'), 'info');
  }, [rootDir, addToast]);

  // ── Activity 编排 ─────────────────────────────────────────────────────
  const startActivity = useCallback((task: ActivityTask, phase: ActivityPhase) => {
    setActivityTask(task);
    setActivityPhase(phase);
    setActivitySeq((s) => s + 1);
    setScreen('activity');
  }, []);

  const handleProjectSelect = useCallback((selected: GitProject[]) => {
    setSelectedProjects(selected);
    setScreen('featureInput');
  }, []);

  const handleFeatureSubmit = useCallback((f: string) => {
    setFeature(f);
    setScreen('targetDirInput');
  }, []);

  const handleTargetDirSubmit = useCallback((dirName: string) => {
    setTargetDirName(dirName);
    setScreen('branchOverrides');
  }, []);

  const handleOverridesConfirm = useCallback(async (ov: Map<string, string>) => {
    setOverrides(ov);
    setLoading(true);
    const built = await buildPlan(selectedProjects, feature, ov, rootDir, targetDirName, config.baseBranch);
    setPlan(built);
    setLoading(false);
    setScreen('planPreview');
  }, [selectedProjects, feature, rootDir, targetDirName]);

  const startCreateActivity = useCallback(() => {
    // 预检：同分支已被他处检出 → 阻断，留在 PlanPreview
    const conflicts = plan.filter((i) => i.conflictPath);
    if (conflicts.length > 0) {
      for (const i of conflicts) {
        addToast(`${i.branch} (${i.project.name}) ${t('conflictBranchAt')} ${i.conflictPath}`, 'error');
      }
      return;
    }

    const task: ActivityTask = {
      title: `${t('create')}: ${feature}`,
      run: async (onProgress) => {
        const r = await executePlan(plan, rootDir, symlinkNames, (event) => {
          if (event.type === 'project:skipped') addToast(`${event.project}: ${event.reason}`, 'warning');
          else if (event.type === 'project:failed') addToast(`${event.project}: ${event.reason}`, 'error');
          else if (event.type === 'link:skipped') addToast(`${event.project}/${event.name}: ${event.reason}`, 'warning');
          onProgress(event);
        });
        setResult(r);
      },
    };
    setResult(null);
    startActivity(task, 'create');
  }, [plan, rootDir, feature, addToast, startActivity]);

  const startPruneActivity = useCallback(() => {
    const task: ActivityTask = {
      title: t('safePruneExec'),
      run: async (onProgress) => {
        const r = await executeSafePrune(rootDir, false, onProgress);
        setPruneResult(r);
      },
    };
    setPruneResult(null);
    startActivity(task, 'prune');
  }, [rootDir, startActivity]);

  const startCleanupActivity = useCallback((roots: Set<string>) => {
    const names = groups.filter((g) => roots.has(g.rootPath)).map((g) => g.name).join(', ');
    const task: ActivityTask = {
      title: names ? `${t('cleanupExec')}: ${names}` : t('cleanupExec'),
      run: async (onProgress) => {
        const r = await executeCleanup(groups, roots, symlinkNames, onProgress);
        setCleanupResult(r);
      },
    };
    setCleanupResult(null);
    setDeletedBranches([]);
    setFailedBranches([]);
    startActivity(task, 'cleanup');
  }, [groups, startActivity]);

  const cleanupSingleGroup = useCallback((groupRoot: string) => {
    const roots = new Set([groupRoot]);
    setSelectedGroupRoots(roots);
    startCleanupActivity(roots);
  }, [startCleanupActivity]);

  const startForceActivity = useCallback(() => {
    const failedItems = (cleanupResultRef.current?.failed ?? []).filter((f) => f.forceRetryable);
    const task: ActivityTask = {
      title: t('forceRetryExec'),
      run: async (onProgress) => {
        const r = await executeForceRetry(failedItems, symlinkNames, onProgress);
        setCleanupResult((prev) => (prev ? mergeForceResult(prev, r, groups) : prev));
      },
    };
    startActivity(task, 'force');
  }, [groups, startActivity]);

  const startBranchActivity = useCallback(() => {
    const cr = cleanupResultRef.current;
    if (!cr || cr.branchesToDelete.length === 0) { backToHome(); return; }
    const projectPaths = buildProjectPaths(groups);
    const selected = new Set(cr.branchesToDelete.map((b) => `${b.projectName}:${b.branch}`));
    const task: ActivityTask = {
      title: t('branchDeleteTitle'),
      run: async (onProgress) => {
        const r = await executeBranchDeletion(cr.branchesToDelete, selected, projectPaths, onProgress);
        setDeletedBranches(r.deleted);
        setFailedBranches(r.failed);
      },
    };
    startActivity(task, 'branch');
  }, [groups, startActivity, backToHome]);

  const startBranchIfAny = useCallback(() => {
    if (cleanupResultRef.current?.branchesToDelete.length) startBranchActivity();
    else backToHome();
  }, [startBranchActivity, backToHome]);

  const startRepairActivity = useCallback((groupRoot: string) => {
    const roots = new Set([groupRoot]);
    const names = groups.filter((g) => roots.has(g.rootPath)).map((g) => g.name).join(', ');
    const task: ActivityTask = {
      title: names ? `${t('repairTitle')}: ${names}` : t('repairTitle'),
      run: async (onProgress) => {
        const r = await executeRepair(rootDir, groups, roots, symlinkNames, onProgress);
        setRepairResult(r);
      },
    };
    setRepairResult(null);
    startActivity(task, 'repair');
  }, [rootDir, groups, symlinkNames, startActivity]);

  if (loading && (screen === 'projectPicker' || screen === 'groupList')) {
    return <Box><Text>{t('scanning')}</Text></Box>;
  }

  if (loading && screen === 'planPreview') {
    return <Box><Text>{t('buildingPlan')}</Text></Box>;
  }

  return (
    <Screen breadcrumb={SCREEN_BREADCRUMB[screen]} hints={currentBindings} showHints={showBottomLine}>
      <ToastHost toasts={toasts} />

      {helpOpen && (
        <HelpOverlay title={t(screen === 'groupList' ? 'dashboardTitle' : 'appTitle')} groups={helpGroups} />
      )}

      {screen === 'home' && (
        <Home onSelect={handleHomeSelect} />
      )}

      {screen === 'projectPicker' && (
        <ProjectPicker
          projects={projects}
          preselected={prefilledProjects.map((p) => p.name)}
          onSelect={handleProjectSelect}
          onBack={() => backToHome()}
        />
      )}
      {screen === 'featureInput' && (
        <FeatureInput
          defaultValue={feature}
          onSubmit={handleFeatureSubmit}
          onBack={() => setScreen('projectPicker')}
        />
      )}
      {screen === 'targetDirInput' && (
        <TargetDirInput
          defaultDirName={feature ? featureToDirectoryName(feature, rootName) : ''}
          parentDir={parentDir}
          onSubmit={handleTargetDirSubmit}
          onBack={() => setScreen('featureInput')}
        />
      )}
      {screen === 'branchOverrides' && (
        <BranchOverrides
          projects={selectedProjects}
          feature={feature}
          overrides={overrides}
          onConfirm={handleOverridesConfirm}
          onBack={() => setScreen('targetDirInput')}
        />
      )}
      {screen === 'planPreview' && plan.length > 0 && (
        <PlanPreview
          items={plan}
          worktreeRoot={worktreeRoot}
          rootName={rootName}
          feature={feature}
          onConfirm={startCreateActivity}
          onBack={() => setScreen('branchOverrides')}
        />
      )}

      {screen === 'activity' && activityTask && (
        <Activity key={activitySeq} task={activityTask} complete={
          <ActivityComplete
            phase={activityPhase}
            result={result}
            pruneResult={pruneResult}
            cleanupResult={cleanupResult}
            repairResult={repairResult}
            deletedBranches={deletedBranches}
            failedBranches={failedBranches}
            worktreeRoot={worktreeRoot}
            onStartForce={startForceActivity}
            onStartBranch={startBranchActivity}
            onDeclineForce={startBranchIfAny}
            onDone={backToHome}
          />
        } />
      )}

      {screen === 'groupList' && (
        <GroupList
          groups={groups}
          config={config}
          onBack={backToHome}
          onCreate={startCreateFlow}
          onCleanupGroup={cleanupSingleGroup}
          onPrune={startPruneActivity}
          onRefresh={refreshGroups}
          onRepair={startRepairActivity}
        />
      )}

      {screen === 'settings' && (
        <Settings
          cwd={rootDir}
          showBottomLine={showBottomLine}
          symlinkNames={symlinkNames}
          onToggleBottomLine={() => setShowBottomLine((v) => !v)}
          onSymlinkNamesChange={setSymlinkNames}
          onBack={backToHome}
        />
      )}
    </Screen>
  );
}
