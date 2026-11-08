import { useState } from 'react';
import ErrorState from '../../components/ErrorState';
import ProductImage from '../../components/ProductImage';
import Skeleton from '../../components/Skeleton';
import { useCategories } from '../../hooks/useCategories';
import { useSetAvailability, useStaffProducts } from '../../hooks/staff';
import MenuFilter, { useMenuFilter } from '../components/MenuFilter';
import styles from './InventoryPage.module.css';

// Mỗi dòng có mutation riêng: bấm nhiều món liên tiếp thì lỗi/hoàn tất của từng món vẫn được xử lý.
function InventoryRow({ product, categoryName, onFailure }) {
  const setAvailability = useSetAvailability();
  // Giá trị tạm (lạc quan) trong lúc gửi; lỗi thì bỏ để công tắc trở về như cũ.
  const [optimistic, setOptimistic] = useState(null);
  const on = optimistic ?? product.isAvailable;

  const toggle = () => {
    const next = !on;
    onFailure('');
    setOptimistic(next);
    setAvailability.mutate({ id: product.id, isAvailable: next }, {
      onError: () => onFailure(`Không cập nhật được ${product.name}`),
      onSettled: () => setOptimistic(null),
    });
  };

  return (
    <li className={styles.row}>
      <span className={styles.photo}><ProductImage src={product.image} name={product.name} alt="" fill /></span>
      <span className={styles.name}>{product.name}</span>
      <span className={styles.category}>{categoryName}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`Còn hàng: ${product.name}`}
        className={styles.switch}
        disabled={setAvailability.isPending}
        onClick={toggle}
      >
        <span className={styles.knob} aria-hidden="true" />
        <span>{on ? 'Còn' : 'Hết'}</span>
      </button>
    </li>
  );
}

export default function InventoryPage() {
  const products = useStaffProducts();
  const categories = useCategories();
  const filter = useMenuFilter();
  const [failure, setFailure] = useState('');

  const categoryName = (id) => categories.data?.find((c) => c.id === id)?.name ?? '';

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Tồn kho</h1>
      {failure && <p role="alert" className={styles.error}>{failure}</p>}
      {products.isPending && <Skeleton height="320px" />}
      {products.isError && <ErrorState message={products.error.message} onRetry={products.refetch} />}
      {products.isSuccess && (
        <div className={styles.panel}>
          <MenuFilter filter={filter} />
          <ul className={styles.list}>
            {filter.apply(products.data).map((p) => (
              <InventoryRow key={p.id} product={p} categoryName={categoryName(p.categoryId)} onFailure={(message) => message ? setFailure(message) : null} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
