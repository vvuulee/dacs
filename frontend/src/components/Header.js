import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const Header = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const { cartCount } = useCart();
  const [currentUser, setCurrentUser] = useState(() => JSON.parse(localStorage.getItem('user') || '{}'));
  const [headerSearch, setHeaderSearch] = useState('');

  const handleHeaderSearch = (e) => {
    e.preventDefault();
    if (headerSearch.trim()) {
      navigate(`/?search=${encodeURIComponent(headerSearch.trim())}`);
    } else {
      navigate('/');
    }
  };

  useEffect(() => {
    const handleProfileUpdate = () => {
      setCurrentUser(JSON.parse(localStorage.getItem('user') || '{}'));
    };
    window.addEventListener('userProfileUpdated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('userProfileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, []);

  // Kiểm tra quyền ADMIN từ object user hoặc giải mã trực tiếp từ JWT Token
  const checkIsAdmin = () => {
    if (!token) return false;

    // 1. Kiểm tra trong localStorage 'user'
    if (
      currentUser?.role === 'ADMIN' ||
      currentUser?.role === 'ROLE_ADMIN' ||
      currentUser?.roles?.includes('ADMIN') ||
      currentUser?.roles?.includes('ROLE_ADMIN')
    ) {
      return true;
    }

    // 2. Giải mã phần payload của JWT Token để kiểm tra
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(window.atob(base64));

      return (
        payload?.role === 'ADMIN' ||
        payload?.role === 'ROLE_ADMIN' ||
        payload?.roles?.includes('ADMIN') ||
        payload?.roles?.includes('ROLE_ADMIN') ||
        payload?.authorities?.some(
          (auth) =>
            auth === 'ROLE_ADMIN' ||
            auth === 'ADMIN' ||
            auth?.authority === 'ROLE_ADMIN' ||
            auth?.authority === 'ADMIN'
        )
      );
    } catch (e) {
      return false;
    }
  };

  const isAdmin = checkIsAdmin();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
    window.location.reload();
  };

  return (
    <header className="bg-brand-beige text-brand-dark py-4 shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl flex justify-between items-center">
        {/* Logo và tên thương hiệu */}
        <Link to="/" className="flex items-center gap-2 cursor-pointer group">
          <div className="bg-brand-dark text-brand-beige p-2 rounded-lg group-hover:bg-black transition duration-300">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="text-2xl md:text-3xl font-extrabold tracking-tighter" style={{ fontFamily: "'Orbitron', sans-serif" }}>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-yellow-300">LAPTOP</span>
            <span className="text-brand-dark">.HAY</span>
          </div>
        </Link>

        {/* Thanh tìm kiếm */}
        <form onSubmit={handleHeaderSearch} className="flex-1 mx-8 relative items-center hidden md:flex">
          <input 
            type="text" 
            value={headerSearch}
            onChange={(e) => setHeaderSearch(e.target.value)}
            placeholder="Bạn tìm laptop gì (MacBook, Gaming, Dell XPS...)..." 
            className="w-full py-2 pl-4 pr-12 rounded-xl focus:outline-none border border-transparent focus:border-brand-dark shadow-inner text-sm text-brand-dark bg-white"
          />
          <button 
            type="submit" 
            className="absolute right-0 top-0 bottom-0 px-4 bg-white rounded-r-xl text-gray-400 hover:text-brand-dark flex items-center justify-center transition"
            title="Tìm kiếm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21 21-4.34-4.34"/>
              <circle cx="11" cy="11" r="8"/>
            </svg>
          </button>
        </form>

        {/* Giỏ hàng & Tài khoản */}
        <div className="flex space-x-6 items-center font-medium">
          {/* Nút Quản trị (Hiển thị khi là Admin) */}
          {isAdmin && (
            <div className="flex items-center gap-2">
              <Link
                to="/admin/products"
                className="bg-brand-dark text-brand-beige px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-black transition shadow-sm flex items-center gap-1.5"
                title="Quản trị kho hàng"
              >
                <span>📦</span>
                <span className="hidden sm:inline">Quản trị kho</span>
              </Link>
              <Link
                to="/admin/orders"
                className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-sm flex items-center gap-1.5"
                title="Quản lý toàn bộ đơn hàng hệ thống"
              >
                <span>📑</span>
                <span className="hidden sm:inline">Đơn hàng</span>
              </Link>
            </div>
          )}

          <Link to="/cart" className="hover:text-gray-500 transition flex items-center gap-2 group relative">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-brand-dark group-hover:scale-110 transition-transform" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m2.05 2.05 1.099-.028a1 1 0 0 1 1.008.815l2.69 14.347A1 1 0 0 0 7.83 18H18"/>
                <path d="M4.563 5h16.435a1 1 0 0 1 .981 1.204l-1.026 6.226A2 2 0 0 1 18.962 14H6.25"/>
                <circle cx="18" cy="20" r="2"/>
                <circle cx="8" cy="20" r="2"/>
              </svg>
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2.5 bg-red-600 text-white text-[11px] font-bold rounded-full h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md animate-bounce">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </div>
            <span className="hidden sm:inline font-semibold">Giỏ hàng</span>
          </Link>

          {token ? (
            <div className="flex items-center gap-3">
              {/* Nút bấm vào tên tài khoản chuyển sang trang Profile */}
              <Link
                to="/profile"
                className="flex items-center gap-2 text-sm font-semibold text-brand-dark hover:text-blue-600 transition px-2 py-1.5 rounded-xl hover:bg-black/5 group"
                title="Bấm vào để xem và sửa thông tin tài khoản"
              >
                <div className="w-7 h-7 rounded-full bg-brand-dark text-white flex items-center justify-center text-xs font-bold uppercase shadow-sm group-hover:bg-blue-600 transition">
                  {(currentUser.fullName || currentUser.username || 'U')[0]}
                </div>
                <span className="truncate max-w-[120px] sm:max-w-[150px]">
                  {currentUser.fullName || currentUser.username || 'Tài khoản'}
                </span>
              </Link>

              {/* Nút xem Lịch sử đơn hàng */}
              <Link
                to="/orders"
                className="hidden md:flex items-center gap-1.5 text-xs font-semibold text-gray-700 hover:text-brand-dark px-2.5 py-1.5 rounded-lg hover:bg-black/5 transition"
                title="Xem lịch sử mua hàng"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Đơn hàng</span>
              </Link>

              <button 
                onClick={handleLogout}
                className="text-xs bg-red-100 text-red-600 px-3 py-1.5 rounded-md hover:bg-red-200 transition font-medium"
              >
                Đăng xuất
              </button>
            </div>
          ) : (
            <Link 
              to="/login"
              className="bg-brand-dark text-white px-5 py-2 rounded-md hover:bg-black transition"
            >
              Đăng nhập
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;