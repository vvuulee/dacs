import styles from './States.module.css';

export default function Skeleton({ height = '1rem', width = '100%' }) {
  return <div aria-hidden="true" className={styles.skeleton} style={{ height, width }} />;
}
