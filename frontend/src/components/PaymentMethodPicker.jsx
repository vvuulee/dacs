import { PAYMENT_TTL_MS } from '../constants';
import { PAYMENT_METHODS } from '../features/orders/orderStatus';
import styles from './PaymentMethodPicker.module.css';

const ICONS = { cash: 'ph-money', bank_transfer: 'ph-qr-code', wallet: 'ph-device-mobile' };
const MS_PER_MINUTE = 60000;
const ONLINE_HINT = `Thanh toán trong ${PAYMENT_TTL_MS / MS_PER_MINUTE} phút sau khi đặt`;

export default function PaymentMethodPicker({ value, onChange, error }) {
  return (
    <fieldset className={styles.group} aria-describedby={error ? 'error-paymentMethod' : undefined}>
      <legend className="visually-hidden">Phương thức thanh toán</legend>
      {PAYMENT_METHODS.map((method, index) => (
        <div key={method.id} className={styles.option}>
          <label className={styles.label}>
            <input
              type="radio"
              name="paymentMethod"
              className="visually-hidden"
              id={index === 0 ? 'field-paymentMethod' : undefined}
              checked={value === method.id}
              onChange={() => onChange(method.id)}
            />
            <span className={styles.icon} aria-hidden="true"><i className={`ph-bold ${ICONS[method.id] ?? 'ph-wallet'}`} /></span>
            <span className={styles.text}>{method.label}</span>
            <span className={styles.radio} aria-hidden="true" />
          </label>
          {method.online && value === method.id && <span className={styles.hint}>{ONLINE_HINT}</span>}
        </div>
      ))}
      {error && <p id="error-paymentMethod" className={styles.error}>{error}</p>}
    </fieldset>
  );
}
