export interface GitProject {
  name: string;
  path: string;
}

export interface ProjectSpec {
  name: string;
  branch?: string;
}

export type PlanItemStatus = 'pending' | 'skipped' | 'success' | 'failed';

export interface PlanItem {
  project: GitProject;
  branch: string;
  targetPath: string;
  sourceRef: string;
  sourceIsRemoteBranch: boolean;
  dirty: boolean;
  branchExists: boolean;
  branchDiverges: boolean;
  targetExists: boolean;
  /** 该分支已被其他 worktree 检出（git 禁止同分支多处检出）→ 阻断创建。 */
  conflictPath?: string;
  status: PlanItemStatus;
  error?: string;
  skipReason?: string;
  symlinks: SymlinkResult[];
}

export interface SymlinkResult {
  name: string;
  source: string;
  target: string;
  fromRoot: boolean;
  created: boolean;
  skipped: boolean;
  reason?: string;
}

export interface ExecutionResult {
  successes: string[];
  skipped: string[];
  failed: { project: string; reason: string }[];
  skippedSymlinks: SymlinkResult[];
}

export type ProgressEvent =
  | { type: 'project:start'; project: string }
  | { type: 'project:skipped'; project: string; reason: string }
  | { type: 'project:success'; project: string }
  | { type: 'project:failed'; project: string; reason: string }
  | { type: 'project:step'; project: string; step: string; status: 'running' | 'done' | 'failed' | 'skipped'; command?: string }
  | { type: 'link:created'; project: string; name: string; source: string; fromRoot: boolean }
  | { type: 'link:skipped'; project: string; name: string; reason: string };

export type Action = 'create' | 'list' | 'safePrune' | 'cleanupStale';

export type Screen =
  | 'home'
  | 'projectPicker'
  | 'featureInput'
  | 'targetDirInput'
  | 'branchOverrides'
  | 'planPreview'
  | 'activity'
  | 'groupList'
  | 'settings';

export interface WorktreeInfo {
  path: string;
  head: string;
  branch: string | null;
  detached: boolean;
}

export interface WorktreeItem {
  projectName: string;
  projectPath: string;
  worktreePath: string;
  branch: string | null;
  head: string;
  dirty: boolean;
  missing: boolean;
  mergedToBase: boolean;
  lastCommitDate: number | null;
}

export interface WorktreeGroup {
  rootPath: string;
  name: string;
  items: WorktreeItem[];
  ageDays: number;
  hasDirty: boolean;
  hasUnmerged: boolean;
  hasMissing: boolean;
  recommendedForCleanup: boolean;
}

export interface PruneEntry {
  project: string;
  output: string;
}

export interface PruneResult {
  dryRunEntries: PruneEntry[];
  executed: string[];
  failed: { project: string; reason: string }[];
}

export interface CleanupItemResult {
  projectName: string;
  projectPath: string;
  worktreePath: string;
  branch: string | null;
  removed: boolean;
  forceRetryable: boolean;
  reason?: string;
}

export interface CleanupResult {
  removed: CleanupItemResult[];
  failed: CleanupItemResult[];
  removedGroups: string[];
  rootSymlinksRemoved: string[];
  branchesToDelete: { projectName: string; branch: string }[];
  branchesDeleted: { projectName: string; branch: string }[];
  branchesFailed: { projectName: string; branch: string; reason: string }[];
}

export interface RepairResult {
  created: SymlinkResult[];
  skipped: SymlinkResult[];
  repairedGroups: string[];
}

export interface ToastMessage {
  id: string;
  text: string;
  level: 'info' | 'warning' | 'error';
}

export interface GitResult<T> {
  ok: boolean;
  value?: T;
  error?: string;
}
