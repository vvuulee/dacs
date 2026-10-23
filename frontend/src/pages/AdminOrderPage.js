import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { getAllOrders, updateOrderStatus } from '../services/api';

const STATUS_CONFIG = {
  PENDING: {
    label: 'Chờ xử lý',
    badgeClass: 'bg-amber-100 text-amber-800 border-amber-200',
    dotClass: 'bg-amber-500',
  },
  CONFIRMED: {
    label: 'Đã xác nhận',
    badgeClass: 'bg-blue-100 text-blue-800 border-blue-200',
    dotClass: 'bg-blue-500',
  },
  SHIPPING: {
    label: 'Đang giao hàng',
    badgeClass: 'bg-purple-100 text-purple-800 border-purple-200',
    dotClass: 'bg-purple-500 animate-pulse',
  },
  DELIVERED: {
    label: 'Đã giao hàng',
    badgeClass: 'bg-green-100 text-green-800 border-green-200',
    dotClass: 'bg-green-500',
  },
  CANCELLED: {
    label: 'Đã hủy',
    badgeClass: 'bg-gray-100 text-gray-700 border-gray-200',
    dotClass: 'bg-gray-400',
  },
};

const AdminOrderPage = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });

  // Kiểm tra quyền Admin & Tải dữ liệu
  const fetchAllOrdersData = async () => {
    try {
      setLoading(true);
      const data = await getAllOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải đơn hàng toàn hệ thống:', err);
      if (err.response?.status === 403) {
        alert('Tài khoản của bạn không có quyền Quản trị viên (ROLE_ADMIN)!');
        navigate('/');
        return;
      }
      if (err.response?.status === 401) {
        alert('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại!');
        navigate('/login');
        return;
      }
      setStatusMessage({
        type: 'error',
        text: 'Không thể tải danh sách đơn hàng toàn hệ thống!',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.role !== 'ROLE_ADMIN') {
      alert('Vui lòng đăng nhập bằng tài khoản Quản trị viên (Admin)!');
      navigate('/login');
      return;
    }
    fetchAllOrdersData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  // Xử lý đổi trạng thái đơn hàng
  const handleUpdateStatus = async (orderId, newStatus) => {
    const statusText = STATUS_CONFIG[newStatus]?.label || newStatus;
    const confirmChange = window.confirm(
      `Bạn có chắc chắn muốn chuyển đơn hàng #DH${String(orderId).padStart(5, '0')} sang trạng thái "${statusText}"?`
    );
    if (!confirmChange) return;

    try {
      setUpdatingId(orderId);
      setStatusMessage({ type: '', text: '' });
      await updateOrderStatus(orderId, newStatus);
      setStatusMessage({
        type: 'success',
        text: `Đã cập nhật đơn hàng #DH${String(orderId).padStart(5, '0')} sang "${statusText}" thành công!`,
      });
      // Cập nhật state trực tiếp
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch (err) {
      console.error('Lỗi cập nhật trạng thái đơn hàng:', err);
      const errorMsg =
        err.response?.data?.message ||
        (typeof err.response?.data === 'string' ? err.response?.data : null) ||
        'Không thể cập nhật trạng thái đơn hàng!';
      setStatusMessage({ type: 'error', text: errorMsg });
    } finally {
      setUpdatingId(null);
    }
  };

  // Thống kê nhanh
  const totalOrders = orders.length;
  const pendingCount = orders.filter((o) => o.status === 'PENDING').length;
  const shippingCount = orders.filter((o) => o.status === 'SHIPPING').length;
  const deliveredCount = orders.filter((o) => o.status === 'DELIVERED').length;
  const cancelledCount = orders.filter((o) => o.status === 'CANCELLED').length;
  const totalRevenue = orders
    .filter((o) => o.status === 'DELIVERED' || o.status === 'SHIPPING')
    .reduce((sum, o) => sum + Number(o.totalAmount || 0), 0);

  // Lọc theo trạng thái và tìm kiếm
  const filteredOrders = orders.filter((order) => {
    const matchFilter = selectedFilter === 'ALL' || order.status === selectedFilter;
    if (!matchFilter) return false;

    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase().trim();
    const orderCode = `dh${String(order.id).padStart(5, '0')}`;
    const idMatch = String(order.id).includes(q) || orderCode.includes(q);
    const receiverMatch = order.receiverName?.toLowerCase().includes(q);
    const phoneMatch = order.receiverPhone?.includes(q);
    const userMatch =
      order.user?.username?.toLowerCase().includes(q) ||
      order.user?.fullName?.toLowerCase().includes(q) ||
      order.user?.email?.toLowerCase().includes(q);
    const addressMatch = order.shippingAddress?.toLowerCase().includes(q);

    return idMatch || receiverMatch || phoneMatch || userMatch || addressMatch;
  });

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-8 flex-1 max-w-7xl">
        {/* Thanh tiêu đề & Chuyển đổi Trang Quản trị */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between pb-6 mb-6 border-b border-gray-200 gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2.5 py-0.5 rounded-md">
                Admin Panel
              </span>
              <span className="text-xs text-gray-500">• Hệ thống quản lý toàn diện</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-brand-dark tracking-tight">
              Quản lý Đơn hàng Toàn Hệ thống
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Theo dõi, chuyển trạng thái giao hàng, kiểm soát doanh thu và xem đánh giá của khách hàng.
            </p>
          </div>

          {/* Tab chuyển nhanh giữa Quản lý sản phẩm và Đơn hàng */}
          <div className="flex items-center gap-2 bg-gray-100 p-1 rounded-xl self-start md:self-auto shadow-inner">
            <Link
              to="/admin/products"
              className="px-4 py-2 text-xs md:text-sm font-semibold rounded-lg text-gray-600 hover:text-brand-dark hover:bg-white/60 transition"
            >
              📦 Quản lý Sản phẩm
            </Link>
            <Link
              to="/admin/orders"
              className="px-4 py-2 text-xs md:text-sm font-bold rounded-lg bg-white text-brand-dark shadow-sm transition"
            >
              📑 Đơn hàng Hệ thống ({totalOrders})
            </Link>
          </div>
        </div>

        {/* Thông báo thao tác */}
        {statusMessage.text && (
          <div
            className={`p-4 rounded-xl text-sm font-medium mb-6 flex items-center justify-between border shadow-sm ${
              statusMessage.type === 'error'
                ? 'bg-red-50 text-red-700 border-red-200'
                : 'bg-green-50 text-green-700 border-green-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <span>{statusMessage.type === 'error' ? '❌' : '✅'}</span>
              <span>{statusMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setStatusMessage({ type: '', text: '' })}
              className="text-xs underline hover:opacity-75 font-semibold"
            >
              Đóng
            </button>
          </div>
        )}

        {/* 4 Thẻ KPI thống kê */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Tổng đơn hàng</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-brand-dark">{totalOrders}</span>
              <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full font-bold">100%</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-amber-100 bg-amber-50/20 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Chờ xử lý</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-amber-600">{pendingCount}</span>
              <span className="text-xs text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full font-bold">Cần duyệt</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-purple-100 bg-purple-50/20 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wider">Đang giao hàng</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-purple-600">{shippingCount}</span>
              <span className="text-xs text-purple-700 bg-purple-100 px-2 py-0.5 rounded-full font-bold">Vận chuyển</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-green-100 bg-green-50/20 shadow-sm flex flex-col justify-between">
            <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Đã hoàn thành</span>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-extrabold text-green-600">{deliveredCount}</span>
              <span className="text-xs text-green-700 bg-green-100 px-2 py-0.5 rounded-full font-bold">Thành công</span>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm col-span-2 lg:col-span-1 flex flex-col justify-between">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Doanh thu tạm tính</span>
            <div className="mt-2">
              <span className="text-xl font-extrabold text-red-600">
                {totalRevenue.toLocaleString('vi-VN')} ₫
              </span>
            </div>
          </div>
        </div>

        {/* Thanh công cụ: Tìm kiếm & Lọc trạng thái */}
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs bộ lọc */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'ALL', label: 'Tất cả', count: totalOrders },
              { key: 'PENDING', label: 'Chờ xử lý', count: pendingCount },
              { key: 'CONFIRMED', label: 'Đã xác nhận', count: orders.filter((o) => o.status === 'CONFIRMED').length },
              { key: 'SHIPPING', label: 'Đang giao', count: shippingCount },
              { key: 'DELIVERED', label: 'Đã giao', count: deliveredCount },
              { key: 'CANCELLED', label: 'Đã hủy', count: cancelledCount },
            ].map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setSelectedFilter(f.key)}
                className={`text-xs px-3.5 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
                  selectedFilter === f.key
                    ? 'bg-brand-dark text-white shadow-sm'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                <span>{f.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    selectedFilter === f.key ? 'bg-white/25 text-white' : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {f.count}
                </span>
              </button>
            ))}
          </div>

          {/* Ô tìm kiếm & Nút làm mới */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 sm:w-72">
              <input
                type="text"
                placeholder="Tìm mã đơn, tên người nhận, SĐT, username..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full text-xs pl-9 pr-4 py-2 rounded-xl border border-gray-200 focus:outline-none focus:border-brand-dark bg-gray-50/50"
              />
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4 text-gray-400 absolute left-3 top-2.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 105.65 5.65a7.5 7.5 0 0010.7 10.7z" />
              </svg>
            </div>

            <button
              type="button"
              onClick={fetchAllOrdersData}
              disabled={loading}
              className="p-2 text-gray-600 hover:text-brand-dark bg-gray-100 hover:bg-gray-200 rounded-xl transition"
              title="Làm mới danh sách"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </div>
        </div>

        {/* Nội dung danh sách đơn hàng */}
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3 text-gray-500">
            <svg className="animate-spin h-8 w-8 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
            </svg>
            <p className="text-sm font-semibold">Đang tải toàn bộ đơn hàng hệ thống...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-12 text-center text-gray-500">
            <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-brand-dark mb-1">Không tìm thấy đơn hàng nào</h3>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Không có đơn hàng nào khớp với bộ lọc hoặc từ khóa tìm kiếm của bạn.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const cfg = STATUS_CONFIG[order.status] || {
                label: order.status,
                badgeClass: 'bg-gray-100 text-gray-700',
                dotClass: 'bg-gray-400',
              };

              const orderDate = order.createAt
                ? new Date(order.createAt).toLocaleString('vi-VN', {
                    hour: '2-digit',
                    minute: '2-digit',
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                  })
                : 'Vừa xong';

              const isUpdatingThis = updatingId === order.id;

              return (
                <div
                  key={order.id}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition duration-200"
                >
                  {/* Header đơn hàng */}
                  <div className="bg-gray-50/90 px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-bold text-brand-dark text-sm bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                        #DH{String(order.id).padStart(5, '0')}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">Ngày đặt: {orderDate}</span>
                      {order.user && (
                        <>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md font-medium">
                            Khách hàng: <strong className="text-brand-dark">@{order.user.username}</strong>
                            {order.user.email ? ` (${order.user.email})` : ''}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Trạng thái hiện tại */}
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${cfg.badgeClass}`}
                      >
                        <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`}></span>
                        {cfg.label}
                      </span>
                    </div>
                  </div>

                  {/* Thông tin người nhận và địa chỉ */}
                  <div className="px-5 py-3 bg-amber-50/30 border-b border-gray-100 text-xs text-gray-600 flex flex-wrap items-center justify-between gap-y-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-1">
                      <div>
                        <span className="text-gray-400">Người nhận:</span>{' '}
                        <strong className="text-brand-dark font-bold">{order.receiverName}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Số điện thoại:</span>{' '}
                        <strong className="text-brand-dark font-bold">{order.receiverPhone}</strong>
                      </div>
                      <div>
                        <span className="text-gray-400">Địa chỉ giao:</span>{' '}
                        <span className="text-brand-dark font-medium">{order.shippingAddress}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-gray-500 text-xs">Tổng giá trị đơn: </span>
                      <strong className="text-red-600 text-base font-extrabold ml-1">
                        {Number(order.totalAmount || 0).toLocaleString('vi-VN')} ₫
                      </strong>
                    </div>
                  </div>

                  {/* Danh sách sản phẩm trong đơn */}
                  <div className="p-5 divide-y divide-gray-100">
                    {order.orderDetails &&
                      order.orderDetails.map((item) => {
                        const variant = item.productVariant;
                        const product = variant?.product;
                        const itemImg =
                          variant?.imageUrl ||
                          product?.imageUrl ||
                          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                        const itemPrice = Number(item.price || 0);
                        const lineTotal = itemPrice * (item.quantity || 1);

                        return (
                          <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                            <img
                              src={itemImg}
                              alt={product?.name || 'Laptop'}
                              className="w-16 h-16 object-contain bg-gray-50 rounded-xl p-1 border border-gray-100 shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-bold text-brand-dark truncate">
                                {product?.name || 'Sản phẩm'}
                              </h4>
                              <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                                {variant?.color && (
                                  <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-semibold text-gray-700">
                                    Màu: {variant.color}
                                  </span>
                                )}
                                <span>Số lượng: <strong className="text-brand-dark">x{item.quantity}</strong></span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-sm font-bold text-brand-dark">
                                {lineTotal.toLocaleString('vi-VN')} ₫
                              </div>
                              <div className="text-[11px] text-gray-400">
                                {itemPrice.toLocaleString('vi-VN')} ₫ / máy
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>

                  {/* Đánh giá của khách hàng (Nếu có) */}
                  {order.review && (
                    <div className="mx-5 mb-4 p-4 rounded-xl bg-gradient-to-r from-amber-50/70 to-yellow-50/40 border border-amber-200/80">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                            <span>⭐</span> Đánh giá từ khách hàng:
                          </span>
                          <div className="flex items-center text-amber-500 text-sm">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <span key={star}>
                                {star <= order.review.rating ? '★' : '☆'}
                              </span>
                            ))}
                          </div>
                          <span className="text-xs font-bold text-amber-800">
                            ({order.review.rating}/5 sao)
                          </span>
                        </div>
                        {order.review.createdAt && (
                          <span className="text-[11px] text-gray-400">
                            {new Date(order.review.createdAt).toLocaleDateString('vi-VN')}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 italic bg-white/80 p-2.5 rounded-lg border border-amber-100">
                        "{order.review.comment || 'Khách hàng không để lại bình luận văn bản.'}"
                      </p>
                    </div>
                  )}

                  {/* Thanh thao tác cập nhật trạng thái của Admin */}
                  <div className="bg-gray-50 px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-gray-600">Thao tác Admin:</span>
                      {isUpdatingThis && (
                        <span className="text-blue-600 font-semibold animate-pulse flex items-center gap-1">
                          <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                          </svg>
                          Đang cập nhật...
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {/* Nút hành động nhanh: Chuyển sang "Đang giao" (Theo yêu cầu người dùng) */}
                      {order.status !== 'SHIPPING' && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleUpdateStatus(order.id, 'SHIPPING')}
                          className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
                          title="Bấm để chuyển trạng thái sang Đang giao hàng"
                        >
                          <span>🚚</span>
                          <span>Chuyển sang "Đang giao"</span>
                        </button>
                      )}

                      {/* Nút hoàn thành giao hàng */}
                      {order.status === 'SHIPPING' && (
                        <button
                          type="button"
                          disabled={isUpdatingThis}
                          onClick={() => handleUpdateStatus(order.id, 'DELIVERED')}
                          className="bg-green-600 hover:bg-green-700 text-white font-bold px-3.5 py-1.5 rounded-xl transition shadow-sm flex items-center gap-1.5"
                        >
                          <span>✅</span>
                          <span>Xác nhận đã giao hàng</span>
                        </button>
                      )}

                      {/* Dropdown thay đổi trạng thái linh hoạt */}
                      <div className="flex items-center gap-1">
                        <span className="text-gray-400">Đổi trạng thái:</span>
                        <select
                          disabled={isUpdatingThis}
                          value={order.status}
                          onChange={(e) => handleUpdateStatus(order.id, e.target.value)}
                          className="text-xs bg-white border border-gray-300 rounded-lg px-2.5 py-1.5 font-semibold text-brand-dark focus:outline-none focus:border-brand-dark"
                        >
                          <option value="PENDING">Chờ xử lý (PENDING)</option>
                          <option value="CONFIRMED">Đã xác nhận (CONFIRMED)</option>
                          <option value="SHIPPING">Đang giao hàng (SHIPPING)</option>
                          <option value="DELIVERED">Đã giao hàng (DELIVERED)</option>
                          <option value="CANCELLED">Đã hủy đơn (CANCELLED)</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default AdminOrderPage;

