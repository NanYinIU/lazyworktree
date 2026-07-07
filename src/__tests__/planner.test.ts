import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import { execa } from 'execa';
import { parseProjectSpecs, buildPlan } from '../planner.js';
import type { GitProject } from '../types.js';

let tmpDir: string;
let rootDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-plan-'));
  rootDir = path.join(tmpDir, 'zh');
  fs.mkdirpSync(rootDir);
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

async function initRepo(name: string): Promise<GitProject> {
  const repoPath = path.join(rootDir, name);
  fs.mkdirpSync(repoPath);
  await execa('git', ['init'], { cwd: repoPath });
  await execa('git', ['config', 'user.email', 'test@test.com'], { cwd: repoPath });
  await execa('git', ['config', 'user.name', 'Test'], { cwd: repoPath });
  fs.writeFileSync(path.join(repoPath, 'README.md'), '# test');
  await execa('git', ['add', '.'], { cwd: repoPath });
  await execa('git', ['commit', '-m', 'init'], { cwd: repoPath });
  return { name, path: repoPath };
}

describe('parseProjectSpecs', () => {
  it('parses simple project list', () => {
    const specs = parseProjectSpecs('api-model,ypzb,room-portal');
    expect(specs).toEqual([
      { name: 'api-model', branch: undefined },
      { name: 'ypzb', branch: undefined },
      { name: 'room-portal', branch: undefined },
    ]);
  });

  it('parses branch overrides', () => {
    const specs = parseProjectSpecs('api-model,ypzb:bugfix-room,room-portal');
    expect(specs).toEqual([
      { name: 'api-model', branch: undefined },
      { name: 'ypzb', branch: 'bugfix-room' },
      { name: 'room-portal', branch: undefined },
    ]);
  });

  it('returns empty for undefined input', () => {
    expect(parseProjectSpecs(undefined)).toEqual([]);
  });

  it('filters empty entries', () => {
    const specs = parseProjectSpecs('api-model,,room-portal');
    expect(specs).toHaveLength(2);
  });
});

describe('buildPlan', () => {
  const targetDirName = 'zh-feature-foo';

  it('uses default feature branch for all projects', async () => {
    const projA = await initRepo('proj-a');
    const projB = await initRepo('proj-b');
    const overrides = new Map<string, string>();

    const plan = await buildPlan([projA, projB], 'feature/test', overrides, rootDir, 'zh-feature-test');

    expect(plan).toHaveLength(2);
    expect(plan[0].branch).toBe('feature/test');
    expect(plan[1].branch).toBe('feature/test');
  });

  it('applies per-project branch override', async () => {
    const projA = await initRepo('proj-a');
    const projB = await initRepo('proj-b');
    const overrides = new Map([['proj-b', 'bugfix/custom']]);

    const plan = await buildPlan([projA, projB], 'feature/test', overrides, rootDir, 'zh-feature-test');

    expect(plan[0].branch).toBe('feature/test');
    expect(plan[1].branch).toBe('bugfix/custom');
  });

  it('derives target paths correctly', async () => {
    const projA = await initRepo('proj-a');
    const overrides = new Map<string, string>();

    const plan = await buildPlan([projA], 'feature/foo', overrides, rootDir, targetDirName);

    expect(plan[0].targetPath).toBe(path.join(tmpDir, targetDirName, 'proj-a'));
  });

  it('marks target directory conflicts as targetExists', async () => {
    const projA = await initRepo('proj-a');
    const overrides = new Map<string, string>();

    const worktreeRoot = path.join(tmpDir, targetDirName);
    fs.mkdirpSync(path.join(worktreeRoot, 'proj-a'));

    const plan = await buildPlan([projA], 'feature/foo', overrides, rootDir, targetDirName);

    expect(plan[0].targetExists).toBe(true);
  });

  it('detects dirty working tree', async () => {
    const projA = await initRepo('proj-a');
    fs.writeFileSync(path.join(projA.path, 'untracked.txt'), 'test');
    const overrides = new Map<string, string>();

    const plan = await buildPlan([projA], 'feature/foo', overrides, rootDir, targetDirName);

    expect(plan[0].dirty).toBe(true);
  });

  it('reports clean working tree', async () => {
    const projA = await initRepo('proj-a');
    const overrides = new Map<string, string>();

    const plan = await buildPlan([projA], 'feature/foo', overrides, rootDir, targetDirName);

    expect(plan[0].dirty).toBe(false);
  });

  it('rejects invalid target directory names', async () => {
    const projA = await initRepo('proj-a');
    const overrides = new Map<string, string>();

    await expect(buildPlan([projA], 'feature/foo', overrides, rootDir, '../escape')).rejects.toThrow(
      'Invalid target directory'
    );
  });

  it('rejects invalid branch names', async () => {
    const projA = await initRepo('proj-a');
    const overrides = new Map<string, string>();

    await expect(buildPlan([projA], 'feature//foo', overrides, rootDir, targetDirName)).rejects.toThrow(
      'Invalid branch'
    );
  });

  it('resolves sourceRef from per-project baseBranch override (wins over default)', async () => {
    const proj = await initRepo('proj-a');
    const plan = await buildPlan([proj], 'feature/x', new Map(), rootDir, 'zh-x', {
      default: 'auto',
      projects: { 'proj-a': 'origin/main' },
    });
    expect(plan[0].sourceRef).toBe('origin/main');
  });

  it('uses explicit default baseBranch when not auto', async () => {
    const proj = await initRepo('proj-a');
    const plan = await buildPlan([proj], 'feature/x', new Map(), rootDir, 'zh-x', {
      default: 'origin/main',
      projects: {},
    });
    expect(plan[0].sourceRef).toBe('origin/main');
  });

  it('falls back to detected branch when default is auto', async () => {
    // initRepo creates a repo with no origin → detectDefaultBranch falls back to origin/master
    const proj = await initRepo('proj-a');
    const plan = await buildPlan([proj], 'feature/x', new Map(), rootDir, 'zh-x');
    expect(plan[0].sourceRef).toBe('origin/master');
  });

  it('flags conflictPath when the branch is already checked out in another worktree', async () => {
    const proj = await initRepo('proj-a');
    // 在 proj-a 里建一个检出 feature/dup 的 worktree
    const wtPath = path.join(tmpDir, 'wt-dup', 'proj-a');
    await fs.ensureDir(path.dirname(wtPath));
    await execa('git', ['worktree', 'add', '-b', 'feature/dup', wtPath], { cwd: proj.path });

    const plan = await buildPlan([proj], 'feature/dup', new Map(), rootDir, 'zh-dup');
    expect(plan[0].conflictPath).toBeTruthy();
    expect(plan[0].conflictPath).toContain('wt-dup');
  });

  it('leaves conflictPath unset when the branch is not checked out elsewhere', async () => {
    const proj = await initRepo('proj-a');
    const plan = await buildPlan([proj], 'feature/fresh', new Map(), rootDir, 'zh-fresh');
    expect(plan[0].conflictPath).toBeUndefined();
  });
});
