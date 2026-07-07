import path from 'node:path';
import fs from 'fs-extra';
import type { GitProject, SymlinkResult } from './types.js';

export function scanGitProjects(rootDir: string): GitProject[] {
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory() && fs.existsSync(path.join(rootDir, e.name, '.git')))
    .map((e) => ({
      name: e.name,
      path: path.join(rootDir, e.name),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function featureToDirectoryName(feature: string, rootName: string): string {
  return `${rootName}-${sanitizeFeature(feature)}`;
}

/** Current workspace directory name used as the worktree group prefix. */
export function getRootName(rootDir: string): string {
  return path.basename(rootDir) || 'worktree';
}

export function sanitizeFeature(feature: string): string {
  const sanitized = feature
    .replace(/[/\\_ ]+/g, '-')
    .replace(/[\x00-\x1f:?*"<>|~^.[\]]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  return sanitized || 'worktree';
}

export function getWorktreeRoot(parentDir: string, dirName: string): string {
  return path.join(parentDir, dirName);
}

export function getWorktreeProjectPath(worktreeRoot: string, projectName: string): string {
  return path.join(worktreeRoot, projectName);
}

export async function createSymlinks(
  originalProjectPath: string,
  worktreeProjectPath: string,
  rootDir: string,
  names: string[],
  opts?: { fallbackToRoot?: boolean }
): Promise<SymlinkResult[]> {
  const fallbackToRoot = opts?.fallbackToRoot ?? true;
  const results: SymlinkResult[] = [];

  for (const name of names) {
    const projectSource = path.join(originalProjectPath, name);
    const rootSource = path.join(rootDir, name);
    const target = path.join(worktreeProjectPath, name);

    // Prefer project-level sources, optionally falling back to workspace-level sources.
    let source: string | null = null;
    let fromRoot = false;

    if (fs.existsSync(projectSource)) {
      source = projectSource;
    } else if (fallbackToRoot && fs.existsSync(rootSource)) {
      source = rootSource;
      fromRoot = true;
    }

    if (!source) {
      continue;
    }

    if (fs.existsSync(target) || fs.existsSync(target + '/')) {
      results.push({
        name,
        source,
        target,
        fromRoot,
        created: false,
        skipped: true,
        reason: 'target already exists',
      });
      continue;
    }

    try {
      await fs.symlink(source, target);
      results.push({ name, source, target, fromRoot, created: true, skipped: false });
    } catch (err) {
      results.push({
        name,
        source,
        target,
        fromRoot,
        created: false,
        skipped: true,
        reason: (err as Error).message,
      });
    }
  }

  return results;
}

export async function createRootSymlinks(
  rootDir: string,
  worktreeRoot: string,
  names: string[]
): Promise<SymlinkResult[]> {
  const results: SymlinkResult[] = [];

  for (const name of names) {
    const source = path.join(rootDir, name);
    const target = path.join(worktreeRoot, name);

    if (!fs.existsSync(source)) {
      continue;
    }

    if (fs.existsSync(target) || fs.existsSync(target + '/')) {
      results.push({
        name,
        source,
        target,
        fromRoot: true,
        created: false,
        skipped: true,
        reason: 'target already exists',
      });
      continue;
    }

    try {
      await fs.symlink(source, target);
      results.push({ name, source, target, fromRoot: true, created: true, skipped: false });
    } catch (err) {
      results.push({
        name,
        source,
        target,
        fromRoot: true,
        created: false,
        skipped: true,
        reason: (err as Error).message,
      });
    }
  }

  return results;
}
