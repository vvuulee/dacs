import { Link, Navigate, useParams } from 'react-router-dom';
import OrderLoadError from '../components/OrderLoadError';
import PhoneGate from '../components/PhoneGate';
import QrPlaceholder from '../components/QrPlaceholder';
import Skeleton from '../components/Skeleton';
import { env } from '../config/env';
import { isOnlinePayment, PAYMENT_METHODS } from '../features/orders/orderStatus';
import { formatCountdown, useCountdown } from '../hooks/useCountdown';
import { useOrderAccess } from '../hooks/useOrderAccess';
import { useSimulatePayment } from '../hooks/useSimulatePayment';
import { formatVnd } from '../lib/money';
import styles from './PaymentPage.module.css';

export default function PaymentPage() {
  const { id } = useParams();
  const { setPhone, query, needsPhone } = useOrderAccess(id);
  const { data: order, isPending, isError, error, refetch } = query;
  const simulate = useSimulatePayment();
  const remainingMs = useCountdown(order?.payment?.expiresAt);

  if (needsPhone) return <><h1>Thanh toán đơn hàng</h1><PhoneGate onSubmit={setPhone} /></>;
  if (isError && !order) return <OrderLoadError error={error} onRetry={refetch} onChangePhone={() => setPhone('')} />;
  if (isPending || !order) return <Skeleton height="320px" />;

  if (!isOnlinePayment(order.paymentMethod) || order.paymentStatus === 'paid') {
    return <Navigate to={`/orders/${order.id}`} replace />;
  }

  const expired = order.paymentStatus === 'expired' || order.status === 'cancelled' || remainingMs === 0;
  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);

  return (
    <section className={styles.page}>
      <h1>Thanh toán đơn {order.id}</h1>
      <p>Phương thức: {method?.label}</p>
      <p className={styles.amount}>Số tiền cần thanh toán: <strong>{formatVnd(order.total)}</strong></p>
      <p>Thời gian còn lại: <time>{formatCountdown(remainingMs)}</time></p>
      {expired ? (
        <div role="alert" className={styles.expired}>
          <p>Đơn đã hết hạn thanh toán</p>
          <Link to="/menu">Về Menu</Link>
        </div>
      ) : (
        <>
          <QrPlaceholder content={order.payment?.qrContent ?? order.id} />
          {env.apiMode === 'mock' && (
            <button type="button" className={styles.simulate} disabled={simulate.isPending} onClick={() => simulate.mutate(order.id)}>
              Giả lập đã thanh toán
            </button>
          )}
          {simulate.isError && <p role="alert">{simulate.error.message}</p>}
        </>
      )}
    </section>
  );
}
