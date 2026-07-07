import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { execa } from 'execa';
import { buildPlan } from '../planner.js';
import { executePlan } from '../executor.js';
import { discoverWorktreeGroups } from '../worktree-manager.js';
import { executeCleanup } from '../manage-executor.js';
import { appendInfoExclude } from '../git.js';
import { DEFAULT_SYMLINK_NAMES } from '../config.js';
import type { GitProject } from '../types.js';

let tmpDir: string;
let rootDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-integration-'));
  rootDir = path.join(tmpDir, 'zh');
  await fs.ensureDir(rootDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

async function git(cwd: string, args: string[]): Promise<string> {
  const result = await execa('git', args, { cwd });
  return result.stdout.trim();
}

async function initProjectWithOrigin(name: string): Promise<GitProject> {
  const repoPath = path.join(rootDir, name);
  const originPath = path.join(tmpDir, `${name}.git`);

  await fs.ensureDir(repoPath);
  await git(repoPath, ['init', '--initial-branch=master']);
  await git(repoPath, ['config', 'user.email', 'test@test.com']);
  await git(repoPath, ['config', 'user.name', 'Test']);
  await fs.writeFile(path.join(repoPath, 'README.md'), '# test');
  await git(repoPath, ['add', '.']);
  await git(repoPath, ['commit', '-m', 'init']);
  await git(tmpDir, ['clone', '--bare', repoPath, originPath]);
  await git(repoPath, ['remote', 'add', 'origin', originPath]);
  await git(repoPath, ['fetch', 'origin', 'master']);

  return { name, path: repoPath };
}

async function pushRemoteOnlyBranch(project: GitProject, branch: string): Promise<void> {
  await git(project.path, ['checkout', '-b', branch]);
  await fs.writeFile(path.join(project.path, 'remote-branch.txt'), branch);
  await git(project.path, ['add', '.']);
  await git(project.path, ['commit', '-m', `add ${branch}`]);
  await git(project.path, ['push', '-u', 'origin', branch]);
  await git(project.path, ['checkout', 'master']);
  await git(project.path, ['branch', '-D', branch]);
  await git(project.path, ['update-ref', '-d', `refs/remotes/origin/${branch}`]);
}

describe('lazyworktree integration', () => {
  it('creates a real git worktree from origin/master and root symlinks', async () => {
    const project = await initProjectWithOrigin('api-model');
    await fs.writeFile(path.join(rootDir, 'AGENTS.md'), '# Agents');

    const plan = await buildPlan([project], 'feature/integration', new Map(), rootDir, 'zh-feature-integration');
    const events: string[] = [];
    const result = await executePlan(plan, rootDir, DEFAULT_SYMLINK_NAMES, (event) => {
      if (event.type === 'project:step') events.push(`${event.project}:${event.status}:${event.step}`);
    });

    const worktreePath = path.join(tmpDir, 'zh-feature-integration', 'api-model');
    expect(result.failed).toEqual([]);
    expect(result.successes).toEqual(['api-model']);
    expect(await fs.pathExists(path.join(worktreePath, 'README.md'))).toBe(true);
    expect(await git(worktreePath, ['branch', '--show-current'])).toBe('feature/integration');
    expect((await fs.lstat(path.join(tmpDir, 'zh-feature-integration', 'AGENTS.md'))).isSymbolicLink()).toBe(true);
    expect(events.some((event) => event.includes('worktree created'))).toBe(true);
    // Symlink names are written to .git/info/exclude so new worktrees stay clean.
    expect(await git(worktreePath, ['status', '--porcelain'])).toBe('');
  });

  it('creates a tracked local branch from a same-name remote branch', async () => {
    const project = await initProjectWithOrigin('remote-proj');
    await pushRemoteOnlyBranch(project, 'feature/remote-existing');

    const plan = await buildPlan([project], 'feature/remote-existing', new Map(), rootDir, 'zh-feature-remote-existing');
    const result = await executePlan(plan, rootDir, DEFAULT_SYMLINK_NAMES, () => {});

    const worktreePath = path.join(tmpDir, 'zh-feature-remote-existing', 'remote-proj');
    expect(result.failed).toEqual([]);
    expect(await fs.pathExists(path.join(worktreePath, 'remote-branch.txt'))).toBe(true);
    expect(await git(worktreePath, ['branch', '--show-current'])).toBe('feature/remote-existing');
    expect(await git(worktreePath, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}'])).toBe('origin/feature/remote-existing');
  });

  it('appends symlink names to the worktree info/exclude idempotently', async () => {
    const project = await initProjectWithOrigin('exclude-proj');
    const wtPath = path.join(tmpDir, 'wt-exclude', 'exclude-proj');
    await fs.ensureDir(path.dirname(wtPath));
    await git(project.path, ['worktree', 'add', '-b', 'feature/exclude', wtPath]);

    const r1 = await appendInfoExclude(wtPath, ['.claude', 'CLAUDE.md']);
    expect(r1.ok).toBe(true);

    const rel = await git(wtPath, ['rev-parse', '--git-path', 'info/exclude']);
    const excludePath = path.isAbsolute(rel) ? rel : path.join(wtPath, rel);
    const content = fs.readFileSync(excludePath, 'utf8');
    expect(content).toContain('.claude');
    expect(content).toContain('CLAUDE.md');

    const before = fs.readFileSync(excludePath, 'utf8');
    await appendInfoExclude(wtPath, ['.claude', 'CLAUDE.md']);
    expect(fs.readFileSync(excludePath, 'utf8')).toBe(before); // 幂等
  });

  it('discovers and removes a created zh worktree group', async () => {
    const project = await initProjectWithOrigin('room-server');

    const plan = await buildPlan([project], 'feature/cleanup', new Map(), rootDir, 'zh-feature-cleanup');
    await executePlan(plan, rootDir, DEFAULT_SYMLINK_NAMES, () => {});

    const groups = await discoverWorktreeGroups(rootDir);
    expect(groups.map((group) => group.name)).toContain('zh-feature-cleanup');
    const group = groups.find((g) => g.name === 'zh-feature-cleanup')!;
    const selected = new Set([group.rootPath]);
    const result = await executeCleanup(groups, selected, DEFAULT_SYMLINK_NAMES, () => {});

    expect(result.failed).toEqual([]);
    expect(result.removed.map((item) => item.projectName)).toEqual(['room-server']);
    expect(await fs.pathExists(path.join(tmpDir, 'zh-feature-cleanup', 'room-server'))).toBe(false);
    expect(await fs.pathExists(path.join(tmpDir, 'zh-feature-cleanup'))).toBe(false);
  });
});

  it('cleans up a prunable (missing directory) worktree via git worktree prune', async () => {
    const project = await initProjectWithOrigin('api-model');

    // Create a real worktree group.
    const plan = await buildPlan([project], 'feature/prunable', new Map(), rootDir, 'zh-feature-prunable');
    await executePlan(plan, rootDir, DEFAULT_SYMLINK_NAMES, () => {});

    const worktreePath = path.join(tmpDir, 'zh-feature-prunable', 'api-model');
    expect(await fs.pathExists(worktreePath)).toBe(true);

    // Simulate a prunable worktree by deleting the physical directory.
    // (git metadata remains, making it "prunable")
    await fs.remove(worktreePath);
    expect(await fs.pathExists(worktreePath)).toBe(false);

    // Discover the group with missing=true.
    const groups = await discoverWorktreeGroups(rootDir);
    const group = groups.find((g) => g.name === 'zh-feature-prunable');
    expect(group).toBeDefined();
    expect(group!.items.some((i) => i.missing)).toBe(true);

    // executeCleanup prunes stale metadata.
    const selected = new Set([group!.rootPath]);
    const result = await executeCleanup(groups, selected, DEFAULT_SYMLINK_NAMES, () => {});

    expect(result.failed).toEqual([]);
    expect(result.removed.length).toBe(1);
    expect(result.removed[0].projectName).toBe('api-model');

    // The prunable entry is removed from git worktree list.
    const remaining = await git(project.path, ['worktree', 'list']);
    expect(remaining).not.toContain('zh-feature-prunable');
  });
