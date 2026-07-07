import React from 'react';
import { Text } from 'ink';
import type { GroupHealth } from '../../ui/status.js';
import { GROUP_HEALTH } from '../../ui/status.js';
import { t } from '../../i18n.js';

interface Props {
  status: GroupHealth;
}

/** Status badge with a color dot and bracketed text label. */
export function StatusBadge({ status }: Props): React.ReactElement {
  const meta = GROUP_HEALTH[status];
  return <Text color={meta.color}>{meta.dot} [{t(meta.labelKey)}]</Text>;
}
