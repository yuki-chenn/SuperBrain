export function validateContent(content) {
    const c = content;
    const errors = [];
    if (!c)
        return { valid: false, errors: ['no-content'] };
    if (!c.size?.width || !c.size?.height || !c.size?.depth)
        errors.push('missing-size');
    if (!c.startCoord)
        errors.push('missing-startCoord');
    if (!Array.isArray(c.cells))
        errors.push('missing-cells');
    return errors.length ? { valid: false, errors } : { valid: true };
}
//# sourceMappingURL=content-validator.js.map