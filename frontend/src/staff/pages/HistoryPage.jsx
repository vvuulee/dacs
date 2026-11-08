import { useState } from 'react';
import ErrorState from '../../components/ErrorState';
import Skeleton from '../../components/Skeleton';
import { PAYMENT_METHODS, STATUS_LABELS } from '../../features/orders/orderStatus';
import { useTodayOrders, useTodayReport } from '../../hooks/staff';
import { formatVnd } from '../../lib/money';
import Receipt from '../components/Receipt';
import StatTiles from '../components/StatTiles';
import styles from './HistoryPage.module.css';

const SHORT_PAYMENT = { cash: 'Tiền mặt', bank_transfer: 'Chuyển khoản', wallet: 'Ví' };
const time = (iso) => new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
const who = (order) => {
  if (order.source === 'online') return order.customer.name;
  return order.serviceType === 'dine_in' ? `Bàn ${order.table}` : 'Mang đi';
};
const itemCount = (order) => order.items.reduce((sum, item) => sum + item.quantity, 0);

// "dd/mm/yyyy" từ ngày backend trả (YYYY-MM-DD), không phụ thuộc múi giờ máy.
function formatReportDate(date) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day).toLocaleDateString('vi-VN');
}

function OnlineDetail({ order }) {
  return (
    <section aria-label={`Chi tiết đơn ${order.id}`} className={styles.detail}>
      <h2>Đơn {order.id}</h2>
      <p>{order.customer.name} · {order.customer.phone}</p>
      <p>{order.address.street}, {order.address.wardName}, {order.address.provinceName}</p>
      {order.note && <p>Ghi chú: {order.note}</p>}
      <ul>{order.items.map((item, i) => <li key={`${item.productId}-${i}`}>{item.quantity} × {item.name}</li>)}</ul>
      <p><strong>{formatVnd(order.total)}</strong> · {PAYMENT_METHODS.find((m) => m.id === order.paymentMethod)?.label} · {STATUS_LABELS[order.status]}</p>
    </section>
  );
}

// Chỉ xem dữ liệu hôm nay: không có ô chọn ngày, API cũng không nhận tham số ngày.
export default function HistoryPage() {
  const report = useTodayReport();
  const orders = useTodayOrders();
  const [selected, setSelected] = useState(null);
  const title = report.data ? `Hôm nay, ${formatReportDate(report.data.date)}` : `Hôm nay, ${new Date().toLocaleDateString('vi-VN')}`;

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>{title}</h1>
      {report.isPending && <Skeleton height="120px" />}
      {report.isError && <ErrorState message={report.error.message} onRetry={report.refetch} />}
      {report.isSuccess && <StatTiles report={report.data} />}

      {orders.isPending && <Skeleton height="240px" />}
      {orders.isError && <ErrorState message={orders.error.message} onRetry={orders.refetch} />}
      {orders.isSuccess && (orders.data.length === 0 ? <p className={styles.empty}>Hôm nay chưa có đơn nào</p> : (
        <div className={styles.body}>
          <table className={styles.table}>
            <thead>
              <tr><th>Giờ</th><th>Mã</th><th>Nguồn</th><th>Bàn / Người nhận</th><th>Số món</th><th>Tổng</th><th>Thanh toán</th><th>Trạng thái</th></tr>
            </thead>
            <tbody>
              {orders.data.map((order) => (
                <tr key={order.id} aria-selected={selected?.id === order.id}>
                  <td>{time(order.createdAt)}</td>
                  <td><button type="button" className={styles.link} aria-label={`Xem đơn ${order.id}`} onClick={() => setSelected(order)}>{order.id}</button></td>
                  <td>{order.source === 'counter' ? 'Quầy' : 'Online'}</td>
                  <td>{who(order)}</td>
                  <td>{itemCount(order)}</td>
                  <td>{formatVnd(order.total)}</td>
                  <td>{SHORT_PAYMENT[order.paymentMethod]}</td>
                  <td>{STATUS_LABELS[order.status]}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {selected && (
            <aside className={styles.side}>
              {selected.source === 'counter' ? (
                <>
                  <Receipt order={selected} />
                  <button type="button" className={styles.print} onClick={() => window.print()}>In lại hoá đơn</button>
                </>
              ) : <OnlineDetail order={selected} />}
              <button type="button" className={styles.close} onClick={() => setSelected(null)}>Đóng</button>
            </aside>
          )}
        </div>
      ))}
    </div>
  );
}
