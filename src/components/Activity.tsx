import React, { useEffect, useRef, useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { Spinner } from '@inkjs/ui';
import type { ActivityTask } from '../activity.js';
import { applyEvent, countFinished, initialProgressState } from '../activity.js';
import { LogStream } from './ui/LogStream.js';
import { t } from '../i18n.js';

interface Props {
  task: ActivityTask;
  /** 完成态视图（由 App 按结果构造，可自带按键交互如 ConfirmDialog）。 */
  complete?: React.ReactNode;
  /** 无 complete 时的默认完成回调（按任意键）。 */
  onComplete?: () => void;
}

/** Runs an activity task, streams its log, and renders the completion view. */
export function Activity({ task, complete, onComplete }: Props): React.ReactElement {
  const [state, setState] = useState(initialProgressState);
  const [done, setDone] = useState(false);
  const startRef = useRef<[number, number]>(process.hrtime());
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    const msSinceStart = (): number => {
      const d = process.hrtime(startRef.current);
      return d[0] * 1000 + d[1] / 1e6;
    };
    (async () => {
      await task.run((event) => {
        setState((prev) => applyEvent(prev, event, msSinceStart()));
      });
      setDone(true);
    })();
  }, [task]);

  useInput((input, key) => {
    if (done && !complete && onComplete && (input || key.return)) {
      onComplete();
    }
  });

  const total = state.groups.length;
  const finished = countFinished(state);

  return (
    <Box flexDirection="column">
      <Text bold>{task.title}</Text>
      <Text>{' '}</Text>
      <LogStream state={state} />
      {!done ? (
        <Box marginTop={1}>
          <Spinner label={total > 0 ? `${t('working')} ${finished}/${total}` : t('working')} />
        </Box>
      ) : complete ? (
        <Box marginTop={1}>{complete}</Box>
      ) : (
        <Box marginTop={1}>
          <Text bold color="green">{t('done')}</Text>
        </Box>
      )}
    </Box>
  );
}
