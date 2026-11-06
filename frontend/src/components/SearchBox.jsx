import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import styles from './Header.module.css';

export default function SearchBox() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const urlTerm = params.get('q') ?? '';
  const [value, setValue] = useState(urlTerm);
  const term = useDebouncedValue(value).trim();

  useEffect(() => {
    if (term === urlTerm) return;
    const next = new URLSearchParams(params);
    if (term) next.set('q', term);
    else next.delete('q');
    navigate({ pathname: '/menu', search: next.toString() });
    // Chỉ chạy khi từ khóa đã debounce đổi; params/urlTerm lấy từ lần render hiện tại.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  return (
    <input
      type="search"
      className={styles.search}
      aria-label="Tìm món"
      placeholder="Tìm món"
      value={value}
      onChange={(event) => setValue(event.target.value)}
    />
  );
}
