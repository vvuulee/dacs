import { Link } from 'react-router-dom';
import CartLine from '../components/CartLine';
import CartSummary from '../components/CartSummary';
import EmptyState from '../components/EmptyState';
import { useCart } from '../features/cart/CartContext';
import styles from './CartPage.module.css';

export default function CartPage() {
  const { items } = useCart();
  if (items.length === 0) {
    return (
      <>
        <h1>Giỏ hàng</h1>
        <EmptyState title="Giỏ hàng trống" hint="Bạn chưa chọn món nào." />
        <p className={styles.center}><Link to="/menu">Về Menu</Link></p>
      </>
    );
  }
  return (
    <>
      <h1>Giỏ hàng</h1>
      <ul className={styles.list}>{items.map((item) => <CartLine key={item.key} item={item} />)}</ul>
      <p className={styles.hint}>
        Có mã giảm giá? Nhập ở bước thanh toán. <Link to="/offers">Xem ưu đãi</Link>
      </p>
      <div className={styles.footer}>
        <CartSummary items={items} />
        <Link to="/checkout" className={styles.checkout}>Thanh toán</Link>
      </div>
    </>
  );
}
