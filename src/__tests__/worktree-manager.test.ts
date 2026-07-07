import { describe, it, expect } from 'vitest';
import { parseWorktreePorcelain } from '../git.js';
import { isWorktreeGroup, classifyWorktreePath, computeGroupAgeDays, STALE_DAYS } from '../worktree-manager.js';
import type { WorktreeItem } from '../types.js';

describe('parseWorktreePorcelain', () => {
  it('parses simple worktree list output', () => {
    const output = [
      'worktree /Users/test/zh/api-model',
      'HEAD 44edbec891',
      'branch refs/heads/master',
      '',
      'worktree /Users/test/zh-feature-foo/api-model',
      'HEAD 61a7be4c9c',
      'branch refs/heads/feature/foo',
      '',
    ].join('\n');

    const result = parseWorktreePorcelain(output);
    expect(result).toHaveLength(2);
    expect(result[0].path).toBe('/Users/test/zh/api-model');
    expect(result[0].branch).toBe('master');
    expect(result[0].head).toBe('44edbec891');
    expect(result[0].detached).toBe(false);
    expect(result[1].path).toBe('/Users/test/zh-feature-foo/api-model');
    expect(result[1].branch).toBe('feature/foo');
  });

  it('handles detached HEAD', () => {
    const output = [
      'worktree /Users/test/zh-detached/api-model',
      'HEAD 44edbec891',
      'detached',
      '',
    ].join('\n');

    const result = parseWorktreePorcelain(output);
    expect(result).toHaveLength(1);
    expect(result[0].detached).toBe(true);
    expect(result[0].branch).toBeNull();
  });

  it('handles output without trailing newline', () => {
    const output = 'worktree /Users/test/zh/api-model\nHEAD 44edbec891\nbranch refs/heads/master';
    const result = parseWorktreePorcelain(output);
    expect(result).toHaveLength(1);
    expect(result[0].path).toBe('/Users/test/zh/api-model');
    expect(result[0].branch).toBe('master');
  });
});

describe('isWorktreeGroup', () => {
  it('matches the dynamic <rootName>- prefix', () => {
    expect(isWorktreeGroup('zh-feature-foo', 'zh')).toBe(true);
    expect(isWorktreeGroup('zh-ai-pet-v3', 'zh')).toBe(true);
    expect(isWorktreeGroup('search-server-feature-x', 'search-server')).toBe(true);
  });

  it('rejects foreign or empty prefixes', () => {
    expect(isWorktreeGroup('stream-domain-switch', 'zh')).toBe(false);
    expect(isWorktreeGroup('zh', 'zh')).toBe(false);
    expect(isWorktreeGroup('', 'zh')).toBe(false);
    expect(isWorktreeGroup('zh-hello', 'search-server')).toBe(false);
  });
});

describe('classifyWorktreePath', () => {
  const rootDir = '/Users/test/zh';

  it('classifies main repo path', () => {
    expect(classifyWorktreePath('/Users/test/zh', rootDir)).toBe('mainRepo');
    expect(classifyWorktreePath('/Users/test/zh/api-model', rootDir)).toBe('mainRepo');
  });

  it('classifies group paths under the current repo prefix', () => {
    expect(classifyWorktreePath('/Users/test/zh-feature-foo/api-model', rootDir)).toBe('group');
    expect(classifyWorktreePath('/Users/test/zh-ai-pet-v3/room-server', rootDir)).toBe('group');
  });

  it('classifies foreign and random paths as other', () => {
    expect(classifyWorktreePath('/Users/test/stream-domain-switch/api-model', rootDir)).toBe('other');
    expect(classifyWorktreePath('/some/random/path', rootDir)).toBe('other');
  });

  it('uses the directory name dynamically for non-zh repos', () => {
    expect(classifyWorktreePath('/srv/search-server-feat/api', '/srv/search-server')).toBe('group');
    expect(classifyWorktreePath('/srv/zh-feat/api', '/srv/search-server')).toBe('other');
  });
});

describe('computeGroupAgeDays', () => {
  it('returns max age from lastCommitDate', () => {
    const now = Math.floor(Date.now() / 1000);
    const items: WorktreeItem[] = [
      {
        projectName: 'proj-a',
        projectPath: '/test/proj-a',
        worktreePath: '/test/wt/proj-a',
        branch: 'feature/foo',
        head: 'abc',
        dirty: false,
        missing: false,
        mergedToBase: false,
        lastCommitDate: now - 5 * 86400,
      },
      {
        projectName: 'proj-b',
        projectPath: '/test/proj-b',
        worktreePath: '/test/wt/proj-b',
        branch: 'feature/foo',
        head: 'def',
        dirty: false,
        missing: false,
        mergedToBase: false,
        lastCommitDate: now - 20 * 86400,
      },
    ];
    const age = computeGroupAgeDays(items);
    expect(age).toBe(20);
  });

  it('returns 0 when no commit dates', () => {
    const items: WorktreeItem[] = [
      {
        projectName: 'proj-a',
        projectPath: '/test/proj-a',
        worktreePath: '/nonexistent/proj-a',
        branch: 'feature/foo',
        head: 'abc',
        dirty: false,
        missing: true,
        mergedToBase: false,
        lastCommitDate: null,
      },
    ];
    const age = computeGroupAgeDays(items);
    expect(age).toBe(0);
  });
});

describe('STALE_DAYS', () => {
  it('is 14', () => {
    expect(STALE_DAYS).toBe(14);
  });
});
