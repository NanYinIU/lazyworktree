import { describe, it, expect } from 'vitest';
import { clampFocus, toggleMember, toggleAllIndices } from '../components/ui/SelectList.js';

describe('SelectList pure helpers', () => {
  it('clampFocus bounds the index and handles empty lists', () => {
    expect(clampFocus(5, 3)).toBe(2);
    expect(clampFocus(-1, 3)).toBe(0);
    expect(clampFocus(1, 3)).toBe(1);
    expect(clampFocus(0, 0)).toBe(0);
  });

  it('toggleMember toggles immutably', () => {
    const empty = new Set<number>();
    const withOne = toggleMember(empty, 2);
    expect([...withOne]).toEqual([2]);
    expect(empty.size).toBe(0); // original untouched
    const withoutOne = toggleMember(withOne, 2);
    expect([...withoutOne]).toEqual([]);
  });

  it('toggleAllIndices flips between all-selected and none', () => {
    const none = new Set<number>();
    const all = toggleAllIndices(none, 4);
    expect([...all]).toEqual([0, 1, 2, 3]);
    // when all selected -> back to empty
    expect([...toggleAllIndices(all, 4)]).toEqual([]);
    // partial -> selects the rest
    const partial = toggleMember(none, 1);
    expect([...toggleAllIndices(partial, 3)]).toEqual([0, 1, 2]);
    // empty list stays empty
    expect([...toggleAllIndices(none, 0)]).toEqual([]);
  });
});
