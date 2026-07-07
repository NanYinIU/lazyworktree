import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { TextInput } from '@inkjs/ui';
import { t } from '../i18n.js';
import { validateBranchName } from '../validation.js';
import { Field } from './ui/Field.js';

interface Props {
  defaultValue: string;
  onSubmit: (feature: string) => void;
  onBack: () => void;
}

export function FeatureInput({ defaultValue, onSubmit, onBack }: Props): React.ReactElement {
  const [error, setError] = useState<string | null>(null);

  useInput((_input, key) => {
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column">
      <Field
        label={t('featureBranch')}
        hint={`${t('featureBranchHint')} ${t('featureBranchExample')}`}
        error={error}
      >
        <TextInput
          placeholder={t('featurePlaceholder')}
          defaultValue={defaultValue}
          onChange={() => {}}
          onSubmit={(v: string) => {
            const value = v.trim();
            const validation = validateBranchName(value);
            if (!validation.ok) {
              setError(t(validation.code || 'validation.branchInvalidChars'));
              return;
            }
            setError(null);
            onSubmit(value);
          }}
        />
      </Field>
      <Text dimColor>{t('enterContinue')}</Text>
    </Box>
  );
}
