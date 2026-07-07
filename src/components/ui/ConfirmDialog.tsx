import React from 'react';
import { Box, Text, useInput } from 'ink';

interface Props {
  title: string;
  message: string;
  /** 危险操作（删除 dirty/unmerged 等）用红色边框警示。 */
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Confirmation dialog where Enter confirms and Esc or q cancels. */
export function ConfirmDialog({ title, message, danger, onConfirm, onCancel }: Props): React.ReactElement {
  const color = danger ? 'red' : 'yellow';

  useInput((input, key) => {
    if (key.escape) { onCancel(); return; }
    if (input === 'y' || input === 'Y') { onConfirm(); return; }
    if (input === 'n' || input === 'N') { onCancel(); return; }
  });

  return (
    <Box flexDirection="column" borderStyle="double" borderColor={color} paddingX={2} paddingY={1}>
      <Text bold color={color}>{title}</Text>
      <Text>{message}</Text>
      <Text dimColor>y · n/Esc</Text>
    </Box>
  );
}
