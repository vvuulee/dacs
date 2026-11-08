import { CANCELLABLE, NEXT_STATUS, PAYMENT_METHODS, PAYMENT_STATUS_LABELS, STATUS_LABELS } from '../../features/orders/orderStatus';
import { formatVnd } from '../../lib/money';
import styles from './OrderCard.module.css';

const NEXT_LABELS = { placed: 'Nhận đơn → pha chế', preparing: 'Giao hàng', delivering: 'Đã giao' };
const methodLabel = (id) => PAYMENT_METHODS.find((m) => m.id === id)?.label ?? id;

// Mỗi thẻ chỉ có một nút đi bước tiếp; nút Huỷ chỉ khi đơn chưa đi giao.
export default function OrderCard({ order, busy, error, onAdvance, onCancel }) {
  const next = NEXT_STATUS[order.status];
  return (
    <article aria-label={`Đơn ${order.id}`} className={styles.card}>
      <header className={styles.head}>
        <strong>{order.id}</strong>
        <span className={styles.status}>{STATUS_LABELS[order.status]}</span>
        <time dateTime={order.createdAt}>{new Date(order.createdAt).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</time>
      </header>
      <p className={styles.customer}>{order.customer.name} · {order.customer.phone}</p>
      <p className={styles.address}>{order.address.street}, {order.address.wardName}, {order.address.provinceName}</p>
      {order.note && <p className={styles.note}>Ghi chú: {order.note}</p>}
      <ul className={styles.items}>
        {order.items.map((item, index) => (
          <li key={`${item.productId}-${index}`}>
            {item.quantity} × {item.name}{item.summary && ` (${item.summary})`}{item.note && ` — ${item.note}`}
          </li>
        ))}
      </ul>
      <p className={styles.pay}>
        <strong>{formatVnd(order.total)}</strong> · {methodLabel(order.paymentMethod)} · {PAYMENT_STATUS_LABELS[order.paymentStatus]}
      </p>
      {error && <p role="alert" className={styles.error}>{error}</p>}
      {(next || CANCELLABLE.includes(order.status)) && (
        <div className={styles.actions}>
          {CANCELLABLE.includes(order.status) && (
            <button type="button" className={styles.cancel} disabled={busy} onClick={onCancel}>Huỷ đơn</button>
          )}
          {next && <button type="button" className={styles.next} disabled={busy} onClick={() => onAdvance(next)}>{NEXT_LABELS[order.status]}</button>}
        </div>
      )}
    </article>
  );
}
