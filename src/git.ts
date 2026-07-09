import { execa } from 'execa';
import fs from 'fs-extra';
import path from 'node:path';
import type { GitResult, WorktreeInfo } from './types.js';

async function runGit(
  cwd: string,
  args: string[]
): Promise<GitResult<string>> {
  try {
    const result = await execa('git', args, { cwd, reject: false });
    if (result.exitCode !== 0) {
      return { ok: false, error: result.stderr.trim() || result.stdout.trim() };
    }
    return { ok: true, value: result.stdout.trim() };
  } catch (err) {
    return { ok: false, error: (err as Error).message };
  }
}

export async function fetchRef(projectPath: string, ref: string): Promise<GitResult<void>> {
  // ref 形如 origin/main —— 用显式 refspec 确保更新远程跟踪引用
  const branch = ref.replace(/^origin\//, '');
  const result = await runGit(projectPath, ['fetch', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function fetchRemoteBranch(projectPath: string, branch: string): Promise<GitResult<void>> {
  const result = await runGit(projectPath, ['fetch', 'origin', branch]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

/** Detect the default remote branch using origin/HEAD, origin/main, then origin/master. */
export async function detectDefaultBranch(projectPath: string): Promise<string> {
  const head = await runGit(projectPath, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head.ok && head.value && head.value.startsWith('origin/')) {
    return head.value;
  }
  if (await refExists(projectPath, 'origin/main')) {
    return 'origin/main';
  }
  return 'origin/master';
}

export async function refExists(projectPath: string, ref: string): Promise<boolean> {
  const result = await runGit(projectPath, ['rev-parse', '--verify', '--quiet', ref]);
  return result.ok;
}

export async function hasLocalBranch(projectPath: string, branch: string): Promise<boolean> {
  return refExists(projectPath, `refs/heads/${branch}`);
}

export async function hasRemoteBranch(projectPath: string, branch: string): Promise<boolean> {
  const remoteRef = `refs/remotes/origin/${branch}`;
  if (await refExists(projectPath, remoteRef)) {
    return true;
  }

  const fetchResult = await fetchRemoteBranch(projectPath, branch);
  if (!fetchResult.ok) {
    return false;
  }
  return refExists(projectPath, remoteRef);
}

export async function getRefCommit(projectPath: string, ref: string): Promise<GitResult<string>> {
  return runGit(projectPath, ['rev-parse', ref]);
}

export async function isDirty(projectPath: string): Promise<boolean> {
  const result = await runGit(projectPath, ['status', '--porcelain']);
  if (!result.ok) return false;
  return result.value!.length > 0;
}

export async function addWorktreeFromRef(
  projectPath: string,
  targetPath: string,
  branch: string,
  ref: string
): Promise<GitResult<void>> {
  const result = await runGit(projectPath, [
    'worktree', 'add', '-b', branch, targetPath, ref,
  ]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function addWorktreeFromRemoteBranch(
  projectPath: string,
  targetPath: string,
  branch: string,
  ref: string
): Promise<GitResult<void>> {
  const result = await runGit(projectPath, [
    'worktree', 'add', '--track', '-b', branch, targetPath, ref,
  ]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function addWorktreeFromExistingBranch(
  projectPath: string,
  targetPath: string,
  branch: string
): Promise<GitResult<void>> {
  const result = await runGit(projectPath, [
    'worktree', 'add', targetPath, branch,
  ]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export function parseWorktreePorcelain(output: string): WorktreeInfo[] {
  const worktrees: WorktreeInfo[] = [];
  let current: Partial<WorktreeInfo> = {};

  for (const line of output.split('\n')) {
    if (line.startsWith('worktree ')) {
      if (current.path) worktrees.push(current as WorktreeInfo);
      current = { path: line.slice('worktree '.length), head: '', branch: null, detached: false };
    } else if (line.startsWith('HEAD ')) {
      current.head = line.slice('HEAD '.length);
    } else if (line.startsWith('branch ')) {
      current.branch = line.slice('branch '.length).replace(/^refs\/heads\//, '');
    } else if (line === 'detached') {
      current.detached = true;
    } else if (line.trim() === '') {
      if (current.path) worktrees.push(current as WorktreeInfo);
      current = {};
    }
  }
  if (current.path) worktrees.push(current as WorktreeInfo);
  return worktrees;
}

export async function listWorktrees(projectPath: string): Promise<GitResult<WorktreeInfo[]>> {
  const result = await runGit(projectPath, ['worktree', 'list', '--porcelain']);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true, value: parseWorktreePorcelain(result.value!) };
}

/**
 * 查找某分支当前被检出于哪个 worktree（git 不允许同一分支同时检出多处）。
 * 返回冲突 worktree 路径，或 null。排除 excludePath（通常是本次目标，尚未创建）。
 */
export async function findBranchCheckout(
  projectPath: string,
  branch: string,
  excludePath?: string
): Promise<string | null> {
  const result = await listWorktrees(projectPath);
  if (!result.ok || !result.value) return null;
  const hit = result.value.find((wt) => wt.branch === branch && !wt.detached && wt.path !== excludePath);
  return hit ? hit.path : null;
}

export async function pruneWorktreesDryRun(projectPath: string): Promise<GitResult<string>> {
  return runGit(projectPath, ['worktree', 'prune', '--dry-run', '--verbose']);
}

export async function pruneWorktrees(projectPath: string): Promise<GitResult<string>> {
  return runGit(projectPath, ['worktree', 'prune', '--verbose']);
}

export async function removeWorktree(projectPath: string, worktreePath: string): Promise<GitResult<void>> {
  const result = await runGit(projectPath, ['worktree', 'remove', worktreePath]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function removeWorktreeForce(projectPath: string, worktreePath: string): Promise<GitResult<void>> {
  const result = await runGit(projectPath, ['worktree', 'remove', '--force', worktreePath]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function isBranchMergedInto(projectPath: string, branch: string, baseRef: string): Promise<boolean> {
  const result = await runGit(projectPath, ['merge-base', '--is-ancestor', branch, baseRef]);
  return result.ok;
}

export async function deleteLocalBranch(projectPath: string, branch: string): Promise<GitResult<void>> {
  const result = await runGit(projectPath, ['branch', '-d', branch]);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function getLastCommitDate(worktreePath: string): Promise<number | null> {
  const result = await runGit(worktreePath, ['log', '-1', '--format=%ct']);
  if (!result.ok) return null;
  const ts = parseInt(result.value!, 10);
  return isNaN(ts) ? null : ts;
}

/**
 * Check if a local branch is behind its remote tracking branch.
 * Uses local cache only: `git rev-list --count branch..origin/branch`.
 * Returns false if the remote ref doesn't exist.
 */
export async function isBehindRemote(projectPath: string, branch: string): Promise<boolean> {
  const ref = `origin/${branch}`;
  const exists = await refExists(projectPath, ref);
  if (!exists) return false;
  const result = await runGit(projectPath, ['rev-list', '--count', `${branch}..${ref}`]);
  if (!result.ok) return false;
  const count = parseInt(result.value!, 10);
  return !isNaN(count) && count > 0;
}

export async function fetchProject(projectPath: string): Promise<GitResult<void>> {
  const result = await runGit(projectPath, ['fetch', 'origin']);
  if (!result.ok) {
    return { ok: false, error: result.error };
  }
  return { ok: true };
}

export async function pullBranch(worktreePath: string, branch: string): Promise<GitResult<string>> {
  return runGit(worktreePath, ['pull', 'origin', branch]);
}

/**
 * 把 names 幂等追加到该 worktree 专属的 info/exclude（非跟踪 → 不污染 .gitignore，
 * 检出即干净）。用 `git rev-parse --git-path info/exclude` 定位每个 linked worktree
 * 自己的排除文件。
 */
export async function appendInfoExclude(worktreePath: string, names: string[]): Promise<GitResult<void>> {
  if (names.length === 0) return { ok: true };
  const pathRes = await runGit(worktreePath, ['rev-parse', '--git-path', 'info/exclude']);
  if (!pathRes.ok || !pathRes.value) return { ok: false, error: pathRes.error || 'rev-parse failed' };

  const excludePath = path.isAbsolute(pathRes.value) ? pathRes.value : path.join(worktreePath, pathRes.value);
  await fs.ensureDir(path.dirname(excludePath));

  const existing = fs.existsSync(excludePath) ? fs.readFileSync(excludePath, 'utf8') : '';
  const have = new Set(existing.split('\n'));
  const additions = names.filter((n) => n.length > 0 && !have.has(n));
  if (additions.length === 0) return { ok: true };

  const sep = existing.length > 0 && !existing.endsWith('\n') ? '\n' : '';
  fs.appendFileSync(excludePath, `${sep}# lazyworktree: symlinks\n${additions.join('\n')}\n`);
  return { ok: true };
}
