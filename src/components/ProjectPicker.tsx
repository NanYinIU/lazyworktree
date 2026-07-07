import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { GitProject } from '../types.js';
import { t } from '../i18n.js';
import { SelectList } from './ui/SelectList.js';

interface Props {
  projects: GitProject[];
  preselected: string[];
  onSelect: (selected: GitProject[]) => void;
  onBack: () => void;
}

export function ProjectPicker({ projects, preselected, onSelect, onBack }: Props): React.ReactElement {
  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  const defaultSelected = projects.flatMap((p, i) => (preselected.includes(p.name) ? [i] : []));

  return (
    <Box flexDirection="column">
      <Text bold>{t('selectProjects')}</Text>
      <Text dimColor>{t('selectProjectsHint')}</Text>
      <Text>{' '}</Text>
      <SelectList
        items={projects}
        getKey={(p) => p.name}
        multi
        defaultSelected={defaultSelected}
        renderItem={(p) => <Text bold>{p.name}</Text>}
        onSubmit={(indices) => onSelect(indices.map((i) => projects[i]))}
      />
    </Box>
  );
}
