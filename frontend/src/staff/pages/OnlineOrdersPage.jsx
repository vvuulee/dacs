import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import Skeleton from '../../components/Skeleton';
import { useOnlineOrders, useUpdateOrderStatus } from '../../hooks/staff';
import OrderCard from '../components/OrderCard';
import styles from './OnlineOrdersPage.module.css';

const CONFLICT = 409;
const CONFLICT_TEXT = 'Đơn đã được cập nhật bởi người khác';
const TABS = [
  { id: 'placed', label: 'Chờ xác nhận', statuses: ['placed'] },
  { id: 'preparing', label: 'Đang pha chế', statuses: ['preparing'] },
  { id: 'delivering', label: 'Đang giao', statuses: ['delivering'] },
  { id: 'done', label: 'Đã xong', statuses: ['delivered', 'cancelled'] },
];

// Mỗi thẻ có mutation riêng: bấm nhiều đơn liên tiếp thì đơn nào cũng giữ trạng thái khoá và lỗi của nó.
function OrderCardItem({ order, error, onError, onConflict }) {
  const update = useUpdateOrderStatus();
  const [confirming, setConfirming] = useState(false);

  const change = (status) => {
    onError(order.id, '');
    update.mutate({ id: order.id, status }, {
      onError: (failure) => {
        onError(order.id, failure.status === CONFLICT ? CONFLICT_TEXT : failure.message);
        if (failure.status === CONFLICT) onConflict();
      },
    });
  };

  return (
    <>
      <OrderCard order={order} busy={update.isPending} error={error} onAdvance={change} onCancel={() => setConfirming(true)} />
      <ConfirmDialog
        open={confirming}
        title={`Huỷ đơn ${order.id}?`}
        message="Khách sẽ thấy đơn đã bị huỷ."
        confirmLabel="Huỷ đơn"
        onConfirm={() => { setConfirming(false); change('cancelled'); }}
        onCancel={() => setConfirming(false)}
      />
    </>
  );
}

export default function OnlineOrdersPage() {
  const orders = useOnlineOrders();
  const [tabId, setTabId] = useState('placed');
  const [errors, setErrors] = useState({});

  const setError = (id, message) => setErrors((current) => ({ ...current, [id]: message }));
  const list = orders.data ?? [];
  const tab = TABS.find((t) => t.id === tabId);
  const shown = list.filter((o) => tab.statuses.includes(o.status));

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Đơn online</h1>
      <div role="tablist" aria-label="Lọc theo trạng thái" className={styles.tabs}>
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={t.id === tabId} className={styles.tab} onClick={() => setTabId(t.id)}>
            {t.label} <span className={styles.count}>{list.filter((o) => t.statuses.includes(o.status)).length}</span>
          </button>
        ))}
      </div>
      {orders.isPending && <Skeleton height="240px" />}
      {orders.isError && <ErrorState message={orders.error.message} onRetry={orders.refetch} />}
      {orders.isSuccess && (shown.length === 0 ? <p className={styles.empty}>Không có đơn nào</p> : (
        <div className={styles.grid}>
          {shown.map((order) => (
            <OrderCardItem key={order.id} order={order} error={errors[order.id]} onError={setError} onConflict={() => orders.refetch()} />
          ))}
        </div>
      ))}
      {/* Lỗi 409 của đơn đã rời tab hiện tại vẫn phải hiện cho nhân viên thấy. */}
      {Object.entries(errors).filter(([id, message]) => message && !shown.some((o) => o.id === id)).map(([id, message]) => (
        <p key={id} role="alert" className={styles.notice}>{id}: {message}</p>
      ))}
    </div>
  );
}
