import path from 'node:path';
import fs from 'fs-extra';
import type { PlanItem, ProgressEvent, SymlinkResult, ExecutionResult } from './types.js';
import { fetchRef, refExists, addWorktreeFromRef, addWorktreeFromExistingBranch, appendInfoExclude } from './git.js';
import { createSymlinks, createRootSymlinks } from './fs-layout.js';

type ProgressCallback = (event: ProgressEvent) => void;

export async function executePlan(
  items: PlanItem[],
  rootDir: string,
  symlinkNames: string[],
  onProgress: ProgressCallback
): Promise<ExecutionResult> {
  const successes: string[] = [];
  const skipped: string[] = [];
  const failed: { project: string; reason: string }[] = [];
  const skippedSymlinks: SymlinkResult[] = [];

  // Use the first item to locate the worktree group root.
  const worktreeRoot = items.length > 0 ? path.dirname(items[0].targetPath) : '';

  // Create root-level symlinks in the worktree group root.
  if (worktreeRoot) {
    await fs.ensureDir(worktreeRoot);
    const rootSymlinkResults = await createRootSymlinks(rootDir, worktreeRoot, symlinkNames);

    for (const sr of rootSymlinkResults) {
      if (sr.skipped) {
        skippedSymlinks.push(sr);
        onProgress({ type: 'project:step', project: '(root)', step: `symlink ${sr.name} - skipped (${sr.reason})`, status: 'skipped' });
        onProgress({ type: 'link:skipped', project: '(root)', name: sr.name, reason: sr.reason || 'unknown' });
      } else if (sr.created) {
        onProgress({ type: 'project:step', project: '(root)', step: `symlink ${sr.name} (from workspace root)`, status: 'done' });
        onProgress({ type: 'link:created', project: '(root)', name: sr.name, source: sr.source, fromRoot: true });
      }
    }
  }

  for (const item of items) {
    const name = item.project.name;
    onProgress({ type: 'project:start', project: name });

    // Skip existing target directories.
    if (item.targetExists) {
      item.status = 'skipped';
      item.skipReason = 'target directory already exists';
      onProgress({ type: 'project:step', project: name, step: `skip (dir exists: ${item.targetPath})`, status: 'skipped' });
      onProgress({ type: 'project:skipped', project: name, reason: 'target directory already exists' });
      skipped.push(name);
      continue;
    }

    // Fetch the selected base branch.
    const refShort = item.sourceRef.replace(/^origin\//, '');
    onProgress({ type: 'project:step', project: name, step: `git fetch origin ${refShort}`, status: 'running', command: `git fetch origin ${refShort}` });
    const fetchResult = await fetchRef(item.project.path, item.sourceRef);
    if (!fetchResult.ok) {
      const hasCached = await refExists(item.project.path, item.sourceRef);
      if (!hasCached) {
        onProgress({ type: 'project:step', project: name, step: `fetch failed, no cached ${item.sourceRef}`, status: 'failed' });
        item.status = 'failed';
        item.error = `fetch failed and no cached ${item.sourceRef}: ${fetchResult.error}`;
        onProgress({ type: 'project:failed', project: name, reason: item.error });
        failed.push({ project: name, reason: item.error });
        continue;
      }
      onProgress({ type: 'project:step', project: name, step: `fetch failed, using cached ${item.sourceRef}`, status: 'done' });
    } else {
      onProgress({ type: 'project:step', project: name, step: `git fetch origin ${refShort}`, status: 'done' });
    }

    // Ensure the parent directory exists.
    const parentDir = path.dirname(item.targetPath);
    await fs.ensureDir(parentDir);

    // Create the worktree.
    if (item.branchExists) {
      onProgress({ type: 'project:step', project: name, step: `git worktree add ${item.targetPath} ${item.branch} (reuse existing branch)`, status: 'running', command: `git worktree add ${item.targetPath} ${item.branch}` });
    } else {
      onProgress({ type: 'project:step', project: name, step: `git worktree add -b ${item.branch} ${item.targetPath} ${item.sourceRef}`, status: 'running', command: `git worktree add -b ${item.branch} ${item.targetPath} ${item.sourceRef}` });
    }

    let worktreeResult;
    if (item.branchExists) {
      worktreeResult = await addWorktreeFromExistingBranch(item.project.path, item.targetPath, item.branch);
    } else {
      worktreeResult = await addWorktreeFromRef(item.project.path, item.targetPath, item.branch, item.sourceRef);
    }

    if (!worktreeResult.ok) {
      onProgress({ type: 'project:step', project: name, step: 'worktree add failed', status: 'failed' });
      item.status = 'failed';
      item.error = worktreeResult.error || 'git worktree add failed';
      onProgress({ type: 'project:failed', project: name, reason: item.error });
      failed.push({ project: name, reason: item.error });
      continue;
    }

    onProgress({ type: 'project:step', project: name, step: 'worktree created', status: 'done' });

    // Project worktrees only use project-level symlink sources.
    const fallbackToRoot = false;
    // Create per-project symlinks.
    const symlinkResults = await createSymlinks(item.project.path, item.targetPath, rootDir, symlinkNames, { fallbackToRoot: fallbackToRoot });
    item.symlinks = symlinkResults;

    for (const sr of symlinkResults) {
      const label = sr.fromRoot ? `${sr.name} (from root)` : sr.name;
      if (sr.skipped) {
        skippedSymlinks.push(sr);
        onProgress({ type: 'project:step', project: name, step: `symlink ${label} - skipped (${sr.reason})`, status: 'skipped' });
        onProgress({ type: 'link:skipped', project: name, name: sr.name, reason: sr.reason || 'unknown' });
      } else if (sr.created) {
        onProgress({ type: 'project:step', project: name, step: `symlink ${label}`, status: 'done' });
        onProgress({ type: 'link:created', project: name, name: sr.name, source: sr.source, fromRoot: sr.fromRoot });
      }
    }

    // Ignore symlink names in this worktree's local info/exclude file.
    const exclude = await appendInfoExclude(item.targetPath, symlinkNames);
    if (exclude.ok) {
      onProgress({ type: 'project:step', project: name, step: `info/exclude += ${symlinkNames.join(', ')}`, status: 'done' });
    } else {
      onProgress({ type: 'project:step', project: name, step: `info/exclude failed: ${exclude.error}`, status: 'failed' });
    }

    item.status = 'success';
    onProgress({ type: 'project:success', project: name });
    successes.push(name);
  }

  return { successes, skipped, failed, skippedSymlinks };
}
