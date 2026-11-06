import { env } from '../../config/env';
import { request } from '../client';

export function createHttpAdapter(baseUrl) {
  return {
    getCategories: () => request('/categories', { baseUrl }),
    getProducts: ({ categoryId, q } = {}) =>
      request('/products', { baseUrl, params: { category: categoryId, q } }),
    getProvinces: () => request('/provinces', { baseUrl }),
    getWards: (provinceId) => request(`/provinces/${encodeURIComponent(provinceId)}/wards`, { baseUrl }),
    createOrder: (body) => request('/orders', { baseUrl, method: 'POST', body }),
    getOrder: (id, phone) => request(`/orders/${encodeURIComponent(id)}`, { baseUrl, params: { phone } }),
    // Đăng ký/đăng nhập/quên/đặt lại mật khẩu không gắn token (auth: false).
    register: (body) => request('/auth/register', { baseUrl, method: 'POST', body, auth: false }),
    login: (body) => request('/auth/login', { baseUrl, method: 'POST', body, auth: false }),
    forgotPassword: (body) => request('/auth/forgot-password', { baseUrl, method: 'POST', body, auth: false }),
    resetPassword: (body) => request('/auth/reset-password', { baseUrl, method: 'POST', body, auth: false }),
    logout: () => request('/auth/logout', { baseUrl, method: 'POST' }),
    getMe: () => request('/me', { baseUrl }),
    updateMe: (body) => request('/me', { baseUrl, method: 'PATCH', body }),
    changePassword: (body) => request('/auth/change-password', { baseUrl, method: 'POST', body }),
    getMyOrders: () => request('/me/orders', { baseUrl }),
    getStores: ({ provinceId, q } = {}) => request('/stores', { baseUrl, params: { province: provinceId, q } }),
    getOffers: () => request('/offers', { baseUrl }),
    validateVoucher: (body) => request('/vouchers/validate', { baseUrl, method: 'POST', body }),
    getProduct: (id) => request(`/products/${encodeURIComponent(id)}`, { baseUrl }),
  };
}

export const httpAdapter = createHttpAdapter(env.apiBaseUrl);
