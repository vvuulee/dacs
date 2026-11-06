import { Link } from 'react-router-dom';
import ErrorState from '../components/ErrorState';
import ProductCard from '../components/ProductCard';
import ProductImage from '../components/ProductImage';
import Skeleton from '../components/Skeleton';
import { FEATURED_COUNT } from '../constants';
import { useCategories } from '../hooks/useCategories';
import { useOffers } from '../hooks/useOffers';
import { useProducts } from '../hooks/useProducts';
import { formatVnd } from '../lib/money';
import styles from './HomePage.module.css';

const SKELETON_COUNT = 4;
const CARD_STAGGER_MS = 60;
const skeletons = Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} height="280px" />);

const SERVICE_FACTS = [
  { icon: 'ph-qr-code', text: 'Chuyển khoản QR, ví điện tử, tiền mặt', dark: true },
  { icon: 'ph-map-trifold', text: 'Theo dõi trạng thái đơn hàng' },
  { icon: 'ph-sliders', text: 'Chọn size, topping, ghi chú', dark: true },
  { icon: 'ph-storefront', text: 'Xem cửa hàng gần bạn' },
  { icon: 'ph-ticket', text: 'Nhập mã giảm giá khi thanh toán', dark: true },
];

const productLink = (product) => `/menu/${product.id}`;
const withImage = (products) => products.filter((p) => p.isAvailable && p.image);

function PhotoCell({ product, className, name }) {
  if (!product) return <div className={`${className} ${styles.well}`} aria-hidden="true" />;
  return (
    <Link to={productLink(product)} className={`${className} ${styles.well}`} data-name={name}>
      <ProductImage src={product.image} name={product.name} alt="" fill />
      <span className={styles.photoLabel}>
        <span className={styles.photoName}>{product.name}</span>
        <span className={styles.photoPrice}>{formatVnd(product.basePrice)}</span>
      </span>
    </Link>
  );
}

function Hero() {
  const { data } = useProducts({});
  const offers = useOffers();
  const [main, side, small] = data ? withImage(data) : [];
  const offer = offers.data?.[0];

  return (
    <section className={styles.bento} aria-label="Giới thiệu">
      <div className={styles.heroMain}>
        <div className={styles.heroCopy}>
          <h1 className={styles.heroTitle}>Cà phê phin, trà trái cây pha tươi mỗi ngày</h1>
          <p className={styles.heroText}>Đặt online, nhận đồ uống tận nơi từ cửa hàng gần bạn.</p>
        </div>
        <div className={styles.heroActions}>
          <Link to="/menu" className={styles.ctaPrimary}>Xem menu <i className="ph-bold ph-arrow-right" aria-hidden="true" /></Link>
          <Link to="/stores" className={styles.ctaGhost}><i className="ph-bold ph-storefront" aria-hidden="true" />Tìm cửa hàng</Link>
        </div>
        <div className={styles.heroCapsule} aria-hidden="true">
          {main && <ProductImage src={main.image} name={main.name} alt="" fill className={styles.heroPhoto} />}
        </div>
        {main && (
          <Link to={productLink(main)} className={styles.heroTag}>
            <span className={styles.heroTagAdd}><i className="ph-bold ph-plus" aria-hidden="true" /></span>
            <span>
              <span className={styles.heroTagName}>{main.name}</span>
              <span className={styles.heroTagPrice}>{formatVnd(main.basePrice)}</span>
            </span>
          </Link>
        )}
      </div>

      <PhotoCell product={side} className={styles.sideCell} name="side product cell" />

      <Link to="/orders" className={styles.trackCell}>
        <span className={styles.trackIcon} aria-hidden="true"><i className="ph-bold ph-receipt" /></span>
        <span className={styles.trackText}>
          <span className={styles.trackTitle}>Tra cứu đơn hàng</span>
          <span className={styles.trackHint}>Mã đơn + số điện thoại</span>
        </span>
        <span className={styles.trackButton}>Tra cứu <i className="ph-bold ph-arrow-right" aria-hidden="true" /></span>
      </Link>

      <Link to="/offers" className={styles.offerCell}>
        <i className="ph-bold ph-ticket" aria-hidden="true" />
        {offer ? (
          <span>
            <span className={styles.offerTitle}>{offer.title}</span>
            <span className={styles.offerHint}>
              {offer.minOrder ? `Đơn từ ${formatVnd(offer.minOrder)}, ` : ''}mã {offer.code}
            </span>
          </span>
        ) : (
          <span className={styles.offerTitle}>Xem ưu đãi</span>
        )}
      </Link>

      <PhotoCell product={small} className={styles.smallCell} name="small product cell" />
    </section>
  );
}

