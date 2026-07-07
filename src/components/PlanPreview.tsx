import React from 'react';
import { Box, Text } from 'ink';
import { ConfirmInput, Badge } from '@inkjs/ui';
import type { PlanItem } from '../types.js';
import { t } from '../i18n.js';
import { buildPlanView } from '../view-models/create-plan-view.js';

interface Props {
  items: PlanItem[];
  worktreeRoot: string;
  rootName: string;
  feature: string;
  onConfirm: () => void;
  onBack: () => void;
}

export function PlanPreview({ items, worktreeRoot, onConfirm, onBack }: Props): React.ReactElement {
  const view = buildPlanView(items);
  const conflicts = items.filter((i) => i.conflictPath);

  return (
    <Box flexDirection="column">
      <Text bold>{t('planPreview')}</Text>
      <Text dimColor>{t('worktreeRoot')}{worktreeRoot}</Text>
      <Box flexDirection="row" gap={2}>
        <Text>{t('planSummary')}: {view.summary.total}</Text>
        <Text color="green">{t('planReady')}: {view.summary.ready}</Text>
        <Text color="yellow">{t('planWarnings')}: {view.summary.warnings}</Text>
        <Text color="gray">{t('planSkipped')}: {view.summary.skipped}</Text>
      </Box>
      <Text>{' '}</Text>

      {conflicts.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold color="red">{t('conflictTitle')} ({conflicts.length})</Text>
          {conflicts.map((item, i) => (
            <Box key={`conflict-${item.project.name}-${i}`} flexDirection="column">
              <Text color="red">  {item.project.name} [{item.branch}]</Text>
              <Text color="red">    {t('conflictBranchAt')} {item.conflictPath}</Text>
            </Box>
          ))}
        </Box>
      )}

      <PlanSection title={t('planSectionSkipped')} color="gray" items={view.skipped} />
      <PlanSection title={t('planSectionWarnings')} color="yellow" items={view.warnings} />
      <PlanSection title={t('planSectionReady')} color="green" items={view.ready} />

      <Text>{' '}</Text>
      <Text bold>{t('confirmYN')}</Text>
      <ConfirmInput onConfirm={onConfirm} onCancel={onBack} />
    </Box>
  );
}

function PlanSection({
  title,
  color,
  items,
}: {
  title: string;
  color: 'gray' | 'yellow' | 'green';
  items: PlanItem[];
}): React.ReactElement | null {
  if (items.length === 0) return null;

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Text bold color={color}>{title} ({items.length})</Text>
      {items.map((item, i) => (
        <Box key={`${item.project.name}-${i}`} flexDirection="column" marginBottom={1}>
          <Box flexDirection="row" gap={1}>
            <Text bold>{item.project.name}</Text>
            {item.targetExists
              ? <Badge color="yellow">{t('skip')}</Badge>
              : <Badge color="green">{t('create')}</Badge>}
          </Box>
          <Text dimColor>  {t('branch')}: {item.branch}</Text>
          <Text dimColor>  {t('source')}: {item.sourceRef}</Text>
          <Text dimColor>  {t('target')}: {item.targetPath}</Text>
          {item.dirty && <Text color="yellow">{t('dirtyWarning')}</Text>}
          {item.branchExists && (
            <Text color={item.branchDiverges ? 'yellow' : 'green'}>
              {item.branchDiverges ? t('branchExistsDiverge') : t('branchExistsMatch')}
            </Text>
          )}
        </Box>
      ))}
    </Box>
  );
}
