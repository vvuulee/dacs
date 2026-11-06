import { MAX_QTY } from '../constants';
import { useCart } from '../features/cart/CartContext';
import { formatVnd } from '../lib/money';
import ProductImage from './ProductImage';
import styles from './CartLine.module.css';

export default function CartLine({ item }) {
  const { setQuantity, remove } = useCart();
  return (
    <li className={styles.line}>
      <div className={styles.thumb}><ProductImage src={item.image} name={item.name} /></div>
      <div className={styles.info}>
        <span className={styles.name}>{item.name}</span>
        {item.summary && <span className={styles.meta}>{item.summary}</span>}
        {item.note && <span className={styles.meta}>Ghi chú: {item.note}</span>}
        <div className={styles.controls}>
          <button type="button" aria-label={`Giảm số lượng ${item.name}`} onClick={() => setQuantity(item.key, item.quantity - 1)}>−</button>
          <output aria-label={`Số lượng ${item.name}`}>{item.quantity}</output>
          <button type="button" aria-label={`Tăng số lượng ${item.name}`} disabled={item.quantity >= MAX_QTY} onClick={() => setQuantity(item.key, item.quantity + 1)}>+</button>
          <button type="button" className={styles.remove} aria-label={`Xóa ${item.name}`} onClick={() => remove(item.key)}>Xóa</button>
        </div>
      </div>
      <span className={styles.total}>{formatVnd(item.unitPrice * item.quantity)}</span>
    </li>
  );
}