function OfferMarquee() {
  const { data } = useOffers();
  if (!data || data.length === 0) return null;
  const pills = (hidden) => (
    <div className={styles.marqueeGroup} aria-hidden={hidden || undefined}>
      {data.map((offer, i) => (
        <Link key={offer.id} to="/offers" tabIndex={hidden ? -1 : undefined} className={styles.voucher}>
          <span className={i % 2 ? styles.codeOrange : styles.codeMustard}>{offer.code}</span>
          <span className={styles.voucherTitle}>{offer.title}</span>
          {offer.minOrder && <span className={styles.voucherMin}>Đơn từ {formatVnd(offer.minOrder)}</span>}
          <i className="ph-bold ph-copy" aria-hidden="true" />
        </Link>
      ))}
    </div>
  );
  const facts = (hidden) => (
    <div className={styles.marqueeGroup} aria-hidden={hidden || undefined}>
      {SERVICE_FACTS.map((fact) => (
        <span key={fact.text} className={fact.dark ? styles.factDark : styles.fact}>
          <i className={`ph-bold ${fact.icon}`} aria-hidden="true" />{fact.text}
        </span>
      ))}
    </div>
  );

  return (
    <section className={styles.band} aria-labelledby="vouchers-title">
      <div className={styles.bandHead}>
        <h2 id="vouchers-title" className={styles.sectionTitle}>Mã giảm giá đang có</h2>
        <Link to="/offers" className={styles.moreLink}>Tất cả ưu đãi <i className="ph-bold ph-arrow-right" aria-hidden="true" /></Link>
      </div>
      <div className={styles.marquee}>{pills(false)}{pills(true)}</div>
      <div className={`${styles.marquee} ${styles.reverse}`}>{facts(false)}{facts(true)}</div>
    </section>
  );
}

function Categories() {
  const { data, isPending, isError, error, refetch } = useCategories();
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;
  if (isPending) return <div className={styles.categories}>{Array.from({ length: 6 }, (_, i) => <Skeleton key={i} height="72px" />)}</div>;
  return (
    <ul className={styles.categories}>
      {data.map((category, i) => (
        <li key={category.id}>
          <Link to={`/menu?category=${encodeURIComponent(category.id)}`} className={i === 0 ? styles.categoryDark : styles.category}>
            <span className={styles.categoryThumb}><ProductImage src={category.image} name={category.name} alt="" fill /></span>
            <span className={styles.categoryName}>{category.name}</span>
            <i className={`ph-bold ph-arrow-right ${styles.categoryArrow}`} aria-hidden="true" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Featured() {
  const { data, isPending, isError, error, refetch } = useProducts({});
  return (
    <>
      <div className={styles.sectionHead}>
        <h2 id="featured-title" className={styles.sectionTitle}>Món bán chạy</h2>
        <Link to="/menu" className={styles.moreLink}>Xem toàn bộ menu <i className="ph-bold ph-arrow-right" aria-hidden="true" /></Link>
      </div>
      <section aria-labelledby="featured-title" aria-busy={isPending}>
        {isError && <ErrorState message={error.message} onRetry={refetch} />}
        {isPending && <div className={styles.grid}>{skeletons}</div>}
        {data && (
          <div className={styles.grid}>
            {data.filter((p) => p.isAvailable).slice(0, FEATURED_COUNT).map((p, i) => (
              <ProductCard key={p.id} product={p} variant="peek" style={{ animationDelay: `${i * CARD_STAGGER_MS}ms` }} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

export default function HomePage() {
  return (
    <>
      <Hero />
      <OfferMarquee />
      <section aria-labelledby="categories-title" className={styles.block}>
        <h2 id="categories-title" className={styles.sectionTitle}>Danh mục</h2>
        <Categories />
      </section>
      <div className={styles.block}>
        <Featured />
      </div>
    </>
  );
}
