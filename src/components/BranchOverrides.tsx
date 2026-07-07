import React, { useState, useMemo } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput, UnorderedList } from '@inkjs/ui';
import type { GitProject } from '../types.js';
import { t } from '../i18n.js';
import { validateBranchName } from '../validation.js';

interface Props {
  projects: GitProject[];
  feature: string;
  overrides: Map<string, string>;
  onConfirm: (overrides: Map<string, string>) => void;
  onBack: () => void;
}

export function BranchOverrides({ projects, feature, overrides, onConfirm, onBack }: Props): React.ReactElement {
  const [editing, setEditing] = useState<string | null>(null);
  const [localOverrides, setLocalOverrides] = useState(overrides);
  const [error, setError] = useState<string | null>(null);

  const items = useMemo(
    () => projects.map((p) => {
      const branch = localOverrides.get(p.name) || feature;
      const overridden = localOverrides.has(p.name);
      return `${p.name}: ${branch}${overridden ? t('overridden') : ''}`;
    }),
    [projects, localOverrides, feature]
  );

  useInput((_input, key) => {
    if (key.escape) {
      if (editing) setEditing(null);
      else onBack();
    }
  });

  if (editing) {
    return (
      <Box flexDirection="column">
        <Text bold>{t('editBranchFor')}{editing}</Text>
        <Text dimColor>{t('editBranchHint')}</Text>
        <Text>{' '}</Text>
        <TextInput
          defaultValue={localOverrides.get(editing) || feature}
          onChange={() => {}}
          onSubmit={(v: string) => {
            const next = new Map(localOverrides);
            const value = v.trim();
            if (value) {
              const validation = validateBranchName(value);
              if (!validation.ok) {
                setError(t(validation.code || 'validation.branchInvalidChars'));
                return;
              }
              next.set(editing, value);
            }
            else next.delete(editing);
            setError(null);
            setLocalOverrides(next);
            setEditing(null);
          }}
        />
        {error && <Text color="red">{error}</Text>}
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{t('branchOverrides')}</Text>
      <Text dimColor>{t('defaultBranch')}{feature}</Text>
      <Text dimColor>{t('branchOverrideHint')}</Text>
      <Text>{' '}</Text>
      <UnorderedList>
        {items.map((item, i) => (
          <UnorderedList.Item key={i}><Text>{item}</Text></UnorderedList.Item>
        ))}
      </UnorderedList>
      <Text>{' '}</Text>
      <Text dimColor>{t('enterContinue')}</Text>
      <OverrideInput
        projects={projects}
        onEdit={(name) => setEditing(name)}
        onConfirm={() => {
          for (const project of projects) {
            const branch = localOverrides.get(project.name) || feature;
            const validation = validateBranchName(branch);
            if (!validation.ok) {
              setError(`${project.name}: ${t(validation.code || 'validation.branchInvalidChars')}`);
              return;
            }
          }
          setError(null);
          onConfirm(localOverrides);
        }}
      />
      {error && <Text color="red">{error}</Text>}
    </Box>
  );
}

function OverrideInput({
  projects,
  onEdit,
  onConfirm,
}: {
  projects: GitProject[];
  onEdit: (name: string) => void;
  onConfirm: () => void;
}): React.ReactElement {
  return (
    <TextInput
      placeholder={t('overridePlaceholder')}
      defaultValue=""
      onChange={() => {}}
      onSubmit={(v: string) => {
        const trimmed = v.trim();
        if (!trimmed) { onConfirm(); return; }
        const match = projects.find((p) => p.name === trimmed || p.name.startsWith(trimmed));
        if (match) onEdit(match.name);
      }}
    />
  );
}
