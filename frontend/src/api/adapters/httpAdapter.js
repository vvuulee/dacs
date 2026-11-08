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
    // Nhân viên: gắn token nhân viên (auth: 'staff'); đăng nhập không gắn token.
    staffLogin: (body) => request('/staff/login', { baseUrl, method: 'POST', body, auth: false }),
    staffLogout: () => request('/staff/logout', { baseUrl, method: 'POST', auth: 'staff' }),
    staffGetMe: () => request('/staff/me', { baseUrl, auth: 'staff' }),
    staffChangePassword: (body) => request('/staff/me/password', { baseUrl, method: 'POST', body, auth: 'staff' }),
    staffCreateOrder: (body) => request('/staff/orders', { baseUrl, method: 'POST', body, auth: 'staff' }),
    staffGetOnlineOrders: ({ status } = {}) => request('/staff/orders/online', { baseUrl, params: { status }, auth: 'staff' }),
    staffUpdateOrderStatus: (id, status) =>
      request(`/staff/orders/${encodeURIComponent(id)}/status`, { baseUrl, method: 'PATCH', body: { status }, auth: 'staff' }),
    staffGetTodayOrders: () => request('/staff/orders/today', { baseUrl, auth: 'staff' }),
    staffGetTodayReport: () => request('/staff/reports/today', { baseUrl, auth: 'staff' }),
    staffGetVouchers: () => request('/staff/vouchers', { baseUrl, auth: 'staff' }),
    staffCreateVoucher: (body) => request('/staff/vouchers', { baseUrl, method: 'POST', body, auth: 'staff' }),
    staffDeleteVoucher: (id) => request(`/staff/vouchers/${encodeURIComponent(id)}`, { baseUrl, method: 'DELETE', auth: 'staff' }),
    staffGetProducts: () => request('/staff/products', { baseUrl, auth: 'staff' }),
    staffSetAvailability: (id, isAvailable) =>
      request(`/staff/products/${encodeURIComponent(id)}`, { baseUrl, method: 'PATCH', body: { is_available: isAvailable }, auth: 'staff' }),
  };
}

export const httpAdapter = createHttpAdapter(env.apiBaseUrl);
