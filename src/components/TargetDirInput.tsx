import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { t } from '../i18n.js';
import { validateDirectoryName } from '../validation.js';
import { Field } from './ui/Field.js';

interface Props {
  defaultDirName: string;
  parentDir: string;
  onSubmit: (dirName: string) => void;
  onBack: () => void;
}

export function TargetDirInput({ defaultDirName, parentDir, onSubmit, onBack }: Props): React.ReactElement {
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Field
        label={t('targetDir')}
        hint={t('targetDirHint2')}
        preview={`${t('targetDirHint')}${parentDir}/${defaultDirName}`}
        error={error}
      >
        <TextInput
          placeholder={defaultDirName}
          defaultValue={defaultDirName}
          onChange={() => {}}
          onSubmit={(v: string) => {
            const name = v.trim() || defaultDirName;
            const validation = validateDirectoryName(name);
            if (!validation.ok) {
              setError(t(validation.code || 'validation.directorySeparator'));
              return;
            }
            setError(null);
            onSubmit(name);
          }}
        />
      </Field>
      <Text dimColor>{t('enterContinue')}</Text>
    </Box>
  );
}
