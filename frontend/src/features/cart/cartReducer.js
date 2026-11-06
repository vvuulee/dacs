import { MAX_QTY, MIN_QTY } from '../../constants';

const clampQty = (quantity) => Math.min(MAX_QTY, quantity);
const normalizeToppings = (ids) => [...new Set(ids)].sort();

export function makeCartKey({ productId, sizeId, toppingIds, note }) {
  return [productId, sizeId ?? '', normalizeToppings(toppingIds).join(','), note.trim()].join('|');
}

function addItem(items, item) {
  const normalized = { ...item, toppingIds: normalizeToppings(item.toppingIds), note: item.note.trim() };
  const key = makeCartKey(normalized);
  const existing = items.find((line) => line.key === key);
  if (!existing) return [...items, { ...normalized, key, quantity: clampQty(item.quantity) }];
  return items.map((line) =>
    line.key === key ? { ...line, quantity: clampQty(line.quantity + item.quantity) } : line,
  );
}

export function cartReducer(items, action) {
  switch (action.type) {
    case 'ADD':
      return addItem(items, action.item);
    case 'SET_QTY':
      if (action.quantity < MIN_QTY) return items.filter((line) => line.key !== action.key);
      return items.map((line) =>
        line.key === action.key ? { ...line, quantity: clampQty(action.quantity) } : line,
      );
    case 'REMOVE':
      return items.filter((line) => line.key !== action.key);
    case 'CLEAR':
      return [];
    default:
      throw new Error(`Action giỏ hàng không hợp lệ: ${action.type}`);
  }
}
