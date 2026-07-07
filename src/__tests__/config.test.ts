import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import path from 'node:path';
import os from 'node:os';
import fs from 'fs-extra';
import { loadConfig, DEFAULT_SYMLINK_NAMES } from '../config.js';

let tmpDir: string;

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wt-config-'));
});

afterEach(async () => {
  await fs.remove(tmpDir);
});

describe('loadConfig', () => {
  it('uses lazygit-style defaults when no config file exists', () => {
    const config = loadConfig(tmpDir);

    expect(config.language).toBe('auto');
    expect(config.gui.showBottomLine).toBe(true);
    expect(config.symlinks.names).toEqual(DEFAULT_SYMLINK_NAMES);
    expect(config.keybindings.dashboard.newWorktree).toBe('n');
    expect(config.keybindings.universal.quit).toBe('q');
  });

  it('merges local json config and CLI overrides', async () => {
    await fs.writeJson(path.join(tmpDir, '.lazyworktree.json'), {
      language: 'zh',
      keybindings: {
        dashboard: {
          refresh: 'u',
        },
      },
    });

    const config = loadConfig(tmpDir, { language: 'en', hideBottomLine: true });

    expect(config.language).toBe('en');
    expect(config.gui.showBottomLine).toBe(false);
    expect(config.keybindings.dashboard.refresh).toBe('u');
    expect(config.keybindings.dashboard.newWorktree).toBe('n');
  });

  it('falls back for invalid language and empty keybindings', async () => {
    await fs.writeJson(path.join(tmpDir, '.lazyworktree.json'), {
      language: 'fr',
      keybindings: {
        dashboard: {
          refresh: '',
        },
      },
    });

    const config = loadConfig(tmpDir);

    expect(config.language).toBe('auto');
    expect(config.keybindings.dashboard.refresh).toBe('r');
  });

  it('overrides symlink names from config file and dedupes', async () => {
    await fs.writeJson(path.join(tmpDir, '.lazyworktree.json'), {
      symlinks: { names: ['.claude', '.claude', 'CLAUDE.md', '  '] },
    });
    const config = loadConfig(tmpDir);
    expect(config.symlinks.names).toEqual(['.claude', 'CLAUDE.md']);
  });

  it('falls back to default symlink names when config value is invalid', async () => {
    await fs.writeJson(path.join(tmpDir, '.lazyworktree.json'), {
      symlinks: { names: [] },
    });
    const config = loadConfig(tmpDir);
    expect(config.symlinks.names).toEqual(DEFAULT_SYMLINK_NAMES);
  });

  it('merges baseBranch default and per-project overrides', async () => {
    await fs.writeJson(path.join(tmpDir, '.lazyworktree.json'), {
      baseBranch: { default: 'origin/main', projects: { 'search-server': 'origin/main' } },
    });
    const config = loadConfig(tmpDir);
    expect(config.baseBranch.default).toBe('origin/main');
    expect(config.baseBranch.projects).toEqual({ 'search-server': 'origin/main' });
  });

  it('defaults baseBranch to auto with empty projects map', () => {
    expect(loadConfig(tmpDir).baseBranch).toEqual({ default: 'auto', projects: {} });
  });
});
