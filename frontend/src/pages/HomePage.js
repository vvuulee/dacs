import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import Banner from '../components/Banner';
import Footer from '../components/Footer';
import { getLaptops, getVariantsByProduct } from '../services/api';
import { useCart } from '../context/CartContext';

// Danh sách danh mục hỗ trợ
const CATEGORIES = [
  { id: 'ALL', name: 'Tất cả', icon: '💻' },
  { id: 'GAMING', name: 'Laptop Gaming', icon: '🎮' },
  { id: 'OFFICE', name: 'Laptop Văn Phòng', icon: '💼' },
  { id: 'MACBOOK', name: 'MacBook', icon: '🍎' },
];

// Hàm ánh xạ tên màu sắc phổ biến sang mã màu Hex
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

// Phân loại thông minh một sản phẩm vào 1 trong 3 nhóm chính: GAMING, OFFICE, MACBOOK
const getProductCategoryKey = (product) => {
  const catId = product.category?.id;
  const catName = (product.category?.name || product.categoryName || '').toLowerCase();
  const pName = (product.name || '').toLowerCase();

  // 1. Nhóm MacBook
  if (
    catId === 3 ||
    catName.includes('macbook') ||
    pName.includes('macbook') ||
    pName.includes('apple') ||
    pName.includes('air m') ||
    pName.includes('pro m')
  ) {
    return 'MACBOOK';
  }

  // 2. Nhóm Gaming
  if (
    catId === 1 ||
    catName.includes('gaming') ||
    pName.includes('gaming') ||
    pName.includes('tuf') ||
    pName.includes('nitro') ||
    pName.includes('legion') ||
    pName.includes('rog') ||
    pName.includes('predator') ||
    pName.includes('alienware') ||
    pName.includes('victus') ||
    pName.includes('loq') ||
    pName.includes('strix')
  ) {
    return 'GAMING';
  }

  // 3. Mặc định là nhóm Văn Phòng
  return 'OFFICE';
};

