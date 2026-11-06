import { Link, useLocation } from 'react-router-dom';
import { formatVnd } from '../lib/money';
import ProductImage from './ProductImage';
import styles from './ProductCard.module.css';

const AddIcon = () => <i className="ph-bold ph-plus" aria-hidden="true" />;

/**
 * Thẻ món. `variant`:
 * - "peek" (trang chủ): ảnh lớn, nhãn giá chồng lên góc ảnh.
 * - "tile" (menu, mặc định): ô nhỏ trong lưới.
 * - "feature" / "tall" / "wide" (menu): ô lớn chiếm nhiều cột/hàng.
 */
export default function ProductCard({ product, variant = 'tile', style }) {
  const { search } = useLocation();
  const to = { pathname: `/menu/${product.id}`, search };
  const price = formatVnd(product.basePrice);
  const soldOut = !product.isAvailable;

  if (variant === 'peek') {
    return (
      <Link to={to} className={styles.peek} style={style}>
        <span className={styles.peekPhoto}><ProductImage src={product.image} name={product.name} alt="" fill /></span>
        <span className={styles.peekTag}>
          <span className={styles.price}>{price}</span>
          <span className={styles.addRound}><AddIcon /></span>
        </span>
        <span className={styles.peekName}>{product.name}</span>
        {product.description && <span className={styles.peekDesc}>{product.description}</span>}
      </Link>
    );
  }

  if (soldOut) {
    return (
      <Link to={to} className={`${styles.tile} ${styles.soldOutTile}`} style={style}>
        <span className={styles.soldOutHead}>
          <span className={styles.soldOut}>Tạm hết</span>
          <i className="ph-bold ph-drop-half" aria-hidden="true" />
        </span>
        <span className={styles.soldOutBody}>
          <span className={styles.name}>{product.name}</span>
          {product.description && <span className={styles.desc}>{product.description}</span>}
          <s className={styles.mutedPrice}>{price}</s>
        </span>
      </Link>
    );
  }

  if (variant === 'feature') {
    return (
      <Link to={to} className={styles.feature} style={style}>
        <ProductImage src={product.image} name={product.name} alt="" fill className={styles.featureImg} />
        <span className={styles.featureCard}>
          <span className={styles.featureName}>{product.name}</span>
          {product.description && <span className={styles.desc}>{product.description}</span>}
          <span className={styles.featureRow}>
            <span className={styles.featurePrice}>{price}</span>
            <span className={styles.addPill}><AddIcon />Thêm</span>
          </span>
        </span>
      </Link>
    );
  }

  if (variant === 'tall') {
    return (
      <Link to={to} className={`${styles.tile} ${styles.tall}`} style={style}>
        <span className={styles.photo}><ProductImage src={product.image} name={product.name} alt="" fill /></span>
        <span className={styles.tallBody}>
          <span className={styles.tallName}>{product.name}</span>
          {product.description && <span className={styles.tallDesc}>{product.description}</span>}
          <span className={styles.featureRow}>
            <span className={styles.tallPrice}>{price}</span>
            <span className={styles.addRound}><AddIcon /></span>
          </span>
        </span>
      </Link>
    );
  }

  if (variant === 'wide') {
    return (
      <Link to={to} className={`${styles.tile} ${styles.wide}`} style={style}>
        <span className={styles.widePhoto}><ProductImage src={product.image} name={product.name} alt="" fill /></span>
        <span className={styles.wideBody}>
          <span>
            <span className={styles.tallName}>{product.name}</span>
            {product.description && <span className={styles.desc}>{product.description}</span>}
          </span>
          <span className={styles.featureRow}>
            <span className={styles.featurePrice}>{price}</span>
            <span className={styles.addPill}><AddIcon />Thêm</span>
          </span>
        </span>
      </Link>
    );
  }

  return (
    <Link to={to} className={styles.tile} style={style}>
      <span className={styles.photo}><ProductImage src={product.image} name={product.name} alt="" fill /></span>
      <span className={styles.tileBody}>
        <span className={styles.name}>{product.name}</span>
        <span className={styles.price}>{price}</span>
      </span>
    </Link>
  );
}
