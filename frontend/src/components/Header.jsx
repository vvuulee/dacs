import { Link, NavLink } from 'react-router-dom';
import { BRAND } from '../config/brand';
import { useAuth } from '../features/auth/AuthContext';
import { useCart } from '../features/cart/CartContext';
import { selectCount } from '../features/cart/selectors';
import SearchBox from './SearchBox';
import styles from './Header.module.css';

const navClass = ({ isActive }) => (isActive ? styles.navActive : styles.nav);

export default function Header() {
  const { items } = useCart();
  const { status, user } = useAuth();
  const count = selectCount(items);
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link to="/" className={styles.brand}>
          <span className={styles.mark} aria-hidden="true"><i className="ph-fill ph-coffee" /></span>
          {BRAND.name}
        </Link>
        <nav className={styles.navList}>
          <NavLink to="/" end className={navClass}>Trang chủ</NavLink>
          <NavLink to="/menu" className={navClass}>Menu</NavLink>
          <NavLink to="/stores" className={navClass}>Cửa hàng</NavLink>
          <NavLink to="/offers" className={navClass}>Ưu đãi</NavLink>
          <NavLink to="/orders" className={navClass}>Đơn hàng</NavLink>
        </nav>
        <SearchBox />
        <button type="button" className={styles.address}>
          <i className="ph-bold ph-map-pin" aria-hidden="true" />
          Giao đến
        </button>
        {status === 'anonymous' && <Link to="/login" className={styles.account}>Đăng nhập</Link>}
        {status === 'authenticated' && <Link to="/account" className={styles.account}>Tài khoản: {user.name}</Link>}
        <Link to="/cart" className={styles.cart} aria-label={`Giỏ hàng, ${count} món`}>
          <i className="ph-bold ph-shopping-bag" aria-hidden="true" />
          <span className={styles.cartLabel} aria-hidden="true">Giỏ hàng</span>
          <span className={styles.badge}>{count}</span>
        </Link>
      </div>
    </header>
  );
}
