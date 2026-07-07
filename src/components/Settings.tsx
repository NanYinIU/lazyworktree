import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import fs from 'fs-extra';
import path from 'node:path';
import type { Locale } from '../i18n.js';
import { setLocale, getLocale, t } from '../i18n.js';
import { DEFAULT_SYMLINK_NAMES } from '../config.js';
import { Field } from './ui/Field.js';

interface Props {
  cwd: string;
  showBottomLine: boolean;
  symlinkNames: string[];
  onToggleBottomLine: () => void;
  onSymlinkNamesChange: (names: string[]) => void;
  onBack: () => void;
}

const CONFIG_FILE = '.lazyworktree.json';

/** Symlink presets shown in Settings. */
const PRESETS: { name: string; names: string[] }[] = [
  { name: 'Claude Code', names: ['.claude', 'CLAUDE.md'] },
  { name: 'Codex', names: ['AGENTS.md', '.agents'] },
  { name: 'Factory Droid', names: ['.factory'] },
  { name: 'All', names: [...DEFAULT_SYMLINK_NAMES] },
];

function matchPreset(names: string[]): string {
  const set = new Set(names);
  for (const p of PRESETS) {
    if (p.names.length === names.length && p.names.every((n) => set.has(n))) return p.name;
  }
  return 'custom';
}

/** Settings screen for language, footer hints, and symlink names. */
export function Settings({ cwd, showBottomLine, symlinkNames, onToggleBottomLine, onSymlinkNamesChange, onBack }: Props): React.ReactElement {
  const [saved, setSaved] = useState(false);
  const [mode, setMode] = useState<'idle' | 'edit'>('idle');
  const [draft, setDraft] = useState(symlinkNames.join(', '));
  const configPath = path.join(cwd, CONFIG_FILE);

  const persist = (patch: { language?: Locale; showBottomLine?: boolean; symlinks?: string[] }): void => {
    const existing = fs.existsSync(configPath) ? fs.readJsonSync(configPath) : {};
    const next: Record<string, unknown> = { ...existing };
    if (patch.language !== undefined) next.language = patch.language;
    if (patch.showBottomLine !== undefined) {
      next.gui = { ...((existing.gui as Record<string, unknown>) || {}), showBottomLine: patch.showBottomLine };
    }
    if (patch.symlinks !== undefined) {
      next.symlinks = { ...((existing.symlinks as Record<string, unknown>) || {}), names: patch.symlinks };
    }
    fs.writeJsonSync(configPath, next, { spaces: 2 });
    setSaved(true);
  };

  useInput((input, key) => {
    if (mode === 'edit') {
      if (key.escape) { setDraft(symlinkNames.join(', ')); setMode('idle'); }
      return; // TextInput handles character input while editing.
    }
    if (key.escape) { onBack(); return; }
    if (input === 'l' || input === 'L') {
      const order: Locale[] = ['en', 'zh'];
      const next = order[(order.indexOf(getLocale()) + 1) % order.length];
      setLocale(next);
      persist({ language: next });
      return;
    }
    if (input === 'b' || input === 'B') {
      onToggleBottomLine();
      persist({ showBottomLine: !showBottomLine });
      return;
    }
    if (input === 'p' || input === 'P') {
      const cur = matchPreset(symlinkNames);
      const idx = PRESETS.findIndex((p) => p.name === cur);
      const next = PRESETS[(idx + 1) % PRESETS.length];
      onSymlinkNamesChange(next.names);
      persist({ symlinks: next.names });
      return;
    }
    if (input === 'e' || input === 'E') {
      setDraft(symlinkNames.join(', '));
      setMode('edit');
    }
  });

  return (
    <Box flexDirection="column">
      <Text bold>{t('settingsTitle')}</Text>
      <Text dimColor>{configPath}</Text>
      <Text>{' '}</Text>
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">L</Text>
        <Text dimColor>{t('settingsLanguage')}: {getLocale()}</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">B</Text>
        <Text dimColor>{t('settingsBottomLine')}: {showBottomLine ? 'on' : 'off'}</Text>
      </Box>
      <Box flexDirection="row" gap={2}>
        <Text color="cyan">P</Text>
        <Text dimColor>{t('settingsPreset')}: {matchPreset(symlinkNames)} → {symlinkNames.join(', ')}</Text>
      </Box>

      {mode === 'edit' ? (
        <Field label={`${t('settingsEdit')} (Enter ${t('keyConfirm')})`}>
          <TextInput
            placeholder=".claude, CLAUDE.md"
            defaultValue={draft}
            onChange={setDraft}
            onSubmit={(v: string) => {
              const names = v.split(',').map((s) => s.trim()).filter(Boolean);
              if (names.length > 0) {
                onSymlinkNamesChange(Array.from(new Set(names)));
                persist({ symlinks: Array.from(new Set(names)) });
              }
              setMode('idle');
            }}
          />
        </Field>
      ) : (
        <Box flexDirection="row" gap={2}>
          <Text color="cyan">E</Text>
          <Text dimColor>{t('settingsEdit')}</Text>
        </Box>
      )}

      <Text>{' '}</Text>
      {saved ? <Text color="green">{t('settingsSaved')}</Text> : null}
    </Box>
  );
}
