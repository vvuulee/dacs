import { useState } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { normalizeText } from '../../lib/text';
import styles from './MenuFilter.module.css';

// Lọc món theo danh mục + tìm không dấu, dùng chung cho Bán hàng và Tồn kho.
export function useMenuFilter() {
  const [categoryId, setCategoryId] = useState('');
  const [q, setQ] = useState('');
  const needle = normalizeText(q);
  const apply = (products) =>
    products.filter((p) => (!categoryId || p.categoryId === categoryId) && normalizeText(p.name).includes(needle));
  return { categoryId, setCategoryId, q, setQ, apply };
}

export default function MenuFilter({ filter }) {
  const categories = useCategories();
  return (
    <div className={styles.toolbar}>
      <div className={styles.tabs} role="group" aria-label="Danh mục">
        {[{ id: '', name: 'Tất cả' }, ...(categories.data ?? [])].map((c) => (
          <button key={c.id || 'all'} type="button" aria-pressed={filter.categoryId === c.id} className={styles.tab} onClick={() => filter.setCategoryId(c.id)}>
            {c.name}
          </button>
        ))}
      </div>
      <input type="search" aria-label="Tìm món" placeholder="Tìm món" className={styles.search} value={filter.q} onChange={(e) => filter.setQ(e.target.value)} />
    </div>
  );
}
