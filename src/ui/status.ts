import type { I18nKey } from '../i18n.js';
import { GLYPHS } from './glyphs.js';
import type { WorktreeGroup } from '../types.js';

/** Worktree group health values rendered as a dot, color, and label. */
export type GroupHealth = 'clean' | 'dirty' | 'unmerged' | 'behind' | 'missing' | 'stale';

export interface GroupHealthMeta {
  /** Dot glyph shown before the text label. */
  dot: string;
  color: string;
  labelKey: I18nKey;
}

export const GROUP_HEALTH: Record<GroupHealth, GroupHealthMeta> = {
  clean: { dot: GLYPHS.dot, color: 'green', labelKey: 'badgeClean' },
  dirty: { dot: GLYPHS.dot, color: 'yellow', labelKey: 'badgeDirty' },
  unmerged: { dot: GLYPHS.dot, color: 'red', labelKey: 'badgeUnmerged' },
  behind: { dot: GLYPHS.dot, color: 'blue', labelKey: 'badgeBehind' },
  missing: { dot: GLYPHS.dot, color: 'gray', labelKey: 'badgeMissing' },
  stale: { dot: GLYPHS.dot, color: 'green', labelKey: 'badgeStale' },
};

/** Worst group health for the leading row badge. */
export function worstHealth(g: WorktreeGroup): GroupHealth {
  if (g.hasUnmerged) return 'unmerged';
  if (g.hasDirty) return 'dirty';
  if (g.hasBehindRemote) return 'behind';
  if (g.hasMissing) return 'missing';
  if (g.recommendedForCleanup) return 'stale';
  return 'clean';
}

/** All matching health states in descending severity order. */
export function groupHealths(g: WorktreeGroup): GroupHealth[] {
  const out: GroupHealth[] = [];
  if (g.hasUnmerged) out.push('unmerged');
  if (g.hasDirty) out.push('dirty');
  if (g.hasBehindRemote) out.push('behind');
  if (g.hasMissing) out.push('missing');
  if (g.recommendedForCleanup) out.push('stale');
  return out;
}

/** Activity and step status glyph mapping. */
export type StepState = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface StepStateMeta {
  icon: string;
  color: string;
}

export const STEP_STATE: Record<StepState, StepStateMeta> = {
  pending: { icon: GLYPHS.pending, color: 'gray' },
  running: { icon: GLYPHS.running, color: 'yellow' },
  success: { icon: GLYPHS.check, color: 'green' },
  failed: { icon: GLYPHS.cross, color: 'red' },
  skipped: { icon: GLYPHS.circleSlash, color: 'yellow' },
};

/** Status values for project:step events. */
export type SubStepState = 'running' | 'done' | 'failed' | 'skipped';

export const SUB_STEP: Record<SubStepState, StepStateMeta> = {
  running: { icon: GLYPHS.arrow, color: 'yellow' },
  done: { icon: GLYPHS.check, color: 'green' },
  failed: { icon: GLYPHS.cross, color: 'red' },
  skipped: { icon: GLYPHS.circleSlash, color: 'yellow' },
};
