import { ORDER_NOT_FOUND_TEXT } from '../features/orders/orderStatus';
import ErrorState from './ErrorState';

const NOT_FOUND = 404;

export default function OrderLoadError({ error, onRetry, onChangePhone }) {
  if (error.status !== NOT_FOUND) return <ErrorState message={error.message} onRetry={onRetry} />;
  return (
    <div style={{ textAlign: 'center', padding: '40px 0' }}>
      <p role="alert">{ORDER_NOT_FOUND_TEXT}</p>
      <button type="button" onClick={onChangePhone}>Nhập lại số điện thoại</button>
    </div>
  );
}
