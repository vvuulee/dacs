import { selectSubtotal } from '../features/cart/selectors';
import { formatVnd } from '../lib/money';
import styles from './CartSummary.module.css';

export default function CartSummary({ items }) {
  return (
    <dl className={styles.summary}>
      <dt>Tạm tính</dt>
      <dd data-testid="subtotal">{formatVnd(selectSubtotal(items))}</dd>
    </dl>
  );
}
