import styles from './States.module.css';

export default function EmptyState({ title, hint }) {
  return (
    <div className={styles.box}>
      <p className={styles.title}>{title}</p>
      {hint && <p className={styles.hint}>{hint}</p>}
    </div>
  );
}
