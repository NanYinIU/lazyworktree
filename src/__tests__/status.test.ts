import { describe, it, expect } from 'vitest';
import { GROUP_HEALTH, STEP_STATE, SUB_STEP, worstHealth, groupHealths } from '../ui/status.js';
import type { WorktreeGroup } from '../types.js';

function makeGroup(over: Partial<WorktreeGroup>): WorktreeGroup {
  return {
    rootPath: '/x',
    name: 'x',
    items: [],
    ageDays: 1,
    hasDirty: false,
    hasUnmerged: false,
    hasMissing: false,
    hasBehindRemote: false,
    recommendedForCleanup: false,
    ...over,
  };
}

describe('status vocabulary', () => {
  it('every group health carries a dot glyph, a color and a label key (dual encoding)', () => {
    for (const [name, meta] of Object.entries(GROUP_HEALTH)) {
      expect(meta.dot.length, `${name} dot`).toBeGreaterThan(0);
      expect(meta.color.length, `${name} color`).toBeGreaterThan(0);
      expect(meta.labelKey, `${name} labelKey`).toBeTruthy();
    }
  });

  it('every step state carries an icon and a color', () => {
    for (const meta of Object.values(STEP_STATE)) {
      expect(meta.icon.length).toBeGreaterThan(0);
      expect(meta.color.length).toBeGreaterThan(0);
    }
    for (const meta of Object.values(SUB_STEP)) {
      expect(meta.icon.length).toBeGreaterThan(0);
    }
  });

  it('worstHealth ranks unmerged > dirty > behind > missing > stale > clean', () => {
    expect(worstHealth(makeGroup({ hasUnmerged: true, hasDirty: true }))).toBe('unmerged');
    expect(worstHealth(makeGroup({ hasDirty: true, hasBehindRemote: true }))).toBe('dirty');
    expect(worstHealth(makeGroup({ hasBehindRemote: true, recommendedForCleanup: true }))).toBe('behind');
    expect(worstHealth(makeGroup({ hasMissing: true, recommendedForCleanup: true }))).toBe('missing');
    expect(worstHealth(makeGroup({ recommendedForCleanup: true }))).toBe('stale');
    expect(worstHealth(makeGroup({}))).toBe('clean');
  });

  it('groupHealths lists all hit flags, severity-descending', () => {
    expect(groupHealths(makeGroup({}))).toEqual([]);
    expect(groupHealths(makeGroup({ hasDirty: true, recommendedForCleanup: true }))).toEqual(['dirty', 'stale']);
    expect(groupHealths(makeGroup({ hasBehindRemote: true, hasUnmerged: true }))).toEqual(['unmerged', 'behind']);
  });
});
