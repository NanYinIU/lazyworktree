import path from 'node:path';
import fs from 'fs-extra';
import type { GitProject, WorktreeGroup, WorktreeItem } from './types.js';
import { scanGitProjects, getRootName } from './fs-layout.js';
import { listWorktrees, isDirty, isBranchMergedInto, detectDefaultBranch, getLastCommitDate } from './git.js';

export const STALE_DAYS = 14;

/** A group belongs to this workspace when it starts with the workspace directory name. */
export function isWorktreeGroup(groupName: string, rootName: string): boolean {
  return groupName.startsWith(`${rootName}-`);
}

export function classifyWorktreePath(
  wtPath: string,
  rootDir: string
): 'mainRepo' | 'group' | 'other' {
  const normalized = normalizeExistingPath(wtPath);
  const expectedMain = normalizeExistingPath(rootDir);

  if (normalized === expectedMain || normalized.startsWith(expectedMain + path.sep)) {
    return 'mainRepo';
  }

  const rootName = getRootName(rootDir);
  const prefix = path.join(path.dirname(expectedMain), `${rootName}-`);
  if (normalized.startsWith(prefix)) {
    return 'group';
  }

  return 'other';
}

function normalizeExistingPath(value: string): string {
  try {
    return fs.realpathSync(value);
  } catch {
    return path.resolve(value);
  }
}

export async function discoverWorktreeGroups(
  rootDir: string,
  includeNonZh: boolean = false
): Promise<WorktreeGroup[]> {
  const rootName = getRootName(rootDir);
  const projects = scanGitProjects(rootDir);
  const groupMap = new Map<string, WorktreeItem[]>();
  // 每项目探测一次基准分支（避免每个 worktree 重复探测）
  const baseRefByProject = new Map<string, string>();

  for (const project of projects) {
    const result = await listWorktrees(project.path);
    if (!result.ok || !result.value) continue;

    let baseRef = baseRefByProject.get(project.path);
    if (!baseRef) {
      baseRef = await detectDefaultBranch(project.path);
      baseRefByProject.set(project.path, baseRef);
    }

    for (const wt of result.value) {
      const cls = classifyWorktreePath(wt.path, rootDir);
      if (cls === 'mainRepo') continue;

      if (cls === 'group') {
        // always include current repo's groups
      } else if (cls === 'other' && includeNonZh) {
        // include foreign groups only if explicitly requested
      } else {
        continue;
      }

      const groupName = path.basename(path.dirname(wt.path));
      if (!includeNonZh && !isWorktreeGroup(groupName, rootName)) continue;

      const dirty = await isDirty(wt.path);
      const missing = !fs.existsSync(wt.path);
      const merged = wt.branch ? await isBranchMergedInto(project.path, wt.branch, baseRef) : false;
      const lastCommitDate = await getLastCommitDate(wt.path);

      const item: WorktreeItem = {
        projectName: project.name,
        projectPath: project.path,
        worktreePath: wt.path,
        branch: wt.branch,
        head: wt.head,
        dirty,
        missing,
        mergedToBase: merged,
        lastCommitDate,
      };

      const groupRoot = path.dirname(wt.path);
      if (!groupMap.has(groupRoot)) {
        groupMap.set(groupRoot, []);
      }
      groupMap.get(groupRoot)!.push(item);
    }
  }

  const groups: WorktreeGroup[] = [];
  for (const [rootPath, items] of groupMap) {
    const name = path.basename(rootPath);
    const ageDays = computeGroupAgeDays(items);
    const hasDirty = items.some((i) => i.dirty);
    const hasUnmerged = items.some((i) => !i.mergedToBase && i.branch);
    const hasMissing = items.some((i) => i.missing);
    const recommendedForCleanup = ageDays >= STALE_DAYS && !hasDirty && !hasUnmerged;

    groups.push({
      rootPath,
      name,
      items,
      ageDays,
      hasDirty,
      hasUnmerged,
      hasMissing,
      recommendedForCleanup,
    });
  }

  groups.sort((a, b) => b.ageDays - a.ageDays);
  return groups;
}

export function computeGroupAgeDays(items: WorktreeItem[]): number {
  const now = Date.now() / 1000;
  let maxAge = 0;

  for (const item of items) {
    if (item.lastCommitDate) {
      const age = Math.floor((now - item.lastCommitDate) / 86400);
      if (age > maxAge) maxAge = age;
    }
  }

  if (maxAge === 0) {
    for (const item of items) {
      try {
        const stat = fs.statSync(item.worktreePath);
        const age = Math.floor((now - stat.mtimeMs / 1000) / 86400);
        if (age > maxAge) maxAge = age;
      } catch {
        // missing path
      }
    }
  }

  return maxAge;
}

export function filterStaleGroups(groups: WorktreeGroup[]): WorktreeGroup[] {
  return groups.filter((g) => g.ageDays >= STALE_DAYS);
}
