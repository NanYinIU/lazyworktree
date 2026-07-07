import path from 'node:path';
import fs from 'fs-extra';
import type { GitProject, WorktreeGroup, PruneResult, CleanupResult, CleanupItemResult, RepairResult, SymlinkResult, ProgressEvent } from './types.js';
import { scanGitProjects, createSymlinks, createRootSymlinks } from './fs-layout.js';
import {
  pruneWorktreesDryRun,
  pruneWorktrees,
  removeWorktree,
  removeWorktreeForce,
  deleteLocalBranch,
} from './git.js';

type ProgressCallback = (event: ProgressEvent) => void;

export async function executeSafePrune(
  rootDir: string,
  dryRun: boolean,
  onProgress: ProgressCallback
): Promise<PruneResult> {
  const projects = scanGitProjects(rootDir);
  const dryRunEntries: { project: string; output: string }[] = [];
  const executed: string[] = [];
  const failed: { project: string; reason: string }[] = [];

  for (const project of projects) {
    onProgress({ type: 'project:step', project: project.name, step: 'git worktree prune --dry-run --verbose', status: 'running', command: 'git worktree prune --dry-run --verbose' });

    const dryResult = await pruneWorktreesDryRun(project.path);
    if (!dryResult.ok) {
      onProgress({ type: 'project:step', project: project.name, step: 'prune dry-run failed', status: 'failed' });
      failed.push({ project: project.name, reason: dryResult.error || 'prune dry-run failed' });
      continue;
    }

    const output = dryResult.value || '(nothing to prune)';
    dryRunEntries.push({ project: project.name, output });
    onProgress({ type: 'project:step', project: project.name, step: output, status: 'done' });

    if (!dryRun && output.trim() !== '(nothing to prune)' && output.trim() !== '') {
      onProgress({ type: 'project:step', project: project.name, step: 'git worktree prune --verbose', status: 'running', command: 'git worktree prune --verbose' });
      const execResult = await pruneWorktrees(project.path);
      if (!execResult.ok) {
        onProgress({ type: 'project:step', project: project.name, step: 'prune failed', status: 'failed' });
        failed.push({ project: project.name, reason: execResult.error || 'prune failed' });
      } else {
        onProgress({ type: 'project:step', project: project.name, step: 'prune done', status: 'done' });
        executed.push(project.name);
      }
    }
  }

  return { dryRunEntries, executed, failed };
}

