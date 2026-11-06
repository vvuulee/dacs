import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import FormField, { fieldProps } from '../components/FormField';
import { PHONE_ERROR } from '../features/checkout/validate';
import { ORDER_NOT_FOUND_TEXT } from '../features/orders/orderStatus';
import { addRecentOrder, loadRecentOrders } from '../features/orders/recentOrders';
import { isValidPhone, normalizePhone } from '../lib/phone';
import { getOrder } from '../services/orderService';
import styles from './OrdersPage.module.css';

const NOT_FOUND = 404;

export default function OrdersPage() {
  const navigate = useNavigate();
  const [orderId, setOrderId] = useState('');
  const [phone, setPhone] = useState('');
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);
  const [recent] = useState(loadRecentOrders);

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const code = orderId.trim();
    const next = {};
    if (!code) next.orderId = 'Nhập mã đơn';
    if (!isValidPhone(phone)) next.phone = PHONE_ERROR;
    setErrors(next);
    setFailure('');
    if (Object.keys(next).length > 0) return;

    setPending(true);
    try {
      const order = await getOrder(code, phone);
      addRecentOrder({ id: order.id, phone: normalizePhone(phone), createdAt: order.createdAt });
      navigate(`/orders/${order.id}`);
    } catch (error) {
      setFailure(error.status === NOT_FOUND ? ORDER_NOT_FOUND_TEXT : error.message);
      setPending(false);
    }
  };

  return (
    <>
      <h1>Đơn hàng</h1>
      <div className={styles.layout}>
        <form onSubmit={submit} noValidate className={styles.form}>
          <h2>Tra cứu đơn</h2>
          <FormField name="orderId" label="Mã đơn" error={errors.orderId}>
            <input type="text" {...fieldProps('orderId', errors.orderId)} value={orderId} onChange={(e) => setOrderId(e.target.value)} />
          </FormField>
          <FormField name="phone" label="Số điện thoại" error={errors.phone}>
            <input type="tel" autoComplete="tel" {...fieldProps('phone', errors.phone)} value={phone} onChange={(e) => setPhone(e.target.value)} />
          </FormField>
          {failure && <p role="alert" className={styles.error}>{failure}</p>}
          <button type="submit" className={styles.submit} disabled={pending}>Tra cứu</button>
        </form>
        <section aria-label="Đơn gần đây">
          <h2>Đơn gần đây</h2>
          {recent.length === 0 ? (
            <EmptyState title="Chưa có đơn gần đây" hint="Các đơn bạn đặt trên trình duyệt này sẽ hiện ở đây." />
          ) : (
            <ul className={styles.recent}>
              {recent.map((entry) => (
                <li key={entry.id}>
                  <Link to={`/orders/${entry.id}`}>Đơn {entry.id}</Link>
                  <span className={styles.date}>{new Date(entry.createdAt).toLocaleString('vi-VN')}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
