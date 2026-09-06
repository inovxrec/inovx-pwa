/** Joins class names, dropping anything falsy. The only class-name helper. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ');
}
