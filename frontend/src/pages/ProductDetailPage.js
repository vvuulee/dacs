import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getProductById, getVariantsByProduct } from '../services/api';
import { useCart } from '../context/CartContext';

// Hàm ánh xạ tên màu sắc phổ biến sang mã màu Hex hiển thị
const getColorHex = (colorName) => {
  if (!colorName) return '#94a3b8';
  const name = colorName.toLowerCase();
  if (name.includes('đen') || name.includes('black') || name.includes('dark')) return '#1e293b';
  if (name.includes('trắng') || name.includes('white')) return '#f8fafc';
  if (name.includes('bạc') || name.includes('silver')) return '#cbd5e1';
  if (name.includes('xám') || name.includes('gray') || name.includes('grey') || name.includes('space')) return '#64748b';
  if (name.includes('vàng') || name.includes('gold')) return '#eab308';
  if (name.includes('xanh dương') || name.includes('blue') || name.includes('navy')) return '#2563eb';
  if (name.includes('xanh lá') || name.includes('green')) return '#16a34a';
  if (name.includes('đỏ') || name.includes('red')) return '#dc2626';
  if (name.includes('hồng') || name.includes('pink') || name.includes('rose')) return '#f472b6';
  if (name.includes('tím') || name.includes('purple')) return '#9333ea';
  if (name.includes('cam') || name.includes('orange')) return '#ea580c';
  return '#94a3b8';
};

const ProductDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [variants, setVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    const fetchProductData = async () => {
      try {
        setLoading(true);
        // 1. Lấy thông tin chi tiết sản phẩm
        const prodData = await getProductById(id);
        setProduct(prodData);

        // 2. Lấy danh sách biến thể (variants) thực tế từ Database
        const variantList = await getVariantsByProduct(id);
        if (variantList && variantList.length > 0) {
          setVariants(variantList);
          // Mặc định chọn phiên bản đầu tiên còn hàng hoặc đầu danh sách
          const firstInStock = variantList.find((v) => v.stockQuantity == null || v.stockQuantity > 0);
          setSelectedVariant(firstInStock || variantList[0]);
        } else {
          setVariants([]);
          setSelectedVariant(null);
        }
      } catch (error) {
        console.error('Lỗi khi tải chi tiết sản phẩm:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  const hasVariants = variants && variants.length > 0;
  const isOutOfStock = selectedVariant && selectedVariant.stockQuantity !== null && selectedVariant.stockQuantity <= 0;
  const maxStock = selectedVariant?.stockQuantity != null ? Math.max(1, selectedVariant.stockQuantity) : 99;
  const isActionDisabled = !hasVariants || isOutOfStock;

  const handleSelectVariant = (variant) => {
    setSelectedVariant(variant);
    // Điều chỉnh số lượng nếu vượt quá tồn kho của biến thể mới
    if (variant.stockQuantity != null && variant.stockQuantity > 0) {
      if (quantity > variant.stockQuantity) {
        setQuantity(variant.stockQuantity);
      }
    } else {
      setQuantity(1);
    }
  };

  const handleAddToCart = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      navigate('/login');
      return;
    }

    if (!hasVariants) {
      alert('Sản phẩm này chưa có phiên bản màu sắc sẵn sàng!');
      return;
    }

    const variantId = selectedVariant?.id;
    if (!variantId) {
      alert('Vui lòng chọn màu sắc trước khi thêm vào giỏ hàng!');
      return;
    }

    if (isOutOfStock) {
      alert('Phiên bản màu sắc này hiện đã hết hàng, vui lòng chọn màu khác!');
      return;
    }

    try {
      setIsAdding(true);
      const displayName = `${product.name} (${selectedVariant?.color || ''})`;
      await addToCart(variantId, quantity, displayName);
    } catch (err) {
      console.error('Lỗi thêm giỏ hàng:', err);
      if (err.message === 'AUTH_REQUIRED' || err.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : data?.message || err.message || 'Không thể thêm vào giỏ hàng!';
      alert(msg);
    } finally {
      setIsAdding(false);
    }
  };

  const handleBuyNow = async () => {
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      alert('Vui lòng đăng nhập để mua hàng!');
      navigate('/login');
      return;
    }

    if (!hasVariants) {
      alert('Sản phẩm này chưa có phiên bản để mua!');
      return;
    }

    const variantId = selectedVariant?.id;
    if (!variantId) {
      alert('Vui lòng chọn phiên bản cấu hình/màu sắc trước khi mua!');
      return;
    }

    if (isOutOfStock) {
      alert('Phiên bản màu sắc này hiện đã hết hàng, vui lòng chọn màu khác!');
      return;
    }

    try {
      setIsAdding(true);
      const displayName = `${product.name} (${selectedVariant?.color || ''})`;
      await addToCart(variantId, quantity, displayName);
      navigate('/checkout');
    } catch (err) {
      console.error('Lỗi mua ngay:', err);
      if (err.message === 'AUTH_REQUIRED' || err.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : data?.message || err.message || 'Không thể tiến hành mua ngay!';
      alert(msg);
    } finally {
      setIsAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-brand-light min-h-screen font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 font-semibold animate-pulse">
          Đang tải thông tin sản phẩm...
        </div>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="bg-brand-light min-h-screen font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold text-brand-dark">Không tìm thấy sản phẩm</h2>
          <Link to="/" className="px-6 py-2.5 bg-brand-dark text-white rounded-lg text-sm font-semibold">
            Quay lại trang chủ
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  // Lấy giá hiển thị: Ưu tiên giá của biến thể đang được chọn, nếu không có lấy giá gốc sản phẩm
  const displayPrice = selectedVariant?.price ?? product.price;

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-10 flex-1">
        <div className="mb-6">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-brand-dark underline flex items-center gap-1">
            <span>←</span> Quay lại danh sách sản phẩm
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-10 grid grid-cols-1 md:grid-cols-2 gap-10">
          {/* Cột trái: Hình ảnh */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center bg-gray-50 rounded-2xl p-6 min-h-[360px] border border-gray-100">
              <img
                src={selectedVariant?.imageUrl || product.imageUrl || 'https://via.placeholder.com/400?text=No+Image'}
                alt={product.name}
                className="w-full max-h-96 object-contain transition-all duration-300"
              />
            </div>

            {/* Ảnh thu nhỏ các màu sắc nếu có nhiều biến thể */}
            {variants.length > 1 && (
              <div className="flex items-center justify-center gap-3 overflow-x-auto py-1">
                {variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => handleSelectVariant(v)}
                      className={`w-16 h-16 rounded-xl p-1.5 border-2 transition-all overflow-hidden bg-white flex flex-col items-center justify-center ${
                        isSelected
                          ? 'border-brand-dark ring-2 ring-brand-dark/20 shadow-sm'
                          : 'border-gray-200 hover:border-gray-400 opacity-70 hover:opacity-100'
                      }`}
                      title={v.color}
                    >
                      <img
                        src={v.imageUrl || product.imageUrl || 'https://via.placeholder.com/100?text=Color'}
                        alt={v.color}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Cột phải: Thông tin, Tùy chọn & Nút mua */}
          <div className="flex flex-col justify-between">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold text-brand-dark">
                {product.name}
              </h1>

              {/* Giá tự động thay đổi theo tùy chọn */}
              <div className="text-3xl font-extrabold text-red-600 mt-4 pb-6 border-b border-gray-100 flex items-baseline gap-3">
                <span>
                  {displayPrice ? Number(displayPrice).toLocaleString('vi-VN') + ' ₫' : 'Liên hệ'}
                </span>
                {selectedVariant && selectedVariant.price && product.price && Number(selectedVariant.price) !== Number(product.price) && (
                  <span className="text-sm font-normal text-gray-400 line-through">
                    {Number(product.price).toLocaleString('vi-VN')} ₫
                  </span>
                )}
              </div>

              {/* Khu vực chọn màu sắc (Color) từ Database */}
              {hasVariants ? (
                <div className="mt-6 p-4 rounded-xl bg-gray-50/70 border border-gray-100">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold text-brand-dark">
                      Màu sắc:{' '}
                      <span className="font-bold text-blue-600">
                        {selectedVariant?.color || 'Mặc định'}
                      </span>
                    </p>
                    {selectedVariant?.stockQuantity !== undefined && selectedVariant?.stockQuantity !== null && (
                      <span
                        className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                          selectedVariant.stockQuantity > 0
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-600'
                        }`}
                      >
                        {selectedVariant.stockQuantity > 0
                          ? `Còn ${selectedVariant.stockQuantity} máy`
                          : 'Tạm hết hàng'}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {variants.map((v) => {
                      const isSelected = selectedVariant?.id === v.id;
                      const isVariantOutOfStock = v.stockQuantity !== null && v.stockQuantity <= 0;

                      return (
                        <button
                          key={v.id}
                          type="button"
                          disabled={isVariantOutOfStock}
                          onClick={() => handleSelectVariant(v)}
                          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-medium border transition-all flex items-center gap-2.5 ${
                            isSelected
                              ? 'bg-brand-dark text-white border-brand-dark shadow-md ring-2 ring-brand-dark/20'
                              : isVariantOutOfStock
                              ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-50'
                              : 'bg-white text-brand-dark border-gray-200 hover:border-brand-dark hover:bg-gray-50'
                          }`}
                        >
                          {/* Chấm tròn biểu thị màu sắc */}
                          <span
                            className="w-4 h-4 rounded-full border border-gray-300 shadow-inner shrink-0"
                            style={{ backgroundColor: getColorHex(v.color) }}
                          />
                          <span className="font-semibold">{v.color || `Màu #${v.id}`}</span>
                          {v.price && (
                            <span
                              className={`text-xs ml-1 ${
                                isSelected ? 'text-yellow-300' : 'text-gray-500'
                              }`}
                            >
                              {Number(v.price).toLocaleString('vi-VN')} ₫
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="mt-6 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm flex items-center gap-2">
                  <span>ℹ️ Sản phẩm này chưa được cấu hình màu sắc trong cơ sở dữ liệu.</span>
                </div>
              )}

              {/* Thông số kỹ thuật chi tiết */}
              <div className="mt-6">
                <h3 className="text-sm font-bold uppercase text-gray-500 mb-3">
                  Thông số kỹ thuật
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 text-sm">
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">CPU:</span>
                    <span className="col-span-2 font-semibold text-brand-dark">{product.cpu || 'Đang cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">RAM:</span>
                    <span className="col-span-2 font-semibold text-brand-dark">{product.ramGb ? `${product.ramGb} GB` : 'Đang cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Ổ cứng:</span>
                    <span className="col-span-2 font-semibold text-brand-dark">{product.storageGb ? `${product.storageGb} GB SSD` : 'Đang cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Card đồ họa:</span>
                    <span className="col-span-2 font-semibold text-brand-dark">{product.vga || 'Đang cập nhật'}</span>
                  </div>
                  <div className="grid grid-cols-3">
                    <span className="text-gray-500">Màn hình:</span>
                    <span className="col-span-2 font-semibold text-brand-dark">{product.screenSize || 'Đang cập nhật'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chọn số lượng sản phẩm & Đặt mua */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-brand-dark">Số lượng:</span>
                  <div className="flex items-center border border-gray-300 rounded-lg bg-white overflow-hidden shadow-sm">
                    <button
                      type="button"
                      disabled={quantity <= 1 || isActionDisabled}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      className="px-3.5 py-1.5 text-base font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={maxStock}
                      value={quantity}
                      disabled={isActionDisabled}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10);
                        if (isNaN(val) || val < 1) setQuantity(1);
                        else if (val > maxStock) setQuantity(maxStock);
                        else setQuantity(val);
                      }}
                      className="w-14 text-center py-1 font-semibold text-brand-dark border-x border-gray-200 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400"
                    />
                    <button
                      type="button"
                      disabled={quantity >= maxStock || isActionDisabled}
                      onClick={() => setQuantity((q) => Math.min(maxStock, q + 1))}
                      className="px-3.5 py-1.5 text-base font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Thông tin số lượng trong kho */}
                <div className="text-xs text-gray-500">
                  {!hasVariants ? (
                    <span className="text-amber-600 font-medium">⚠️ Chưa có phiên bản màu sẵn sàng</span>
                  ) : isOutOfStock ? (
                    <span className="text-red-500 font-bold">⚠️ Sản phẩm tạm thời hết hàng</span>
                  ) : selectedVariant?.stockQuantity != null ? (
                    <span>
                      Tồn kho: <strong className="text-brand-dark font-bold">{selectedVariant.stockQuantity}</strong> sản phẩm có sẵn
                    </span>
                  ) : (
                    <span className="text-green-600 font-medium">Sản phẩm có sẵn giao ngay</span>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  disabled={isActionDisabled || isAdding}
                  onClick={handleAddToCart}
                  className="flex-1 border-2 border-brand-dark text-brand-dark py-3.5 px-4 rounded-xl hover:bg-brand-dark hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  {isAdding ? (
                    <span className="animate-pulse">Đang thêm...</span>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>
                        <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/>
                        <circle cx="18" cy="20" r="2"/>
                        <circle cx="8" cy="20" r="2"/>
                      </svg>
                      <span>Thêm vào giỏ hàng</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  disabled={isActionDisabled || isAdding}
                  onClick={handleBuyNow}
                  className="flex-1 bg-brand-dark text-white py-3.5 px-4 rounded-xl hover:bg-black disabled:opacity-40 disabled:cursor-not-allowed transition font-semibold text-sm shadow-sm flex items-center justify-center gap-2"
                >
                  {!hasVariants ? 'Chưa có hàng' : isOutOfStock ? 'Tạm hết hàng' : isAdding ? 'Đang chuyển...' : 'Mua ngay'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default ProductDetailPage;