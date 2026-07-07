import path from 'node:path';
import fs from 'fs-extra';
import type { GitProject, ProjectSpec, PlanItem } from './types.js';
import { getWorktreeRoot, getWorktreeProjectPath } from './fs-layout.js';
import { hasLocalBranch, getRefCommit, isDirty, detectDefaultBranch, findBranchCheckout } from './git.js';
import { validateBranchName, validateDirectoryName } from './validation.js';

export interface BaseBranchConfig {
  default: string;
  projects: Record<string, string>;
}

const AUTO_BASE: BaseBranchConfig = { default: 'auto', projects: {} };

/** 解析某项目的基准分支：项目级覆盖 > 全局显式 default > 自动探测。 */
async function resolveBaseRef(project: GitProject, baseBranch: BaseBranchConfig): Promise<string> {
  const override = baseBranch.projects[project.name] || (baseBranch.default !== 'auto' ? baseBranch.default : null);
  return override ?? (await detectDefaultBranch(project.path));
}

export function parseProjectSpecs(raw: string | undefined): ProjectSpec[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((spec) => {
      const [name, branch] = spec.split(':');
      return { name: name.trim(), branch: branch?.trim() || undefined };
    });
}

export async function buildPlan(
  selectedProjects: GitProject[],
  feature: string,
  overrides: Map<string, string>,
  rootDir: string,
  targetDirName: string,
  baseBranch: BaseBranchConfig = AUTO_BASE
): Promise<PlanItem[]> {
  const targetValidation = validateDirectoryName(targetDirName);
  if (!targetValidation.ok) {
    throw new Error(`Invalid target directory "${targetDirName}": ${targetValidation.code}`);
  }

  const parentDir = path.dirname(rootDir);
  const worktreeRoot = getWorktreeRoot(parentDir, targetDirName);
  const items: PlanItem[] = [];

  for (const project of selectedProjects) {
    const branch = overrides.get(project.name) || feature;
    const branchValidation = validateBranchName(branch);
    if (!branchValidation.ok) {
      throw new Error(`Invalid branch "${branch}" for ${project.name}: ${branchValidation.code}`);
    }

    const targetPath = getWorktreeProjectPath(worktreeRoot, project.name);
    const targetExists = fs.existsSync(targetPath);

    const branchExists = await hasLocalBranch(project.path, branch);
    const sourceRef = await resolveBaseRef(project, baseBranch);

    let branchDiverges = false;
    if (branchExists) {
      const branchCommit = await getRefCommit(project.path, branch);
      const baseCommit = await getRefCommit(project.path, sourceRef);
      if (branchCommit.ok && baseCommit.ok) {
        branchDiverges = branchCommit.value !== baseCommit.value;
      }
    }

    const dirty = await isDirty(project.path);
    const conflictPath = (await findBranchCheckout(project.path, branch, targetPath)) ?? undefined;

    items.push({
      project,
      branch,
      targetPath,
      sourceRef,
      dirty,
      branchExists,
      branchDiverges,
      targetExists,
      conflictPath,
      status: 'pending',
      symlinks: [],
    });
  }

  return items;
}
