import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import fs from 'fs-extra';
import os from 'node:os';
import {
  scanGitProjects,
  sanitizeFeature,
  featureToDirectoryName,
  getWorktreeRoot,
  getWorktreeProjectPath,
  createSymlinks,
  createRootSymlinks,
} from '../fs-layout.js';

let tmpDir: string;

const NAMES = ['.claude', '.agents', '.factory', 'CLAUDE.md', 'AGENTS.md'];

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-test-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('scanGitProjects', () => {
  it('discovers only first-level directories with .git', () => {
    fs.mkdirpSync(path.join(tmpDir, 'proj-a', '.git'));
    fs.mkdirpSync(path.join(tmpDir, 'proj-b', '.git'));
    fs.mkdirpSync(path.join(tmpDir, 'not-a-repo'));
    fs.mkdirpSync(path.join(tmpDir, 'proj-a', 'sub', '.git'));

    const projects = scanGitProjects(tmpDir);
    const names = projects.map((p) => p.name);
    expect(names).toEqual(['proj-a', 'proj-b']);
    expect(names).not.toContain('not-a-repo');
  });

  it('sorts by directory name', () => {
    fs.mkdirpSync(path.join(tmpDir, 'zebra', '.git'));
    fs.mkdirpSync(path.join(tmpDir, 'alpha', '.git'));
    fs.mkdirpSync(path.join(tmpDir, 'mid', '.git'));

    const projects = scanGitProjects(tmpDir);
    expect(projects.map((p) => p.name)).toEqual(['alpha', 'mid', 'zebra']);
  });
});

describe('sanitizeFeature', () => {
  it('replaces slashes with dashes', () => {
    expect(sanitizeFeature('feature/foo')).toBe('feature-foo');
  });

  it('replaces backslashes, underscores, and spaces', () => {
    expect(sanitizeFeature('feature/foo bar_baz')).toBe('feature-foo-bar-baz');
    expect(sanitizeFeature('feat\\bar')).toBe('feat-bar');
  });

  it('collapses consecutive dashes', () => {
    expect(sanitizeFeature('feature//foo')).toBe('feature-foo');
    expect(sanitizeFeature('feature/ /foo')).toBe('feature-foo');
  });

  it('trims leading and trailing dashes', () => {
    expect(sanitizeFeature('/feature/foo/')).toBe('feature-foo');
    expect(sanitizeFeature(' /foo ')).toBe('foo');
  });

  it('returns a stable fallback when the feature sanitizes to empty', () => {
    expect(sanitizeFeature('___')).toBe('worktree');
    expect(sanitizeFeature('...')).toBe('worktree');
  });
});

describe('featureToDirectoryName', () => {
  it('prefixes with root name', () => {
    expect(featureToDirectoryName('feature/foo', 'zh')).toBe('zh-feature-foo');
  });

  it('handles complex feature names', () => {
    expect(featureToDirectoryName('feature/foo bar_baz', 'zh')).toBe('zh-feature-foo-bar-baz');
  });
});

describe('getWorktreeRoot', () => {
  it('joins parent dir with directory name', () => {
    const result = getWorktreeRoot('/parent', 'zh-feature-foo');
    expect(result).toBe(path.join('/parent', 'zh-feature-foo'));
  });
});

describe('getWorktreeProjectPath', () => {
  it('joins worktree root with project name', () => {
    const result = getWorktreeProjectPath('/parent/zh-feature-foo', 'api-model');
    expect(result).toBe(path.join('/parent/zh-feature-foo', 'api-model'));
  });
});

