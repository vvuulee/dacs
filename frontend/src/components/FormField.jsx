import styles from './FormField.module.css';

// id/aria cho ô nhập: id dạng field-<tên> để trang có thể focus ô sai đầu tiên.
export const fieldProps = (name, error) => ({
  id: `field-${name}`,
  'aria-invalid': error ? 'true' : undefined,
  'aria-describedby': error ? `error-${name}` : undefined,
});

export default function FormField({ name, label, error, children }) {
  return (
    <div className={styles.field}>
      <label htmlFor={`field-${name}`} className={styles.label}>{label}</label>
      {children}
      {error && <p id={`error-${name}`} className={styles.error}>{error}</p>}
    </div>
  );
}
