import React from 'react';
import { Box, Text, useInput } from 'ink';
import type { ExecutionResult, PruneResult, CleanupResult, RepairResult } from '../types.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';
import { t } from '../i18n.js';

export type ActivityPhase = 'create' | 'prune' | 'cleanup' | 'force' | 'branch' | 'repair';

interface Props {
  phase: ActivityPhase;
  result: ExecutionResult | null;
  pruneResult: PruneResult | null;
  cleanupResult: CleanupResult | null;
  repairResult: RepairResult | null;
  deletedBranches: { projectName: string; branch: string }[];
  failedBranches: { projectName: string; branch: string; reason: string }[];
  worktreeRoot: string;
  onStartForce: () => void;
  onStartBranch: () => void;
  /** Continue after declining force removal. */
  onDeclineForce: () => void;
  onDone: () => void;
}

/** Determine the next action after cleanup or force removal. */
function cleanupNext(cr: CleanupResult | null): 'force' | 'branch' | 'done' {
  if (!cr) return 'done';
  if (cr.failed.some((f) => f.forceRetryable)) return 'force';
  if (cr.branchesToDelete.length > 0) return 'branch';
  return 'done';
}

/** Completion view for activity results and follow-up confirmations. */
export function ActivityComplete(props: Props): React.ReactElement {
  const { phase, result, pruneResult, cleanupResult, repairResult, deletedBranches, failedBranches, worktreeRoot } = props;
  const { onStartForce, onStartBranch, onDeclineForce, onDone } = props;
  const next = cleanupNext(cleanupResult);
  const interactive = (phase === 'cleanup' || phase === 'force') && next !== 'done';

  useInput((input, key) => {
    if (interactive) return; // ConfirmDialog handles input while active.
    if (input || key.return) onDone();
  });

  if (phase === 'cleanup' && next === 'force') {
    return (
      <ConfirmDialog title={t('forceRetryTitle')} message={t('forceRetryWarn')} danger
        onConfirm={onStartForce} onCancel={onDeclineForce} />
    );
  }
  if ((phase === 'cleanup' || phase === 'force') && next === 'branch') {
    return (
      <ConfirmDialog title={t('branchConfirmTitle')} message={t('branchConfirmDesc')}
        onConfirm={onStartBranch} onCancel={onDone} />
    );
  }

  return (
    <Box flexDirection="column">
      {phase === 'create' && result ? (
        <>
          <Text bold color={result.failed.length ? 'yellow' : 'green'}>{t('results')}</Text>
          <Text>{t('success')} {result.successes.length} · {t('skipped')} {result.skipped.length} · {t('failed')} {result.failed.length}</Text>
          {result.failed.map((f, i) => (
            <Text key={i} color="red">  {f.project}: {f.reason}</Text>
          ))}
          {worktreeRoot ? <Text dimColor>{t('nextStep')} cd {worktreeRoot}</Text> : null}
        </>
      ) : null}

      {phase === 'prune' && pruneResult ? (
        <>
          <Text bold color="green">{t('pruneResults')}</Text>
          <Text>{t('pruned')} {pruneResult.executed.length} · {t('failed')} {pruneResult.failed.length}</Text>
        </>
      ) : null}

      {(phase === 'cleanup' || phase === 'force') && cleanupResult ? (
        <>
          <Text bold color="green">{t('cleanupResults')}</Text>
          <Text>{t('removed')} {cleanupResult.removed.length} · {t('failed')} {cleanupResult.failed.length}</Text>
          {cleanupResult.removedGroups.length > 0 ? (
            <Text dimColor>{t('removedGroupDirs')} {cleanupResult.removedGroups.join(', ')}</Text>
          ) : null}
        </>
      ) : null}

      {phase === 'branch' ? (
        <>
          <Text bold color="green">{t('branchDeleteResults')}</Text>
          <Text>{t('deleted')} {deletedBranches.length} · {t('failed')} {failedBranches.length}</Text>
        </>
      ) : null}

      {phase === 'repair' && repairResult ? (
        <>
          <Text bold color="green">{t('repairDone')}</Text>
          <Text>{t('repairCreated')} {repairResult.created.length} · {t('repairSkipped')} {repairResult.skipped.length}</Text>
          {repairResult.repairedGroups.length > 0 ? (
            <Text dimColor>{t('repairGroups')}: {repairResult.repairedGroups.join(', ')}</Text>
          ) : null}
        </>
      ) : null}

      <Text dimColor>{t('pressAnyKeyBack')}</Text>
    </Box>
  );
}
