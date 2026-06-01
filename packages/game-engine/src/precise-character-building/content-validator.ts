export function validateContent(content: unknown): { valid: boolean; errors?: string[]; warnings?: string[] } {
  const c = content as any;
  const errors: string[] = [];
  if (!c) return { valid: false, errors: ['no-content'] };
  if (typeof c.boardSize !== 'number') errors.push('missing-boardSize');
  if (!Array.isArray(c.radicalPool) || c.radicalPool.length === 0) errors.push('empty-radicalPool');
  if (!Array.isArray(c.cells)) errors.push('missing-cells');
  if (!Array.isArray(c.solutionRounds) || c.solutionRounds.length === 0) errors.push('empty-solutionRounds');
  return errors.length ? { valid: false, errors } : { valid: true };
}
