import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import {
  getUserProfile,
  updateUserProfile,
  getMyOrders,
  cancelOrder,
  markOrderAsReceived,
  reviewOrder,
  getAdminUsers,
  grantAdminRole,
  revokeAdminRole,
} from '../services/api';

const ProfilePage = ({ initialTab }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('token');

  // Đọc tab khởi tạo từ props hoặc từ query parameter (?tab=orders)
  const queryTab = new URLSearchParams(location.search).get('tab');
  const [activeTab, setActiveTab] = useState(initialTab || queryTab || 'info'); // 'info' | 'orders' | 'password'

  const [loading, setLoading] = useState(true);

  // Thông tin cá nhân
  const [profile, setProfile] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    address: '',
    role: '',
    createdAt: '',
  });

  // Đổi mật khẩu
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);

  // Lịch sử đơn hàng
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersFilter, setOrdersFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'CONFIRMED' | 'SHIPPING' | 'DELIVERED' | 'CANCELLED'
  const [cancellingId, setCancellingId] = useState(null);
  const [receivingId, setReceivingId] = useState(null);

  // Modal Đánh giá đơn hàng
  const [reviewModal, setReviewModal] = useState({
    isOpen: false,
    order: null,
    rating: 5,
    comment: '',
    submitting: false,
    hoverRating: 0,
  });

  // Quản lý Phân quyền Quản trị viên (Admin)
  const [adminUsers, setAdminUsers] = useState([]);
  const [adminUsersLoading, setAdminUsersLoading] = useState(false);
  const [roleForm, setRoleForm] = useState({ email: '', name: '' });
  const [roleSubmitting, setRoleSubmitting] = useState(false);

  // Trạng thái thông báo và loading nút bấm
  const [statusMessage, setStatusMessage] = useState({ type: '', text: '' });
  const [isSaving, setIsSaving] = useState(false);

  // 1. Tải thông tin tài khoản
  useEffect(() => {
    if (!token) {
      navigate('/login');
      return;
    }

    const fetchProfile = async () => {
      try {
        setLoading(true);
        const data = await getUserProfile();
        setProfile({
          username: data.username || '',
          email: data.email || '',
          fullName: data.fullName || '',
          phone: data.phone || '',
          address: data.address || '',
          role: data.role || 'ROLE_USER',
          createdAt: data.createdAt || '',
        });
      } catch (err) {
        console.error('Lỗi khi tải thông tin tài khoản:', err);
        if (err.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          navigate('/login');
        } else {
          setStatusMessage({
            type: 'error',
            text: 'Không thể tải thông tin tài khoản lúc này!',
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token, navigate]);

  // Cập nhật tab nếu query param thay đổi
  useEffect(() => {
    if (queryTab && ['info', 'orders', 'password', 'permissions'].includes(queryTab)) {
      setActiveTab(queryTab);
    }
  }, [queryTab]);

  const isAdmin = profile.role === 'ROLE_ADMIN' || profile.role === 'ADMIN';

  // 2. Tải danh sách đơn hàng khi chuyển sang tab orders
  const fetchOrders = async () => {
    try {
      setOrdersLoading(true);
      setStatusMessage({ type: '', text: '' });
      const data = await getMyOrders();
      setOrders(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách đơn hàng:', err);
      setStatusMessage({
        type: 'error',
        text: 'Không thể tải danh sách đơn hàng lúc này!',
      });
    } finally {
      setOrdersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders' && token) {
      fetchOrders();
    }
  }, [activeTab, token]);

  // 3. Tải danh sách Quản trị viên khi vào tab permissions
  const fetchAdminUsers = async () => {
    try {
      setAdminUsersLoading(true);
      const data = await getAdminUsers();
      setAdminUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách quản trị viên:', err);
    } finally {
      setAdminUsersLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'permissions' && isAdmin && token) {
      fetchAdminUsers();
    }
  }, [activeTab, isAdmin, token]);

  const handleInfoChange = (e) => {
    setProfile({
      ...profile,
      [e.target.name]: e.target.value,
    });
    setStatusMessage({ type: '', text: '' });
  };

  const handlePasswordChange = (e) => {
    setPasswordData({
      ...passwordData,
      [e.target.name]: e.target.value,
    });
    setStatusMessage({ type: '', text: '' });
  };

  // Lưu thông tin cá nhân (Tên, Email, SĐT, Địa chỉ)
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!profile.email.trim()) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập địa chỉ Email/Gmail!' });
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateUserProfile({
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        address: profile.address,
      });

      const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
      const newUser = {
        ...storedUser,
        fullName: updated.fullName,
        email: updated.email,
      };
      localStorage.setItem('user', JSON.stringify(newUser));
      window.dispatchEvent(new Event('userProfileUpdated'));

      setStatusMessage({
        type: 'success',
        text: 'Cập nhật thông tin cá nhân thành công!',
      });
    } catch (err) {
      console.error('Lỗi cập nhật thông tin:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể cập nhật thông tin!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi cập nhật thông tin!',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Đổi mật khẩu
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    if (!passwordData.currentPassword) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu hiện tại!' });
      return;
    }

    if (!passwordData.newPassword) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập mật khẩu mới!' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu mới phải có ít nhất 6 ký tự!' });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setStatusMessage({ type: 'error', text: 'Mật khẩu xác nhận không khớp!' });
      return;
    }

    try {
      setIsSaving(true);
      await updateUserProfile({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword,
      });

      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      });

      setStatusMessage({
        type: 'success',
        text: 'Đổi mật khẩu thành công! Mật khẩu mới đã có hiệu lực.',
      });
    } catch (err) {
      console.error('Lỗi đổi mật khẩu:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể đổi mật khẩu!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi đổi mật khẩu!',
      });
    } finally {
      setIsSaving(false);
    }
  };

  // Hủy đơn hàng
  const handleCancelOrder = async (orderId) => {
    const confirmCancel = window.confirm(
      `Bạn có chắc chắn muốn hủy đơn hàng #DH${String(orderId).padStart(5, '0')} không?\nSố lượng sản phẩm sẽ được hoàn lại kho tự động.`
    );
    if (!confirmCancel) return;

    try {
      setCancellingId(orderId);
      await cancelOrder(orderId);
      setStatusMessage({
        type: 'success',
        text: `Đã hủy đơn hàng #DH${String(orderId).padStart(5, '0')} thành công!`,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Lỗi khi hủy đơn hàng:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể hủy đơn hàng lúc này!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi khi hủy đơn hàng!',
      });
    } finally {
      setCancellingId(null);
    }
  };

  // Xác nhận đã nhận được hàng (chuyển sang DELIVERED)
  const handleMarkAsReceived = async (orderId) => {
    const confirmReceive = window.confirm(
      `Bạn xác nhận đã nhận được kiện hàng cho đơn hàng #DH${String(orderId).padStart(5, '0')}?\nTrạng thái sẽ được cập nhật thành "Đã giao hàng". Bạn có thể để lại đánh giá sau khi nhận hàng.`
    );
    if (!confirmReceive) return;

    try {
      setReceivingId(orderId);
      await markOrderAsReceived(orderId);
      setStatusMessage({
        type: 'success',
        text: `Đã xác nhận nhận hàng cho đơn #DH${String(orderId).padStart(5, '0')} thành công! Hãy để lại đánh giá cho sản phẩm nhé.`,
      });
      await fetchOrders();
    } catch (err) {
      console.error('Lỗi khi xác nhận nhận hàng:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể xác nhận nhận hàng lúc này!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi khi xác nhận nhận hàng!',
      });
    } finally {
      setReceivingId(null);
    }
  };

  // Mở modal đánh giá
  const handleOpenReviewModal = (order) => {
    setReviewModal({
      isOpen: true,
      order: order,
      rating: order.review?.rating || 5,
      comment: order.review?.comment || '',
      submitting: false,
      hoverRating: 0,
    });
  };

  // Đóng modal đánh giá
  const handleCloseReviewModal = () => {
    setReviewModal({
      isOpen: false,
      order: null,
      rating: 5,
      comment: '',
      submitting: false,
      hoverRating: 0,
    });
  };

  // Gửi đánh giá lên máy chủ
  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!reviewModal.order) return;

    try {
      setReviewModal((prev) => ({ ...prev, submitting: true }));
      await reviewOrder(reviewModal.order.id, {
        rating: reviewModal.rating,
        comment: reviewModal.comment.trim(),
      });
      setStatusMessage({
        type: 'success',
        text: `Đánh giá đơn hàng #DH${String(reviewModal.order.id).padStart(5, '0')} thành công! Cảm ơn nhận xét của bạn.`,
      });
      handleCloseReviewModal();
      await fetchOrders();
    } catch (err) {
      console.error('Lỗi khi gửi đánh giá:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể gửi đánh giá lúc này!';
      alert(typeof msg === 'string' ? msg : 'Lỗi khi gửi đánh giá!');
      setReviewModal((prev) => ({ ...prev, submitting: false }));
    }
  };

  // Xử lý thay đổi input trong Form Phân quyền
  const handleRoleInputChange = (e) => {
    setRoleForm({
      ...roleForm,
      [e.target.name]: e.target.value,
    });
    setStatusMessage({ type: '', text: '' });
  };

  // Trao quyền Quản trị viên cho người dùng bằng Email và Tên
  const handleGrantAdmin = async (e) => {
    if (e) e.preventDefault();
    setStatusMessage({ type: '', text: '' });

    const email = roleForm.email.trim();
    const name = roleForm.name.trim();

    if (!email) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Email của người dùng cần trao quyền Admin!' });
      return;
    }
    if (!name) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Tên (Username hoặc Họ tên) của người dùng!' });
      return;
    }

    const confirmGrant = window.confirm(
      `Xác nhận trao quyền Quản trị viên (Admin) cho:\n- Email: ${email}\n- Tên: ${name}\n\nNgười dùng này sẽ có toàn quyền truy cập quản trị hệ thống.`
    );
    if (!confirmGrant) return;

    try {
      setRoleSubmitting(true);
      const res = await grantAdminRole({ email, name });
      setStatusMessage({
        type: 'success',
        text: `Đã trao quyền Quản trị viên (Admin) cho tài khoản "${res.username}" (${res.email}) thành công!`,
      });
      setRoleForm({ email: '', name: '' });
      await fetchAdminUsers();
    } catch (err) {
      console.error('Lỗi khi trao quyền Admin:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể trao quyền Quản trị viên lúc này!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi khi trao quyền Admin!',
      });
    } finally {
      setRoleSubmitting(false);
    }
  };

  // Thu hồi quyền Quản trị viên (Gỡ quyền Admin)
  const handleRevokeAdmin = async (targetEmail, targetName) => {
    setStatusMessage({ type: '', text: '' });

    const email = (targetEmail || roleForm.email || '').trim();
    const name = (targetName || roleForm.name || '').trim();

    if (!email) {
      setStatusMessage({ type: 'error', text: 'Vui lòng nhập Email của người dùng cần gỡ quyền Admin!' });
      return;
    }

    const confirmRevoke = window.confirm(
      `CẢNH BÁO: Bạn có chắc chắn muốn thu hồi quyền Quản trị viên (Admin) của tài khoản:\n- Email: ${email}${name ? `\n- Tên: ${name}` : ''} không?\n\nTài khoản này sẽ trở về quyền khách hàng thông thường.`
    );
    if (!confirmRevoke) return;

    try {
      setRoleSubmitting(true);
      const res = await revokeAdminRole({ email, name });
      setStatusMessage({
        type: 'success',
        text: `Đã thu hồi quyền Admin của tài khoản "${res.username}" (${res.email}) thành công!`,
      });
      if (!targetEmail) {
        setRoleForm({ email: '', name: '' });
      }
      await fetchAdminUsers();
    } catch (err) {
      console.error('Lỗi khi gỡ quyền Admin:', err);
      const msg = err.response?.data?.message || err.response?.data || 'Không thể gỡ quyền Quản trị viên lúc này!';
      setStatusMessage({
        type: 'error',
        text: typeof msg === 'string' ? msg : 'Lỗi khi gỡ quyền Admin!',
      });
    } finally {
      setRoleSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  // Helper hiển thị trạng thái đơn hàng
  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
            Chờ xử lý
          </span>
        );
      case 'CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            Đã xác nhận
          </span>
        );
      case 'SHIPPING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <span className="w-2 h-2 rounded-full bg-indigo-500"></span>
            Đang giao hàng
          </span>
        );
      case 'DELIVERED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Đã giao hàng
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600 border border-gray-200">
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            Đã hủy
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {status}
          </span>
        );
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (ordersFilter === 'ALL') return true;
    return o.status === ordersFilter;
  });

  if (loading) {
    return (
      <div className="bg-brand-light min-h-screen font-sans flex flex-col">
        <Header />
        <div className="flex-1 flex items-center justify-center text-gray-500 font-semibold animate-pulse">
          Đang tải thông tin tài khoản...
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="bg-brand-light min-h-screen font-sans flex flex-col">
      <Header />

      <div className="container mx-auto px-4 py-8 flex-1 max-w-6xl">
        <div className="mb-6">
          <Link to="/" className="text-sm font-medium text-gray-600 hover:text-brand-dark flex items-center gap-1">
            <span>←</span> Quay lại trang chủ
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Cột trái: Tóm tắt thông tin tài khoản & Menu tabs */}
          <div className="md:col-span-1">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col items-center text-center sticky top-24">
              {/* Avatar */}
              <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-brand-dark to-gray-700 text-white text-2xl font-bold flex items-center justify-center uppercase shadow-md mb-3 ring-4 ring-gray-100">
                {(profile.fullName || profile.username || 'U')[0]}
              </div>

              <h2 className="text-lg font-bold text-brand-dark break-words max-w-full">
                {profile.fullName || profile.username}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">@{profile.username}</p>

              <div className="mt-2.5">
                <span className={`text-xs font-semibold px-3 py-0.5 rounded-full ${
                  profile.role === 'ROLE_ADMIN'
                    ? 'bg-purple-100 text-purple-700'
                    : 'bg-blue-100 text-blue-700'
                }`}>
                  {profile.role === 'ROLE_ADMIN' ? '⭐ Quản trị viên' : 'Khách hàng thân thiết'}
                </span>
              </div>

              {/* Menu chuyển tab */}
              <div className="w-full mt-6 space-y-1.5 border-t border-gray-100 pt-5 text-left text-sm font-medium">
                {/* Tab Thông tin cá nhân */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('info');
                    setStatusMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                    activeTab === 'info'
                      ? 'bg-brand-dark text-white font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>Hồ sơ cá nhân</span>
                </button>

                {/* Tab Lịch sử đơn hàng */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('orders');
                    setStatusMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                    activeTab === 'orders'
                      ? 'bg-brand-dark text-white font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                    </svg>
                    <span>Lịch sử mua hàng</span>
                  </div>
                  {orders.length > 0 && (
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                      activeTab === 'orders' ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-700'
                    }`}>
                      {orders.length}
                    </span>
                  )}
                </button>

                {/* Tab Đổi mật khẩu */}
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('password');
                    setStatusMessage({ type: '', text: '' });
                  }}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl transition ${
                    activeTab === 'password'
                      ? 'bg-brand-dark text-white font-semibold shadow-sm'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  <span>Đổi mật khẩu</span>
                </button>

                {/* Tab Phân quyền Admin (Chỉ hiển thị khi là Admin) */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab('permissions');
                      setStatusMessage({ type: '', text: '' });
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl transition ${
                      activeTab === 'permissions'
                        ? 'bg-purple-600 text-white font-bold shadow-md'
                        : 'text-purple-700 bg-purple-50 hover:bg-purple-100 font-semibold'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Phân quyền Admin</span>
                    </div>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-purple-200/60 text-purple-900">
                      Tag
                    </span>
                  </button>
                )}

                {/* Phím tắt Admin sang các trang quản trị */}
                {isAdmin && (
                  <div className="pt-2 border-t border-dashed border-gray-200 mt-2 space-y-1">
                    <div className="text-[10px] uppercase font-bold text-gray-400 px-3.5 py-1">
                      Khu vực Quản trị
                    </div>
                    <Link
                      to="/admin/products"
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-gray-700 hover:bg-black/5 transition font-medium"
                    >
                      <span>📦</span>
                      <span>Quản trị kho sản phẩm</span>
                    </Link>
                    <Link
                      to="/admin/orders"
                      className="w-full flex items-center gap-3 px-3.5 py-2 rounded-xl text-xs text-blue-700 hover:bg-blue-50 transition font-medium"
                    >
                      <span>📑</span>
                      <span>Quản lý đơn hàng</span>
                    </Link>
                  </div>
                )}

                {/* Link Giỏ hàng */}
                <Link
                  to="/cart"
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-gray-600 hover:bg-gray-100 transition"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <span>Giỏ hàng của tôi</span>
                </Link>

                {/* Đăng xuất */}
                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-red-600 hover:bg-red-50 transition font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Đăng xuất</span>
                </button>
              </div>
            </div>
          </div>

          {/* Cột phải: Nội dung chi tiết các tab */}
          <div className="md:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
              {/* Thông báo trạng thái */}
              {statusMessage.text && (
                <div
                  className={`mb-6 p-4 rounded-xl text-sm flex items-center gap-2.5 border ${
                    statusMessage.type === 'success'
                      ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      : 'bg-red-50 text-red-800 border-red-200'
                  }`}
                >
                  <span>{statusMessage.type === 'success' ? '✓' : '⚠️'}</span>
                  <span>{statusMessage.text}</span>
                </div>
              )}

              {/* TAB 1: THÔNG TIN CÁ NHÂN */}
              {activeTab === 'info' && (
                <div>
                  <div className="pb-4 mb-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-brand-dark">Hồ sơ cá nhân</h1>
                    <p className="text-xs text-gray-500 mt-1">
                      Cập nhật thông tin họ tên, email, số điện thoại và địa chỉ nhận hàng của bạn.
                    </p>
                  </div>

                  <form onSubmit={handleSaveInfo} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-gray-500 mb-1.5">
                        Tên đăng nhập (Tài khoản)
                      </label>
                      <input
                        type="text"
                        value={profile.username}
                        disabled
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 text-sm font-medium cursor-not-allowed"
                      />
                      <span className="text-[11px] text-gray-400 mt-1 block">Tên tài khoản không thể thay đổi sau khi đăng ký.</span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Họ và tên
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={profile.fullName}
                        onChange={handleInfoChange}
                        placeholder="Ví dụ: Nguyễn Văn A"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Địa chỉ Email / Gmail <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={profile.email}
                        onChange={handleInfoChange}
                        required
                        placeholder="Ví dụ: khachhang@gmail.com"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Số điện thoại
                      </label>
                      <input
                        type="tel"
                        name="phone"
                        value={profile.phone}
                        onChange={handleInfoChange}
                        placeholder="Ví dụ: 0987654321"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Địa chỉ nhận hàng mặc định
                      </label>
                      <textarea
                        name="address"
                        rows="3"
                        value={profile.address}
                        onChange={handleInfoChange}
                        placeholder="Ví dụ: Số 123 Đường Cầu Giấy, Phường Dịch Vọng, Quận Cầu Giấy, Hà Nội"
                        className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition resize-none"
                      />
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition shadow-sm disabled:opacity-40 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Đang lưu...</span>
                          </>
                        ) : (
                          <span>Lưu thông tin</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 2: LỊCH SỬ ĐƠN HÀNG */}
              {activeTab === 'orders' && (
                <div>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 mb-6 border-b border-gray-100 gap-3">
                    <div>
                      <h1 className="text-xl font-bold text-brand-dark">Lịch sử mua hàng</h1>
                      <p className="text-xs text-gray-500 mt-1">
                        Theo dõi tiến trình đơn hàng và xem lại các thiết bị bạn đã mua.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={fetchOrders}
                      disabled={ordersLoading}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-600 hover:text-brand-dark bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg transition self-start sm:self-auto"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${ordersLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Làm mới</span>
                    </button>
                  </div>

                  {/* Bộ lọc trạng thái */}
                  <div className="flex flex-wrap gap-2 mb-6">
                    {[
                      { key: 'ALL', label: 'Tất cả' },
                      { key: 'PENDING', label: 'Chờ xử lý' },
                      { key: 'CONFIRMED', label: 'Đã xác nhận' },
                      { key: 'SHIPPING', label: 'Đang giao' },
                      { key: 'DELIVERED', label: 'Đã giao' },
                      { key: 'CANCELLED', label: 'Đã hủy' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        type="button"
                        onClick={() => setOrdersFilter(f.key)}
                        className={`text-xs px-3.5 py-1.5 rounded-full font-semibold transition ${
                          ordersFilter === f.key
                            ? 'bg-brand-dark text-white shadow-sm'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {ordersLoading ? (
                    <div className="py-16 text-center text-gray-400 flex flex-col items-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-brand-dark" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <p className="text-sm font-medium">Đang tải lịch sử đơn hàng...</p>
                    </div>
                  ) : filteredOrders.length === 0 ? (
                    <div className="py-16 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 p-8">
                      <div className="w-16 h-16 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mx-auto mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                      </div>
                      <h3 className="text-base font-bold text-brand-dark mb-1">
                        {ordersFilter === 'ALL' ? 'Bạn chưa có đơn hàng nào' : 'Không có đơn hàng nào ở trạng thái này'}
                      </h3>
                      <p className="text-xs text-gray-500 max-w-sm mx-auto mb-5">
                        Hãy dạo một vòng cửa hàng và chọn cho mình chiếc laptop ưng ý nhất nhé!
                      </p>
                      <Link
                        to="/"
                        className="inline-flex items-center gap-2 bg-brand-dark text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-black transition shadow-sm"
                      >
                        <span>Khám phá Laptop ngay</span>
                        <span>→</span>
                      </Link>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      {filteredOrders.map((order) => {
                        const orderDate = order.createAt
                          ? new Date(order.createAt).toLocaleString('vi-VN', {
                              hour: '2-digit',
                              minute: '2-digit',
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })
                          : 'Vừa xong';

                        const isPending = order.status === 'PENDING';

                        return (
                          <div
                            key={order.id}
                            className="border border-gray-200 rounded-2xl overflow-hidden hover:shadow-md transition bg-white"
                          >
                            {/* Thanh Header của đơn hàng */}
                            <div className="bg-gray-50/80 px-5 py-3.5 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-brand-dark text-sm">
                                  #DH{String(order.id).padStart(5, '0')}
                                </span>
                                <span className="text-gray-400">•</span>
                                <span className="text-gray-500">Ngày đặt: {orderDate}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {getStatusBadge(order.status)}
                              </div>
                            </div>

                            {/* Thông tin người nhận */}
                            <div className="px-5 py-3 bg-amber-50/30 border-b border-gray-100 text-xs text-gray-600 flex flex-wrap gap-x-6 gap-y-1">
                              <div>
                                <span className="text-gray-400">Người nhận:</span>{' '}
                                <strong className="text-brand-dark">{order.receiverName}</strong>
                              </div>
                              <div>
                                <span className="text-gray-400">Số điện thoại:</span>{' '}
                                <strong className="text-brand-dark">{order.receiverPhone}</strong>
                              </div>
                              <div className="w-full">
                                <span className="text-gray-400">Địa chỉ giao:</span>{' '}
                                <span className="text-brand-dark font-medium">{order.shippingAddress}</span>
                              </div>
                            </div>

                            {/* Danh sách sản phẩm trong đơn */}
                            <div className="p-5 divide-y divide-gray-100">
                              {order.orderDetails && order.orderDetails.map((item) => {
                                const variant = item.productVariant;
                                const product = variant?.product;
                                const itemImg = variant?.imageUrl || product?.imageUrl || 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300';
                                const itemPrice = Number(item.price || 0);
                                const lineTotal = itemPrice * (item.quantity || 1);

                                return (
                                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center gap-4">
                                    <img
                                      src={itemImg}
                                      alt={product?.name || 'Laptop'}
                                      className="w-16 h-16 object-cover rounded-xl border border-gray-200 shrink-0 bg-white"
                                    />
                                    <div className="flex-1 min-w-0">
                                      <h4 className="text-sm font-bold text-brand-dark truncate">
                                        {product?.name || 'Sản phẩm'}
                                      </h4>
                                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs">
                                        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded font-medium">
                                          Màu: <strong>{variant?.color || 'Mặc định'}</strong>
                                        </span>
                                        <span className="text-gray-500">
                                          Số lượng: <strong className="text-brand-dark">x{item.quantity}</strong>
                                        </span>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0">
                                      <div className="text-xs text-gray-400">
                                        {itemPrice.toLocaleString('vi-VN')} ₫ / máy
                                      </div>
                                      <div className="text-sm font-extrabold text-red-600 mt-0.5">
                                        {lineTotal.toLocaleString('vi-VN')} ₫
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Hiển thị Đánh giá nếu người dùng đã đánh giá */}
                            {order.review && (
                              <div className="mx-5 mb-4 p-4 rounded-xl bg-amber-50/70 border border-amber-200">
                                <div className="flex items-center justify-between gap-2 mb-1.5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-amber-900 flex items-center gap-1">
                                      <span>⭐</span> Đánh giá của bạn:
                                    </span>
                                    <div className="flex items-center text-amber-500 text-sm">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <span key={star}>
                                          {star <= order.review.rating ? '★' : '☆'}
                                        </span>
                                      ))}
                                      <span className="ml-1.5 text-xs font-extrabold text-amber-800">
                                        ({order.review.rating}/5)
                                      </span>
                                    </div>
                                  </div>
                                  <span className="text-[11px] text-gray-500">
                                    {order.review.createdAt
                                      ? new Date(order.review.createdAt).toLocaleDateString('vi-VN')
                                      : ''}
                                  </span>
                                </div>
                                {order.review.comment ? (
                                  <p className="text-xs text-gray-700 italic bg-white/80 p-2.5 rounded-lg border border-amber-100">
                                    "{order.review.comment}"
                                  </p>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">
                                    (Không có nhận xét bằng lời)
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Footer đơn hàng: Tổng tiền & Nút Hành động */}
                            <div className="bg-gray-50 px-5 py-3.5 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
                              <div className="flex items-baseline gap-2">
                                <span className="text-xs text-gray-500 font-medium">Tổng tiền thanh toán:</span>
                                <span className="text-lg font-extrabold text-red-600">
                                  {Number(order.totalAmount || 0).toLocaleString('vi-VN')} ₫
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                {/* Hủy đơn hàng khi đơn còn PENDING */}
                                {isPending && (
                                  <button
                                    type="button"
                                    disabled={cancellingId === order.id}
                                    onClick={() => handleCancelOrder(order.id)}
                                    className="text-xs font-bold text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3.5 py-1.5 rounded-lg transition disabled:opacity-40"
                                  >
                                    {cancellingId === order.id ? 'Đang hủy...' : 'Hủy đơn hàng'}
                                  </button>
                                )}

                                {/* Người dùng xác nhận Đã nhận được hàng khi trạng thái SHIPPING */}
                                {order.status === 'SHIPPING' && (
                                  <button
                                    type="button"
                                    disabled={receivingId === order.id}
                                    onClick={() => handleMarkAsReceived(order.id)}
                                    className="text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 disabled:opacity-50"
                                    title="Xác nhận bạn đã nhận được sản phẩm"
                                  >
                                    <span>📦</span>
                                    <span>{receivingId === order.id ? 'Đang xác nhận...' : 'Đã nhận được hàng'}</span>
                                  </button>
                                )}

                                {/* Đánh giá đơn hàng khi trạng thái DELIVERED */}
                                {order.status === 'DELIVERED' && (
                                  order.review ? (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(order)}
                                      className="text-xs font-bold text-amber-800 hover:text-amber-950 bg-amber-100 hover:bg-amber-200 border border-amber-300 px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                                      title="Chỉnh sửa đánh giá của bạn"
                                    >
                                      <span>✏️</span>
                                      <span>Sửa đánh giá</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleOpenReviewModal(order)}
                                      className="text-xs font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-sm px-3.5 py-1.5 rounded-lg transition flex items-center gap-1.5 animate-pulse"
                                      title="Chấm điểm và nhận xét về sản phẩm"
                                    >
                                      <span>⭐</span>
                                      <span>Đánh giá đơn hàng</span>
                                    </button>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: ĐỔI MẬT KHẨU */}
              {activeTab === 'password' && (
                <div>
                  <div className="pb-4 mb-6 border-b border-gray-100">
                    <h1 className="text-xl font-bold text-brand-dark">Đổi mật khẩu tài khoản</h1>
                    <p className="text-xs text-gray-500 mt-1">
                      Để bảo vệ tài khoản của bạn, hãy sử dụng mật khẩu mạnh có ít nhất 6 ký tự.
                    </p>
                  </div>

                  <form onSubmit={handleSavePassword} className="space-y-5">
                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Mật khẩu hiện tại <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showCurrentPass ? 'text' : 'password'}
                          name="currentPassword"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                          required
                          placeholder="Nhập mật khẩu hiện tại"
                          className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowCurrentPass(!showCurrentPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark text-xs font-semibold px-1 py-1"
                        >
                          {showCurrentPass ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          required
                          minLength="6"
                          placeholder="Nhập mật khẩu mới (ít nhất 6 ký tự)"
                          className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPass(!showNewPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark text-xs font-semibold px-1 py-1"
                        >
                          {showNewPass ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                        Xác nhận mật khẩu mới <span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPass ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          required
                          placeholder="Nhập lại mật khẩu mới"
                          className="w-full px-4 py-2.5 pr-12 rounded-xl border border-gray-300 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPass(!showConfirmPass)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-brand-dark text-xs font-semibold px-1 py-1"
                        >
                          {showConfirmPass ? 'Ẩn' : 'Hiện'}
                        </button>
                      </div>
                    </div>

                    <div className="pt-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isSaving}
                        className="bg-brand-dark text-white px-8 py-3 rounded-xl font-bold text-sm hover:bg-black transition shadow-sm disabled:opacity-40 flex items-center gap-2"
                      >
                        {isSaving ? (
                          <>
                            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                            </svg>
                            <span>Đang cập nhật...</span>
                          </>
                        ) : (
                          <span>Xác nhận đổi mật khẩu</span>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* TAB 4: PHÂN QUYỀN ADMIN (CHỈ DÀNH CHO ADMIN) */}
              {activeTab === 'permissions' && isAdmin && (
                <div className="space-y-8 animate-fadeIn">
                  {/* Header của Tab */}
                  <div className="pb-4 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold uppercase tracking-wider bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          🛡️ Admin Authority
                        </span>
                        <span className="text-xs text-gray-500">• Phân quyền hệ thống</span>
                      </div>
                      <h1 className="text-xl font-extrabold text-brand-dark">
                        Trao Quyền & Thu Hồi Quyền Quản Trị Viên (Admin)
                      </h1>
                      <p className="text-xs text-gray-500 mt-1">
                        Cấp quyền Admin cho người dùng bất kỳ thông qua Email và Tên, hoặc gỡ quyền khi không còn phụ trách.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={fetchAdminUsers}
                      disabled={adminUsersLoading}
                      className="self-start sm:self-auto text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 transition flex items-center gap-1.5 shadow-sm"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className={`w-3.5 h-3.5 ${adminUsersLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span>Làm mới danh sách</span>
                    </button>
                  </div>

                  {/* Form Trao / Gỡ Quyền */}
                  <div className="bg-gradient-to-br from-purple-50/70 via-white to-indigo-50/40 p-6 rounded-2xl border border-purple-100 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-lg bg-purple-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        ⚙️
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-brand-dark">
                          Biểu mẫu Phân Quyền Người Dùng
                        </h3>
                        <p className="text-xs text-gray-500">
                          Nhập chính xác Email và Tên (Username hoặc Họ tên) của người dùng để thực hiện
                        </p>
                      </div>
                    </div>

                    <form onSubmit={handleGrantAdmin} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Nhập Email */}
                        <div>
                          <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                            Địa chỉ Email / Gmail <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="email"
                            name="email"
                            value={roleForm.email}
                            onChange={handleRoleInputChange}
                            required
                            placeholder="Ví dụ: nguyenvana@gmail.com"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-sm outline-none transition bg-white"
                          />
                        </div>

                        {/* Nhập Tên người dùng */}
                        <div>
                          <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                            Tên người dùng (Username hoặc Họ tên) <span className="text-red-500">*</span>
                          </label>
                          <input
                            type="text"
                            name="name"
                            value={roleForm.name}
                            onChange={handleRoleInputChange}
                            required
                            placeholder="Ví dụ: nguyenvana hoặc Nguyễn Văn A"
                            className="w-full px-4 py-2.5 rounded-xl border border-gray-300 focus:border-purple-600 focus:ring-1 focus:ring-purple-600 text-sm outline-none transition bg-white"
                          />
                        </div>
                      </div>

                      {/* Thông báo chú ý */}
                      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-900 flex items-start gap-2.5">
                        <span className="text-base shrink-0">💡</span>
                        <div className="leading-relaxed">
                          <strong>Lưu ý bảo mật:</strong> Quyền <strong>Quản trị viên (Admin)</strong> cho phép truy cập toàn quyền vào kho sản phẩm, xem toàn bộ đơn hàng hệ thống và phân quyền. Hãy xác nhận kỹ thông tin người nhận trước khi cấp quyền.
                        </div>
                      </div>

                      {/* Các nút bấm thao tác */}
                      <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                        {/* Nút Gỡ quyền Admin */}
                        <button
                          type="button"
                          disabled={roleSubmitting || !roleForm.email.trim()}
                          onClick={() => handleRevokeAdmin(roleForm.email, roleForm.name)}
                          className="px-5 py-2.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold transition disabled:opacity-40 flex items-center gap-1.5"
                          title="Thu hồi quyền Admin của tài khoản này nếu đang là Admin"
                        >
                          <span>⛔</span>
                          <span>{roleSubmitting ? 'Đang xử lý...' : 'Gỡ quyền Admin'}</span>
                        </button>

                        {/* Nút Trao quyền Admin */}
                        <button
                          type="submit"
                          disabled={roleSubmitting || !roleForm.email.trim() || !roleForm.name.trim()}
                          className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md transition disabled:opacity-40 flex items-center gap-1.5"
                          title="Trao quyền Quản trị viên cho tài khoản này"
                        >
                          <span>🛡️</span>
                          <span>{roleSubmitting ? 'Đang trao quyền...' : 'Trao Quyền Quản Trị Viên'}</span>
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* Danh sách Quản trị viên hiện tại */}
                  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-brand-dark flex items-center gap-2">
                          <span>Danh Sách Quản Trị Viên Hệ Thống</span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-bold">
                            {adminUsers.length} tài khoản
                          </span>
                        </h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Tất cả những người dùng đang nắm giữ quyền Admin trong hệ thống
                        </p>
                      </div>
                    </div>

                    {adminUsersLoading ? (
                      <div className="py-12 text-center text-gray-400 flex flex-col items-center gap-2">
                        <svg className="animate-spin h-6 w-6 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                        </svg>
                        <span className="text-xs">Đang tải danh sách Admin...</span>
                      </div>
                    ) : adminUsers.length === 0 ? (
                      <div className="py-12 text-center text-gray-400 text-xs">
                        Chưa có dữ liệu danh sách quản trị viên.
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-gray-50/80 border-b border-gray-100 text-gray-500 uppercase font-bold text-[11px]">
                              <th className="py-3 px-4">Tài khoản & Họ tên</th>
                              <th className="py-3 px-4">Email</th>
                              <th className="py-3 px-4">Số điện thoại</th>
                              <th className="py-3 px-4">Vai trò</th>
                              <th className="py-3 px-4 text-right">Thao tác</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {adminUsers.map((u) => {
                              const isSelf = u.username === profile.username || u.email === profile.email;

                              return (
                                <tr key={u.id} className="hover:bg-purple-50/30 transition">
                                  <td className="py-3.5 px-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-purple-700 to-indigo-600 text-white font-bold flex items-center justify-center uppercase shrink-0 shadow-sm text-xs">
                                        {(u.fullName || u.username || 'A')[0]}
                                      </div>
                                      <div>
                                        <div className="font-bold text-brand-dark flex items-center gap-1.5">
                                          <span>{u.fullName || u.username}</span>
                                          {isSelf && (
                                            <span className="text-[10px] bg-green-100 text-green-700 font-bold px-1.5 py-0.2 rounded">
                                              Bạn
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[11px] text-gray-400 font-mono">
                                          @{u.username}
                                        </div>
                                      </div>
                                    </div>
                                  </td>

                                  <td className="py-3.5 px-4 font-mono text-gray-700 font-medium">
                                    {u.email}
                                  </td>

                                  <td className="py-3.5 px-4 text-gray-600">
                                    {u.phone || 'Chưa cập nhật'}
                                  </td>

                                  <td className="py-3.5 px-4">
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-100 text-purple-700 border border-purple-200">
                                      <span>⭐</span> Quản trị viên
                                    </span>
                                  </td>

                                  <td className="py-3.5 px-4 text-right">
                                    {isSelf ? (
                                      <span className="text-gray-400 italic text-[11px]">
                                        Đang sử dụng
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        disabled={roleSubmitting}
                                        onClick={() => handleRevokeAdmin(u.email, u.username)}
                                        className="text-red-600 hover:text-white bg-red-50 hover:bg-red-600 border border-red-200 px-3 py-1.5 rounded-lg transition font-semibold text-xs shadow-sm inline-flex items-center gap-1 disabled:opacity-40"
                                        title={`Gỡ quyền Quản trị viên của @${u.username}`}
                                      >
                                        <span>⛔</span>
                                        <span>Gỡ quyền Admin</span>
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL ĐÁNH GIÁ ĐƠN HÀNG */}
      {reviewModal.isOpen && reviewModal.order && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-gray-100">
            {/* Nút đóng */}
            <button
              type="button"
              onClick={handleCloseReviewModal}
              disabled={reviewModal.submitting}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition"
            >
              ✕
            </button>

            <div className="text-center mb-6">
              <div className="w-14 h-14 bg-amber-100 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-3 text-2xl shadow-inner">
                ⭐
              </div>
              <h3 className="text-xl font-extrabold text-brand-dark">
                {reviewModal.order.review ? 'Chỉnh sửa Đánh Giá' : 'Đánh Giá Đơn Hàng'}
              </h3>
              <p className="text-xs text-gray-500 mt-1">
                Đơn hàng #DH{String(reviewModal.order.id).padStart(5, '0')} • Cảm nhận của bạn giúp chúng tôi nâng cao chất lượng dịch vụ
              </p>
            </div>

            <form onSubmit={handleSubmitReview} className="space-y-5">
              {/* Star Rating Picker */}
              <div className="text-center bg-gray-50 py-4 px-4 rounded-2xl border border-gray-100">
                <label className="block text-xs font-bold text-gray-600 uppercase tracking-wider mb-2">
                  Bạn chấm đơn hàng này mấy sao?
                </label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const activeStar = reviewModal.hoverRating || reviewModal.rating;
                    return (
                      <button
                        key={star}
                        type="button"
                        onMouseEnter={() => setReviewModal((prev) => ({ ...prev, hoverRating: star }))}
                        onMouseLeave={() => setReviewModal((prev) => ({ ...prev, hoverRating: 0 }))}
                        onClick={() => setReviewModal((prev) => ({ ...prev, rating: star }))}
                        className="text-3xl sm:text-4xl transition-transform hover:scale-125 focus:outline-none"
                      >
                        <span className={star <= activeStar ? 'text-amber-400' : 'text-gray-300'}>
                          ★
                        </span>
                      </button>
                    );
                  })}
                </div>
                <div className="text-xs font-bold text-amber-700 mt-2">
                  {(() => {
                    const current = reviewModal.hoverRating || reviewModal.rating;
                    switch (current) {
                      case 1:
                        return '😞 1 sao - Rất không hài lòng';
                      case 2:
                        return '🙁 2 sao - Chưa hài lòng';
                      case 3:
                        return '😐 3 sao - Bình thường';
                      case 4:
                        return '😊 4 sao - Hài lòng & Tốt';
                      case 5:
                      default:
                        return '🤩 5 sao - Cực kỳ hài lòng & Tuyệt vời!';
                    }
                  })()}
                </div>
              </div>

              {/* Nhận xét văn bản */}
              <div>
                <label className="block text-xs font-bold uppercase text-brand-dark mb-1.5">
                  Nhận xét chi tiết (Tùy chọn)
                </label>
                <textarea
                  rows={4}
                  value={reviewModal.comment}
                  onChange={(e) =>
                    setReviewModal((prev) => ({ ...prev, comment: e.target.value }))
                  }
                  placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm, đóng gói, thời gian giao hàng..."
                  className="w-full px-4 py-3 rounded-2xl border border-gray-200 focus:border-brand-dark focus:ring-1 focus:ring-brand-dark text-sm outline-none transition resize-none"
                />
              </div>

              {/* Nút hành động */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleCloseReviewModal}
                  disabled={reviewModal.submitting}
                  className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={reviewModal.submitting}
                  className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white text-sm font-bold shadow-md transition disabled:opacity-50 flex items-center gap-2"
                >
                  {reviewModal.submitting ? (
                    <>
                      <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
                      </svg>
                      <span>Đang gửi...</span>
                    </>
                  ) : (
                    <span>Gửi Đánh Giá</span>
                  )}
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

export default ProfilePage;
