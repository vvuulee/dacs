import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getVariantsByProduct } from '../services/api';

const CATEGORIES = [
  { id: 1, name: 'Laptop Gaming' },
  { id: 2, name: 'Laptop Văn Phòng' },
  { id: 3, name: 'MacBook' },
];

const initialVariant = {
  color: '',
  quantity: 10,
  price: '',
};

const initialFormState = {
  name: '',
  categoryId: 1,
  cpu: '',
  ramGb: '',
  storageGb: '',
  vga: '',
  screenSize: '',
  imageUrl: '',
  price: '',
  variants: [{ ...initialVariant }],
};

const AdminProductPage = () => {
  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Quản lý Modal Thêm / Sửa
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState(initialFormState);

  const navigate = useNavigate();
  const API_URL = 'http://localhost:8080/api/products';

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await axios.get(API_URL);
      setProducts(res.data || []);
    } catch (error) {
      console.error('Lỗi tải danh sách sản phẩm:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Vui lòng đăng nhập bằng tài khoản Admin!');
      navigate('/login');
      return;
    }
    fetchProducts();
  }, [navigate]);

  // Xử lý thay đổi các ô thông tin chung của Laptop
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // Xử lý thay đổi từng dòng Màu sắc & Số lượng
  const handleVariantChange = (index, field, value) => {
    const updatedVariants = [...formData.variants];
    updatedVariants[index][field] = value;
    setFormData((prev) => ({
      ...prev,
      variants: updatedVariants,
    }));
  };

  // Thêm 1 dòng màu sắc mới
  const addVariantRow = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          color: '',
          quantity: 10,
          price: prev.price || '',
        },
      ],
    }));
  };

  // Xóa 1 dòng màu sắc
  const removeVariantRow = (index) => {
    if (formData.variants.length <= 1) {
      alert('Sản phẩm cần có ít nhất 1 màu sắc/phiên bản!');
      return;
    }
    const updatedVariants = formData.variants.filter((_, i) => i !== index);
    setFormData((prev) => ({
      ...prev,
      variants: updatedVariants,
    }));
  };

  // Mở Modal ở chế độ Thêm mới
  const openCreateModal = () => {
    setEditingId(null);
    setFormData({
      ...initialFormState,
      variants: [{ color: '', quantity: 10, price: '' }],
    });
    setIsModalOpen(true);
  };

  // Mở Modal ở chế độ Chỉnh sửa và lấy cả danh sách màu sắc hiện có
  const openEditModal = async (product) => {
    setEditingId(product.id);

    let existingVariants = product.variants || product.productVariants || [];
    if (existingVariants.length === 0) {
      try {
        const fetched = await getVariantsByProduct(product.id);
        if (fetched && fetched.length > 0) {
          existingVariants = fetched;
        }
      } catch (e) {}
    }

    const mappedVariants =
      existingVariants.length > 0
        ? existingVariants.map((v) => ({
            id: v.id,
            color: v.color || v.variantName || '',
            quantity: v.stockQuantity ?? v.quantity ?? v.stock ?? 0,
            price: v.price ?? product.price ?? '',
          }))
        : [
            {
              color: product.color || 'Mặc định',
              quantity: product.stockQuantity ?? product.quantity ?? 10,
              price: product.price ?? '',
            },
          ];

    setFormData({
      name: product.name || '',
      categoryId: product.category?.id || 1,
      cpu: product.cpu || '',
      ramGb: product.ramGb ?? '',
      storageGb: product.storageGb ?? '',
      vga: product.vga || '',
      screenSize: product.screenSize || '',
      imageUrl: product.imageUrl || '',
      price: product.price ?? '',
      variants: mappedVariants,
    });
    setIsModalOpen(true);
  };

  // Tính tổng số lượng từ tất cả các màu
  const totalStockQuantity = formData.variants.reduce(
    (sum, v) => sum + (Number(v.quantity) || 0),
    0
  );

  // Xử lý Lưu sản phẩm và các phiên bản màu sắc
  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    if (!token) {
      navigate('/login');
      return;
    }

    // Chuẩn hóa danh sách biến thể màu sắc gửi xuống Backend
    const formattedVariants = formData.variants.map((v) => ({
      id: v.id || null,
      color: (v.color || '').trim() || 'Tiêu chuẩn',
      stockQuantity: Number(v.quantity) || 0,
      price: v.price ? Number(v.price) : Number(formData.price) || 0,
      imageUrl: formData.imageUrl,
    }));

    const selectedCategory =
      CATEGORIES.find((c) => Number(c.id) === Number(formData.categoryId)) || CATEGORIES[0];

    const payload = {
      name: formData.name,
      category: { id: selectedCategory.id, name: selectedCategory.name },
      cpu: formData.cpu,
      ramGb: formData.ramGb ? Number(formData.ramGb) : null,
      storageGb: formData.storageGb ? Number(formData.storageGb) : null,
      vga: formData.vga,
      screenSize: formData.screenSize,
      imageUrl: formData.imageUrl,
      price: formData.price ? Number(formData.price) : 0,
      variants: formattedVariants,
    };

    setSubmitting(true);
    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` },
      };

      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload, config);
        alert('Cập nhật sản phẩm thành công!');
      } else {
        await axios.post(API_URL, payload, config);
        alert('Thêm sản phẩm mới thành công!');
      }

      setIsModalOpen(false);
      fetchProducts();
    } catch (error) {
      console.error('Lỗi lưu sản phẩm:', error);
      if (error.response?.status === 403) {
        alert('Từ chối truy cập (403): Tài khoản của bạn không có quyền ADMIN!');
      } else {
        alert(
          error.response?.data?.message ||
            'Không thể lưu sản phẩm. Vui lòng kiểm tra lại!'
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Xóa sản phẩm
  const handleDelete = async (id, name) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa sản phẩm "${name}" không?`)) {
      return;
    }

    const token = localStorage.getItem('token');
    try {
      await axios.delete(`${API_URL}/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts((prev) => prev.filter((p) => p.id !== id));
      alert('Đã xóa sản phẩm thành công!');
    } catch (error) {
      console.error('Lỗi xóa sản phẩm:', error);
      if (error.response?.status === 403) {
        alert('Từ chối truy cập (403): Chỉ ADMIN mới có quyền xóa sản phẩm!');
      } else {
        alert('Không thể xóa sản phẩm này (có thể sản phẩm đang nằm trong giỏ hàng)!');
      }
    }
  };

  const filteredProducts = products.filter((p) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase().trim();
    const nameMatch = (p.name || '').toLowerCase().includes(term);
    const catName = p.category?.name || (typeof p.category === 'string' ? p.category : '') || p.categoryName || '';
    const categoryMatch = catName.toLowerCase().includes(term);
    return nameMatch || categoryMatch;
  });

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        {/* Thanh tiêu đề & Tab chuyển nhanh */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-8 border-b border-gray-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-md">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500">• Quản trị kho hàng</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight">
              Quản Lý Kho Hàng & Laptop
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Quản lý dòng máy, cấu hình, màu sắc và số lượng tồn kho
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Tab chuyển nhanh giữa Quản lý sản phẩm và Đơn hàng */}
            <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl shadow-inner">
              <Link
                to="/admin/products"
                className="px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-white text-brand-dark shadow-sm transition"
              >
                📦 Quản lý Sản phẩm ({products.length})
              </Link>
              <Link
                to="/admin/orders"
                className="px-4 py-2 text-xs md:text-sm font-semibold rounded-lg text-gray-600 hover:text-brand-dark hover:bg-white/60 transition"
              >
                📑 Đơn hàng Hệ thống
              </Link>
            </div>

            <button
              type="button"
              onClick={openCreateModal}
              className="px-4 py-2 bg-brand-dark text-white rounded-xl text-xs md:text-sm font-bold hover:bg-black transition shadow-sm flex items-center gap-1.5"
            >
              <span>+</span>
              <span>Thêm Laptop Mới</span>
            </button>
          </div>
        </div>

                {/* Thanh tìm kiếm sản phẩm trong kho */}
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="relative w-full sm:w-96">
            <input
              type="text"
              placeholder="Tìm kiếm theo tên laptop hoặc dòng máy..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
            />
            <svg
              className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-xs hover:bg-gray-100"
                title="Xóa tìm kiếm"
              >
                ✕
              </button>
            )}
          </div>

          <div className="text-xs text-gray-500 font-medium">
            Hiển thị <strong className="text-brand-dark font-bold">{filteredProducts.length}</strong> / {products.length} sản phẩm trong kho
          </div>
        </div>

        {/* Bảng danh sách sản phẩm */}
        {loading ? (
          <div className="bg-white rounded-2xl p-12 text-center text-gray-500 font-semibold animate-pulse">
            Đang tải dữ liệu kho hàng...
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase text-gray-500 font-bold">
                    <th className="py-4 px-4">ID</th>
                    <th className="py-4 px-4">Sản phẩm & Dòng máy</th>
                    <th className="py-4 px-4">Cấu hình</th>
                    <th className="py-4 px-4">Màu sắc & Tồn kho</th>
                    <th className="py-4 px-4">Giá gốc</th>
                    <th className="py-4 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((product) => {
                      const variantList =
                        product.variants || product.productVariants || [];
                      return (
                        <tr key={product.id} className="hover:bg-gray-50/60 transition">
                          <td className="py-4 px-4 font-semibold text-gray-500">
                            #{product.id}
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <img
                                src={
                                  product.imageUrl ||
                                  'https://via.placeholder.com/80?text=No+Image'
                                }
                                alt={product.name}
                                className="w-14 h-14 object-contain bg-gray-50 rounded-lg p-1 border border-gray-100 shrink-0"
                              />
                              <div>
                                <span className="font-bold text-brand-dark line-clamp-2">
                                  {product.name}
                                </span>
                                <span className="inline-block mt-1 px-2.5 py-0.5 bg-gray-100 text-gray-700 rounded-md text-xs font-medium">
                                  {product.category?.name ||
                                    (typeof product.category === 'string' ? product.category : '') ||
                                    product.categoryName ||
                                    'Chưa phân loại'}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 text-gray-600 text-xs">
                            <div className="font-semibold text-brand-dark text-sm">
                              {product.cpu || 'Chưa cập nhật'}
                            </div>
                            <div className="mt-0.5">
                              RAM: {product.ramGb ? `${product.ramGb}GB` : '-'} | SSD:{' '}
                              {product.storageGb ? `${product.storageGb}GB` : '-'}
                            </div>
                            <div className="mt-0.5">
                              VGA: {product.vga || '-'} | Màn: {product.screenSize || '-'}
                            </div>
                          </td>
                          <td className="py-4 px-4 text-xs">
                            {variantList.length > 0 ? (
                              <div className="space-y-1">
                                {variantList.map((v, i) => (
                                  <div
                                    key={v.id || i}
                                    className="inline-flex items-center gap-1.5 mr-2 px-2 py-1 bg-gray-50 border border-gray-200 rounded-md"
                                  >
                                    <span className="font-semibold text-brand-dark">
                                      {v.color || v.variantName || 'Mặc định'}:
                                    </span>
                                    <span className="text-green-700 font-bold">
                                      {v.stockQuantity ?? v.quantity ?? v.stock ?? 0} máy
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <span className="text-gray-500">
                                Tổng kho:{' '}
                                <strong className="text-brand-dark">
                                  {product.stockQuantity ?? product.quantity ?? 'Chưa có'}
                                </strong>
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-4 font-bold text-red-600 whitespace-nowrap">
                            {product.price
                              ? product.price.toLocaleString('vi-VN') + ' ₫'
                              : 'Liên hệ'}
                          </td>
                          <td className="py-4 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openEditModal(product)}
                                className="px-3.5 py-1.5 border border-brand-dark text-brand-dark rounded-lg text-xs font-semibold hover:bg-brand-dark hover:text-white transition"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDelete(product.id, product.name)}
                                className="px-3.5 py-1.5 border border-red-200 text-red-600 bg-red-50 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition"
                              >
                                Xóa
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="py-12 text-center text-gray-500">
                        {searchTerm ? (
                          <div className="flex flex-col items-center justify-center gap-2">
                            <span className="text-2xl">🔍</span>
                            <p className="font-semibold text-brand-dark">
                              Không tìm thấy sản phẩm nào khớp với từ khóa "{searchTerm}"
                            </p>
                            <button
                              type="button"
                              onClick={() => setSearchTerm('')}
                              className="text-xs text-blue-600 hover:underline font-semibold mt-1"
                            >
                              Xóa bộ lọc tìm kiếm
                            </button>
                          </div>
                        ) : (
                          'Chưa có sản phẩm nào trong kho hàng.'
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modal Form Thêm / Cập nhật sản phẩm */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 sm:p-8 shadow-xl border border-gray-100 my-8 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100 mb-6">
              <h2 className="text-xl font-bold text-brand-dark">
                {editingId
                  ? `Cập Nhật Sản Phẩm #${editingId}`
                  : 'Thêm Laptop Mới Vào Kho'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-brand-dark font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* PHẦN 1: THÔNG TIN CHUNG & DÒNG LAPTOP */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Tên Laptop *
                  </label>
                  <input
                    type="text"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="VD: ASUS ROG Strix G16 / MacBook Air M3"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
    Dòng Laptop (Danh mục) *
  </label>
  <select
    name="categoryId"
    value={formData.categoryId}
    onChange={handleInputChange}
    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm bg-white focus:outline-none focus:border-brand-dark font-medium text-brand-dark"
  >
    {CATEGORIES.map((cat) => (
      <option key={cat.id} value={cat.id}>
        {cat.name}
      </option>
    ))}
  </select>
</div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Vi xử lý (CPU)
                  </label>
                  <input
                    type="text"
                    name="cpu"
                    value={formData.cpu}
                    onChange={handleInputChange}
                    placeholder="VD: Intel Core i7-13650HX"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Dung lượng RAM (GB)
                  </label>
                  <input
                    type="number"
                    name="ramGb"
                    value={formData.ramGb}
                    onChange={handleInputChange}
                    placeholder="VD: 16"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Ổ cứng SSD (GB)
                  </label>
                  <input
                    type="number"
                    name="storageGb"
                    value={formData.storageGb}
                    onChange={handleInputChange}
                    placeholder="VD: 512"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Card đồ họa (VGA)
                  </label>
                  <input
                    type="text"
                    name="vga"
                    value={formData.vga}
                    onChange={handleInputChange}
                    placeholder="VD: RTX 4060 8GB"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Kích thước màn hình
                  </label>
                  <input
                    type="text"
                    name="screenSize"
                    value={formData.screenSize}
                    onChange={handleInputChange}
                    placeholder="VD: 16 inch FHD+ 165Hz"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Giá bán niêm yết (VNĐ) *
                  </label>
                  <input
                    type="number"
                    name="price"
                    required
                    value={formData.price}
                    onChange={handleInputChange}
                    placeholder="VD: 29990000"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block text-xs font-bold uppercase text-gray-600 mb-1">
                    Đường dẫn hình ảnh (Image URL)
                  </label>
                  <input
                    type="text"
                    name="imageUrl"
                    value={formData.imageUrl}
                    onChange={handleInputChange}
                    placeholder="https://..."
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                  />
                </div>
              </div>

              {/* PHẦN 2: QUẢN LÝ MÀU SẮC & SỐ LƯỢNG TỒN KHO CHO TỪNG MÀU */}
              <div className="bg-gray-50 p-4 sm:p-5 rounded-2xl border border-gray-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-brand-dark">
                      Phân loại Màu sắc & Số lượng từng màu *
                    </h3>
                    <p className="text-xs text-gray-500">
                      Tổng tồn kho tất cả các màu:{' '}
                      <strong className="text-brand-dark">{totalStockQuantity} máy</strong>
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={addVariantRow}
                    className="px-3.5 py-2 bg-brand-dark text-white rounded-xl text-xs font-semibold hover:bg-black transition self-start sm:self-auto"
                  >
                    + Thêm màu sắc
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.variants.map((variant, index) => (
                    <div
                      key={index}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end bg-white p-3 rounded-xl border border-gray-200"
                    >
                      <div className="sm:col-span-5">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                          Tên màu / Phiên bản #{index + 1} *
                        </label>
                        <input
                          type="text"
                          required
                          value={variant.color}
                          onChange={(e) =>
                            handleVariantChange(index, 'color', e.target.value)
                          }
                          placeholder="VD: Đen (Eclipse Gray) / Bạc / Vàng..."
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                          Số lượng tồn kho *
                        </label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={variant.quantity}
                          onChange={(e) =>
                            handleVariantChange(index, 'quantity', e.target.value)
                          }
                          placeholder="VD: 15"
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                        />
                      </div>

                      <div className="sm:col-span-3">
                        <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                          Giá riêng của màu này (VNĐ)
                        </label>
                        <input
                          type="number"
                          value={variant.price}
                          onChange={(e) =>
                            handleVariantChange(index, 'price', e.target.value)
                          }
                          placeholder={formData.price || 'Mặc định theo giá gốc'}
                          className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:border-brand-dark"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => removeVariantRow(index)}
                          title="Xóa màu này"
                          className="w-full sm:w-9 h-9 flex items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white transition text-xs font-bold"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Nút Hủy & Lưu */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 border border-gray-300 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-6 py-2.5 bg-brand-dark text-white rounded-xl text-sm font-semibold hover:bg-black transition shadow-sm disabled:opacity-50"
                >
                  {submitting
                    ? 'Đang lưu...'
                    : editingId
                    ? 'Lưu Thay Đổi'
                    : 'Tạo Sản Phẩm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};

export default AdminProductPage;