import { Link } from 'react-router-dom';
import { BRAND } from '../config/brand';
import styles from './Footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.inner}>
        <div className={styles.brand}>
          <span className={styles.mark} aria-hidden="true"><i className="ph-fill ph-coffee" /></span>
          <strong>{BRAND.name}</strong>
          <span>{BRAND.tagline}</span>
        </div>
        <nav aria-label="Liên kết cuối trang" className={styles.links}>
          <Link to="/stores">Cửa hàng</Link>
          <Link to="/offers">Ưu đãi</Link>
          <Link to="/orders">Tra cứu đơn</Link>
          <Link to="/account">Tài khoản</Link>
        </nav>
      </div>
    </footer>
  );
}