const HomePage = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { addToCart, showToast } = useCart();

  // Đọc params từ URL nếu người dùng search từ Header
  const queryParams = new URLSearchParams(location.search);
  const initialSearch = queryParams.get('search') || '';
  const initialCategory = queryParams.get('category') || 'ALL';

  // State cho Tìm kiếm và Lọc danh mục
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [sortBy, setSortBy] = useState('DEFAULT'); // 'DEFAULT' | 'PRICE_ASC' | 'PRICE_DESC' | 'NAME_ASC'

  // State cho Modal chọn nhanh màu sắc
  const [modalProduct, setModalProduct] = useState(null);
  const [modalVariants, setModalVariants] = useState([]);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [modalQuantity, setModalQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Tải danh sách laptop từ Backend
  useEffect(() => {
    const fetchLaptops = async () => {
      try {
        const data = await getLaptops();
        if (data && data.length > 0) {
          setProducts(data);
        }
      } catch (error) {
        console.error('Lỗi kết nối Backend:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLaptops();
  }, []);

  // Đồng bộ khi URL thay đổi (ví dụ người dùng gõ từ thanh tìm kiếm Header)
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const s = params.get('search');
    if (s !== null) {
      setSearchTerm(s);
    }
    const c = params.get('category');
    if (c !== null && ['ALL', 'GAMING', 'OFFICE', 'MACBOOK'].includes(c.toUpperCase())) {
      setSelectedCategory(c.toUpperCase());
    }
  }, [location.search]);

  // Đếm số lượng sản phẩm theo từng danh mục
  const categoryCounts = useMemo(() => {
    const counts = {
      ALL: products.length,
      GAMING: 0,
      OFFICE: 0,
      MACBOOK: 0,
    };
    products.forEach((p) => {
      const key = getProductCategoryKey(p);
      if (counts[key] !== undefined) {
        counts[key] += 1;
      }
    });
    return counts;
  }, [products]);

  // Lọc sản phẩm theo danh mục và từ khóa tìm kiếm
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      // 1. Lọc theo danh mục
      if (selectedCategory !== 'ALL') {
        const prodCat = getProductCategoryKey(product);
        if (prodCat !== selectedCategory) return false;
      }

      // 2. Lọc theo từ khóa tìm kiếm (tên, cpu, vga, danh mục, màu sắc biến thể)
      if (searchTerm.trim()) {
        const term = searchTerm.trim().toLowerCase();
        const nameMatch = (product.name || '').toLowerCase().includes(term);
        const cpuMatch = (product.cpu || '').toLowerCase().includes(term);
        const vgaMatch = (product.vga || '').toLowerCase().includes(term);
        const catMatch = (product.category?.name || product.categoryName || '').toLowerCase().includes(term);
        const variantMatch = (product.variants || []).some((v) =>
          (v.color || '').toLowerCase().includes(term)
        );

        if (!nameMatch && !cpuMatch && !vgaMatch && !catMatch && !variantMatch) {
          return false;
        }
      }

      return true;
    });
  }, [products, selectedCategory, searchTerm]);

  // Sắp xếp sản phẩm
  const sortedProducts = useMemo(() => {
    const list = [...filteredProducts];
    if (sortBy === 'PRICE_ASC') {
      return list.sort((a, b) => Number(a.price || 0) - Number(b.price || 0));
    }
    if (sortBy === 'PRICE_DESC') {
      return list.sort((a, b) => Number(b.price || 0) - Number(a.price || 0));
    }
    if (sortBy === 'NAME_ASC') {
      return list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    }
    return list; // Mặc định giữ thứ tự từ server
  }, [filteredProducts, sortBy]);

  const openQuickSelectModal = (product, variants) => {
    setModalProduct(product);
    setModalVariants(variants);
    const firstInStock = variants.find((v) => v.stockQuantity == null || v.stockQuantity > 0);
    setSelectedVariant(firstInStock || variants[0]);
    setModalQuantity(1);
  };

  const closeModal = () => {
    setModalProduct(null);
    setModalVariants([]);
    setSelectedVariant(null);
    setModalQuantity(1);
  };

  const handleAddToCart = async (product, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập để thêm sản phẩm vào giỏ hàng!');
      navigate('/login');
      return;
    }

    try {
      const prodId = product.id || product.Id;
      const variants = await getVariantsByProduct(prodId);
      if (!variants || variants.length === 0) {
        showToast('Sản phẩm này hiện chưa có phiên bản màu sắc để thêm vào giỏ!', 'error');
        return;
      }

      if (variants.length > 1) {
        openQuickSelectModal(product, variants);
        return;
      }

      const v = variants[0];
      if (v.stockQuantity != null && v.stockQuantity <= 0) {
        showToast('Sản phẩm này tạm thời đã hết hàng!', 'error');
        return;
      }

      await addToCart(v.id, 1, `${product.name} (${v.color || 'Mặc định'})`);
    } catch (err) {
      console.error('Lỗi thêm giỏ hàng:', err);
      if (err.message === 'AUTH_REQUIRED' || err.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : data?.message || err.message || 'Không thể thêm vào giỏ hàng!';
      showToast(msg, 'error');
    }
  };

  const handleBuyNow = async (product, e) => {
    if (e) e.stopPropagation();
    const token = localStorage.getItem('token');
    if (!token || token === 'undefined' || token === 'null') {
      alert('Vui lòng đăng nhập để mua hàng!');
      navigate('/login');
      return;
    }

    try {
      const prodId = product.id || product.Id;
      const variants = await getVariantsByProduct(prodId);
      if (!variants || variants.length === 0) {
        showToast('Sản phẩm này hiện chưa có phiên bản để mua!', 'error');
        return;
      }

      if (variants.length > 1) {
        openQuickSelectModal(product, variants);
        return;
      }

      const v = variants[0];
      if (v.stockQuantity != null && v.stockQuantity <= 0) {
        showToast('Sản phẩm này tạm thời đã hết hàng!', 'error');
        return;
      }

      await addToCart(v.id, 1, `${product.name} (${v.color || 'Mặc định'})`);
      navigate('/cart');
    } catch (err) {
      console.error('Lỗi mua ngay:', err);
      if (err.message === 'AUTH_REQUIRED' || err.response?.status === 401) {
        alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : data?.message || err.message || 'Không thể tiến hành mua ngay!';
      showToast(msg, 'error');
    }
  };

  const handleModalSubmit = async (isBuyNow = false) => {
    if (!selectedVariant) return;

    if (selectedVariant.stockQuantity != null && selectedVariant.stockQuantity <= 0) {
      showToast('Màu này hiện đã hết hàng, vui lòng chọn màu khác!', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const displayName = `${modalProduct.name} (${selectedVariant.color})`;
      await addToCart(selectedVariant.id, modalQuantity, displayName);
      closeModal();
      if (isBuyNow) {
        navigate('/cart');
      }
    } catch (err) {
      console.error('Lỗi thêm giỏ từ modal:', err);
      if (err.message === 'AUTH_REQUIRED' || err.response?.status === 401) {
        closeModal();
        alert('Phiên đăng nhập đã hết hạn hoặc bạn chưa đăng nhập. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      const data = err.response?.data;
      const msg = typeof data === 'string' ? data : data?.message || err.message || 'Không thể thêm vào giỏ hàng!';
      showToast(msg, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Badge màu sắc đại diện cho danh mục
  const renderCategoryBadge = (product) => {
    const catKey = getProductCategoryKey(product);
    if (catKey === 'GAMING') {
      return (
        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-red-100 text-red-700">
          🎮 Gaming
        </span>
      );
    }
    if (catKey === 'MACBOOK') {
      return (
        <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-purple-100 text-purple-700">
          🍎 MacBook
        </span>
      );
    }
    return (
      <span className="text-[10px] uppercase font-extrabold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
        💼 Văn Phòng
      </span>
    );
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('ALL');
    setSortBy('DEFAULT');
    navigate('/');
  };

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />
      <Banner />

      <div id="product-section" className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        {/* KHU VỰC TÌM KIẾM & BỘ LỌC DANH MỤC */}
        <div className="bg-white rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 mb-8 space-y-5">
          {/* Hàng 1: Thanh tìm kiếm trực tiếp + Sắp xếp */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            {/* Input tìm kiếm */}
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm laptop theo tên, vi xử lý CPU, card đồ họa VGA, màu sắc..."
                className="w-full pl-11 pr-10 py-3 rounded-xl border border-gray-200 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark outline-none text-sm transition"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-sm font-bold"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Dropdown sắp xếp */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-gray-500 whitespace-nowrap">Sắp xếp theo:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="px-3.5 py-3 rounded-xl border border-gray-200 text-sm font-semibold text-brand-dark bg-white focus:outline-none focus:border-brand-dark cursor-pointer shadow-sm"
              >
                <option value="DEFAULT">Mới nhất / Nổi bật</option>
                <option value="PRICE_ASC">Giá: Thấp đến Cao</option>
                <option value="PRICE_DESC">Giá: Cao đến Thấp</option>
                <option value="NAME_ASC">Tên: A đến Z</option>
              </select>
            </div>
          </div>

          {/* Hàng 2: Bộ lọc danh mục (Gaming, Văn phòng, MacBook) */}
          <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400 mr-1 hidden sm:inline">
                Danh mục:
              </span>
              {CATEGORIES.map((cat) => {
                const isSelected = selectedCategory === cat.id;
                const count = categoryCounts[cat.id] ?? 0;

                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition shadow-sm ${
                      isSelected
                        ? 'bg-brand-dark text-white ring-2 ring-brand-dark ring-offset-1'
                        : 'bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-bold ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Nút Xóa bộ lọc nếu đang có lọc hoặc tìm kiếm */}
            {(searchTerm || selectedCategory !== 'ALL' || sortBy !== 'DEFAULT') && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-red-600 hover:text-red-700 hover:underline flex items-center gap-1 self-center"
              >
                <span>↺</span>
                <span>Đặt lại tất cả bộ lọc</span>
              </button>
            )}
          </div>
        </div>

        {/* TIÊU ĐỀ KHU VỰC SẢN PHẨM & TỔNG SỐ KẾT QUẢ */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-extrabold text-brand-dark uppercase tracking-wide flex items-center gap-2">
              <span>Danh Sách Laptop</span>
              {selectedCategory !== 'ALL' && (
                <span className="text-sm font-normal text-gray-500 normal-case">
                  (Dòng {CATEGORIES.find((c) => c.id === selectedCategory)?.name})
                </span>
              )}
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Hiển thị <strong>{sortedProducts.length}</strong> sản phẩm phù hợp
              {searchTerm && <span> với từ khóa <em>"{searchTerm}"</em></span>}
            </p>
          </div>
        </div>

        {/* DANH SÁCH SẢN PHẨM */}
        {loading ? (
          <div className="text-center py-24 text-gray-500 font-semibold animate-pulse flex flex-col items-center gap-3">
            <svg className="animate-spin h-8 w-8 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <span>Đang lấy dữ liệu laptop...</span>
          </div>
        ) : sortedProducts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-dashed border-gray-200 max-w-lg mx-auto my-6">
            <div className="w-16 h-16 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
              🔍
            </div>
            <h3 className="text-lg font-bold text-brand-dark mb-1">Không tìm thấy laptop phù hợp</h3>
            <p className="text-xs text-gray-500 mb-5 leading-relaxed">
              Không có sản phẩm nào khớp với từ khóa{' '}
              {searchTerm ? <strong>"{searchTerm}"</strong> : ''}{' '}
              trong danh mục bạn đã chọn.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="bg-brand-dark text-white px-5 py-2.5 rounded-xl font-bold text-xs hover:bg-black transition shadow-sm"
            >
              Xem tất cả sản phẩm
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5 md:gap-6">
            {sortedProducts.map((product) => {
              const variants = product.variants || [];
              const price = product.price ? product.price.toLocaleString('vi-VN') + ' ₫' : 'Liên hệ';

              return (
                <div
                  key={product.id || product.Id}
                  onClick={() => navigate(`/product/${product.id || product.Id}`)}
                  className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm hover:shadow-xl transition duration-300 cursor-pointer border border-gray-100 flex flex-col justify-between group relative"
                >
                  {/* Badge danh mục ở góc ảnh */}
                  <div className="flex items-center justify-between gap-1 mb-2">
                    {renderCategoryBadge(product)}
                    {variants.length > 0 && (
                      <span className="text-[10px] font-semibold text-gray-400">
                        {variants.length} màu sắc
                      </span>
                    )}
                  </div>

                  {/* Ảnh sản phẩm */}
                  <div className="overflow-hidden rounded-xl mb-4 bg-gray-50/50 p-2 flex items-center justify-center h-44">
                    <img
                      src={product.imageUrl || 'https://via.placeholder.com/200?text=No+Image'}
                      alt={product.name}
                      className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <div>
                    {/* Tên sản phẩm */}
                    <h3
                      className="font-bold text-brand-dark text-sm sm:text-base h-11 overflow-hidden line-clamp-2 group-hover:text-blue-600 transition"
                      title={product.name}
                    >
                      {product.name}
                    </h3>

                    {/* Cấu hình cơ bản: CPU, RAM, Ổ cứng, VGA */}
                    <div className="text-xs text-gray-500 mt-2 bg-gray-50 p-2 rounded-xl space-y-1">
                      <div className="truncate font-medium text-brand-dark">
                        {product.cpu || 'CPU thế hệ mới'}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-gray-500">
                        <span>RAM {product.ramGb ? `${product.ramGb}GB` : '-'}</span>
                        <span>•</span>
                        <span>SSD {product.storageGb ? `${product.storageGb}GB` : '-'}</span>
                        {product.vga && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[70px]" title={product.vga}>
                              {product.vga}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Hiển thị các chấm màu sắc có sẵn */}
                    {variants.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-3">
                        <span className="text-[10px] text-gray-400 mr-0.5">Màu:</span>
                        {variants.slice(0, 4).map((v) => (
                          <span
                            key={v.id}
                            title={v.color}
                            className="w-3.5 h-3.5 rounded-full border border-gray-300 shadow-xs inline-block"
                            style={{ backgroundColor: getColorHex(v.color) }}
                          />
                        ))}
                        {variants.length > 4 && (
                          <span className="text-[10px] text-gray-400 font-bold">
                            +{variants.length - 4}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-gray-100 flex flex-col justify-end">
                    {/* Giá sản phẩm */}
                    <span className="text-red-600 font-extrabold text-base sm:text-lg mb-3 block">
                      {price}
                    </span>

                    {/* Nút hành động */}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(e) => handleAddToCart(product, e)}
                        title="Thêm vào giỏ hàng"
                        className="flex-1 border border-brand-dark text-brand-dark py-2 px-1 rounded-xl hover:bg-brand-dark hover:text-white transition font-bold text-xs flex items-center justify-center gap-1 shadow-xs"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>
                          <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/>
                          <circle cx="18" cy="20" r="2"/>
                          <circle cx="8" cy="20" r="2"/>
                        </svg>
                        <span className="truncate">Thêm giỏ</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => handleBuyNow(product, e)}
                        className="flex-1 bg-brand-dark text-white py-2 px-1 rounded-xl hover:bg-black transition font-bold text-xs flex items-center justify-center shadow-sm"
                      >
                        Mua ngay
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Chọn Nhanh Màu Sắc & Số Lượng khi bấm Thêm giỏ / Mua ngay */}
      {modalProduct && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm"
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl relative animate-fade-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nút đóng X */}
            <button
              onClick={closeModal}
              className="absolute top-4 right-4 text-gray-400 hover:text-brand-dark text-xl font-bold w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
            >
              ✕
            </button>

            {/* Chi tiết sản phẩm */}
            <div className="flex gap-4 items-center pb-4 border-b border-gray-100">
              <img
                src={selectedVariant?.imageUrl || modalProduct.imageUrl || 'https://via.placeholder.com/100'}
                alt={modalProduct.name}
                className="w-20 h-20 object-contain bg-gray-50 rounded-xl p-2 shrink-0 border border-gray-100"
              />
              <div className="min-w-0 flex-1">
                <h4 className="font-bold text-brand-dark text-sm line-clamp-2">
                  {modalProduct.name}
                </h4>
                <div className="text-red-600 font-extrabold text-base mt-1">
                  {selectedVariant?.price
                    ? Number(selectedVariant.price).toLocaleString('vi-VN') + ' ₫'
                    : modalProduct.price
                    ? Number(modalProduct.price).toLocaleString('vi-VN') + ' ₫'
                    : 'Liên hệ'}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Tồn kho:{' '}
                  <strong className={selectedVariant?.stockQuantity > 0 ? 'text-green-600' : 'text-red-600'}>
                    {selectedVariant?.stockQuantity != null ? `${selectedVariant.stockQuantity} máy` : 'Có sẵn'}
                  </strong>
                </div>
              </div>
            </div>

            {/* Chọn màu sắc */}
            <div className="py-4 border-b border-gray-100">
              <label className="block text-xs font-bold uppercase text-brand-dark mb-2">
                Chọn màu sắc ({modalVariants.length} lựa chọn):
              </label>
              <div className="flex flex-wrap gap-2">
                {modalVariants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  const isOutOfStock = v.stockQuantity != null && v.stockQuantity <= 0;

                  return (
                    <button
                      key={v.id}
                      type="button"
                      disabled={isOutOfStock}
                      onClick={() => setSelectedVariant(v)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold border transition ${
                        isSelected
                          ? 'border-brand-dark bg-brand-dark text-white shadow-sm'
                          : isOutOfStock
                          ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-gray-400'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20"
                        style={{ backgroundColor: getColorHex(v.color) }}
                      />
                      <span>{v.color}</span>
                      {isOutOfStock && <span className="text-[10px] text-red-500">(Hết)</span>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chọn số lượng */}
            <div className="py-4 flex items-center justify-between">
              <span className="text-xs font-bold uppercase text-brand-dark">Số lượng mua:</span>
              <div className="flex items-center border border-gray-300 rounded-xl overflow-hidden bg-white shadow-xs">
                <button
                  type="button"
                  disabled={modalQuantity <= 1}
                  onClick={() => setModalQuantity((q) => Math.max(1, q - 1))}
                  className="px-3 py-1 font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  -
                </button>
                <span className="w-10 text-center text-sm font-bold text-brand-dark">
                  {modalQuantity}
                </span>
                <button
                  type="button"
                  disabled={selectedVariant?.stockQuantity != null && modalQuantity >= selectedVariant.stockQuantity}
                  onClick={() => setModalQuantity((q) => q + 1)}
                  className="px-3 py-1 font-bold text-brand-dark hover:bg-gray-100 disabled:opacity-40 transition"
                >
                  +
                </button>
              </div>
            </div>

            {/* Nút bấm hành động */}
            <div className="pt-2 flex gap-3">
              <button
                type="button"
                disabled={isSubmitting || (selectedVariant?.stockQuantity != null && selectedVariant.stockQuantity <= 0)}
                onClick={() => handleModalSubmit(false)}
                className="flex-1 py-3 border border-brand-dark text-brand-dark rounded-xl font-bold text-xs hover:bg-brand-dark hover:text-white transition shadow-xs disabled:opacity-40"
              >
                {isSubmitting ? 'Đang thêm...' : 'Thêm vào giỏ'}
              </button>
              <button
                type="button"
                disabled={isSubmitting || (selectedVariant?.stockQuantity != null && selectedVariant.stockQuantity <= 0)}
                onClick={() => handleModalSubmit(true)}
                className="flex-1 py-3 bg-brand-dark text-white rounded-xl font-bold text-xs hover:bg-black transition shadow-sm disabled:opacity-40"
              >
                {isSubmitting ? 'Đang xử lý...' : 'Mua ngay'}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default HomePage;