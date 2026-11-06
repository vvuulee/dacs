import { Link, useSearchParams } from 'react-router-dom';
import styles from './CategoryList.module.css';

const ICONS = {
  'ca-phe': 'ph-coffee',
  tra: 'ph-orange-slice',
  'tra-sua': 'ph-pint-glass',
  'da-xay': 'ph-snowflake',
  banh: 'ph-cake',
  'an-nhe': 'ph-hamburger',
};

// `counts`: { [categoryId]: số món, all: tổng } — tùy chọn, chỉ để hiển thị.
export default function CategoryList({ categories, activeId, counts }) {
  const [params] = useSearchParams();

  const linkTo = (categoryId) => {
    const next = new URLSearchParams(params);
    if (categoryId) next.set('category', categoryId);
    else next.delete('category');
    return { pathname: '/menu', search: next.toString() };
  };

  const item = (id, name) => {
    const count = counts?.[id || 'all'];
    return (
      <li key={id || 'all'}>
        <Link to={linkTo(id)} className={styles.link} aria-current={(activeId ?? '') === id ? 'true' : undefined}>
          <span className={styles.label}>
            {id && <i className={`ph-bold ${ICONS[id] ?? 'ph-circle'} ${styles.icon}`} aria-hidden="true" />}
            {name}
          </span>
          {count !== undefined && <span className={styles.count} aria-hidden="true">{count}</span>}
        </Link>
      </li>
    );
  };

  return (
    <nav aria-label="Danh mục">
      <ul className={styles.list}>
        {item('', 'Tất cả')}
        {categories.map((c) => item(c.id, c.name))}
      </ul>
    </nav>
  );
}
