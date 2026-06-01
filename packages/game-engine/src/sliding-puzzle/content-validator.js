export function validateContent(content) {
    const c = content;
    const errors = [];
    if (!c || typeof c !== 'object')
        return { valid: false, errors: ['content-not-object'] };
    if (typeof c.size !== 'number' || c.size < 3 || c.size > 10)
        errors.push('size-out-of-range');
    if (typeof c.scrambleMoves !== 'number' || c.scrambleMoves < 0)
        errors.push('scrambleMoves-invalid');
    return errors.length ? { valid: false, errors } : { valid: true };
}
//# sourceMappingURL=content-validator.js.map