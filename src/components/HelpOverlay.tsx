import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { KeybindingGroup } from '../keybindings.js';
import { t } from '../i18n.js';

interface Props {
  title: string;
  groups: KeybindingGroup[];
}

const MAX_VISIBLE_ROWS = 15;

export function HelpOverlay({ title, groups }: Props): React.ReactElement {
  const [scrollOffset, setScrollOffset] = useState(0);
  const totalRows = groups.reduce((sum, group) => sum + 1 + group.bindings.length, 0);

  useInput((_input, key) => {
    if (totalRows <= MAX_VISIBLE_ROWS) return;
    if (key.upArrow) setScrollOffset((offset) => Math.max(0, offset - 1));
    if (key.downArrow) setScrollOffset((offset) => Math.min(totalRows - MAX_VISIBLE_ROWS, offset + 1));
  });

  const allRows: React.ReactElement[] = [];
  for (const group of groups) {
    allRows.push(
      <Text key={group.titleKey} bold color="cyan">{t(group.titleKey)}</Text>
    );
    for (const binding of group.bindings) {
      allRows.push(
        <Box key={`${group.titleKey}-${binding.key}-${binding.labelKey}`} flexDirection="row">
          <Box width={10}>
            <Text color="cyan">{binding.key}</Text>
          </Box>
          <Text>{t(binding.labelKey)}</Text>
        </Box>
      );
    }
  }

  const visibleRows = allRows.slice(scrollOffset, scrollOffset + MAX_VISIBLE_ROWS);

  return (
    <Box flexDirection="column" borderStyle="double" borderColor="cyan" paddingX={2} paddingY={1}>
      <Text bold>{t('helpTitle')} - {title}</Text>
      <Text dimColor>{t('helpPageHint')}</Text>
      <Text>{' '}</Text>
      {visibleRows}
      {totalRows > MAX_VISIBLE_ROWS && (
        <Text dimColor>{scrollOffset + 1}-{Math.min(scrollOffset + MAX_VISIBLE_ROWS, totalRows)}/{totalRows}</Text>
      )}
    </Box>
  );
}
