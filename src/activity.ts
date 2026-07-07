import type { ProgressEvent } from './types.js';

/** Activity task that streams progress events while it runs. */
export interface ActivityTask {
  title: string;
  run: (onProgress: (event: ProgressEvent) => void) => Promise<void>;
}

export type LineStatus = 'running' | 'done' | 'failed' | 'skipped';
export type GroupStatus = 'pending' | 'running' | 'success' | 'failed' | 'skipped';

export interface LogLine {
  label: string;
  status: LineStatus;
  /** Elapsed time since the task started, in milliseconds. */
  ms: number;
}

export interface LogGroup {
  name: string;
  status: GroupStatus;
  lines: LogLine[];
}

export interface ProgressState {
  /** Root-level steps, marked with project='(root)'. */
  root: LogGroup | null;
  groups: LogGroup[];
}

export function initialProgressState(): ProgressState {
  return { root: null, groups: [] };
}

/** Fold one ProgressEvent into the log state. */
export function applyEvent(state: ProgressState, event: ProgressEvent, ms: number): ProgressState {
  switch (event.type) {
    case 'project:start':
      if (event.project === '(root)') {
        return state.root ? state : { ...state, root: { name: '(root)', status: 'running', lines: [] } };
      }
      if (state.groups.some((g) => g.name === event.project)) return state;
      return { ...state, groups: [...state.groups, { name: event.project, status: 'running', lines: [] }] };

    case 'project:step': {
      const line: LogLine = { label: event.step, status: event.status, ms };
      if (event.project === '(root)') {
        const root = state.root ?? { name: '(root)', status: 'running' as GroupStatus, lines: [] };
        return { ...state, root: { ...root, lines: [...root.lines, line] } };
      }
      const existing = state.groups.find((g) => g.name === event.project);
      if (existing) {
        return {
          ...state,
          groups: state.groups.map((g) =>
            g.name === event.project ? { ...g, lines: [...g.lines, line] } : g
          ),
        };
      }
      // Handle steps that arrive before a matching start event.
      return { ...state, groups: [...state.groups, { name: event.project, status: 'running', lines: [line] }] };
    }

    case 'project:success':
      return setGroupStatus(state, event.project, 'success');
    case 'project:failed':
      return setGroupStatus(state, event.project, 'failed');
    case 'project:skipped':
      return setGroupStatus(state, event.project, 'skipped');

    case 'link:created':
    case 'link:skipped':
      return state; // Symlink details are already included in project:step events.
  }
}

function setGroupStatus(state: ProgressState, name: string, status: GroupStatus): ProgressState {
  if (name === '(root)' && state.root) {
    return { ...state, root: { ...state.root, status } };
  }
  return { ...state, groups: state.groups.map((g) => (g.name === name ? { ...g, status } : g)) };
}

/** Count groups that have reached a terminal state. */
export function countFinished(state: ProgressState): number {
  return state.groups.filter((g) => g.status === 'success' || g.status === 'failed' || g.status === 'skipped').length;
}

export function formatMs(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}
