import React from 'react';
import { Box, Text } from 'ink';
import type { ProgressState, LogGroup } from '../../activity.js';
import { STEP_STATE, SUB_STEP } from '../../ui/status.js';
import { GLYPHS } from '../../ui/glyphs.js';
import { formatMs } from '../../activity.js';

interface Props {
  state: ProgressState;
}

/** Renders ProgressState as grouped steps with status glyphs and elapsed time. */
export function LogStream({ state }: Props): React.ReactElement {
  return (
    <Box flexDirection="column">
      {state.root ? <GroupView group={state.root} root /> : null}
      {state.groups.map((g) => (
        <GroupView key={g.name} group={g} />
      ))}
    </Box>
  );
}

function GroupView({ group, root }: { group: LogGroup; root?: boolean }): React.ReactElement {
  const meta = STEP_STATE[group.status];
  return (
    <Box flexDirection="column" marginBottom={group.lines.length > 0 ? 1 : 0}>
      <Box flexDirection="row" gap={1}>
        <Text color={meta.color}>{root ? GLYPHS.diamond : meta.icon}</Text>
        <Text bold>{root ? 'worktree root' : group.name}</Text>
      </Box>
      {group.lines.map((line, i) => {
        const lineMeta = SUB_STEP[line.status];
        const showMs = line.status === 'done' || line.status === 'failed';
        return (
          <Box key={i} flexDirection="row" gap={1}>
            <Text>{'  '}</Text>
            <Text color={lineMeta.color}>{lineMeta.icon}</Text>
            <Text dimColor>{line.label}</Text>
            {showMs ? <Text dimColor>{formatMs(line.ms)}</Text> : null}
          </Box>
        );
      })}
    </Box>
  );
}
