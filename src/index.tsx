import { render } from 'ink';
import { Command } from 'commander';
import React from 'react';
import { App } from './App.js';
import { loadConfig, type LanguageSetting } from './config.js';
import { setLocale } from './i18n.js';

const program = new Command();

program
  .name('lazyworktree')
  .description('Worktree 管理器 - 创建、查看、清理 worktree 分组')
  .option('--projects <list>', 'Comma-separated project entries (e.g. api-model,ypzb:bugfix-room)')
  .option('--feature <branch>', 'Default feature branch name')
  .option('--language <locale>', 'UI language: auto, zh, or en')
  .option('--hide-bottom-line', 'Hide the lazygit-style keybinding bottom line')
  .parse();

const opts = program.opts();

function parseProjects(raw: string | undefined): { name: string; branch?: string }[] {
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

const hasCreateArgs = Boolean(opts.projects || opts.feature);
const config = loadConfig(process.cwd(), {
  language: opts.language as LanguageSetting | undefined,
  hideBottomLine: Boolean(opts.hideBottomLine),
});

setLocale(config.language);

render(
  React.createElement(App, {
    prefilledProjects: parseProjects(opts.projects),
    prefilledFeature: opts.feature || '',
    startMode: hasCreateArgs ? 'create' : 'menu',
    config,
  })
);
