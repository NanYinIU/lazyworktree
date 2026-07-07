import React, { useState } from 'react';
import { Box, Text, useInput } from 'ink';
import { GLYPHS } from '../../ui/glyphs.js';

/** 把焦点索引夹到 [0, length-1]；空列表返回 0。 */
export function clampFocus(index: number, length: number): number {
  if (length === 0) return 0;
  return Math.max(0, Math.min(index, length - 1));
}

/** 多选：翻转某索引的归属，返回新 Set（不可变）。 */
export function toggleMember(set: Set<number>, index: number): Set<number> {
  const next = new Set(set);
  if (next.has(index)) next.delete(index);
  else next.add(index);
  return next;
}

/** 多选 a 键：全选 ↔ 全不选。 */
export function toggleAllIndices(set: Set<number>, length: number): Set<number> {
  const all = Array.from({ length }, (_, i) => i);
  const allOn = length > 0 && all.every((i) => set.has(i));
  return allOn ? new Set<number>() : new Set<number>(all);
}

interface RenderCtx {
  focused: boolean;
  selected: boolean;
}

interface Props<T> {
  items: T[];
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number, ctx: RenderCtx) => React.ReactNode;
  /** 空列表占位。 */
  empty?: React.ReactNode;
  /** 受控焦点（单选列表的调用方通常需要它来联动详情面板/行内动作）。 */
  focusIndex?: number;
  onFocusChange?: (index: number) => void;
  /** 单选：回车确认。 */
  onSelect?: (item: T, index: number) => void;
  /** 多选模式。 */
  multi?: boolean;
  /** 多选初始勾选项（索引）。 */
  defaultSelected?: number[];
  /** 多选：回车提交全部勾选索引。 */
  onSubmit?: (selectedIndices: number[]) => void;
  /** 导航键（默认 vim 风格 k/j），调用方可传 config 以尊重用户自定义。 */
  upKey?: string;
  downKey?: string;
  /** false 时暂停按键（如弹出确认框 / 过滤输入期间）。 */
  active?: boolean;
}

/**
 * Shared list component.
 * - Single select: arrows or configured keys move focus, Enter selects.
 * - Multi select: Space toggles, a selects all or none, Enter submits.
 */
export function SelectList<T>(props: Props<T>): React.ReactElement {
  const {
    items, getKey, renderItem, empty,
    focusIndex: propFocus, onFocusChange, onSelect,
    multi = false, defaultSelected = [], onSubmit,
    upKey = 'k', downKey = 'j', active = true,
  } = props;

  const [internalFocus, setInternalFocus] = useState(0);
  const [selectedSet, setSelectedSet] = useState<Set<number>>(new Set(defaultSelected));

  const controlled = propFocus !== undefined;
  const rawFocus = controlled ? (propFocus as number) : internalFocus;
  const safeFocus = clampFocus(rawFocus, items.length);

  const setFocus = (next: number): void => {
    const clamped = clampFocus(next, items.length);
    if (!controlled) setInternalFocus(clamped);
    onFocusChange?.(clamped);
  };

  useInput((input, key) => {
    if (!active || items.length === 0) return;
    if (key.upArrow || input === upKey) { setFocus(safeFocus - 1); return; }
    if (key.downArrow || input === downKey) { setFocus(safeFocus + 1); return; }

    if (multi) {
      if (input === ' ') {
        setSelectedSet((prev) => toggleMember(prev, safeFocus));
        return;
      }
      if (input === 'a') {
        setSelectedSet((prev) => toggleAllIndices(prev, items.length));
        return;
      }
      if (key.return) {
        onSubmit?.([...selectedSet].sort((x, y) => x - y));
        return;
      }
    } else if (key.return) {
      onSelect?.(items[safeFocus], safeFocus);
    }
  });

  if (items.length === 0) {
    return <>{empty ?? null}</>;
  }

  return (
    <Box flexDirection="column">
      {items.map((item, i) => {
        const focused = i === safeFocus;
        const selected = multi ? selectedSet.has(i) : false;
        return (
          <Box key={getKey(item, i)} flexDirection="row">
            <Box width={2}>
              <Text color={focused ? 'cyan' : undefined}>{focused ? GLYPHS.cursor : ' '}</Text>
            </Box>
            {multi ? (
              <Box width={2}>
                <Text color={selected ? 'green' : undefined}>{selected ? GLYPHS.dotFilled : GLYPHS.ring}</Text>
              </Box>
            ) : null}
            {renderItem(item, i, { focused, selected })}
          </Box>
        );
      })}
    </Box>
  );
}
