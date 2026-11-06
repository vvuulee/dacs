import { useState } from 'react';
import { PHONE_ERROR } from '../features/checkout/validate';
import { isValidPhone, normalizePhone } from '../lib/phone';
import FormField, { fieldProps } from './FormField';
import styles from './PhoneGate.module.css';

export default function PhoneGate({ onSubmit }) {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const submit = (event) => {
    event.preventDefault();
    if (!isValidPhone(phone)) {
      setError(PHONE_ERROR);
      return;
    }
    setError('');
    onSubmit(normalizePhone(phone));
  };

  return (
    <form onSubmit={submit} noValidate className={styles.gate}>
      <p>Nhập số điện thoại dùng khi đặt hàng để xem đơn này.</p>
      <FormField name="phone" label="Số điện thoại" error={error}>
        <input type="tel" autoComplete="tel" {...fieldProps('phone', error)} value={phone} onChange={(e) => setPhone(e.target.value)} />
      </FormField>
      <button type="submit" className={styles.button}>Xem đơn</button>
    </form>
  );
}