export async function executeCleanup(
  groups: WorktreeGroup[],
  selectedGroupRoots: Set<string>,
  symlinkNames: string[],
  onProgress: ProgressCallback
): Promise<CleanupResult> {
  const removed: CleanupItemResult[] = [];
  const failed: CleanupItemResult[] = [];
  const removedGroups: string[] = [];
  const rootSymlinksRemoved: string[] = [];
  const branchesToDelete: { projectName: string; branch: string }[] = [];
  const branchesDeleted: { projectName: string; branch: string }[] = [];
  const branchesFailed: { projectName: string; branch: string; reason: string }[] = [];

  for (const group of groups) {
    if (!selectedGroupRoots.has(group.rootPath)) continue;

    const groupName = group.name;
    onProgress({ type: 'project:start', project: groupName });

    let allRemoved = true;
    let groupRemovedCount = 0;

    for (const item of group.items) {
      const label = `${item.projectName}/${path.basename(item.worktreePath)}`;

      if (item.missing) {
        onProgress({
          type: 'project:step',
          project: groupName,
          step: `git -C ${item.projectName} worktree prune (missing: ${label})`,
          status: 'running',
          command: `git -C ${item.projectName} worktree prune`,
        });
        const pruneResult = await pruneWorktrees(item.projectPath);
        if (pruneResult.ok) {
          onProgress({ type: 'project:step', project: groupName, step: `pruned missing ${label}`, status: 'done' });
          groupRemovedCount += 1;
          removed.push({
            projectName: item.projectName,
            projectPath: item.projectPath,
            worktreePath: item.worktreePath,
            branch: item.branch,
            removed: true,
            forceRetryable: false,
          });
          if (item.branch && item.mergedToBase) {
            branchesToDelete.push({ projectName: item.projectName, branch: item.branch });
          }
        } else {
          onProgress({ type: 'project:step', project: groupName, step: `prune failed ${label}: ${pruneResult.error}`, status: 'failed' });
          failed.push({
            projectName: item.projectName,
            projectPath: item.projectPath,
            worktreePath: item.worktreePath,
            branch: item.branch,
            removed: false,
            forceRetryable: false,
            reason: pruneResult.error || 'prune failed',
          });
          allRemoved = false;
        }
        continue;
      }

      onProgress({
        type: 'project:step',
        project: groupName,
        step: `git -C ${item.projectName} worktree remove ${item.worktreePath}`,
        status: 'running',
        command: `git -C ${item.projectName} worktree remove ${item.worktreePath}`,
      });

      const result = await removeWorktree(item.projectPath, item.worktreePath);
      if (result.ok) {
        onProgress({ type: 'project:step', project: groupName, step: `removed ${label}`, status: 'done' });
        groupRemovedCount += 1;
        removed.push({
          projectName: item.projectName,
          projectPath: item.projectPath,
          worktreePath: item.worktreePath,
          branch: item.branch,
          removed: true,
          forceRetryable: false,
        });

        if (item.branch && item.mergedToBase) {
          branchesToDelete.push({ projectName: item.projectName, branch: item.branch });
        }
      } else {
        const errMsg = result.error || 'unknown';
        const isDirty = errMsg.includes('modified') || errMsg.includes('untracked') || errMsg.includes('--force');
        onProgress({ type: 'project:step', project: groupName, step: `failed ${label}: ${errMsg}`, status: 'failed' });
        failed.push({
          projectName: item.projectName,
          projectPath: item.projectPath,
          worktreePath: item.worktreePath,
          branch: item.branch,
          removed: false,
          forceRetryable: isDirty,
          reason: errMsg,
        });
        allRemoved = false;
      }
    }

    if (allRemoved && groupRemovedCount > 0) {
      // Clean up root symlinks
      for (const name of symlinkNames) {
        const target = path.join(group.rootPath, name);
        try {
          if (fs.lstatSync(target).isSymbolicLink()) {
            fs.unlinkSync(target);
            rootSymlinksRemoved.push(path.join(groupName, name));
            onProgress({ type: 'project:step', project: groupName, step: `removed symlink ${name}`, status: 'done' });
          }
        } catch {
          // not a symlink or doesn't exist
        }
      }

      // Remove group root if empty
      try {
        const remaining = fs.readdirSync(group.rootPath);
        if (remaining.length === 0) {
          fs.rmdirSync(group.rootPath);
          removedGroups.push(groupName);
          onProgress({ type: 'project:step', project: groupName, step: `removed empty group dir`, status: 'done' });
        } else {
          onProgress({ type: 'project:step', project: groupName, step: `group dir not empty, kept: ${remaining.join(', ')}`, status: 'skipped' });
        }
      } catch {
        // already gone
      }
    }

    onProgress({ type: 'project:success', project: groupName });
  }

  return {
    removed,
    failed,
    removedGroups,
    rootSymlinksRemoved,
    branchesToDelete,
    branchesDeleted,
    branchesFailed,
  };
}

export async function executeBranchDeletion(
  branches: { projectName: string; branch: string }[],
  selected: Set<string>,
  projectPaths: Map<string, string>,
  onProgress: ProgressCallback
): Promise<{ deleted: { projectName: string; branch: string }[]; failed: { projectName: string; branch: string; reason: string }[] }> {
  const deleted: { projectName: string; branch: string }[] = [];
  const failed: { projectName: string; branch: string; reason: string }[] = [];

  for (const b of branches) {
    const key = `${b.projectName}:${b.branch}`;
    if (!selected.has(key)) continue;

    const projectPath = projectPaths.get(b.projectName);
    if (!projectPath) {
      failed.push({ ...b, reason: 'project path not found' });
      continue;
    }

    onProgress({ type: 'project:step', project: b.projectName, step: `git branch -d ${b.branch}`, status: 'running', command: `git branch -d ${b.branch}` });
    const result = await deleteLocalBranch(projectPath, b.branch);
    if (result.ok) {
      onProgress({ type: 'project:step', project: b.projectName, step: `deleted branch ${b.branch}`, status: 'done' });
      deleted.push(b);
    } else {
      onProgress({ type: 'project:step', project: b.projectName, step: `failed to delete ${b.branch}: ${result.error}`, status: 'failed' });
      failed.push({ ...b, reason: result.error || 'unknown' });
    }
  }

  return { deleted, failed };
}

