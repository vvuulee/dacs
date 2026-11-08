import { BRAND } from '../../config/brand';
import { formatVnd } from '../../lib/money';
import styles from './Receipt.module.css';

const PAYMENT_LABELS = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', wallet: 'Ví điện tử' };

// Hoá đơn đơn tại quầy; khi in chỉ phần [data-print="receipt"] hiện ra (khổ 80mm).
export default function Receipt({ order }) {
  return (
    <section aria-label="Hoá đơn" data-print="receipt" className={styles.receipt}>
      <h2 className={styles.brand}>{BRAND.name}</h2>
      <p className={styles.meta}>Mã đơn: {order.id}</p>
      <p className={styles.meta}>{new Date(order.createdAt).toLocaleString('vi-VN')}</p>
      <p className={styles.meta}>{order.serviceType === 'dine_in' ? `Bàn ${order.table}` : 'Mang đi'}</p>
      <table className={styles.items}>
        <thead><tr><th>Món</th><th>SL</th><th>Đ.giá</th><th>T.tiền</th></tr></thead>
        <tbody>
          {order.items.map((item, index) => (
            <tr key={`${item.productId}-${index}`}>
              <td>{item.name}{item.summary && <small>{item.summary}</small>}</td>
              <td>{item.quantity}</td>
              <td>{formatVnd(item.unitPrice)}</td>
              <td>{formatVnd(item.unitPrice * item.quantity)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <dl className={styles.sums}>
        <dt>Tạm tính</dt><dd>{formatVnd(order.subtotal)}</dd>
        {order.discount > 0 && <><dt>Giảm giá ({order.voucherCode})</dt><dd>−{formatVnd(order.discount)}</dd></>}
        <dt className={styles.grand}>Tổng</dt><dd className={styles.grand}>{formatVnd(order.total)}</dd>
        <dt>Thanh toán</dt><dd>{PAYMENT_LABELS[order.paymentMethod]}</dd>
        {order.cashReceived !== null && (
          <><dt>Khách đưa</dt><dd>{formatVnd(order.cashReceived)}</dd><dt>Tiền thối</dt><dd>{formatVnd(order.change)}</dd></>
        )}
      </dl>
      <p className={styles.thanks}>Cảm ơn quý khách!</p>
    </section>
  );
}
