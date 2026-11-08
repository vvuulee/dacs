import { useEffect, useId, useRef } from 'react';
import styles from './ConfirmDialog.module.css';

// Hộp xác nhận cho thao tác phá huỷ: focus sẵn vào "Không", Esc để đóng.
export default function ConfirmDialog({ open, title, message, confirmLabel, onConfirm, onCancel, busy = false }) {
  const cancelRef = useRef(null);
  const titleId = useId();

  useEffect(() => {
    if (!open) return undefined;
    cancelRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') onCancel(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onCancel]);

  if (!open) return null;
  return (
    <div className={styles.backdrop}>
      <div role="alertdialog" aria-modal="true" aria-labelledby={titleId} className={styles.dialog}>
        <h2 id={titleId} className={styles.title}>{title}</h2>
        {message && <p className={styles.message}>{message}</p>}
        <div className={styles.actions}>
          <button type="button" ref={cancelRef} className={styles.cancel} onClick={onCancel}>Không</button>
          <button type="button" className={styles.confirm} onClick={onConfirm} disabled={busy}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}
