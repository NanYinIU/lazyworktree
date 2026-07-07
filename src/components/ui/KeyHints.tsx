import React from 'react';
import { Box, Text } from 'ink';
import type { Keybinding } from '../../keybindings.js';
import { t } from '../../i18n.js';

interface Props {
  bindings: Keybinding[];
}

/**
 * 页脚契约：按「主动作 → 导航 → 全局」顺序渲染键位提示。
 * 顺序由 keybindings.getOrderKeybindings 保证（global 恒在最右），
 * 这里只负责渲染，不做重排——契约只有一个源头。
 */
export function KeyHints({ bindings }: Props): React.ReactElement {
  return (
    <Box marginTop={1} flexWrap="wrap">
      {bindings.map((binding, index) => (
        <Box key={`${binding.key}-${binding.labelKey}`} marginRight={index === bindings.length - 1 ? 0 : 2}>
          <Text color="cyan">{binding.key}</Text>
          <Text dimColor> {t(binding.labelKey)}</Text>
        </Box>
      ))}
    </Box>
  );
}
