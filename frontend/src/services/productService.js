import { adapter } from '../api';
import { toProduct, toProducts } from '../mappers/product';

export async function getProducts(filter = {}) {
  return toProducts(await adapter.getProducts(filter));
}

export async function getProduct(id) {
  return toProduct(await adapter.getProduct(id));
}
