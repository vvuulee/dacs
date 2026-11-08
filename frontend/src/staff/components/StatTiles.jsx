import { formatVnd } from '../../lib/money';
import styles from './StatTiles.module.css';

function Tile({ label, children }) {
  return (
    <div role="group" aria-label={label} className={styles.tile}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>{children}</span>
    </div>
  );
}

export default function StatTiles({ report }) {
  const { counter, online } = report.bySource;
  return (
    <>
      <div className={styles.tiles}>
        <Tile label="Số đơn">{report.orderCount}</Tile>
        <Tile label="Doanh thu">{formatVnd(report.revenue)}</Tile>
        <Tile label="Đơn huỷ">{report.cancelledCount}</Tile>
        <Tile label="Quầy / Online">
          <span className={styles.split}>Quầy {counter.count} · {formatVnd(counter.revenue)}</span>
          <span className={styles.split}>Online {online.count} · {formatVnd(online.revenue)}</span>
        </Tile>
      </div>
      <p data-testid="by-payment" className={styles.payments}>
        <span>Tiền mặt {formatVnd(report.byPayment.cash)}</span>
        <span>Chuyển khoản {formatVnd(report.byPayment.bankTransfer)}</span>
        <span>Ví {formatVnd(report.byPayment.wallet)}</span>
      </p>
    </>
  );
}
