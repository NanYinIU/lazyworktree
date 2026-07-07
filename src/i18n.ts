export type Locale = 'zh' | 'en';

function detectLocale(): Locale {
  const candidates = [
    process.env.LANG,
    process.env.LC_ALL,
    process.env.LC_MESSAGES,
  ].filter(Boolean);

  for (const c of candidates) {
    if (c!.toLowerCase().startsWith('zh')) return 'zh';
    if (c!.toLowerCase().startsWith('en')) return 'en';
  }

  try {
    const intl = Intl.DateTimeFormat().resolvedOptions().locale;
    if (intl.toLowerCase().startsWith('zh')) return 'zh';
  } catch {
    // ignore
  }

  return 'en';
}

let activeLocale: Locale = detectLocale();

export function setLocale(locale: Locale | 'auto'): void {
  activeLocale = locale === 'auto' ? detectLocale() : locale;
}

export function getLocale(): Locale {
  return activeLocale;
}

type StringMap = Record<string, { zh: string; en: string }>;

const strings: StringMap = {
  // Action Menu
  appTitle: { zh: 'Worktree 管理器', en: 'Worktree Manager' },
  selectAction: { zh: '请选择操作:', en: 'Select an action:' },
  actionCreate: { zh: '创建 worktree 分组', en: 'Create worktree group' },
  actionList: { zh: '查看已有分组', en: 'List worktree groups' },
  actionPrune: { zh: '安全清理 (清除缺失 worktree 的 Git 元数据)', en: 'Safe prune (clean missing worktree metadata)' },
  actionCleanup: { zh: '清理过期 worktree 分组', en: 'Cleanup stale worktree groups' },

  // Project Picker
  selectProjects: { zh: '选择项目', en: 'Select Projects' },
  selectProjectsHint: { zh: 'Space 切换选中, Enter 确认, Esc 返回', en: 'Space to toggle, Enter to confirm, Esc to go back' },

  // Feature Input
  featureBranch: { zh: '功能分支', en: 'Feature Branch' },
  featureBranchHint: { zh: '输入所有项目的默认分支名', en: 'Enter the default branch name for all projects' },
  featureBranchExample: { zh: '(例如 feature/foo, bugfix/room-switch)', en: '(e.g. feature/foo, bugfix/room-switch)' },
  enterContinue: { zh: 'Enter 继续, Esc 返回', en: 'Enter to continue, Esc to go back' },

  // Target Dir Input
  targetDir: { zh: '目标目录', en: 'Target Directory' },
  targetDirHint: { zh: 'Worktree 分组将创建在: ', en: 'Worktree group will be created at: ' },
  targetDirHint2: { zh: '按 Enter 使用默认名称, 或输入自定义名称', en: 'Press Enter to accept default, or type a custom name' },

  // Branch Overrides
  branchOverrides: { zh: '分支覆盖', en: 'Branch Overrides' },
  defaultBranch: { zh: '默认分支: ', en: 'Default branch: ' },
  branchOverrideHint: { zh: '输入项目名编辑其分支, Enter 确认全部', en: 'Type a project name to edit its branch, Enter to confirm all' },
  editBranchFor: { zh: '编辑分支: ', en: 'Edit branch for ' },
  editBranchHint: { zh: 'Enter 保存, Esc 取消', en: 'Enter to save, Esc to cancel' },
  overridden: { zh: ' (已覆盖)', en: ' (overridden)' },
  overridePlaceholder: { zh: '项目名编辑分支 (Enter 确认全部)...', en: 'Project name to edit (Enter to confirm all)...' },

  // Plan Preview
  planPreview: { zh: '执行计划预览', en: 'Plan Preview' },
  worktreeRoot: { zh: 'Worktree 根目录: ', en: 'Worktree root: ' },
  branch: { zh: '分支', en: 'branch' },
  source: { zh: '来源', en: 'source' },
  target: { zh: '目标', en: 'target' },
  create: { zh: '创建', en: 'CREATE' },
  skip: { zh: '跳过', en: 'SKIP' },
  confirmYN: { zh: '确认执行? (y/n)', en: 'Confirm? (y/n)' },
  dirtyWarning: { zh: '工作区有未提交改动', en: 'WARNING: working tree is dirty' },
  branchExistsMatch: { zh: '分支已存在 (与基准分支一致)', en: 'branch exists (matches base)' },
  branchExistsDiverge: { zh: '分支已存在 (与基准分支有差异)', en: 'branch exists (diverges from base)' },
  planSummary: { zh: '摘要', en: 'Summary' },
  planSkipped: { zh: '跳过', en: 'Skipped' },
  planWarnings: { zh: '警告', en: 'Warnings' },
  planReady: { zh: '可创建', en: 'Ready' },
  planSectionSkipped: { zh: '将跳过', en: 'Will be skipped' },
  planSectionWarnings: { zh: '需要注意', en: 'Needs attention' },
  planSectionReady: { zh: '准备创建', en: 'Ready to create' },

  // Run Progress
  execProgress: { zh: '执行进度', en: 'Execution Progress' },
  working: { zh: '处理中...', en: 'Working...' },
  done: { zh: '完成!', en: 'Done!' },

  // Result Summary (create)
  results: { zh: '执行结果', en: 'Results' },
  success: { zh: '成功', en: 'Success' },
  skipped: { zh: '跳过', en: 'Skipped' },
  failed: { zh: '失败', en: 'Failed' },
  skippedSymlinks: { zh: '跳过的软链接:', en: 'Skipped symlinks:' },
  nextStep: { zh: '下一步:', en: 'Next step:' },
  pressAnyKey: { zh: '按任意键退出', en: 'Press any key to exit' },
  pressAnyKeyBack: { zh: '按任意键返回', en: 'Press any key to go back' },

  // Group List
  groupListTitle: { zh: 'Worktree 分组列表', en: 'Worktree Groups' },
  noGroups: { zh: '未找到 zh-* worktree 分组', en: 'No zh-* worktree groups found.' },
  daysOld: { zh: '天', en: 'd old' },
  projects: { zh: '个项目', en: 'project(s)' },
  pressEscBack: { zh: '按 Esc 返回', en: 'Press Esc to go back' },
  badgeDirty: { zh: '脏', en: 'dirty' },
  badgeClean: { zh: '干净', en: 'clean' },
  badgeUnmerged: { zh: '未合并', en: 'unmerged' },
  badgeMissing: { zh: '缺失', en: 'missing' },
  badgeStale: { zh: '过期', en: 'stale' },
  merged: { zh: '已合并', en: 'merged' },

  // Safe Prune
  safePruneTitle: { zh: '安全清理预览', en: 'Safe Prune Preview' },
  safePruneDesc: { zh: '将清除缺失 worktree 路径的 Git 元数据', en: 'This will clean Git metadata for missing worktree paths.' },
  safePruneNoDelete: { zh: '不会删除任何真实目录', en: 'No real directories will be deleted.' },
  safePruneScanning: { zh: '安全清理 - 扫描中...', en: 'Safe Prune - Scanning...' },
  safePruneChecking: { zh: '检查 worktree 元数据...', en: 'Checking worktree metadata...' },
  nothingToPrune: { zh: '(无需清理)', en: '(nothing to prune)' },
  allClean: { zh: '无需清理, 一切正常!', en: 'Nothing to prune. All clean!' },
  safePruneError: { zh: '安全清理 - 错误', en: 'Safe Prune - Error' },
  executePrune: { zh: '执行清理? (y/n)', en: 'Execute prune? (y/n)' },
  safePruneExec: { zh: '安全清理执行中', en: 'Safe Prune Execution' },
  pruning: { zh: '清理中...', en: 'Pruning...' },
  pruneResults: { zh: '清理结果', en: 'Prune Results' },
  pruned: { zh: '已清理', en: 'Pruned' },
  nothingNeededPrune: { zh: '无需清理', en: 'Nothing needed pruning.' },

  // Cleanup
  cleanupTitle: { zh: '清理过期分组', en: 'Cleanup Stale Groups' },
  cleanupHint: { zh: '显示 14 天以上的分组. Space 切换, Enter 确认.', en: 'Showing groups >= 14 days old. Space to toggle, Enter to confirm.' },
  cleanupHint2: { zh: '脏/未合并分组可见但不预选', en: 'dirty/unmerged groups are shown but not pre-selected.' },
  noStaleGroups: { zh: '未找到过期分组 (14 天以上)', en: 'No stale worktree groups found (>= 14 days old).' },
  cleanupPreviewTitle: { zh: '清理预览', en: 'Cleanup Preview' },
  cleanupPreviewDesc: { zh: '将执行以下 worktree remove 命令:', en: 'The following worktree remove commands will be executed:' },
  cleanupNoForce: { zh: '不使用 --force. 脏 worktree 会失败并保留.', en: 'No --force will be used. Dirty worktrees will fail and be kept.' },
  confirmCleanup: { zh: '确认清理? (y/n)', en: 'Confirm cleanup? (y/n)' },
  cleanupExec: { zh: '清理执行中', en: 'Cleanup Execution' },
  cleaningUp: { zh: '清理中...', en: 'Cleaning up...' },
  cleanupResults: { zh: '清理结果', en: 'Cleanup Results' },
  removed: { zh: '已移除', en: 'Removed' },
  removedGroupDirs: { zh: '已删除分组目录:', en: 'Removed group dirs:' },
  removedRootSymlinks: { zh: '已删除根软链接:', en: 'Removed root symlinks:' },
  nothingToCleanup: { zh: '无需清理', en: 'Nothing to clean up.' },
  willFailDirty: { zh: '脏工作区 - 可能失败', en: 'WARNING: dirty - will likely fail' },
  branchMerged: { zh: '分支已合并到基准分支', en: 'branch merged to base' },

  // Branch Confirm
  branchConfirmTitle: { zh: '已合并分支删除 (二次确认)', en: 'Merged Branch Deletion (Second Confirmation)' },
  branchConfirmDesc: { zh: '这些分支已合并到基准分支 且 worktree 已移除', en: 'These branches were merged to the base branch and their worktrees were removed.' },
  branchConfirmHint: { zh: 'Space 切换, Enter 删除选中分支', en: 'Space to toggle, Enter to delete selected branches.' },
  noMergedBranches: { zh: '没有需要删除的已合并分支', en: 'No merged branches to delete.' },
  branchDeleteTitle: { zh: '分支删除', en: 'Branch Deletion' },
  deletingBranches: { zh: '删除分支中...', en: 'Deleting branches...' },
  branchDeleteResults: { zh: '分支删除结果', en: 'Branch Deletion Results' },
  deleted: { zh: '已删除', en: 'Deleted' },
  noBranchesDeleted: { zh: '未删除分支', en: 'No branches deleted.' },
  reviewMergedBranches: { zh: '按任意键查看可删除的已合并分支', en: 'Press any key to review merged branches for deletion' },
  enterToContinue: { zh: '按 Enter 继续', en: 'Press Enter to continue' },

  // Force Retry
  forceRetryTitle: { zh: '强制删除确认', en: 'Force Remove Confirmation' },
  forceRetryDesc: { zh: '以下 worktree 因含未提交/未跟踪文件而无法普通移除', en: 'The following worktrees failed to remove because they contain modified or untracked files' },
  forceRetryWarn: { zh: '使用 --force 将丢弃这些文件并强制移除, 不可恢复!', en: 'Using --force will discard those files and force-remove. This is irreversible!' },
  forceRetryConfirm: { zh: '确认强制删除? (y/n)', en: 'Confirm force remove? (y/n)' },
  forceRetryExec: { zh: '强制删除执行中', en: 'Force Remove Execution' },
  forceRetrying: { zh: '强制删除中...', en: 'Force removing...' },

  // Common
  scanning: { zh: '扫描中...', en: 'Scanning...' },
  buildingPlan: { zh: '构建计划中...', en: 'Building plan...' },
  enterToSelect: { zh: '输入筛选, 按 Enter 开始选择', en: 'Type to filter, press Enter to start selecting' },
  showing: { zh: '显示', en: 'Showing' },
  of: { zh: '/', en: 'of' },
  projectsWord: { zh: '个项目', en: 'projects' },
  filtered: { zh: '已筛选', en: 'Filtered' },
  noProjectsMatch: { zh: '没有匹配的项目', en: 'No projects match filter.' },
  searchAgain: { zh: '按 Esc 重新搜索', en: 'Press Esc to search again' },
  searchPlaceholder: { zh: '搜索项目... (Enter 选择)', en: 'Search projects... (Enter to select)' },
  featurePlaceholder: { zh: 'feature/...', en: 'feature/...' },
  targetDirPlaceholder: { zh: '目录名...', en: 'directory name...' },

  // Lazygit-style help and keybindings
  helpTitle: { zh: '快捷键帮助', en: 'Keybindings' },
  helpHint: { zh: '按 ? 关闭帮助', en: 'Press ? to close help' },
  helpGroupUniversal: { zh: '通用', en: 'Universal' },
  helpGroupDashboard: { zh: 'Dashboard', en: 'Dashboard' },
  helpGroupCreateFlow: { zh: '创建流程', en: 'Create Flow' },
  keyHelp: { zh: '帮助', en: 'help' },
  keyBack: { zh: '返回', en: 'back' },
  keyConfirm: { zh: '确认', en: 'confirm' },
  keyMove: { zh: '移动选择', en: 'move selection' },
  keyFilter: { zh: '过滤', en: 'filter' },
  keyNewWorktree: { zh: '新建分组', en: 'new worktree group' },
  keyCleanupGroup: { zh: '清理选中分组', en: 'cleanup selected group' },
  keyPrune: { zh: '安全清理元数据', en: 'safe prune metadata' },
  keyRefresh: { zh: '刷新', en: 'refresh' },
  dashboardTitle: { zh: 'Worktree Dashboard', en: 'Worktree Dashboard' },
  dashboardHint: { zh: '仿 lazygit: 选择分组后直接触发上下文操作', en: 'lazygit-style: select a group and run contextual actions' },
  dashboardSelected: { zh: '当前分组', en: 'Selected group' },
  dashboardNoSelection: { zh: '没有可选分组', en: 'No group selected' },
  dashboardPath: { zh: '路径', en: 'path' },
  dashboardAge: { zh: '年龄', en: 'age' },
  dashboardItems: { zh: '项目', en: 'items' },
  dashboardRefreshDone: { zh: '已刷新 worktree 分组', en: 'Worktree groups refreshed' },
  dashboardFilter: { zh: '过滤', en: 'Filter' },
  dashboardFilterHint: { zh: '输入过滤条件，Enter 应用，Esc 取消', en: 'Type to filter, Enter to apply, Esc to cancel' },
  dashboardNoFilteredGroups: { zh: '没有匹配的 worktree 分组', en: 'No worktree groups match the filter' },
  inlineCleanupTitle: { zh: '确认清理分组', en: 'Confirm Cleanup Group' },
  inlineCleanupMessage: { zh: '将移除该分组下所有 worktree。脏工作区会失败并保留。', en: 'This will remove all worktrees in this group. Dirty worktrees will fail and be kept.' },
  inlinePruneTitle: { zh: '确认安全清理', en: 'Confirm Safe Prune' },
  inlinePruneMessage: { zh: '将清除缺失 worktree 路径的 Git 元数据，不删除真实目录。', en: 'This will clean Git metadata for missing worktree paths. No real directories will be deleted.' },
  keyRepair: { zh: '修复软链', en: 'repair symlinks' },
  keyQuit: { zh: '退出', en: 'quit' },
  settingsTitle: { zh: '设置', en: 'Settings' },
  settingsLanguage: { zh: '语言', en: 'language' },
  settingsBottomLine: { zh: '页脚键位提示', en: 'footer key hints' },
  settingsSymlinks: { zh: '软链名单', en: 'symlink names' },
  settingsPreset: { zh: '预设', en: 'preset' },
  settingsEdit: { zh: '编辑（逗号分隔）', en: 'edit (comma-separated)' },
  settingsSaved: { zh: '已写入配置文件', en: 'written to config file' },
  conflictTitle: { zh: '同分支已检出（阻断）', en: 'branch already checked out (blocking)' },
  conflictBranchAt: { zh: '已经检出于', en: 'already checked out at' },
  actionSettings: { zh: '设置', en: 'Settings' },
  helpPageHint: { zh: '↑↓ 滚动, ? 关闭', en: 'Up/Down to scroll, ? to close' },

  // Validation
  'validation.branchRequired': { zh: '请输入分支名', en: 'branch name is required' },
  'validation.branchStartsWithDash': { zh: '分支名不能以 - 开头', en: 'branch name must not start with -' },
  'validation.branchSlashBoundary': { zh: '分支名不能以 / 开头或结尾', en: 'branch name must not start or end with /' },
  'validation.branchDoubleSlash': { zh: '分支名不能包含 //', en: 'branch name must not contain //' },
  'validation.branchDotDot': { zh: '分支名不能包含 ..', en: 'branch name must not contain ..' },
  'validation.branchAtBrace': { zh: '分支名不能包含 @{', en: 'branch name must not contain @{' },
  'validation.branchAt': { zh: '分支名不能是 @', en: 'branch name must not be @' },
  'validation.branchEndsWithDot': { zh: '分支名不能以 . 结尾', en: 'branch name must not end with .' },
  'validation.branchBadPathPart': { zh: '分支路径片段不能以 . 开头或以 .lock 结尾', en: 'branch path parts must not start with . or end with .lock' },
  'validation.branchInvalidChars': { zh: '分支名包含 Git ref 不允许的字符', en: 'branch name contains characters Git refs do not allow' },
  'validation.directoryRequired': { zh: '请输入目录名', en: 'directory name is required' },
  'validation.directoryDot': { zh: '目录名不能是 . 或 ..', en: 'directory name must not be . or ..' },
  'validation.directorySeparator': { zh: '目录名不能包含路径分隔符', en: 'directory name must not contain path separators' },
  'validation.directoryControlChars': { zh: '目录名不能包含控制字符', en: 'directory name contains control characters' },

  // Repair symlinks
  repairTitle: { zh: '修复软链', en: 'Repair Symlinks' },
  repairDone: { zh: '软链修复完成', en: 'Symlink repair complete' },
  repairCreated: { zh: '已创建', en: 'Created' },
  repairSkipped: { zh: '已跳过', en: 'Skipped' },
  repairGroups: { zh: '已修复分组', en: 'Groups repaired' },
};

export type I18nKey = keyof typeof strings;

export function t(key: I18nKey): string {
  const entry = strings[key];
  if (!entry) return key;
  return entry[activeLocale];
}
