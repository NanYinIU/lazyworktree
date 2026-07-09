import path from 'node:path';
import fs from 'fs-extra';
import type { Locale } from './i18n.js';

export type LanguageSetting = Locale | 'auto';

/** Default files and directories mirrored into each worktree. */
export const DEFAULT_SYMLINK_NAMES = ['.claude', '.agents', '.factory', 'CLAUDE.md', 'AGENTS.md'];

export interface KeybindingConfig {
  universal: {
    help: string;
    back: string;
    quit: string;
  };
  create: {
    confirm: string;
  };
  dashboard: {
    moveDown: string;
    moveUp: string;
    filter: string;
    newWorktree: string;
    cleanupGroup: string;
    prune: string;
    refresh: string;
    repair: string;
    fetch: string;
    pull: string;
  };
}

export interface AppConfig {
  language: LanguageSetting;
  gui: {
    showBottomLine: boolean;
  };
  symlinks: {
    /** Files and directories to symlink, ignore, and repair from Settings. */
    names: string[];
  };
  baseBranch: {
    /** 'auto' detects origin/HEAD per project; otherwise use an explicit ref such as 'origin/main'. */
    default: string;
    /** Per-project base branch overrides. */
    projects: Record<string, string>;
  };
  keybindings: KeybindingConfig;
}

export interface ConfigOverrides {
  language?: LanguageSetting;
  hideBottomLine?: boolean;
}

export const DEFAULT_CONFIG: AppConfig = {
  language: 'auto',
  gui: {
    showBottomLine: true,
  },
  symlinks: {
    names: [...DEFAULT_SYMLINK_NAMES],
  },
  baseBranch: {
    default: 'auto',
    projects: {},
  },
  keybindings: {
    universal: {
      help: '?',
      back: 'Esc',
      quit: 'q',
    },
    create: {
      confirm: 'Enter',
    },
    dashboard: {
      moveDown: 'j',
      moveUp: 'k',
      filter: '/',
      newWorktree: 'n',
      cleanupGroup: 'c',
      prune: 'p',
      refresh: 'r',
      repair: 's',
      fetch: 'f',
      pull: 'u',
    },
  },
};

export function loadConfig(cwd: string, overrides: ConfigOverrides = {}): AppConfig {
  const fileConfig = readConfigFile(cwd);
  return normalizeConfig(mergeConfig(DEFAULT_CONFIG, fileConfig), overrides);
}

function readConfigFile(cwd: string): Partial<AppConfig> {
  const configPath = path.join(cwd, '.lazyworktree.json');
  if (!fs.existsSync(configPath)) return {};

  try {
    return fs.readJsonSync(configPath) as Partial<AppConfig>;
  } catch {
    return {};
  }
}

function mergeConfig(base: AppConfig, override: Partial<AppConfig>): AppConfig {
  return {
    language: override.language ?? base.language,
    gui: {
      ...base.gui,
      ...override.gui,
    },
    symlinks: {
      names: Array.isArray(override.symlinks?.names) && override.symlinks!.names.length > 0
        ? override.symlinks!.names
        : base.symlinks.names,
    },
    baseBranch: {
      default: typeof override.baseBranch?.default === 'string' ? override.baseBranch!.default : base.baseBranch.default,
      projects: { ...base.baseBranch.projects, ...(override.baseBranch?.projects || {}) },
    },
    keybindings: {
      universal: {
        ...base.keybindings.universal,
        ...override.keybindings?.universal,
        ...(override.keybindings?.universal || {}),
      },
      create: {
        ...base.keybindings.create,
        ...override.keybindings?.create,
      },
      dashboard: {
        ...base.keybindings.dashboard,
        ...override.keybindings?.dashboard,
      },
    },
  };
}

function normalizeConfig(config: AppConfig, overrides: ConfigOverrides): AppConfig {
  const mergedLanguage = overrides.language ?? config.language;
  const normalizedKeybindings = normalizeKeybindings(config.keybindings, DEFAULT_CONFIG.keybindings);
  const normalizedNames = normalizeSymlinkNames(config.symlinks.names);
  const normalizedBaseDefault = typeof config.baseBranch?.default === 'string' && config.baseBranch.default.trim()
    ? config.baseBranch.default.trim()
    : 'auto';
  const normalizedProjects = config.baseBranch && config.baseBranch.projects && typeof config.baseBranch.projects === 'object'
    ? Object.fromEntries(
        Object.entries(config.baseBranch.projects)
          .filter(([k, v]) => typeof k === 'string' && typeof v === 'string' && v.trim())
          .map(([k, v]) => [k, (v as string).trim()])
      )
    : {};

  return {
    ...config,
    language: isLanguageSetting(mergedLanguage) ? mergedLanguage : DEFAULT_CONFIG.language,
    gui: {
      ...config.gui,
      showBottomLine: overrides.hideBottomLine ? false : config.gui.showBottomLine,
    },
    symlinks: { names: normalizedNames },
    baseBranch: { default: normalizedBaseDefault, projects: normalizedProjects },
    keybindings: normalizedKeybindings,
  };
}

function isLanguageSetting(value: unknown): value is LanguageSetting {
  return value === 'auto' || value === 'zh' || value === 'en';
}

function normalizeKeybindings(config: KeybindingConfig, fallback: KeybindingConfig): KeybindingConfig {
  return {
    universal: {
      help: nonEmpty(config.universal.help, fallback.universal.help),
      back: nonEmpty(config.universal.back, fallback.universal.back),
      quit: nonEmpty(config.universal.quit, fallback.universal.quit),
    },
    create: {
      confirm: nonEmpty(config.create.confirm, fallback.create.confirm),
    },
    dashboard: {
      moveDown: nonEmpty(config.dashboard.moveDown, fallback.dashboard.moveDown),
      moveUp: nonEmpty(config.dashboard.moveUp, fallback.dashboard.moveUp),
      filter: nonEmpty(config.dashboard.filter, fallback.dashboard.filter),
      newWorktree: nonEmpty(config.dashboard.newWorktree, fallback.dashboard.newWorktree),
      cleanupGroup: nonEmpty(config.dashboard.cleanupGroup, fallback.dashboard.cleanupGroup),
      prune: nonEmpty(config.dashboard.prune, fallback.dashboard.prune),
      refresh: nonEmpty(config.dashboard.refresh, fallback.dashboard.refresh),
      repair: nonEmpty(config.dashboard.repair, fallback.dashboard.repair),
      fetch: nonEmpty(config.dashboard.fetch, fallback.dashboard.fetch),
      pull: nonEmpty(config.dashboard.pull, fallback.dashboard.pull),
    },
  };
}

function nonEmpty(value: string, fallback: string): string {
  return value.trim() ? value : fallback;
}

function normalizeSymlinkNames(names: unknown): string[] {
  if (!Array.isArray(names)) return [...DEFAULT_SYMLINK_NAMES];
  const cleaned = names
    .map((n) => (typeof n === 'string' ? n.trim() : ''))
    .filter((n) => n.length > 0);
  // Deduplicate while preserving order.
  return Array.from(new Set(cleaned));
}
