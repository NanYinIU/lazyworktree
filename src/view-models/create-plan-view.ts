import type { PlanItem } from '../types.js';

export interface PlanViewModel {
  skipped: PlanItem[];
  warnings: PlanItem[];
  ready: PlanItem[];
  summary: {
    total: number;
    skipped: number;
    warnings: number;
    ready: number;
  };
}

export function buildPlanView(items: PlanItem[]): PlanViewModel {
  const skipped = items.filter((item) => item.targetExists);
  const warnings = items.filter((item) => !item.targetExists && (item.dirty || item.branchDiverges));
  const ready = items.filter((item) => !item.targetExists && !item.dirty && !item.branchDiverges);

  return {
    skipped,
    warnings,
    ready,
    summary: {
      total: items.length,
      skipped: skipped.length,
      warnings: warnings.length,
      ready: ready.length,
    },
  };
}
