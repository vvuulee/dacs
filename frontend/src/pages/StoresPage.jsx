import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import FormField, { fieldProps } from '../components/FormField';
import Skeleton from '../components/Skeleton';
import StoreCard from '../components/StoreCard';
import { NO_STORES_TEXT } from '../features/vouchers/messages';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { useProvinces } from '../hooks/useProvinces';
import { useStores } from '../hooks/useStores';
import styles from './StoresPage.module.css';

const SKELETON_COUNT = 6;

export default function StoresPage() {
  const [params, setParams] = useSearchParams();
  const provinceId = params.get('province') ?? '';
  const urlTerm = params.get('q') ?? '';
  const [term, setTerm] = useState(urlTerm);
  const debounced = useDebouncedValue(term).trim();
  const provinces = useProvinces();
  const { data, isPending, isError, error, refetch } = useStores({ provinceId: provinceId || undefined, q: urlTerm.trim() });

  const updateParam = (key, value) =>
    setParams((current) => {
      const next = new URLSearchParams(current);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    }, { replace: true });

  // Từ khóa đã debounce mới được ghi lên URL; URL là nguồn sự thật cho bộ lọc.
  useEffect(() => {
    if (debounced !== urlTerm.trim()) updateParam('q', debounced);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  let content;
  if (isError) content = <ErrorState message={error.message} onRetry={refetch} />;
  else if (isPending) content = Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} height="140px" />);
  else if (data.length === 0) content = <EmptyState title={NO_STORES_TEXT} hint="Thử đổi tỉnh/thành hoặc từ khóa khác." />;
  else content = data.map((store) => <StoreCard key={store.id} store={store} />);

  return (
    <>
      <h1>Cửa hàng</h1>
      <div className={styles.filters}>
        <FormField name="province" label="Tỉnh/Thành">
          <select {...fieldProps('province')} value={provinceId} onChange={(e) => updateParam('province', e.target.value)}>
            <option value="">Tất cả</option>
            {provinces.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </FormField>
        <FormField name="q" label="Tìm cửa hàng">
          <input type="search" {...fieldProps('q')} value={term} onChange={(e) => setTerm(e.target.value)} />
        </FormField>
      </div>
      <section aria-label="Danh sách cửa hàng" aria-busy={isPending} className={styles.grid}>
        {content}
      </section>
    </>
  );
}
