import React, { useMemo, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import type { WorktreeGroup, WorktreeItem } from '../types.js';
import { t } from '../i18n.js';
import type { AppConfig } from '../config.js';
import { isKey } from '../keybindings.js';
import { filterGroups, summarizeGroups } from '../view-models/group-dashboard-view.js';
import { StatusBadge } from './ui/StatusBadge.js';
import { SelectList } from './ui/SelectList.js';
import { ConfirmDialog } from './ui/ConfirmDialog.js';
import { worstHealth, GROUP_HEALTH } from '../ui/status.js';

interface Props {
  groups: WorktreeGroup[];
  config: AppConfig;
  onBack: () => void;
  onCreate: () => void;
  onCleanupGroup: (groupRoot: string) => void;
  onPrune: () => void;
  onRefresh: () => void;
  onRepair: (groupRoot: string) => void;
}

const NAME_W = 28;
const AGE_W = 8;

/** 单个 worktree 的行内标签（详情面板用）。颜色统一取自 GROUP_HEALTH 词表。 */
function itemLabels(item: WorktreeItem): { text: string; color: string }[] {
  const out: { text: string; color: string }[] = [];
  if (item.dirty) out.push({ text: t('badgeDirty'), color: GROUP_HEALTH.dirty.color });
  if (item.missing) out.push({ text: t('badgeMissing'), color: GROUP_HEALTH.missing.color });
  if (item.mergedToBase) out.push({ text: t('merged'), color: 'gray' });
  return out;
}

export function GroupList({ groups, config, onBack, onCreate, onCleanupGroup, onPrune, onRefresh, onRepair }: Props): React.ReactElement {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [filterMode, setFilterMode] = useState(false);
  const [draftFilter, setDraftFilter] = useState('');
  const [appliedFilter, setAppliedFilter] = useState('');
  const [pendingAction, setPendingAction] = useState<'cleanup' | 'prune' | 'repair' | null>(null);
  const visibleGroups = useMemo(() => filterGroups(groups, appliedFilter), [groups, appliedFilter]);
  const selectedGroup = visibleGroups[selectedIndex] ?? null;
  const summary = useMemo(() => summarizeGroups(groups), [groups]);

  useInput((input, key) => {
    if (pendingAction) return;
    if (filterMode) {
      if (key.escape) { setDraftFilter(appliedFilter); setFilterMode(false); return; }
      if (key.return) { setAppliedFilter(draftFilter); setSelectedIndex(0); setFilterMode(false); return; }
      if (key.backspace || key.delete) { setDraftFilter((v) => v.slice(0, -1)); return; }
      if (input) setDraftFilter((v) => `${v}${input}`);
      return;
    }
    if (key.escape) onBack();
    if (isKey(input, config.keybindings.dashboard.filter)) { setDraftFilter(appliedFilter); setFilterMode(true); }
    if (isKey(input, config.keybindings.dashboard.newWorktree)) onCreate();
    if (isKey(input, config.keybindings.dashboard.prune)) setPendingAction('prune');
    if (isKey(input, config.keybindings.dashboard.refresh)) onRefresh();
    if (isKey(input, config.keybindings.dashboard.cleanupGroup) && selectedGroup) setPendingAction('cleanup');
    if (isKey(input, config.keybindings.dashboard.repair) && selectedGroup) setPendingAction('repair');
  });

  if (groups.length === 0) {
    return (
      <Box flexDirection="column">
        <Text bold>{t('dashboardTitle')}</Text>
        <Text dimColor>{t('noGroups')}</Text>
        <Text dimColor>
          {config.keybindings.dashboard.newWorktree} {t('keyNewWorktree')}  {config.keybindings.dashboard.prune} {t('keyPrune')}  {config.keybindings.dashboard.refresh} {t('keyRefresh')}
        </Text>
        <Text dimColor>{t('pressEscBack')}</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column">
      <Text bold>{t('dashboardTitle')} ({groups.length})</Text>
      {/* Summary line - single row, aligned. 颜色取自 GROUP_HEALTH 词表。 */}
      <Box flexDirection="row" gap={3}>
        <Text color={GROUP_HEALTH.dirty.color}>{t('badgeDirty')}: {summary.dirty}</Text>
        <Text color={GROUP_HEALTH.unmerged.color}>{t('badgeUnmerged')}: {summary.unmerged}</Text>
        <Text color={GROUP_HEALTH.stale.color}>{t('badgeStale')}: {summary.stale}</Text>
        {appliedFilter && <Text color="cyan">{t('dashboardFilter')}: {appliedFilter}</Text>}
      </Box>

      {filterMode && (
        <Box>
          <Text color="cyan">{t('dashboardFilter')}: {draftFilter}_</Text>
        </Box>
      )}

      <Text>{' '}</Text>

      {/* Group list — 委托给 <SelectList>，行内渲染名称/年龄/状态徽章。 */}
      <SelectList
        items={visibleGroups}
        getKey={(g) => g.rootPath}
        focusIndex={selectedIndex}
        onFocusChange={setSelectedIndex}
        active={!pendingAction && !filterMode}
        upKey={config.keybindings.dashboard.moveUp}
        downKey={config.keybindings.dashboard.moveDown}
        renderItem={(group, _i, { focused }) => (
          <>
            <Box width={NAME_W}>
              <Text bold={focused} color={focused ? 'cyan' : undefined}>{group.name}</Text>
            </Box>
            <Box width={AGE_W}>
              <Text dimColor>{group.ageDays}{t('daysOld')}</Text>
            </Box>
            <StatusBadge status={worstHealth(group)} />
          </>
        )}
      />

      {/* Detail panel below the list */}
      {selectedGroup && (
        <Box flexDirection="column" marginTop={1} borderStyle="single" borderColor="gray" paddingX={1}>
          <Text bold color="cyan">{selectedGroup.name}</Text>
          <Box flexDirection="row" gap={3}>
            <Text dimColor>{t('dashboardAge')}: {selectedGroup.ageDays}{t('daysOld')}</Text>
            <Text dimColor>{t('dashboardItems')}: {selectedGroup.items.length}{t('projects')}</Text>
          </Box>
          <Text>{' '}</Text>
          {selectedGroup.items.map((item, i) => {
            const labels = itemLabels(item);
            return (
              <Box key={i} flexDirection="row">
                <Box width={NAME_W}>
                  <Text color={item.missing ? 'gray' : undefined}>{item.projectName}</Text>
                </Box>
                <Box width={30}>
                  {item.branch ? <Text dimColor>[{item.branch}]</Text> : <Text>{' '}</Text>}
                </Box>
                <Box flexDirection="row" gap={1}>
                  {labels.map((label) => (
                    <Text key={label.text} color={label.color}>{label.text}</Text>
                  ))}
                </Box>
              </Box>
            );
          })}
        </Box>
      )}

      {pendingAction === 'cleanup' && selectedGroup && (
        <ConfirmDialog
          title={t('inlineCleanupTitle')}
          message={`${t('inlineCleanupMessage')}\n${selectedGroup.name}: ${selectedGroup.items.length}${t('projects')}`}
          danger={worstHealth(selectedGroup) !== 'clean'}
          onConfirm={() => { setPendingAction(null); onCleanupGroup(selectedGroup.rootPath); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === 'prune' && (
        <ConfirmDialog
          title={t('inlinePruneTitle')}
          message={t('inlinePruneMessage')}
          onConfirm={() => { setPendingAction(null); onPrune(); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {pendingAction === 'repair' && selectedGroup && (
        <ConfirmDialog
          title={t('repairTitle')}
          message={`${selectedGroup.name}: ${selectedGroup.items.length}${t('projects')}`}
          onConfirm={() => { setPendingAction(null); onRepair(selectedGroup.rootPath); }}
          onCancel={() => setPendingAction(null)}
        />
      )}
    </Box>
  );
}
