export function validateContent(content) {
    const c = content;
    const errors = [];
    if (!c)
        return { valid: false, errors: ['no-content'] };
    if (!c.initialState?.aliveCells)
        errors.push('missing-initialState');
    if (!c.stableState?.aliveCells)
        errors.push('missing-stableState');
    if (!Array.isArray(c.targetRegionIds) || c.targetRegionIds.length === 0)
        errors.push('missing-targetRegionIds');
    if (!Array.isArray(c.targetAnswers))
        errors.push('missing-targetAnswers');
    if (typeof c.stableGeneration !== 'number')
        errors.push('missing-stableGeneration');
    return errors.length ? { valid: false, errors } : { valid: true };
}
//# sourceMappingURL=content-validator.js.map