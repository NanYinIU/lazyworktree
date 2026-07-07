import { describe, it, expect } from 'vitest';
import { getHelpKeybindingGroups, getScreenKeybindings } from '../keybindings.js';
import { DEFAULT_CONFIG } from '../config.js';

describe('getScreenKeybindings', () => {
  it('uses lazygit-style contextual actions on the dashboard', () => {
    const bindings = getScreenKeybindings('groupList', DEFAULT_CONFIG);

    expect(bindings.map((binding) => binding.key)).toEqual(
      expect.arrayContaining(['j/k', '/', 'n', 'c', 'p', 'r', '?', 'Esc'])
    );
  });

  it('keeps confirmation-oriented bindings in create flow screens', () => {
    const bindings = getScreenKeybindings('featureInput', DEFAULT_CONFIG);

    expect(bindings.map((binding) => binding.key)).toEqual(expect.arrayContaining(['Enter', '?', 'Esc']));
  });

  it('uses configured dashboard keybindings', () => {
    const config = {
      ...DEFAULT_CONFIG,
      keybindings: {
        ...DEFAULT_CONFIG.keybindings,
        dashboard: {
          ...DEFAULT_CONFIG.keybindings.dashboard,
          newWorktree: 'a',
          refresh: 'u',
        },
      },
    };

    const bindings = getScreenKeybindings('groupList', config);

    expect(bindings.map((binding) => binding.key)).toEqual(expect.arrayContaining(['a', 'u']));
    expect(bindings.map((binding) => binding.key)).not.toContain('n');
    expect(bindings.map((binding) => binding.key)).not.toContain('r');
  });


  it('groups contextual help by screen', () => {
    expect(getHelpKeybindingGroups('groupList', DEFAULT_CONFIG).map((group) => group.titleKey)).toEqual([
      'helpGroupDashboard',
      'helpGroupUniversal',
    ]);
    expect(getHelpKeybindingGroups('featureInput', DEFAULT_CONFIG).map((group) => group.titleKey)).toEqual([
      'helpGroupCreateFlow',
      'helpGroupUniversal',
    ]);
  });

  it('enforces footer contract: global keys always render last', () => {
    for (const screen of ['groupList', 'featureInput', 'planPreview', 'branchOverrides'] as const) {
      const bindings = getScreenKeybindings(screen, DEFAULT_CONFIG);
      const lastGlobal = Math.max(...bindings.map((b, i) => (b.role === 'global' ? i : -1)));
      const firstNonGlobalAfterGlobal = bindings.findIndex((b, i) => i > lastGlobal && b.role !== 'global');
      expect(firstNonGlobalAfterGlobal, `screen ${screen}`).toBe(-1);
      // help/quit are global and must sit at the tail
      const tail = bindings[bindings.length - 1];
      expect(tail.role).toBe('global');
    }
  });
});
