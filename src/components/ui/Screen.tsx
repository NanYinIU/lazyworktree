import React from 'react';
import { Box, Text } from 'ink';
import type { Keybinding } from '../../keybindings.js';
import { KeyHints } from './KeyHints.js';

interface Props {
  /** 面包屑导航，如 "worktree / groups"。由 App 按当前屏注入。 */
  breadcrumb?: string;
  /** 屏标题。新屏走 <Screen title>；过渡期旧屏仍可自带标题，省略此项即可。 */
  title?: string;
  /** 本屏键位，按页脚契约渲染。 */
  hints?: Keybinding[];
  /** 是否渲染页脚；受 --hide-bottom-line 控制。 */
  showHints?: boolean;
  children: React.ReactNode;
}

/** Shared screen shell with consistent title, navigation, and footer placement. */
export function Screen({ breadcrumb, title, hints, showHints = true, children }: Props): React.ReactElement {
  return (
    <Box flexDirection="column">
      {breadcrumb ? <Text dimColor>{breadcrumb}</Text> : null}
      {title ? <Text bold>{title}</Text> : null}
      {children}
      {showHints && hints && hints.length > 0 ? <KeyHints bindings={hints} /> : null}
    </Box>
  );
}
