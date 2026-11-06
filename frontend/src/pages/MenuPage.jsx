import { useState } from 'react';
import { Link, Outlet, useSearchParams } from 'react-router-dom';
import CartPanel from '../components/CartPanel';
import CategoryList from '../components/CategoryList';
import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import ProductCard from '../components/ProductCard';
import Skeleton from '../components/Skeleton';
import { useCart } from '../features/cart/CartContext';
import { selectCount } from '../features/cart/selectors';
import { useCategories } from '../hooks/useCategories';
import { useOffers } from '../hooks/useOffers';
import { useProducts } from '../hooks/useProducts';
import { formatVnd } from '../lib/money';
import styles from './MenuPage.module.css';

const SKELETON_COUNT = 6;
const TILE_STAGGER_MS = 40;
// Nhịp bố cục lưới: ô đầu lớn 2×2, ô thứ 6 cao, ô thứ 11 rộng; còn lại ô thường.
const LAYOUT = { 0: 'feature', 5: 'tall', 10: 'wide' };

function countByCategory(products) {
  const counts = { all: products.length };
  for (const p of products) counts[p.categoryId] = (counts[p.categoryId] ?? 0) + 1;
  return counts;
}

function Sidebar({ activeId }) {
  const categories = useCategories();
  const all = useProducts({});
  const offers = useOffers();
  const offer = offers.data?.[0];
  return (
    <aside className={styles.sidebar}>
      <p className={styles.sidebarTitle}>Menu</p>
      {categories.isError && <ErrorState message={categories.error.message} onRetry={categories.refetch} />}
      {categories.isPending && <Skeleton height="240px" />}
      {categories.data && (
        <CategoryList categories={categories.data} activeId={activeId} counts={all.data ? countByCategory(all.data) : undefined} />
      )}
      {offer && (
        <Link to="/offers" className={styles.voucher}>
          <span className={styles.voucherCode}>{offer.code}</span>
          <span className={styles.voucherText}>{offer.title}{offer.minOrder ? `, đơn từ ${formatVnd(offer.minOrder)}` : ''}</span>
        </Link>
      )}
    </aside>
  );
}

function ProductGrid({ filter }) {
  const { data, isPending, isError, error, refetch } = useProducts(filter);
  if (isError) return <div className={styles.full}><ErrorState message={error.message} onRetry={refetch} /></div>;
  if (isPending) {
    return Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} height="100%" />);
  }
  if (data.length === 0) {
    return <div className={styles.full}><EmptyState title="Không tìm thấy món nào" hint="Thử từ khóa khác hoặc chọn danh mục khác." /></div>;
  }
  return data.map((product, i) => (
    <ProductCard
      key={product.id}
      product={product}
      variant={data.length > 3 ? LAYOUT[i] : undefined}
      style={{ animationDelay: `${i * TILE_STAGGER_MS}ms` }}
    />
  ));
}

function PageTitle({ categoryId, q }) {
  const { data } = useCategories();
  const category = data?.find((c) => c.id === categoryId);
  let title = category?.name ?? 'Tất cả món';
  if (q) title = `Kết quả cho “${q}”`;
  return <h1 className={styles.title}>{title}</h1>;
}

export default function MenuPage() {
  const [params] = useSearchParams();
  const categoryId = params.get('category') ?? undefined;
  const q = (params.get('q') ?? '').trim();
  const { items } = useCart();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className={styles.layout}>
        <Sidebar activeId={categoryId} />
        <div>
          <div className={styles.head}>
            <PageTitle categoryId={categoryId} q={q} />
            <button type="button" className={styles.drawerToggle} onClick={() => setDrawerOpen(true)}>
              <i className="ph-bold ph-shopping-bag" aria-hidden="true" />Giỏ hàng ({selectCount(items)})
            </button>
          </div>
          <section aria-label="Danh sách món" className={styles.grid}>
            <ProductGrid filter={{ categoryId, q }} />
          </section>
        </div>
        <aside className={drawerOpen ? styles.cartOpen : styles.cart}>
          <button type="button" className={styles.drawerClose} onClick={() => setDrawerOpen(false)}>
            Đóng giỏ hàng
          </button>
          <CartPanel />
        </aside>
      </div>
      <Outlet />
    </>
  );
}
