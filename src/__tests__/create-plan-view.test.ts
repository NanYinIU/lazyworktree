import { describe, it, expect } from 'vitest';
import { buildPlanView } from '../view-models/create-plan-view.js';
import type { PlanItem } from '../types.js';

function item(name: string, fields: Partial<PlanItem>): PlanItem {
  return {
    project: { name, path: `/tmp/${name}` },
    branch: 'feature/foo',
    targetPath: `/tmp/zh-feature/${name}`,
    sourceRef: 'origin/master',
    dirty: false,
    branchExists: false,
    branchDiverges: false,
    targetExists: false,
    status: 'pending',
    symlinks: [],
    ...fields,
  };
}

describe('buildPlanView', () => {
  it('groups create plan items by user attention level', () => {
    const view = buildPlanView([
      item('ready', {}),
      item('dirty', { dirty: true }),
      item('diverged', { branchExists: true, branchDiverges: true }),
      item('skip', { targetExists: true }),
    ]);

    expect(view.ready.map((entry) => entry.project.name)).toEqual(['ready']);
    expect(view.warnings.map((entry) => entry.project.name)).toEqual(['dirty', 'diverged']);
    expect(view.skipped.map((entry) => entry.project.name)).toEqual(['skip']);
    expect(view.summary).toEqual({ total: 4, ready: 1, warnings: 2, skipped: 1 });
  });
});
