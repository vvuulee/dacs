import { useEffect, useState } from 'react';
import QrPlaceholder from '../../components/QrPlaceholder';
import { cashSuggestions, parseCash } from '../../features/staff/cash';
import { formatVnd } from '../../lib/money';
import styles from './PaymentDialog.module.css';

// Thu tiền tại quầy. Frontend chỉ chặn sớm; backend kiểm lại số tiền và tính tiền thối thật.
export default function PaymentDialog({ total, pending, error, onSubmit, onClose }) {
  const [method, setMethod] = useState('cash');
  const [input, setInput] = useState('');
  const cash = parseCash(input);
  const enough = cash !== null && cash >= total;

  useEffect(() => {
    const onKey = (event) => { if (event.key === 'Escape' && !pending) onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, onClose]);

  return (
    <div className={styles.backdrop}>
      <div role="dialog" aria-modal="true" aria-labelledby="payment-title" className={styles.dialog}>
        <div className={styles.head}>
          <h2 id="payment-title">Thanh toán</h2>
          <button type="button" className={styles.close} aria-label="Đóng" onClick={onClose} disabled={pending}>×</button>
        </div>
        <p className={styles.total}>Cần thu <strong>{formatVnd(total)}</strong></p>

        <fieldset className={styles.methods}>
          <legend className="visually-hidden">Cách trả tiền</legend>
          <label><input type="radio" name="pay" checked={method === 'cash'} onChange={() => setMethod('cash')} /> Tiền mặt</label>
          <label><input type="radio" name="pay" checked={method === 'bank_transfer'} onChange={() => setMethod('bank_transfer')} /> Chuyển khoản</label>
        </fieldset>

        {method === 'cash' ? (
          <div className={styles.cash}>
            <label htmlFor="cash-received">Khách đưa</label>
            <input id="cash-received" inputMode="numeric" autoComplete="off" value={input} onChange={(e) => setInput(e.target.value)} />
            <div className={styles.suggestions}>
              {cashSuggestions(total).map((amount) => (
                <button key={amount} type="button" onClick={() => setInput(String(amount))}>{formatVnd(amount)}</button>
              ))}
            </div>
            <p className={styles.change}>Tiền thối <strong data-testid="change">{enough ? formatVnd(cash - total) : '—'}</strong></p>
            <button type="button" className={styles.confirm} disabled={!enough || pending} onClick={() => onSubmit({ paymentMethod: 'cash', cashReceived: cash })}>
              Xác nhận
            </button>
          </div>
        ) : (
          <div className={styles.transfer}>
            <QrPlaceholder content={`COFFEE-QUAY-${total}`} />
            <button type="button" className={styles.confirm} disabled={pending} onClick={() => onSubmit({ paymentMethod: 'bank_transfer', cashReceived: null })}>
              Đã nhận chuyển khoản
            </button>
          </div>
        )}
        {error && <p role="alert" className={styles.error}>{error}</p>}
      </div>
    </div>
  );
}
