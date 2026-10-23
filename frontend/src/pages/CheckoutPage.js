import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getUserProfile, checkoutCart } from '../services/api';
import { useCart } from '../context/CartContext';

/**
 * Trang thanh toán (CheckoutPage) độc lập
 * - Hỗ trợ chọn địa chỉ từ Profile hoặc nhập người nhận / SĐT / địa chỉ mới
 * - Chọn phương thức thanh toán (COD hoặc Chuyển khoản)
 * - Tóm tắt chi tiết giỏ hàng và tổng tiền
 */
const CheckoutPage = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { cartItems, cartCount, totalPrice, fetchCart, showToast } = useCart();

  const [profile, setProfile] = useState(null);
  const [addressOption, setAddressOption] = useState('saved'); // 'saved' hoặc 'new'
  const [paymentMethod, setPaymentMethod] = useState('COD'); // 'COD' hoặc 'BANK_TRANSFER'

  // Thông tin người nhận
  const [formData, setFormData] = useState({
    receiverName: '',
    receiverPhone: '',
    shippingAddress: '',
  });

  // Thông tin nếu chọn nhập mới
  const [newAddressData, setNewAddressData] = useState({
    receiverName: '',
    receiverPhone: '',
    shippingAddress: '',
  });

  const [checkoutError, setCheckoutError] = useState('');
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  // Tải thông tin hồ sơ
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const loadProfile = async () => {
      try {
        const userProfile = await getUserProfile();
        setProfile(userProfile);

        if (userProfile.address && userProfile.address.trim()) {
          setAddressOption('saved');
          setFormData({
            receiverName: userProfile.fullName || '',
            receiverPhone: userProfile.phone || '',
            shippingAddress: userProfile.address || '',
          });
        } else {
          // Chưa có địa chỉ trong profile thì chuyển sang nhập mới
          setAddressOption('new');
        }
      } catch (err) {
        console.error('Không tải được profile:', err);
        const stored = JSON.parse(localStorage.getItem('user') || '{}');
        setProfile(stored);
        setAddressOption('new');
      }
    };

    loadProfile();
  }, [token, navigate]);

  // Cập nhật formData mỗi khi đổi lựa chọn địa chỉ
  useEffect(() => {
    if (addressOption === 'saved' && profile) {
      setFormData({
        receiverName: profile.fullName || '',
        receiverPhone: profile.phone || '',
        shippingAddress: profile.address || '',
      });
    } else if (addressOption === 'new') {
      setFormData(newAddressData);
    }
  }, [addressOption, profile, newAddressData]);

  const handleNewDataChange = (field, value) => {
    const updated = { ...newAddressData, [field]: value };
    setNewAddressData(updated);
    if (addressOption === 'new') {
      setFormData(updated);
    }
  };

  const handleConfirmOrder = async (e) => {
    e.preventDefault();

    if (!formData.receiverName || !formData.receiverName.trim()) {
      setCheckoutError('Vui lòng cung cấp họ tên người nhận hàng!');
      return;
    }
    if (!formData.receiverPhone || !formData.receiverPhone.trim()) {
      setCheckoutError('Vui lòng cung cấp số điện thoại người nhận hàng!');
      return;
    }
    if (!formData.shippingAddress || !formData.shippingAddress.trim()) {
      setCheckoutError('Vui lòng cung cấp địa chỉ nhận hàng chi tiết!');
      return;
    }

    try {
      setIsCheckingOut(true);
      setCheckoutError('');

      await checkoutCart({
        receiverName: formData.receiverName.trim(),
        receiverPhone: formData.receiverPhone.trim(),
        shippingAddress: formData.shippingAddress.trim(),
        paymentMethod: paymentMethod,
      });

      await fetchCart();

      if (showToast) {
        showToast('Đặt hàng thành công! Đơn hàng của bạn đang được chuẩn bị giao.', 'success');
      }
      navigate('/orders');
    } catch (err) {
      console.error('Lỗi khi đặt hàng:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể tạo đơn hàng lúc này!';
      setCheckoutError(typeof msg === 'string' ? msg : 'Lỗi khi tạo đơn hàng!');
    } finally {
      setIsCheckingOut(false);
    }
  };

  if (cartCount === 0) {
    return (
      <div className="bg-brand-light min-h-screen font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-brand-dark mb-2">Giỏ hàng đang trống</h2>
          <p className="text-gray-500 mb-6 text-sm">Bạn chưa có sản phẩm nào để tiến hành thanh toán.</p>
          <Link to="/" className="bg-brand-dark text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-black transition shadow-sm text-sm">
            Mua sắm ngay
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 md:py-12 flex-1 max-w-6xl">
        {/* Breadcrumb & Tiêu đề */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
            <Link to="/" className="hover:underline">Trang chủ</Link>
            <span>/</span>
            <Link to="/cart" className="hover:underline">Giỏ hàng</Link>
            <span>/</span>
            <span className="text-brand-dark font-semibold">Thanh toán</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark">Xác nhận thanh toán đơn hàng</h1>
          <p className="text-sm text-gray-500 mt-1">Vui lòng kiểm tra địa chỉ giao nhận và phương thức thanh toán</p>
        </div>

        {checkoutError && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 text-red-700 text-sm font-medium border border-red-200 flex items-center gap-3">
            <span className="text-lg">⚠️</span>
            <span>{checkoutError}</span>
          </div>
        )}

        <form onSubmit={handleConfirmOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            {/* Cột trái: Thông tin nhận hàng & Phương thức thanh toán (2 Cột) */}
            <div className="lg:col-span-2 space-y-6">
              {/* 1. LỰA CHỌN ĐỊA CHỈ NHẬN HÀNG */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                  <span className="w-7 h-7 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-xs">
                    1
                  </span>
                  <h2 className="text-lg font-bold text-brand-dark">Địa chỉ nhận hàng</h2>
                </div>

                <div className="space-y-4">
                  {/* Option 1: Địa chỉ đã lưu trong hồ sơ */}
                  <label
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition ${
                      addressOption === 'saved'
                        ? 'border-brand-dark bg-amber-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="addressOption"
                        value="saved"
                        checked={addressOption === 'saved'}
                        onChange={() => setAddressOption('saved')}
                        className="mt-1 accent-brand-dark w-4 h-4"
                      />
                      <div className="flex-1 text-sm">
                        <div className="font-bold text-brand-dark flex items-center gap-2">
                          <span>Địa chỉ mặc định của bạn (Đã lưu trong Profile)</span>
                          {profile?.address && (
                            <span className="text-[11px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                              Khuyên dùng
                            </span>
                          )}
                        </div>

                        {profile?.address ? (
                          <div className="mt-2 text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100 space-y-1">
                            <p><strong className="text-brand-dark">Người nhận:</strong> {profile.fullName || '(Chưa cập nhật tên)'}</p>
                            <p><strong className="text-brand-dark">Số điện thoại:</strong> {profile.phone || '(Chưa có SĐT)'}</p>
                            <p><strong className="text-brand-dark">Địa chỉ:</strong> {profile.address}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-amber-600 mt-1 italic">
                            Bạn chưa lưu địa chỉ trong hồ sơ. Vui lòng chọn "Giao đến địa chỉ khác" bên dưới hoặc cập nhật trong trang cá nhân.
                          </p>
                        )}
                      </div>
                    </div>
                  </label>

                  {/* Option 2: Nhập địa chỉ mới / người nhận khác */}
                  <label
                    className={`block p-4 rounded-xl border-2 cursor-pointer transition ${
                      addressOption === 'new'
                        ? 'border-brand-dark bg-amber-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <input
                        type="radio"
                        name="addressOption"
                        value="new"
                        checked={addressOption === 'new'}
                        onChange={() => setAddressOption('new')}
                        className="mt-1 accent-brand-dark w-4 h-4"
                      />
                      <div className="flex-1">
                        <span className="font-bold text-brand-dark text-sm">Giao đến địa chỉ khác / Người nhận khác</span>
                        <p className="text-xs text-gray-500 mt-0.5">Nhập thông tin người nhận và địa chỉ mới riêng cho đơn này</p>
                      </div>
                    </div>

                    {/* Form nhập thông tin khi chọn "Địa chỉ mới" */}
                    {addressOption === 'new' && (
                      <div className="mt-4 pt-4 border-t border-gray-200 space-y-3.5">
                        <div>
                          <label className="block text-xs font-bold uppercase text-brand-dark mb-1">
                            Họ và tên người nhận <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Ví dụ: Nguyễn Văn An"
                            value={newAddressData.receiverName}
                            onChange={(e) => handleNewDataChange('receiverName', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-brand-dark mb-1">
                            Số điện thoại nhận hàng <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="tel"
                            placeholder="Ví dụ: 0987654321"
                            value={newAddressData.receiverPhone}
                            onChange={(e) => handleNewDataChange('receiverPhone', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-bold uppercase text-brand-dark mb-1">
                            Địa chỉ giao hàng chi tiết <span className="text-red-500">*</span>
                          </label>
                          <textarea
                            rows="2"
                            placeholder="Số nhà, ngõ/ngách, tên đường, phường/xã, quận/huyện, tỉnh/thành phố"
                            value={newAddressData.shippingAddress}
                            onChange={(e) => handleNewDataChange('shippingAddress', e.target.value)}
                            className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition resize-none"
                          />
                        </div>
                      </div>
                    )}
                  </label>
                </div>
              </div>

              {/* 2. LỰA CHỌN PHƯƠNG THỨC THANH TOÁN */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <div className="flex items-center gap-2.5 mb-4 pb-3 border-b border-gray-100">
                  <span className="w-7 h-7 rounded-full bg-brand-dark text-white flex items-center justify-center font-bold text-xs">
                    2
                  </span>
                  <h2 className="text-lg font-bold text-brand-dark">Phương thức thanh toán</h2>
                </div>

                <div className="space-y-3">
                  {/* COD */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                      paymentMethod === 'COD'
                        ? 'border-brand-dark bg-amber-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="COD"
                      checked={paymentMethod === 'COD'}
                      onChange={() => setPaymentMethod('COD')}
                      className="mt-1 accent-brand-dark w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-dark text-sm">Thanh toán khi nhận hàng (COD)</span>
                        <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded">Tiền mặt</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Quý khách được kiểm tra máy trước khi thanh toán tiền mặt trực tiếp cho nhân viên giao hàng.
                      </p>
                    </div>
                  </label>

                  {/* CHUYỂN KHOẢN */}
                  <label
                    className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition ${
                      paymentMethod === 'BANK_TRANSFER'
                        ? 'border-brand-dark bg-amber-50/20 shadow-xs'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value="BANK_TRANSFER"
                      checked={paymentMethod === 'BANK_TRANSFER'}
                      onChange={() => setPaymentMethod('BANK_TRANSFER')}
                      className="mt-1 accent-brand-dark w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-dark text-sm">Chuyển khoản ngân hàng (Qua mã QR)</span>
                        <span className="text-xs bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded">VietQR / 247</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        Chuyển khoản an toàn, nhanh chóng thông qua quét mã QR tại bước hoàn tất đơn.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Cột phải: Tóm tắt đơn hàng & Nút Xác nhận */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 space-y-5 sticky top-24">
              <h2 className="text-lg font-bold text-brand-dark pb-3 border-b border-gray-100">
                Đơn hàng ({cartCount} sản phẩm)
              </h2>

              {/* Danh sách các sản phẩm thu nhỏ */}
              <div className="max-h-60 overflow-y-auto space-y-3 pr-1 text-sm">
                {cartItems.map((item) => {
                  const variant = item.productVariant;
                  const product = variant?.product;
                  const price = variant?.price ?? product?.price ?? 0;
                  const img = variant?.imageUrl || product?.imageUrl || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';

                  return (
                    <div key={item.id} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-b-0">
                      <img
                        src={img}
                        alt={product?.name || 'Laptop'}
                        className="w-12 h-12 object-cover rounded-lg border border-gray-100 shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-brand-dark text-xs truncate">{product?.name || 'Laptop'}</p>
                        <p className="text-[11px] text-gray-500">Màu: {variant?.color || 'Chuẩn'} × {item.quantity}</p>
                      </div>
                      <div className="text-xs font-bold text-brand-dark whitespace-nowrap">
                        {(Number(price) * item.quantity).toLocaleString('vi-VN')} ₫
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Tính tiền */}
              <div className="space-y-2.5 text-sm pt-2 border-t border-gray-100">
                <div className="flex justify-between text-gray-600">
                  <span>Tạm tính ({cartCount} máy):</span>
                  <span className="font-semibold text-brand-dark">{totalPrice.toLocaleString('vi-VN')} ₫</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Phí vận chuyển:</span>
                  <span className="font-semibold text-green-600">Miễn phí toàn quốc</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Bảo hành chính hãng:</span>
                  <span className="font-semibold text-brand-dark">12 tháng 1 đổi 1</span>
                </div>
              </div>

              {/* Tổng thanh toán */}
              <div className="pt-4 border-t border-gray-100 flex justify-between items-baseline">
                <span className="text-base font-bold text-brand-dark">Tổng thanh toán:</span>
                <span className="text-2xl font-extrabold text-red-600">
                  {totalPrice.toLocaleString('vi-VN')} ₫
                </span>
              </div>

              {/* Nút bấm */}
              <div className="space-y-3 pt-2">
                <button
                  type="submit"
                  disabled={isCheckingOut}
                  className="w-full bg-brand-dark text-white py-3.5 px-4 rounded-xl font-bold text-sm hover:bg-black transition shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isCheckingOut ? (
                    <>
                      <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Đang tạo đơn hàng...</span>
                    </>
                  ) : (
                    <span>Xác nhận đặt hàng</span>
                  )}
                </button>

                <Link
                  to="/cart"
                  className="w-full block text-center text-xs font-semibold text-gray-500 hover:text-brand-dark py-1"
                >
                  ← Quay lại chỉnh sửa giỏ hàng
                </Link>
              </div>
            </div>
          </div>
        </form>
      </div>

      <Footer />
    </div>
  );
};

export default CheckoutPage;
