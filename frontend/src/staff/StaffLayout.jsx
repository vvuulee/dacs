import { Suspense } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import RouteErrorBoundary from '../components/RouteErrorBoundary';
import Skeleton from '../components/Skeleton';
import { BRAND } from '../config/brand';
import { STAFF_CART_KEY } from '../constants';
import { CartProvider } from '../features/cart/CartContext';
import { useStaffAuth } from '../features/staff/StaffAuthContext';
import styles from './StaffLayout.module.css';

const NAV = [
  { to: '/staff', label: 'Bán hàng', end: true },
  { to: '/staff/orders', label: 'Đơn online' },
  { to: '/staff/vouchers', label: 'Voucher' },
  { to: '/staff/inventory', label: 'Tồn kho' },
  { to: '/staff/history', label: 'Lịch sử' },
  { to: '/staff/account', label: 'Tài khoản' },
];

export default function StaffLayout() {
  const { staff, logout } = useStaffAuth();
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <p className={styles.brand}>{BRAND.name}</p>
        <nav aria-label="Menu nhân viên" className={styles.nav}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={({ isActive }) => (isActive ? `${styles.link} ${styles.active}` : styles.link)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className={styles.profile}>
          <p className={styles.name}>{staff?.name}</p>
          <p className={styles.role}>Nhân viên</p>
          <button type="button" className={styles.logout} onClick={logout}>Đăng xuất</button>
        </div>
      </aside>
      <main className={styles.content}>
        {/* Giỏ tại quầy tách khoá với giỏ của khách trên cùng máy. */}
        <CartProvider storageKey={STAFF_CART_KEY}>
          <RouteErrorBoundary>
            <Suspense fallback={<Skeleton height="320px" />}>
              <Outlet />
            </Suspense>
          </RouteErrorBoundary>
        </CartProvider>
      </main>
    </div>
  );
}
