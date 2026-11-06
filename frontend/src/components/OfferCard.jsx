import { useState } from 'react';
import { COPY_FAILED_TEXT } from '../features/vouchers/messages';
import { copyText } from '../lib/clipboard';
import { formatVnd } from '../lib/money';
import styles from './OfferCard.module.css';

const formatDate = (iso) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? null : date.toLocaleDateString('vi-VN');
};

export default function OfferCard({ offer }) {
  const [copied, setCopied] = useState(null);
  const expiry = offer.expiresAt ? formatDate(offer.expiresAt) : null;

  const copy = async () => setCopied(await copyText(offer.code));

  return (
    <article className={styles.card}>
      <h2 className={styles.title}>{offer.title}</h2>
      {offer.description && <p className={styles.description}>{offer.description}</p>}
      <code className={styles.code}>{offer.code}</code>
      {offer.minOrder != null && <p className={styles.meta}>Đơn từ {formatVnd(offer.minOrder)}</p>}
      {expiry && <p className={styles.meta}>Hạn dùng đến {expiry}</p>}
      <button type="button" className={styles.copy} aria-label={`Sao chép mã ${offer.code}`} onClick={copy}>
        Sao chép mã
      </button>
      {copied !== null && (
        <p role="status" className={styles.status}>{copied ? `Đã sao chép mã ${offer.code}` : COPY_FAILED_TEXT}</p>
      )}
    </article>
  );
}
