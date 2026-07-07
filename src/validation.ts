const INVALID_REF_CHARS = /[\x00-\x20~^:?*[\\]/;

export type ValidationErrorCode =
  | 'validation.branchRequired'
  | 'validation.branchStartsWithDash'
  | 'validation.branchSlashBoundary'
  | 'validation.branchDoubleSlash'
  | 'validation.branchDotDot'
  | 'validation.branchAtBrace'
  | 'validation.branchAt'
  | 'validation.branchEndsWithDot'
  | 'validation.branchBadPathPart'
  | 'validation.branchInvalidChars'
  | 'validation.directoryRequired'
  | 'validation.directoryDot'
  | 'validation.directorySeparator'
  | 'validation.directoryControlChars';

export interface ValidationResult {
  ok: boolean;
  code?: ValidationErrorCode;
}

export function validateBranchName(branch: string): ValidationResult {
  const value = branch.trim();

  if (!value) return { ok: false, code: 'validation.branchRequired' };
  if (value.startsWith('-')) return { ok: false, code: 'validation.branchStartsWithDash' };
  if (value.startsWith('/') || value.endsWith('/')) {
    return { ok: false, code: 'validation.branchSlashBoundary' };
  }
  if (value.includes('//')) return { ok: false, code: 'validation.branchDoubleSlash' };
  if (value.includes('..')) return { ok: false, code: 'validation.branchDotDot' };
  if (value.includes('@{')) return { ok: false, code: 'validation.branchAtBrace' };
  if (value === '@') return { ok: false, code: 'validation.branchAt' };
  if (value.endsWith('.')) return { ok: false, code: 'validation.branchEndsWithDot' };
  if (value.split('/').some((part) => part.startsWith('.') || part.endsWith('.lock'))) {
    return { ok: false, code: 'validation.branchBadPathPart' };
  }
  if (INVALID_REF_CHARS.test(value)) {
    return { ok: false, code: 'validation.branchInvalidChars' };
  }

  return { ok: true };
}

export function validateDirectoryName(name: string): ValidationResult {
  const value = name.trim();

  if (!value) return { ok: false, code: 'validation.directoryRequired' };
  if (value === '.' || value === '..') return { ok: false, code: 'validation.directoryDot' };
  if (value.includes('/') || value.includes('\\')) {
    return { ok: false, code: 'validation.directorySeparator' };
  }
  if (/[\x00-\x1f]/.test(value)) {
    return { ok: false, code: 'validation.directoryControlChars' };
  }

  return { ok: true };
}
