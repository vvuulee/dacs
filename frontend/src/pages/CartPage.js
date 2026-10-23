import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
// import { getUserProfile, checkoutCart } from '../services/api'; // Removed, checkout moved to CheckoutPage

const CartPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const {
    cartItems,
    cartCount,
    totalPrice,
    loading,
    updateItemQty,
    removeItem,
    clearAllCart,
  } = useCart();

  const [updatingId, setUpdatingId] = useState(null);

  const handleQuantityChange = async (cartItemId, newQuantity, maxStock) => {
    if (newQuantity < 1) return;
    if (maxStock != null && newQuantity > maxStock) {
      alert(`Số lượng vượt quá tồn kho hiện có (${maxStock} sản phẩm)!`);
      return;
    }

    try {
      setUpdatingId(cartItemId);
      await updateItemQty(cartItemId, newQuantity, maxStock);
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRemove = async (cartItemId) => {
    if (window.confirm('Bạn có chắc muốn xóa sản phẩm này khỏi giỏ hàng?')) {
      await removeItem(cartItemId);
    }
  };

  const handleClear = async () => {
    if (window.confirm('Bạn có chắc muốn làm trống toàn bộ giỏ hàng?')) {
      await clearAllCart();
    }
  };

  // Chuyển sang trang thanh toán riêng (CheckoutPage)
  const handleOpenCheckout = () => {
    navigate('/checkout');
  };

  if (!token) {
    return (
      <div className="bg-brand-light min-h-screen font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-dark mb-2">Vui lòng đăng nhập</h2>
          <p className="text-gray-500 max-w-sm mb-6">Bạn cần đăng nhập tài khoản để xem và quản lý các sản phẩm trong giỏ hàng.</p>
          <button
            onClick={() => navigate('/login')}
            className="bg-brand-dark text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-black transition shadow-sm text-sm"
          >
            Đăng nhập ngay
          </button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-10 flex-1">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark">Giỏ hàng của bạn</h1>
            <p className="text-sm text-gray-500 mt-1">
              {cartCount > 0 ? `Đang có ${cartCount} sản phẩm (${cartItems.length} loại) trong giỏ` : 'Giỏ hàng đang trống'}
            </p>
          </div>
          {cartItems.length > 0 && (
            <button
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 hover:underline font-semibold flex items-center gap-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              <span>Làm trống giỏ hàng</span>
            </button>
          )}
        </div>

        {loading && cartItems.length === 0 ? (
          <div className="text-center py-20 text-gray-500 font-semibold animate-pulse">
            Đang tải dữ liệu giỏ hàng...
          </div>
        ) : cartItems.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-gray-100 max-w-xl mx-auto">
            <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-brand-dark mb-2">Giỏ hàng của bạn đang trống</h2>
            <p className="text-gray-500 text-sm mb-6">
              Có vẻ bạn chưa thêm sản phẩm nào vào giỏ hàng. Hãy khám phá danh sách laptop chất lượng cao tại cửa hàng ngay nhé!
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="bg-brand-dark text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-black transition shadow-sm text-sm"
              >
                Khám phá Laptop ngay
              </Link>
              <Link
                to="/orders"
                className="bg-gray-100 text-gray-700 hover:bg-gray-200 px-5 py-2.5 rounded-xl font-semibold transition text-sm flex items-center gap-1.5"
              >
                <span>Xem lịch sử đơn hàng</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Cột danh sách sản phẩm */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const variant = item.productVariant;
                const product = variant?.product;
                const price = variant?.price ?? product?.price ?? 0;
                const maxStock = variant?.stockQuantity;
                const img = variant?.imageUrl || product?.imageUrl || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                const isItemUpdating = updatingId === item.id;

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-gray-100 flex flex-col sm:flex-row items-center gap-4 transition hover:border-gray-200"
                  >
                    {/* Ảnh sản phẩm */}
                    <Link to={`/product/${product?.id || ''}`} className="shrink-0 group">
                      <img
                        src={img}
                        alt={product?.name || 'Laptop'}
                        className="w-24 h-24 sm:w-28 sm:h-28 object-cover rounded-xl border border-gray-100 group-hover:scale-105 transition duration-300"
                      />
                    </Link>

                    {/* Thông tin sản phẩm */}
                    <div className="flex-1 text-center sm:text-left min-w-0">
                      <Link
                        to={`/product/${product?.id || ''}`}
                        className="font-bold text-brand-dark hover:text-blue-600 transition text-base block line-clamp-2"
                      >
                        {product?.name || 'Laptop cao cấp'}
                      </Link>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1.5 text-xs">
                        <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full font-medium">
                          Màu sắc: <strong>{variant?.color || 'Mặc định'}</strong>
                        </span>
                        {maxStock != null && (
                          <span className="text-gray-500">
                            (Còn {maxStock} máy)
                          </span>
                        )}
                      </div>
                      <div className="text-sm font-extrabold text-red-600 mt-2">
                        {Number(price).toLocaleString('vi-VN')} ₫
                      </div>
                    </div>

                    {/* Số lượng */}
                    <div className="flex items-center gap-3">
                      <div className="flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white shadow-sm">
                        <button
                          type="button"
                          disabled={item.quantity <= 1 || isItemUpdating}
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1, maxStock)}
                          className="px-3 py-1 font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                          -
                        </button>
                        <span className="w-10 text-center text-sm font-semibold text-brand-dark">
                          {isItemUpdating ? '...' : item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={(maxStock != null && item.quantity >= maxStock) || isItemUpdating}
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1, maxStock)}
                          className="px-3 py-1 font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 transition"
                        >
                          +
                        </button>
                      </div>

                      {/* Nút xóa */}
                      <button
                        type="button"
                        onClick={() => handleRemove(item.id)}
                        className="text-gray-400 hover:text-red-600 p-2 transition rounded-lg hover:bg-red-50"
                        title="Xóa khỏi giỏ hàng"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Cột tóm tắt đơn hàng & Thanh toán */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5 sticky top-24">
              <h2 className="text-lg font-bold text-brand-dark pb-3 border-b border-gray-100">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính</span>
                  <span className="font-semibold text-brand-dark">
                    {totalPrice.toLocaleString('vi-VN')} ₫
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển</span>
                  <span className="font-semibold text-green-600">Miễn phí toàn quốc</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Chính sách bảo hành</span>
                  <span className="font-semibold text-brand-dark">Chính hãng 12 tháng</span>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
                <span className="text-base font-bold text-brand-dark">Tổng cộng:</span>
                <span className="text-2xl font-extrabold text-red-600">
                  {totalPrice.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              <button
                type="button"
                onClick={handleOpenCheckout}
                className="w-full bg-brand-dark text-white py-3.5 px-4 rounded-xl font-bold text-sm hover:bg-black transition shadow-sm flex items-center justify-center gap-2"
              >
                <span>Tiến hành thanh toán</span>
                <span>→</span>
              </button>

              <div className="pt-2 flex flex-col gap-2">
                <Link
                  to="/orders"
                  className="w-full block text-center text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                >
                  Xem lịch sử đơn hàng đã đặt
                </Link>
                <Link
                  to="/"
                  className="w-full block text-center text-xs font-semibold text-gray-500 hover:text-brand-dark underline"
                >
                  Tiếp tục xem các mẫu laptop khác
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
};

export default CartPage;
