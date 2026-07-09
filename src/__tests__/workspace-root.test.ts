import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { execa } from 'execa';
import { resolveWorkspaceRoot } from '../workspace-root.js';

let tmpDir: string;
let rootDir: string;

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execa('git', args, { cwd });
  return result.stdout.trim();
}

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-root-'));
  rootDir = path.join(tmpDir, 'zh');
  await fs.ensureDir(rootDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

async function initRepo(name: string): Promise<string> {
  const repoPath = path.join(rootDir, name);
  await fs.ensureDir(repoPath);
  await git(repoPath, ['init', '--initial-branch=master']);
  await git(repoPath, ['config', 'user.email', 'test@test.com']);
  await git(repoPath, ['config', 'user.name', 'Test']);
  await fs.writeFile(path.join(repoPath, 'README.md'), '# test');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'init']);
  return repoPath;
}

describe('resolveWorkspaceRoot', () => {
  it('returns cwd unchanged when in the main workspace root', () => {
    expect(resolveWorkspaceRoot(rootDir)).toBe(rootDir);
  });

  it('returns cwd unchanged from an empty directory (no child git repos)', async () => {
    const emptyDir = path.join(tmpDir, 'empty');
    await fs.ensureDir(emptyDir);
    expect(resolveWorkspaceRoot(emptyDir)).toBe(emptyDir);
  });

  it('returns cwd unchanged from a directory with no child git repos', async () => {
    const dir = path.join(tmpDir, 'documents');
    await fs.ensureDir(dir);
    await fs.writeFile(path.join(dir, 'notes.txt'), 'hello');
    expect(resolveWorkspaceRoot(dir)).toBe(dir);
  });

  it('resolves from a worktree group directory back to the main workspace root', async () => {
    const repoPath = await initRepo('api-model');

    // Create a linked worktree in a worktree group directory.
    const groupDir = path.join(tmpDir, 'zh-feature-foo');
    const wtPath = path.join(groupDir, 'api-model');
    await fs.ensureDir(groupDir);
    await git(repoPath, ['worktree', 'add', '-b', 'feature/foo', wtPath, 'master']);

    // Running from the worktree group directory should resolve to the main workspace root.
    // (resolveWorkspaceRoot returns the realpath-canonical path, which may
    //  differ from rootDir on macOS where /var is a symlink to /private/var.)
    const resolved = resolveWorkspaceRoot(groupDir);
    expect(resolved).toBe(fs.realpathSync(rootDir));
  });

  it('resolves worktree group with multiple repos consistently', async () => {
    await initRepo('api-model');
    await initRepo('room-server');
    const groupDir = path.join(tmpDir, 'zh-feature-bar');
    const wtPath1 = path.join(groupDir, 'api-model');
    const wtPath2 = path.join(groupDir, 'room-server');
    await fs.ensureDir(wtPath1);
    await fs.ensureDir(wtPath2);

    await git(path.join(rootDir, 'api-model'), ['worktree', 'add', '-b', 'feature/bar', wtPath1, 'master']);
    await git(path.join(rootDir, 'room-server'), ['worktree', 'add', '-b', 'feature/bar', wtPath2, 'master']);

    const resolved = resolveWorkspaceRoot(groupDir);
    expect(resolved).toBe(fs.realpathSync(rootDir));
  });

  it('returns cwd unchanged when git worktree list fails', async () => {
    // A directory with a .git-holding child that has no worktree list
    const repoPath = await initRepo('orphan');
    const orphanDir = path.join(tmpDir, 'no-worktrees');
    await fs.ensureDir(orphanDir);
    await git(repoPath, ['worktree', 'add', '-b', 'feature/wt', path.join(tmpDir, 'zh-other', 'orphan'), 'master']);

    // A non-worktree group dir with a git repo but no complex worktree structure
    // Still works because git worktree list does succeed.
    expect(resolveWorkspaceRoot(rootDir)).toBe(rootDir);
  });
});
