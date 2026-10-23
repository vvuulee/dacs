import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  getMyCart,
  addToCart as apiAddToCart,
  updateCartItemQuantity,
  removeCartItem,
  clearCart as apiClearCart,
} from '../services/api';

const CartContext = createContext();

export const CartProvider = ({ children }) => {
  const [cart, setCart] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success', link = null) => {
    setToast({ message, type, link });
    setTimeout(() => {
      setToast(null);
    }, 4500);
  };

  const closeToast = () => setToast(null);

  const fetchCart = useCallback(async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      setCart(null);
      return;
    }
    try {
      setLoading(true);
      const data = await getMyCart();
      setCart(data);
    } catch (err) {
      console.error('Lỗi khi tải giỏ hàng:', err);
      if (err.response?.status === 401) {
        setCart(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Danh sách các mục trong giỏ
  const cartItems = cart?.cartItems || [];

  // Tổng số lượng máy trong giỏ (ví dụ mua 2 máy màu Xám + 1 máy màu Bạc = 3 máy)
  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 0), 0);

  // Tổng tiền giỏ hàng
  const totalPrice = cartItems.reduce((sum, item) => {
    const itemPrice = item.productVariant?.price ?? item.productVariant?.product?.price ?? 0;
    return sum + itemPrice * (item.quantity || 0);
  }, 0);

  // Hàm thêm vào giỏ hàng
  const addItemToCart = async (variantId, quantity = 1, displayName = '') => {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      throw new Error('AUTH_REQUIRED');
    }

    try {
      const res = await apiAddToCart(variantId, quantity);
      await fetchCart();
      
      showToast(
        displayName
          ? `Đã thêm ${quantity} x "${displayName}" vào giỏ hàng!`
          : `Đã thêm ${quantity} sản phẩm vào giỏ hàng thành công!`,
        'success',
        '/cart'
      );
      return res;
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setCart(null);
        throw new Error('AUTH_REQUIRED');
      }
      throw err;
    }
  };

  // Cập nhật số lượng của một mục
  const updateItemQty = async (cartItemId, newQuantity, maxStock) => {
    if (newQuantity < 1) return;
    if (maxStock != null && newQuantity > maxStock) {
      showToast(`Số lượng vượt quá tồn kho hiện có (${maxStock} máy)!`, 'error');
      return;
    }

    try {
      await updateCartItemQuantity(cartItemId, newQuantity);
      await fetchCart();
    } catch (err) {
      console.error('Lỗi cập nhật số lượng:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể cập nhật số lượng!';
      showToast(typeof msg === 'string' ? msg : 'Lỗi cập nhật số lượng', 'error');
    }
  };

  // Xóa một món khỏi giỏ
  const removeItem = async (cartItemId) => {
    try {
      await removeCartItem(cartItemId);
      await fetchCart();
      showToast('Đã xóa sản phẩm khỏi giỏ hàng', 'success');
    } catch (err) {
      console.error('Lỗi khi xóa sản phẩm:', err);
      showToast('Không thể xóa sản phẩm lúc này!', 'error');
    }
  };

  // Làm rỗng giỏ hàng
  const clearAllCart = async () => {
    try {
      await apiClearCart();
      await fetchCart();
      showToast('Đã làm trống toàn bộ giỏ hàng', 'success');
    } catch (err) {
      console.error('Lỗi làm trống giỏ hàng:', err);
      showToast('Không thể làm trống giỏ hàng!', 'error');
    }
  };

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems,
        cartCount,
        totalPrice,
        loading,
        fetchCart,
        addToCart: addItemToCart,
        updateItemQty,
        removeItem,
        clearAllCart,
        showToast,
      }}
    >
      {children}

      {/* Thông báo dạng Toast nổi toàn ứng dụng */}
      {toast && (
        <div className="fixed top-20 right-4 z-50 max-w-sm w-full animate-fade-in shadow-2xl">
          <div
            className={`p-4 rounded-2xl border text-white flex items-start gap-3 backdrop-blur-md ${
              toast.type === 'success'
                ? 'bg-gray-900/95 border-emerald-500 shadow-emerald-500/10'
                : 'bg-red-900/95 border-red-500 shadow-red-500/10'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
              toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-500 text-white'
            }`}>
              {toast.type === 'success' ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="font-bold">!</span>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm leading-snug">{toast.message}</p>
              {toast.link && (
                <Link
                  to={toast.link}
                  onClick={closeToast}
                  className="inline-flex items-center gap-1 mt-2.5 text-xs font-bold bg-white text-brand-dark px-3.5 py-1.5 rounded-lg hover:bg-gray-100 transition shadow-sm"
                >
                  <span>Xem giỏ hàng</span>
                  <span>→</span>
                </Link>
              )}
            </div>

            <button
              onClick={closeToast}
              className="text-gray-400 hover:text-white text-lg leading-none p-1 transition"
              title="Đóng"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

