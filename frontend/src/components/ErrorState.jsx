import styles from './States.module.css';

export default function ErrorState({ message, onRetry }) {
  return (
    <div role="alert" className={styles.box}>
      <p className={styles.title}>Không tải được dữ liệu</p>
      <p className={styles.hint}>{message}</p>
      {onRetry && (
        <button type="button" className={styles.button} onClick={onRetry}>
          Thử lại
        </button>
      )}
    </div>
  );
}
