import { useRef, useState } from 'react';
import { isVoucherCode, normalizeVoucherCode } from '../features/vouchers/normalizeCode';
import { VOUCHER_CART_CHANGED_TEXT, VOUCHER_FORMAT_TEXT } from '../features/vouchers/messages';
import { useApplyVoucher } from '../hooks/useApplyVoucher';
import FormField, { fieldProps } from './FormField';
import styles from './VoucherBox.module.css';

export default function VoucherBox({ items, applied, cartChanged, onApplied, onRemove, source }) {
  const apply = useApplyVoucher();
  const [input, setInput] = useState('');
  const [error, setError] = useState('');
  // Cờ đồng bộ (không đợi render) để bấm hai lần liên tiếp chỉ gửi một yêu cầu.
  const busyRef = useRef(false);

  const submit = (event) => {
    event.preventDefault();
    if (busyRef.current) return;
    const code = normalizeVoucherCode(input);
    if (!isVoucherCode(code)) {
      setError(VOUCHER_FORMAT_TEXT);
      return;
    }
    setError('');
    busyRef.current = true;
    apply.mutate({ code, items, source }, {
      // Mã sai chỉ hiện lý do; mã đang áp (nếu có) giữ nguyên, chỉ bị thay khi mã mới được áp thành công.
      onSuccess: (result) => {
        if (result.valid) {
          onApplied(result);
          setInput('');
        } else {
          setError(result.reason);
        }
      },
      onError: (failure) => setError(failure.message),
      onSettled: () => { busyRef.current = false; },
    });
  };

  return (
    <section aria-label="Khung nhập mã giảm giá" className={styles.box}>
      <form onSubmit={submit} noValidate className={styles.form}>
        <FormField name="voucher" label="Mã giảm giá">
          <input type="text" autoComplete="off" {...fieldProps('voucher', error)} value={input} onChange={(e) => setInput(e.target.value)} />
        </FormField>
        <button type="submit" className={styles.apply} disabled={apply.isPending}>Áp dụng</button>
      </form>
      {error && <p id="error-voucher" role="alert" className={styles.error}>{error}</p>}
      {cartChanged && <p role="status" className={styles.notice}>{VOUCHER_CART_CHANGED_TEXT}</p>}
      {applied && (
        <div className={styles.applied}>
          <p className={styles.appliedText}>Đã áp dụng {applied.code} — {applied.title}</p>
          <button type="button" className={styles.remove} onClick={onRemove}>Bỏ mã</button>
        </div>
      )}
    </section>
  );
}
