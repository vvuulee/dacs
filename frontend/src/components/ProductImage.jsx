import styles from './ProductImage.module.css';

const BASE_HUE = 20;
const HUE_STEP = 10;
const HUE_VARIANTS = 5;

// Hình giữ chỗ tự tạo: màu ấm theo chữ cái đầu để các món dễ phân biệt.
// `fill`: lấp đầy khung cha (khung cha quyết định kích thước và bo góc).
export default function ProductImage({ src, name, alt = name, fill = false, className = '' }) {
  const base = fill ? styles.fill : styles.square;
  if (src) return <img className={`${base} ${styles.image} ${className}`} src={src} alt={alt} loading="lazy" decoding="async" />;
  const initial = (name.trim()[0] ?? '?').toUpperCase();
  const hue = BASE_HUE + (initial.charCodeAt(0) % HUE_VARIANTS) * HUE_STEP;
  return (
    <div
      className={`${base} ${styles.placeholder} ${className}`}
      style={{ background: `hsl(${hue} 70% 88%)`, color: `hsl(${hue} 60% 30%)` }}
      aria-hidden={alt === '' ? 'true' : undefined}
    >
      {initial}
    </div>
  );
}