describe('createSymlinks', () => {
  it('creates symlinks for existing project-level sources', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const originalPath = path.join(rootDir, 'original');
    const worktreePath = path.join(tmpDir, 'worktree', 'original');
    fs.mkdirpSync(originalPath);
    fs.mkdirpSync(worktreePath);
    fs.mkdirpSync(rootDir);
    fs.writeFileSync(path.join(originalPath, 'CLAUDE.md'), '# Claude');
    fs.mkdirpSync(path.join(originalPath, '.claude'));

    const results = await createSymlinks(originalPath, worktreePath, rootDir, NAMES);
    const created = results.filter((r) => r.created);
    expect(created.map((r) => r.name).sort()).toEqual(['.claude', 'CLAUDE.md']);
    expect(created.every((r) => !r.fromRoot)).toBe(true);
  });

  it('falls back to root-level sources when project-level does not exist', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const originalPath = path.join(rootDir, 'proj-a');
    const worktreePath = path.join(tmpDir, 'worktree', 'proj-a');
    fs.mkdirpSync(originalPath);
    fs.mkdirpSync(worktreePath);
    fs.mkdirpSync(rootDir);
    fs.writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Root Claude');
    fs.mkdirpSync(path.join(rootDir, '.agents'));

    const results = await createSymlinks(originalPath, worktreePath, rootDir, NAMES);
    const created = results.filter((r) => r.created);
    expect(created.map((r) => r.name).sort()).toEqual(['.agents', 'CLAUDE.md']);
    expect(created.every((r) => r.fromRoot)).toBe(true);
  });

  it('prefers project-level over root-level', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const originalPath = path.join(rootDir, 'proj-a');
    const worktreePath = path.join(tmpDir, 'worktree', 'proj-a');
    fs.mkdirpSync(originalPath);
    fs.mkdirpSync(worktreePath);
    fs.mkdirpSync(rootDir);
    fs.writeFileSync(path.join(originalPath, 'CLAUDE.md'), '# Project Claude');
    fs.writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Root Claude');

    const results = await createSymlinks(originalPath, worktreePath, rootDir, NAMES);
    const claudeResult = results.find((r) => r.name === 'CLAUDE.md');
    expect(claudeResult?.created).toBe(true);
    expect(claudeResult?.fromRoot).toBe(false);
  });

  it('skips symlinks when target already exists', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const originalPath = path.join(rootDir, 'original');
    const worktreePath = path.join(tmpDir, 'worktree', 'original');
    fs.mkdirpSync(originalPath);
    fs.mkdirpSync(worktreePath);
    fs.mkdirpSync(rootDir);
    fs.writeFileSync(path.join(originalPath, 'CLAUDE.md'), '# Claude');
    fs.writeFileSync(path.join(worktreePath, 'CLAUDE.md'), '# Existing');

    const results = await createSymlinks(originalPath, worktreePath, rootDir, NAMES);
    const claudeResult = results.find((r) => r.name === 'CLAUDE.md');
    expect(claudeResult?.skipped).toBe(true);
    expect(claudeResult?.created).toBe(false);
    expect(claudeResult?.reason).toBe('target already exists');
  });

  it('does nothing when neither project nor root source exists', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const originalPath = path.join(rootDir, 'original');
    const worktreePath = path.join(tmpDir, 'worktree', 'original');
    fs.mkdirpSync(originalPath);
    fs.mkdirpSync(worktreePath);
    fs.mkdirpSync(rootDir);

    const results = await createSymlinks(originalPath, worktreePath, rootDir, NAMES);
    expect(results).toHaveLength(0);
  });
});

describe('createRootSymlinks', () => {
  it('creates symlinks from root dir to worktree root', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const worktreeRoot = path.join(tmpDir, 'zh-feature-foo');
    fs.mkdirpSync(rootDir);
    fs.mkdirpSync(worktreeRoot);
    fs.writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Root');
    fs.mkdirpSync(path.join(rootDir, '.agents'));

    const results = await createRootSymlinks(rootDir, worktreeRoot, NAMES);
    const created = results.filter((r) => r.created);
    expect(created.map((r) => r.name).sort()).toEqual(['.agents', 'CLAUDE.md']);
    expect(created.every((r) => r.fromRoot)).toBe(true);
  });

  it('skips when target already exists', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const worktreeRoot = path.join(tmpDir, 'zh-feature-foo');
    fs.mkdirpSync(rootDir);
    fs.mkdirpSync(worktreeRoot);
    fs.writeFileSync(path.join(rootDir, 'CLAUDE.md'), '# Root');
    fs.writeFileSync(path.join(worktreeRoot, 'CLAUDE.md'), '# Existing');

    const results = await createRootSymlinks(rootDir, worktreeRoot, NAMES);
    const claudeResult = results.find((r) => r.name === 'CLAUDE.md');
    expect(claudeResult?.skipped).toBe(true);
    expect(claudeResult?.reason).toBe('target already exists');
  });

  it('does nothing for non-existent root sources', async () => {
    const rootDir = path.join(tmpDir, 'zh');
    const worktreeRoot = path.join(tmpDir, 'zh-feature-foo');
    fs.mkdirpSync(rootDir);
    fs.mkdirpSync(worktreeRoot);

    const results = await createRootSymlinks(rootDir, worktreeRoot, NAMES);
    expect(results).toHaveLength(0);
  });
});
