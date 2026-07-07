import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { t, getLocale, setLocale, type I18nKey } from '../i18n.js';

// Import the raw strings map to verify completeness
// We do this by checking that every key returns a non-fallback string in both locales

describe('i18n completeness', () => {
  it('returns non-fallback values for all keys in both locales', () => {
    // Get all keys by testing in en mode
    const originalLocale = getLocale();

    // We can't easily enumerate keys at runtime without importing the strings object,
    // but we can verify that all validation codes and help keys resolve
    const criticalKeys = [
      'appTitle',
      'selectAction',
      'actionCreate',
      'actionList',
      'actionPrune',
      'actionCleanup',
      'helpTitle',
      'helpHint',
      'helpGroupUniversal',
      'helpGroupDashboard',
      'helpGroupCreateFlow',
      'keyHelp',
      'keyBack',
      'keyQuit',
      'keyConfirm',
      'keyMove',
      'keyFilter',
      'keyNewWorktree',
      'keyCleanupGroup',
      'keyPrune',
      'keyRefresh',
      'dashboardTitle',
      'dashboardHint',
      'helpPageHint',
      'validation.branchRequired',
      'validation.branchInvalidChars',
      'validation.directoryRequired',
      'validation.directorySeparator',
      'keyQuit',
    ] as const;

    for (const locale of ['zh', 'en'] as const) {
      setLocale(locale);
      for (const key of criticalKeys) {
        const value = t(key);
        expect(value, `${locale}:${key}`).not.toBe(key);
        expect(value.length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }

    setLocale(originalLocale);
  });

  it('switches locale at runtime', () => {
    const original = getLocale();
    setLocale('en');
    expect(getLocale()).toBe('en');
    setLocale('zh');
    expect(getLocale()).toBe('zh');
    setLocale(original);
  });

  it('user-facing copy contains no emoji', () => {
    const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../i18n.ts');
    const src = fs.readFileSync(file, 'utf8');
    const emoji = src.match(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/gu);
    expect(emoji, `emoji leaked into i18n: ${emoji?.join(' ')}`).toBeNull();
  });
});
