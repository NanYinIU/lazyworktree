import { describe, it, expect } from 'vitest';
import { applyEvent, countFinished, initialProgressState } from '../activity.js';

describe('activity reducer', () => {
  it('opens a group on project:start and dedupes', () => {
    let s = initialProgressState();
    s = applyEvent(s, { type: 'project:start', project: 'api' }, 1);
    s = applyEvent(s, { type: 'project:start', project: 'api' }, 2);
    expect(s.groups).toHaveLength(1);
    expect(s.groups[0].status).toBe('running');
  });

  it('appends step lines and finalizes status across the lifecycle', () => {
    let s = initialProgressState();
    s = applyEvent(s, { type: 'project:start', project: 'web' }, 0);
    s = applyEvent(s, { type: 'project:step', project: 'web', step: 'git fetch', status: 'done' }, 120);
    s = applyEvent(s, { type: 'project:step', project: 'web', step: 'worktree add', status: 'running' }, 300);
    s = applyEvent(s, { type: 'project:success', project: 'web' }, 500);

    expect(s.groups[0].lines.map((l) => l.label)).toEqual(['git fetch', 'worktree add']);
    expect(s.groups[0].lines[0]).toMatchObject({ status: 'done', ms: 120 });
    expect(s.groups[0].status).toBe('success');
    expect(countFinished(s)).toBe(1);
  });

  it('routes (root) steps into the root group', () => {
    let s = initialProgressState();
    s = applyEvent(s, { type: 'project:step', project: '(root)', step: 'symlink CLAUDE.md', status: 'done' }, 10);
    expect(s.root?.lines).toHaveLength(1);
    expect(s.groups).toHaveLength(0);
  });

  it('marks failed and skipped groups as finished', () => {
    let s = initialProgressState();
    s = applyEvent(s, { type: 'project:start', project: 'a' }, 0);
    s = applyEvent(s, { type: 'project:failed', project: 'a', reason: 'boom' }, 5);
    s = applyEvent(s, { type: 'project:start', project: 'b' }, 6);
    s = applyEvent(s, { type: 'project:skipped', project: 'b', reason: 'exists' }, 7);
    expect(countFinished(s)).toBe(2);
  });
});
