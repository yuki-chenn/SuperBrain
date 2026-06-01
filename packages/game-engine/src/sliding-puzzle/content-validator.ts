export function validateContent(content: unknown): { valid: boolean; errors?: string[]; warnings?: string[] } {
  const c = content as any;
  const errors: string[] = [];
  if (!c || typeof c !== 'object') return { valid: false, errors: ['content-not-object'] };
  if (typeof c.size !== 'number' || c.size < 3 || c.size > 10) errors.push('size-out-of-range');
  if (typeof c.scrambleMoves !== 'number' || c.scrambleMoves < 0) errors.push('scrambleMoves-invalid');
  return errors.length ? { valid: false, errors } : { valid: true };
}
