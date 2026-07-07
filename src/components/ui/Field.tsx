import React from 'react';
import { Box, Text } from 'ink';

interface Props {
  label: string;
  hint?: string;
  error?: string | null;
  /** 实时预览（如「将创建 ../wt/foo/」），所见即所得。 */
  preview?: string;
  /** 表单输入控件（TextInput 等）。 */
  children: React.ReactNode;
}

/** Form field shell with consistent label, hint, error, and preview layout. */
export function Field({ label, hint, error, preview, children }: Props): React.ReactElement {
  return (
    <Box flexDirection="column">
      <Text bold>{label}</Text>
      {hint ? <Text dimColor>{hint}</Text> : null}
      {children}
      {error ? <Text color="red">{error}</Text> : null}
      {preview ? <Text dimColor>{preview}</Text> : null}
    </Box>
  );
}
