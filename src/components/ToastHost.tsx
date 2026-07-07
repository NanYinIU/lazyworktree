import React from 'react';
import { Box } from 'ink';
import { StatusMessage } from '@inkjs/ui';
import type { ToastMessage } from '../types.js';

export function ToastHost({ toasts }: { toasts: ToastMessage[] }): React.ReactElement | null {
  if (toasts.length === 0) return null;

  const variant = (level: ToastMessage['level']): 'info' | 'warning' | 'error' =>
    level === 'error' ? 'error' : level === 'warning' ? 'warning' : 'info';

  return (
    <Box flexDirection="column" marginBottom={1}>
      {toasts.map((t) => (
        <Box key={t.id}>
          <StatusMessage variant={variant(t.level)}>{t.text}</StatusMessage>
        </Box>
      ))}
    </Box>
  );
}
