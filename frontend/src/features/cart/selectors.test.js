import { selectCount, selectSubtotal } from './selectors';

const items = [{ quantity: 2, unitPrice: 30000 }, { quantity: 1, unitPrice: 45000 }];

it('selectSubtotal = Σ unitPrice × quantity', () => expect(selectSubtotal(items)).toBe(105000));
it('selectCount = Σ quantity', () => expect(selectCount(items)).toBe(3));
it('giỏ rỗng → 0', () => { expect(selectSubtotal([])).toBe(0); expect(selectCount([])).toBe(0); });
