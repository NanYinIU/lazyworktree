/** Fixed-width Unicode glyphs used for stable terminal alignment. */
export const GLYPHS = {
  /** 列表焦点光标 */
  cursor: '❯',
  /** 实心圆点：状态色点 */
  dot: '●',
  /** 空心圆：未选中 / 待办 */
  ring: '◯',
  /** 填充圆：多选选中 */
  dotFilled: '◉',
  /** 右三角：当前步骤 / 子项引导 */
  arrow: '▸',
  /** 对勾：成功 */
  check: '✓',
  /** 叉：失败 */
  cross: '✗',
  /** 带斜线圆：跳过 */
  circleSlash: '⊘',
  /** 空心小圆：等待中 */
  pending: '○',
  /** 半圆：进行中 */
  running: '◐',
  /** 实心菱形：根级步骤 */
  diamond: '◆',
} as const;
