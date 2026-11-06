import EmptyState from '../components/EmptyState';
import ErrorState from '../components/ErrorState';
import OfferCard from '../components/OfferCard';
import Skeleton from '../components/Skeleton';
import { NO_OFFERS_TEXT } from '../features/vouchers/messages';
import { useOffers } from '../hooks/useOffers';
import styles from './OffersPage.module.css';

const SKELETON_COUNT = 4;

export default function OffersPage() {
  const { data, isPending, isError, error, refetch } = useOffers();

  let content;
  if (isError) content = <ErrorState message={error.message} onRetry={refetch} />;
  else if (isPending) content = Array.from({ length: SKELETON_COUNT }, (_, i) => <Skeleton key={i} height="180px" />);
  else if (data.length === 0) content = <EmptyState title={NO_OFFERS_TEXT} hint="Quay lại sau để xem ưu đãi mới." />;
  else content = data.map((offer) => <OfferCard key={offer.id} offer={offer} />);

  return (
    <>
      <h1>Ưu đãi</h1>
      <p className={styles.hint}>Sao chép mã rồi nhập ở bước thanh toán.</p>
      <section aria-label="Danh sách ưu đãi" aria-busy={isPending} className={styles.grid}>
        {content}
      </section>
    </>
  );
}
