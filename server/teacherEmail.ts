export const TEACHER_EMAIL_DOMAIN =
  process.env.TEACHER_EMAIL_DOMAIN ?? 'stridek12learning.org';

/** Parse "First Last" or "Last, First" into first and last name. */
function parseFirstLast(displayName: string): { first: string; last: string } {
  const trimmed = displayName.trim();
  if (trimmed.includes(',')) {
    const [last, first] = trimmed.split(',').map((s) => s.trim());
    return { first: first ?? '', last: last ?? '' };
  }
  const parts = trimmed.split(/\s+/);
  return { first: parts[0] ?? '', last: parts[parts.length - 1] ?? '' };
}

/**
 * Stride K12 format: first letter of first name + last name
 * e.g. Ashlee Deal → adeal@stridek12learning.org
 */
export function emailFromDisplayName(displayName: string, domain = TEACHER_EMAIL_DOMAIN): string {
  const { first, last } = parseFirstLast(displayName);
  const firstInitial = first.replace(/[^a-zA-Z]/g, '').charAt(0);
  const lastClean = last.toLowerCase().replace(/[^a-z]/g, '');

  if (!firstInitial || !lastClean) return '';

  const host = domain.toLowerCase().replace(/^@/, '');
  return `${firstInitial.toLowerCase()}${lastClean}@${host}`;
}

/** Build teacher email in Stride K12 format (always @stridek12learning.org). */
export function normalizeTeacherEmail(
  displayName: string,
  _rawEmail?: string | null,
  _loginId?: string | null
): string {
  return emailFromDisplayName(displayName);
}
