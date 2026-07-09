import path from 'node:path';
import fs from 'fs-extra';
import { execSync } from 'node:child_process';
import { scanGitProjects } from './fs-layout.js';
import { parseWorktreePorcelain } from './git.js';

/**
 * Resolves the canonical workspace root from any directory.
 *
 * - If `cwd` is a normal workspace root (e.g. `.../zh` with child Git repos),
 *   returns `cwd` unchanged.
 * - If `cwd` is inside a worktree group directory (e.g. `.../zh-feature-foo`),
 *   queries the first child repo's `git worktree list` to find the main
 *   worktree path and derives the original workspace root.
 * - If no child Git repos are found, returns `cwd` unchanged.
 * - On any git/fs error, falls back to `cwd`.
 */
export function resolveWorkspaceRoot(cwd: string): string {
  const projects = scanGitProjects(cwd);
  if (projects.length === 0) {
    return cwd;
  }

  // Query the first child repo's worktree list to find the main worktree path.
  const projectPath = projects[0].path;
  let porcelain: string;
  try {
    porcelain = execSync('git worktree list --porcelain', {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  } catch {
    return cwd;
  }

  const worktrees = parseWorktreePorcelain(porcelain);
  if (worktrees.length === 0) return cwd;

  // The first entry in git worktree list is always the main worktree.
  const mainWorktreePath = worktrees[0].path;
  const candidateRoot = path.dirname(mainWorktreePath);

  // If candidate root is the same as cwd, we're already in the workspace root.
  if (resolveRealPath(candidateRoot) === resolveRealPath(cwd)) {
    return cwd;
  }

  // Verify: the repo name exists under the candidate root.
  const repoName = projects[0].name;
  const expectedPath = path.join(candidateRoot, repoName);
  if (fs.existsSync(expectedPath) && fs.existsSync(path.join(expectedPath, '.git'))) {
    return candidateRoot;
  }

  return cwd;
}

function resolveRealPath(p: string): string {
  try {
    return fs.realpathSync(p);
  } catch {
    return path.resolve(p);
  }
}
