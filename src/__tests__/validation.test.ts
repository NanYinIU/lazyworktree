import { describe, it, expect } from 'vitest';
import { validateBranchName, validateDirectoryName } from '../validation.js';
import { t } from '../i18n.js';

describe('validateBranchName', () => {
  it('accepts common feature branch names', () => {
    expect(validateBranchName('feature/foo').ok).toBe(true);
    expect(validateBranchName('bugfix/room-switch_123').ok).toBe(true);
  });

  it('rejects invalid git ref names before git is invoked', () => {
    const invalid = ['../escape', 'feature//foo', 'feature/foo.lock', 'feature foo', '-bad', '@', 'bad@{ref'];

    for (const branch of invalid) {
      expect(validateBranchName(branch).ok, branch).toBe(false);
    }
  });

  it('returns i18n-ready error codes', () => {
    const result = validateBranchName('feature//foo');

    expect(result).toEqual({ ok: false, code: 'validation.branchDoubleSlash' });
    expect(t(result.code!)).toBeTruthy();
  });
});

describe('validateDirectoryName', () => {
  it('accepts a single directory segment', () => {
    expect(validateDirectoryName('zh-feature-foo').ok).toBe(true);
  });

  it('rejects path traversal and nested paths', () => {
    expect(validateDirectoryName('../zh-feature-foo').ok).toBe(false);
    expect(validateDirectoryName('nested/dir').ok).toBe(false);
    expect(validateDirectoryName('..').ok).toBe(false);
  });

  it('returns i18n-ready directory error codes', () => {
    const result = validateDirectoryName('nested/dir');

    expect(result).toEqual({ ok: false, code: 'validation.directorySeparator' });
    expect(t(result.code!)).toBeTruthy();
  });
});
