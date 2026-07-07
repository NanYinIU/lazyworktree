import React from 'react';
import { Box, Text } from 'ink';
import { SelectList } from './ui/SelectList.js';
import { t } from '../i18n.js';

export type HomeAction = 'create' | 'groups' | 'settings';

interface Props {
  onSelect: (action: HomeAction) => void;
}

const ITEMS: { value: HomeAction; labelKey: 'actionCreate' | 'actionList' | 'actionSettings' }[] = [
  { value: 'create', labelKey: 'actionCreate' },
  { value: 'groups', labelKey: 'actionList' },
  { value: 'settings', labelKey: 'actionSettings' },
];

/** Home screen with Create, Groups, and Settings entries. */
export function Home({ onSelect }: Props): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>{t('appTitle')}</Text>
      <Text dimColor>{t('selectAction')}</Text>
      <Text>{' '}</Text>
      <SelectList
        items={ITEMS}
        getKey={(item) => item.value}
        renderItem={(item) => <Text bold>{t(item.labelKey)}</Text>}
        onSelect={(item) => onSelect(item.value)}
      />
    </Box>
  );
}
