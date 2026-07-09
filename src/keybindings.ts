import type { Screen } from './types.js';
import type { I18nKey } from './i18n.js';
import type { AppConfig } from './config.js';

/**
 * 页脚契约角色。决定键位在页脚的排列：主动作 → 导航 → 全局（全局恒最右）。
 */
export type KeyHintRole = 'primary' | 'navigation' | 'global';

export interface Keybinding {
  key: string;
  labelKey: I18nKey;
  role: KeyHintRole;
}

export interface KeybindingGroup {
  titleKey: I18nKey;
  bindings: Keybinding[];
}

const ROLE_ORDER: Record<KeyHintRole, number> = { primary: 0, navigation: 1, global: 2 };

/** 按页脚契约排序：primary → navigation → global。 */
function orderByRole(bindings: Keybinding[]): Keybinding[] {
  return [...bindings].sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
}

function globalBindings(config: AppConfig): Keybinding[] {
  return [
    { key: config.keybindings.universal.help, labelKey: 'keyHelp', role: 'global' },
    { key: config.keybindings.universal.back, labelKey: 'keyBack', role: 'global' },
    { key: config.keybindings.universal.quit, labelKey: 'keyQuit', role: 'global' },
  ];
}

function dashboardBindings(config: AppConfig): Keybinding[] {
  return [
    { key: config.keybindings.dashboard.newWorktree, labelKey: 'keyNewWorktree', role: 'primary' },
    { key: config.keybindings.dashboard.cleanupGroup, labelKey: 'keyCleanupGroup', role: 'primary' },
    { key: config.keybindings.dashboard.prune, labelKey: 'keyPrune', role: 'primary' },
    { key: config.keybindings.dashboard.repair, labelKey: 'keyRepair', role: 'primary' },
    { key: config.keybindings.dashboard.fetch, labelKey: 'keyFetch', role: 'primary' },
    { key: config.keybindings.dashboard.pull, labelKey: 'keyPull', role: 'primary' },
    { key: `${config.keybindings.dashboard.moveDown}/${config.keybindings.dashboard.moveUp}`, labelKey: 'keyMove', role: 'navigation' },
    { key: config.keybindings.dashboard.filter, labelKey: 'keyFilter', role: 'navigation' },
    { key: config.keybindings.dashboard.refresh, labelKey: 'keyRefresh', role: 'navigation' },
  ];
}

export function getHelpKeybindingGroups(screen: Screen, config: AppConfig): KeybindingGroup[] {
  const groups: KeybindingGroup[] = [
    { titleKey: 'helpGroupUniversal', bindings: globalBindings(config) },
  ];

  if (screen === 'groupList') {
    groups.unshift({ titleKey: 'helpGroupDashboard', bindings: dashboardBindings(config) });
    return groups;
  }

  if (isCreateFlowScreen(screen)) {
    groups.unshift({
      titleKey: 'helpGroupCreateFlow',
      bindings: [{ key: config.keybindings.create.confirm, labelKey: 'keyConfirm', role: 'primary' }],
    });
  }

  return groups;
}

/**
 * 当前屏页脚键位，已按页脚契约排序（global 最右）。
 */
export function getScreenKeybindings(screen: Screen, config: AppConfig): Keybinding[] {
  if (screen === 'groupList') {
    return orderByRole([...dashboardBindings(config), ...globalBindings(config)]);
  }

  if (isCreateFlowScreen(screen)) {
    return orderByRole([
      { key: config.keybindings.create.confirm, labelKey: 'keyConfirm', role: 'primary' },
      ...globalBindings(config),
    ]);
  }

  return orderByRole(globalBindings(config));
}

function isCreateFlowScreen(screen: Screen): boolean {
  return screen === 'projectPicker' ||
    screen === 'featureInput' ||
    screen === 'targetDirInput' ||
    screen === 'branchOverrides' ||
    screen === 'planPreview';
}

export function isKey(input: string, configuredKey: string): boolean {
  return input === configuredKey;
}
