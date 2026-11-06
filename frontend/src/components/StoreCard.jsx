import { buildDirectionsUrl, telHref } from '../features/stores/links';
import styles from './StoreCard.module.css';

export default function StoreCard({ store }) {
  const address = [store.street, store.wardName, store.provinceName].filter(Boolean).join(', ');
  return (
    <article className={styles.card}>
      <h2 className={styles.name}>{store.name}</h2>
      <p className={styles.line}>{address}</p>
      {store.openingHours && <p className={styles.line}>Giờ mở cửa: {store.openingHours}</p>}
      <div className={styles.actions}>
        {store.phone && <a href={telHref(store.phone)}>{store.phone}</a>}
        <a
          href={buildDirectionsUrl(store)}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Chỉ đường tới ${store.name}`}
          className={styles.directions}
        >
          Chỉ đường
        </a>
      </div>
    </article>
  );
}
