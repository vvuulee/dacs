/**
 * @typedef {{id: string, name: string, image: string}} Category
 * @typedef {{id: string, label: string, extraPrice: number}} Size
 * @typedef {{id: string, name: string, price: number}} Topping
 * @typedef {{id: string, name: string, description: string, image: string, categoryId: string,
 *   basePrice: number, sizes: Size[], toppings: Topping[], isAvailable: boolean}} Product
 * @typedef {{key: string, productId: string, name: string, image: string, sizeId: string|null,
 *   toppingIds: string[], note: string, quantity: number, unitPrice: number, summary?: string}} CartItem
 */
export {};
