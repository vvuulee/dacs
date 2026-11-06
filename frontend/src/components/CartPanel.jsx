import { Link } from 'react-router-dom';
import { useCart } from '../features/cart/CartContext';
import { selectCount } from '../features/cart/selectors';
import CartLine from './CartLine';
import CartSummary from './CartSummary';
import EmptyState from './EmptyState';
import styles from './CartPanel.module.css';

export default function CartPanel() {
  const { items } = useCart();
  return (
    <section aria-label="Giỏ hàng" className={styles.panel}>
      <div className={styles.head}>
        <h2 className={styles.title}>Giỏ hàng</h2>
        {items.length > 0 && <span className={styles.count}>{selectCount(items)} món</span>}
      </div>
      {items.length === 0 ? (
        <EmptyState title="Giỏ hàng trống" hint="Chọn món để thêm vào giỏ." />
      ) : (
        <>
          <ul className={styles.list}>{items.map((item) => <CartLine key={item.key} item={item} />)}</ul>
          <div className={styles.summary}><CartSummary items={items} /></div>
          <Link to="/checkout" className={styles.checkout}>Thanh toán <i className="ph-bold ph-arrow-right" aria-hidden="true" /></Link>
          <Link to="/cart" className={styles.link}>Xem giỏ hàng</Link>
        </>
      )}
    </section>
  );
}
