import { describe, it, expect } from 'vitest';
import { filterGroups, summarizeGroups } from '../view-models/group-dashboard-view.js';
import type { WorktreeGroup } from '../types.js';

function group(name: string, fields: Partial<WorktreeGroup> = {}): WorktreeGroup {
  return {
    rootPath: `/tmp/${name}`,
    name,
    items: [],
    ageDays: 0,
    hasDirty: false,
    hasUnmerged: false,
    hasMissing: false,
    recommendedForCleanup: false,
    ...fields,
  };
}

describe('group dashboard view model', () => {
  it('summarizes dashboard warning counters', () => {
    const summary = summarizeGroups([
      group('dirty', { hasDirty: true }),
      group('unmerged', { hasUnmerged: true }),
      group('stale', { recommendedForCleanup: true }),
    ]);

    expect(summary).toEqual({ dirty: 1, unmerged: 1, stale: 1 });
  });

  it('filters by group name, path, project name, and branch', () => {
    const groups = [
      group('zh-room-fix', {
        items: [
          {
            projectName: 'room-server',
            projectPath: '/repo/room-server',
            worktreePath: '/tmp/zh-room-fix/room-server',
            branch: 'feature/live-room',
            head: 'abc',
            dirty: false,
            missing: false,
            mergedToBase: false,
            lastCommitDate: null,
          },
        ],
      }),
      group('zh-search-fix', {
        rootPath: '/workspace/search-target',
      }),
    ];

    expect(filterGroups(groups, 'room').map((g) => g.name)).toEqual(['zh-room-fix']);
    expect(filterGroups(groups, 'live-room').map((g) => g.name)).toEqual(['zh-room-fix']);
    expect(filterGroups(groups, 'search-target').map((g) => g.name)).toEqual(['zh-search-fix']);
    expect(filterGroups(groups, '').map((g) => g.name)).toEqual(['zh-room-fix', 'zh-search-fix']);
  });
});
