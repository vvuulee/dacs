export const selectCount = (items) => items.reduce((sum, line) => sum + line.quantity, 0);
export const selectSubtotal = (items) => items.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
