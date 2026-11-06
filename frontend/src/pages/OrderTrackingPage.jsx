import { Link, useParams } from 'react-router-dom';
import OrderLoadError from '../components/OrderLoadError';
import OrderProgress from '../components/OrderProgress';
import OrderSummary from '../components/OrderSummary';
import PhoneGate from '../components/PhoneGate';
import Skeleton from '../components/Skeleton';
import { PAYMENT_METHODS, PAYMENT_STATUS_LABELS } from '../features/orders/orderStatus';
import { useOrderAccess } from '../hooks/useOrderAccess';
import styles from './OrderTrackingPage.module.css';

export default function OrderTrackingPage() {
  const { id } = useParams();
  const { setPhone, query, needsPhone } = useOrderAccess(id);
  const { data: order, isPending, isError, error, refetch } = query;

  if (needsPhone) return <><h1>Theo dõi đơn hàng</h1><PhoneGate onSubmit={setPhone} /></>;
  if (isError && !order) return <OrderLoadError error={error} onRetry={refetch} onChangePhone={() => setPhone('')} />;
  if (isPending || !order) return <Skeleton height="320px" />;

  const lines = order.items.map((item) => ({
    key: `${item.productId}-${item.summary}-${item.note}`, name: item.name, summary: item.summary, note: item.note,
    quantity: item.quantity, lineTotal: item.unitPrice * item.quantity,
  }));
  const method = PAYMENT_METHODS.find((m) => m.id === order.paymentMethod);
  const { street, wardName, provinceName } = order.address;

  return (
    <section>
      <h1>Theo dõi đơn hàng</h1>
      <p>Mã đơn: <strong>{order.id}</strong></p>
      <p className={styles.meta}>Đặt lúc {new Date(order.createdAt).toLocaleString('vi-VN')}</p>
      {isError && <p role="status" className={styles.warning}>Mất kết nối, đang thử lại</p>}
      <OrderProgress status={order.status} />
      {order.status === 'awaiting_payment' && <Link to={`/payment/${order.id}`}>Thanh toán ngay</Link>}
      <div className={styles.layout}>
        <OrderSummary lines={lines} subtotal={order.subtotal} deliveryFee={order.deliveryFee} discount={order.discount} total={order.total} />
        <dl className={styles.details}>
          <dt>Người nhận</dt><dd>{order.customer.name}</dd>
          <dt>Giao đến</dt><dd>{`${street}, ${wardName}, ${provinceName}`}</dd>
          {order.note && <><dt>Ghi chú</dt><dd>{order.note}</dd></>}
          {order.voucherCode && <><dt>Mã giảm giá</dt><dd>{order.voucherCode}</dd></>}
          <dt>Thanh toán</dt><dd>{method?.label}</dd>
          <dt>Trạng thái thanh toán</dt><dd>{PAYMENT_STATUS_LABELS[order.paymentStatus]}</dd>
        </dl>
      </div>
    </section>
  );
}
