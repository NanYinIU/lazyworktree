import type { WorktreeGroup } from '../types.js';

export interface GroupDashboardSummary {
  dirty: number;
  unmerged: number;
  stale: number;
}

export function summarizeGroups(groups: WorktreeGroup[]): GroupDashboardSummary {
  return {
    dirty: groups.filter((group) => group.hasDirty).length,
    unmerged: groups.filter((group) => group.hasUnmerged).length,
    stale: groups.filter((group) => group.recommendedForCleanup).length,
  };
}

export function filterGroups(groups: WorktreeGroup[], query: string): WorktreeGroup[] {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return groups;

  return groups.filter((group) => {
    if (group.name.toLowerCase().includes(normalized)) return true;
    if (group.rootPath.toLowerCase().includes(normalized)) return true;

    return group.items.some((item) => {
      return item.projectName.toLowerCase().includes(normalized) ||
        (item.branch ?? '').toLowerCase().includes(normalized);
    });
  });
}
