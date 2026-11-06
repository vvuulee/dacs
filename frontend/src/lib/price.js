export function calcUnitPrice(product, sizeId, toppingIds) {
  const extraForSize = sizeExtra(product, sizeId);
  const toppingTotal = [...new Set(toppingIds)].reduce((sum, id) => {
    const topping = product.toppings.find((t) => t.id === id);
    return sum + (topping ? topping.price : 0);
  }, 0);
  return product.basePrice + extraForSize + toppingTotal;
}

function sizeExtra(product, sizeId) {
  if (product.sizes.length === 0) return 0;
  const size = product.sizes.find((s) => s.id === sizeId);
  if (!size) throw new Error(`Size không tồn tại: ${sizeId}`);
  return size.extraPrice;
}
