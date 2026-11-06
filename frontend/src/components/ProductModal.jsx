import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { MAX_QTY, MIN_QTY, NOTE_MAX_LENGTH } from '../constants';
import { useCart } from '../features/cart/CartContext';
import { useCategories } from '../hooks/useCategories';
import { useProduct } from '../hooks/useProduct';
import { formatVnd } from '../lib/money';
import { calcUnitPrice } from '../lib/price';
import ErrorState from './ErrorState';
import ProductImage from './ProductImage';
import Skeleton from './Skeleton';
import styles from './ProductModal.module.css';

const NOT_FOUND = 404;

function CategoryChip({ categoryId }) {
  const { data } = useCategories();
  const category = data?.find((c) => c.id === categoryId);
  if (!category) return null;
  return <span className={styles.chip}>{category.name}</span>;
}

function ProductForm({ product, onDone }) {
  const { add } = useCart();
  const [sizeId, setSizeId] = useState(product.sizes[0]?.id ?? null);
  const [toppingIds, setToppingIds] = useState([]);
  const [quantity, setQuantity] = useState(MIN_QTY);
  const [note, setNote] = useState('');

  const unitPrice = calcUnitPrice(product, sizeId, toppingIds);
  const toggleTopping = (id) =>
    setToppingIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]));

  const summary = [
    product.sizes.find((s) => s.id === sizeId)?.label,
    ...product.toppings.filter((t) => toppingIds.includes(t.id)).map((t) => t.name),
  ].filter(Boolean).join(' · ');

  const submit = () => {
    add({ productId: product.id, name: product.name, image: product.image, sizeId, toppingIds, note, quantity, unitPrice, summary });
    onDone();
  };

  return (
    <div className={styles.body}>
      <div className={styles.well}>
        <ProductImage src={product.image} name={product.name} alt="" fill className={styles.photo} />
        <div className={styles.facts}><CategoryChip categoryId={product.categoryId} /></div>
      </div>

      <div className={styles.panel}>
        <h2 className={styles.title}>{product.name}</h2>
        {product.description && <p className={styles.description}>{product.description}</p>}

        {product.sizes.length > 0 && (
          <fieldset className={`${styles.group} ${styles.stagger}`}>
            <legend>Chọn size</legend>
            <div className={styles.segmented} style={{ gridTemplateColumns: `repeat(${product.sizes.length}, 1fr)` }}>
              {product.sizes.map((size) => (
                <label key={size.id} className={styles.segment}>
                  <input type="radio" name="size" className="visually-hidden" checked={sizeId === size.id} onChange={() => setSizeId(size.id)} />
                  <span>{size.label}</span>
                  {size.extraPrice > 0 && <span className={styles.extra}>+{formatVnd(size.extraPrice)}</span>}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {product.toppings.length > 0 && (
          <fieldset className={`${styles.group} ${styles.stagger}`}>
            <legend>Topping</legend>
            <div className={styles.toppings}>
              {product.toppings.map((topping) => (
                <label key={topping.id} className={styles.topping}>
                  <input type="checkbox" className="visually-hidden" checked={toppingIds.includes(topping.id)} onChange={() => toggleTopping(topping.id)} />
                  <span className={styles.check} aria-hidden="true"><i className="ph-bold ph-check" /></span>
                  <span>{topping.name}</span>
                  <span className={styles.toppingPrice}>+{formatVnd(topping.price)}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        <div className={`${styles.group} ${styles.stagger}`}>
          <div className={styles.noteHead}>
            <label htmlFor="product-note">Ghi chú</label>
            <small aria-live="polite">{note.length}/{NOTE_MAX_LENGTH}</small>
          </div>
          <textarea
            id="product-note"
            className={styles.note}
            value={note}
            maxLength={NOTE_MAX_LENGTH}
            rows={2}
            placeholder="Ví dụ: ít đá, ít ngọt"
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <div className={`${styles.actions} ${styles.stagger}`}>
          <div className={styles.stepper}>
            <button type="button" aria-label="Giảm số lượng" disabled={quantity <= MIN_QTY} onClick={() => setQuantity(quantity - 1)}>
              <i className="ph-bold ph-minus" aria-hidden="true" />
            </button>
            <output aria-label="Số lượng">{quantity}</output>
            <button type="button" aria-label="Tăng số lượng" className={styles.plus} disabled={quantity >= MAX_QTY} onClick={() => setQuantity(quantity + 1)}>
              <i className="ph-bold ph-plus" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className={styles.add} disabled={!product.isAvailable} onClick={submit}>
            {product.isAvailable ? (
              <>
                <span className={styles.addLabel}><i className="ph-bold ph-shopping-bag" aria-hidden="true" />Thêm vào giỏ</span>
                <span>{formatVnd(unitPrice * quantity)}</span>
              </>
            ) : 'Tạm hết'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Content({ query, search, onDone }) {
  const { data, isPending, isError, error, refetch } = query;
  if (isPending) return <div className={styles.loading}><Skeleton height="420px" /></div>;
  if (isError && error.status === NOT_FOUND) {
    return (
      <div className={styles.missing}>
        <p>Món này không tồn tại hoặc đã ngừng bán.</p>
        <Link to={{ pathname: '/menu', search }}>Về Menu</Link>
      </div>
    );
  }
  if (isError) return <div className={styles.missing}><ErrorState message={error.message} onRetry={refetch} /></div>;
  return <ProductForm key={data.id} product={data} onDone={onDone} />;
}

export default function ProductModal() {
  const { id } = useParams();
  const { search } = useLocation();
  const navigate = useNavigate();
  const query = useProduct(id);
  const dialogRef = useRef(null);
  const close = () => navigate({ pathname: '/menu', search });
  const closeRef = useRef(close);
  closeRef.current = close;

  useEffect(() => {
    const opener = document.activeElement;
    dialogRef.current?.focus();
    const onKey = (event) => { if (event.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, []);

  return (
    <div className={styles.backdrop} onMouseDown={(e) => { if (e.target === e.currentTarget) close(); }}>
      <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={query.data?.name ?? 'Chi tiết món'} tabIndex={-1} className={styles.dialog}>
        <button type="button" className={styles.close} aria-label="Đóng" onClick={close}>
          <i className="ph-bold ph-x" aria-hidden="true" />
        </button>
        <Content query={query} search={search} onDone={close} />
      </div>
    </div>
  );
}
