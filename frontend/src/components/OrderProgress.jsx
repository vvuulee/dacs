import { PROGRESS_STEPS, STATUS_LABELS } from '../features/orders/orderStatus';
import styles from './OrderProgress.module.css';

export default function OrderProgress({ status }) {
  if (status === 'cancelled') {
    return <p role="alert" className={styles.cancelled}>{STATUS_LABELS.cancelled}</p>;
  }
  const current = PROGRESS_STEPS.indexOf(status);
  return (
    <>
      {status === 'awaiting_payment' && <p className={styles.waiting}>{STATUS_LABELS.awaiting_payment}</p>}
      <ol className={styles.steps} aria-label="Tiến trình đơn hàng">
        {PROGRESS_STEPS.map((step, index) => (
          <li
            key={step}
            aria-current={index === current ? 'step' : undefined}
            className={index <= current ? styles.done : styles.todo}
          >
            {STATUS_LABELS[step]}
          </li>
        ))}
      </ol>
    </>
  );
}
