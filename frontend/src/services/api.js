import axios from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8080/api', 
  headers: {
    'Content-Type': 'application/json',
  },
});

// Tự động đính kèm Token JWT nếu người dùng đã đăng nhập
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token && token !== 'undefined' && token !== 'null') {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý tự động khi Token hết hạn hoặc không hợp lệ (401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    return Promise.reject(error);
  }
);

export const getLaptops = async () => {
  try {
    const response = await apiClient.get('/products'); 
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy dữ liệu laptop:", error);
    return []; 
  }
};

export const getProductById = async (id) => {
  const response = await apiClient.get(`/products/${id}`);
  return response.data;
};

export const getVariantsByProduct = async (productId) => {
  try {
    const response = await apiClient.get(`/variants/product/${productId}`);
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy biến thể sản phẩm:", error);
    return [];
  }
};

export const getToppings = async () => {
  try {
    const response = await apiClient.get('/toppings');
    return response.data;
  } catch (error) {
    console.error("Lỗi khi lấy danh sách topping:", error);
    return [];
  }
};

export const addToCart = async (variantId, quantity = 1) => {
  const response = await apiClient.post('/carts/add', { variantId, quantity });
  return response.data;
};

export const getMyCart = async () => {
  const response = await apiClient.get('/carts/my-cart');
  return response.data;
};

export const updateCartItemQuantity = async (cartItemId, quantity) => {
  const response = await apiClient.put(`/carts/items/${cartItemId}`, null, {
    params: { quantity },
  });
  return response.data;
};

export const removeCartItem = async (cartItemId) => {
  const response = await apiClient.delete(`/carts/remove/${cartItemId}`);
  return response.data;
};

export const clearCart = async () => {
  const response = await apiClient.delete('/carts/clear');
  return response.data;
};

export const getUserProfile = async () => {
  const response = await apiClient.get('/users/profile');
  return response.data;
};

export const updateUserProfile = async (profileData) => {
  const response = await apiClient.put('/users/profile', profileData);
  return response.data;
};

export const getMyOrders = async () => {
  const response = await apiClient.get('/orders/my-orders');
  return response.data;
};

export const checkoutCart = async (checkoutData) => {
  const response = await apiClient.post('/orders/checkout-cart', checkoutData);
  return response.data;
};

export const cancelOrder = async (orderId) => {
  const response = await apiClient.put(`/orders/${orderId}/cancel`);
  return response.data;
};

// Admin: Lấy toàn bộ đơn hàng trong hệ thống
export const getAllOrders = async () => {
  const response = await apiClient.get('/orders');
  return response.data;
};

// Admin: Cập nhật trạng thái đơn hàng (ví dụ chuyển sang SHIPPING "Đang giao")
export const updateOrderStatus = async (orderId, status) => {
  const response = await apiClient.put(`/orders/${orderId}/status`, { status });
  return response.data;
};

// Khách hàng: Xác nhận đã nhận được hàng
export const markOrderAsReceived = async (orderId) => {
  const response = await apiClient.put(`/orders/${orderId}/received`);
  return response.data;
};

// Khách hàng: Gửi đánh giá cho đơn hàng đã nhận
export const reviewOrder = async (orderId, reviewData) => {
  const response = await apiClient.post(`/orders/${orderId}/review`, reviewData);
  return response.data;
};

// Admin: Lấy danh sách toàn bộ Quản trị viên
export const getAdminUsers = async () => {
  const response = await apiClient.get('/users/admins');
  return response.data;
};

// Admin: Trao quyền Quản trị viên cho User bằng Email và Tên
export const grantAdminRole = async (data) => {
  const response = await apiClient.post('/users/grant-admin', data);
  return response.data;
};

// Admin: Thu hồi quyền Quản trị viên (Gỡ quyền Admin)
export const revokeAdminRole = async (data) => {
  const response = await apiClient.post('/users/revoke-admin', data);
  return response.data;
};

// Khách hàng & Khách vãng lai: Chat với AI tư vấn bán laptop
export const chatWithAI = async (message) => {
  const response = await apiClient.post('/chat', { message });
  return response.data;
};

export default apiClient;