export async function executeForceRetry(
  failedItems: CleanupItemResult[],
  symlinkNames: string[],
  onProgress: ProgressCallback
): Promise<{
  newlyRemoved: CleanupItemResult[];
  stillFailed: CleanupItemResult[];
  removedGroups: string[];
  rootSymlinksRemoved: string[];
}> {
  const newlyRemoved: CleanupItemResult[] = [];
  const stillFailed: CleanupItemResult[] = [];
  const removedGroups: string[] = [];
  const rootSymlinksRemoved: string[] = [];

  // Group failed items by their group root directory (parent of worktree path)
  const groupMap = new Map<string, CleanupItemResult[]>();
  for (const item of failedItems) {
    if (!item.forceRetryable) {
      stillFailed.push(item);
      continue;
    }
    const groupRoot = path.dirname(item.worktreePath);
    if (!groupMap.has(groupRoot)) groupMap.set(groupRoot, []);
    groupMap.get(groupRoot)!.push(item);
  }

  for (const [groupRoot, items] of groupMap) {
    const groupName = path.basename(groupRoot);
    let allForceRemoved = true;

    for (const item of items) {
      const label = `${item.projectName}/${path.basename(item.worktreePath)}`;
      onProgress({ type: 'project:step', project: item.projectName, step: `git worktree remove --force ${item.worktreePath}`, status: 'running', command: `git worktree remove --force ${item.worktreePath}` });

      const result = await removeWorktreeForce(item.projectPath, item.worktreePath);
      if (result.ok) {
        onProgress({ type: 'project:step', project: item.projectName, step: `force removed ${label}`, status: 'done' });
        newlyRemoved.push({ ...item, removed: true, forceRetryable: false, reason: undefined });
      } else {
        onProgress({ type: 'project:step', project: item.projectName, step: `force remove failed ${label}: ${result.error}`, status: 'failed' });
        stillFailed.push({ ...item, forceRetryable: false, reason: result.error || 'force remove failed' });
        allForceRemoved = false;
      }
    }

    // Clean up group dir and symlinks if all items in this group were force-removed
    if (allForceRemoved && items.length > 0) {
      for (const name of symlinkNames) {
        const target = path.join(groupRoot, name);
        try {
          if (fs.lstatSync(target).isSymbolicLink()) {
            fs.unlinkSync(target);
            rootSymlinksRemoved.push(path.join(groupName, name));
            onProgress({ type: 'project:step', project: groupName, step: `removed symlink ${name}`, status: 'done' });
          }
        } catch {
          // not a symlink or doesn't exist
        }
      }

      try {
        const remaining = fs.readdirSync(groupRoot);
        if (remaining.length === 0) {
          fs.rmdirSync(groupRoot);
          removedGroups.push(groupName);
          onProgress({ type: 'project:step', project: groupName, step: `removed empty group dir`, status: 'done' });
        } else {
          onProgress({ type: 'project:step', project: groupName, step: `group dir not empty, kept: ${remaining.join(', ')}`, status: 'skipped' });
        }
      } catch {
        // already gone
      }
    }
  }

  return { newlyRemoved, stillFailed, removedGroups, rootSymlinksRemoved };
}

export async function executeRepair(
  rootDir: string,
  groups: WorktreeGroup[],
  selectedRoots: Set<string>,
  symlinkNames: string[],
  onProgress: ProgressCallback
): Promise<RepairResult> {
  const created: SymlinkResult[] = [];
  const skipped: SymlinkResult[] = [];
  const repairedGroups: string[] = [];

  for (const group of groups) {
    if (!selectedRoots.has(group.rootPath)) continue;

    const groupName = group.name;
    onProgress({ type: 'project:start', project: groupName });

    // Repair per-project symlinks in each worktree item
    for (const item of group.items) {
      const label = `${item.projectName}/${path.basename(item.worktreePath)}`;
      onProgress({ type: 'project:step', project: groupName, step: `repairing symlinks in ${label}`, status: 'running' });

      const results = await createSymlinks(item.projectPath, item.worktreePath, rootDir, symlinkNames, { fallbackToRoot: false });
      for (const r of results) {
        if (r.created) {
          created.push(r);
          onProgress({ type: 'link:created', project: `${groupName}/${item.projectName}`, name: r.name, source: r.source, fromRoot: r.fromRoot });
        } else if (r.skipped) {
          skipped.push(r);
          onProgress({ type: 'link:skipped', project: `${groupName}/${item.projectName}`, name: r.name, reason: r.reason || 'already exists' });
        }
      }
    }

    // Repair root-level symlinks in the group root
    onProgress({ type: 'project:step', project: groupName, step: 'repairing root symlinks', status: 'running' });
    const rootResults = await createRootSymlinks(rootDir, group.rootPath, symlinkNames);
    for (const r of rootResults) {
      if (r.created) {
        created.push(r);
        onProgress({ type: 'link:created', project: groupName, name: r.name, source: r.source, fromRoot: r.fromRoot });
      } else if (r.skipped) {
        skipped.push(r);
        onProgress({ type: 'link:skipped', project: groupName, name: r.name, reason: r.reason || 'already exists' });
      }
    }

    repairedGroups.push(groupName);
    onProgress({ type: 'project:success', project: groupName });
  }

  return { created, skipped, repairedGroups };
}
