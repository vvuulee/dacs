import { Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import Skeleton from '../components/Skeleton';
import { STATUS_LABELS } from '../features/orders/orderStatus';
import { useMyOrders } from '../hooks/useMyOrders';
import { formatVnd } from '../lib/money';
import styles from './AccountOrdersPage.module.css';

export default function AccountOrdersPage() {
  const { data, isPending, isError, error, refetch } = useMyOrders();

  let content;
  if (isError) content = <ErrorState message={error.message} onRetry={refetch} />;
  else if (isPending) content = <Skeleton height="240px" />;
  else if (data.length === 0) content = <EmptyState title="Bạn chưa có đơn nào" hint="Các đơn bạn đặt khi đã đăng nhập sẽ hiện ở đây." />;
  else {
    content = (
      <ul className={styles.list}>
        {data.map((order) => (
          <li key={order.id} className={styles.row}>
            <Link to={`/orders/${order.id}`}>Đơn {order.id}</Link>
            <span className={styles.date}>{new Date(order.createdAt).toLocaleString('vi-VN')}</span>
            <span>{STATUS_LABELS[order.status]}</span>
            <strong className={styles.total}>{formatVnd(order.total)}</strong>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <>
      <h1>Lịch sử đơn</h1>
      {content}
      <p><Link to="/account">Quay lại tài khoản</Link></p>
    </>
  );
}
