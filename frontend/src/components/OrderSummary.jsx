import { formatVnd } from '../lib/money';
import ProductImage from './ProductImage';
import styles from './OrderSummary.module.css';

function Row({ label, amount, strong, negative }) {
  return (
    <div className={strong ? styles.totalRow : negative ? styles.discountRow : styles.row}>
      <dt>{label}</dt>
      <dd>{negative ? '−' : ''}{formatVnd(amount)}</dd>
    </div>
  );
}

/**
 * Tóm tắt đơn. Các slot tùy chọn: `title` + `action` (đầu thẻ), `children` (giữa danh sách món và
 * phần tổng, ví dụ ô mã giảm giá), `footer` (cuối thẻ, ví dụ nút đặt hàng).
 */
export default function OrderSummary({ lines, subtotal, deliveryFee, discount, total, title, action, children, footer }) {
  return (
    <section aria-label="Tóm tắt đơn" className={styles.summary}>
      {(title || action) && (
        <div className={styles.head}>
          {title && <h2 className={styles.title}>{title}</h2>}
          {action}
        </div>
      )}
      <ul className={styles.lines}>
        {lines.map((line) => (
          <li key={line.key} className={styles.line}>
            {'image' in line && (
              <span className={styles.thumb}><ProductImage src={line.image} name={line.name} alt="" fill /></span>
            )}
            <div className={styles.info}>
              <span className={styles.name}>{line.name}</span> <span className={styles.qty}>× {line.quantity}</span>
              {line.summary && <div className={styles.meta}>{line.summary}</div>}
              {line.note && <div className={styles.meta}>Ghi chú: {line.note}</div>}
            </div>
            <span className={styles.lineTotal}>{formatVnd(line.lineTotal)}</span>
          </li>
        ))}
      </ul>
      {children}
      <dl className={styles.totals}>
        <Row label="Tạm tính" amount={subtotal} />
        {deliveryFee !== undefined && <Row label="Phí giao hàng" amount={deliveryFee} />}
        {discount > 0 && <Row label="Giảm giá" amount={discount} negative />}
        {total !== undefined && <Row label="Tổng cộng" amount={total} strong />}
      </dl>
      {footer}
    </section>
  );
}
