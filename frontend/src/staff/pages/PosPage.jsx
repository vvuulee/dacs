import { useCallback, useRef, useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import FormField, { fieldProps } from '../../components/FormField';
import { ProductForm } from '../../components/ProductModal';
import ProductImage from '../../components/ProductImage';
import Skeleton from '../../components/Skeleton';
import VoucherBox from '../../components/VoucherBox';
import { MAX_QTY, MIN_QTY, TABLE_MAX, VOUCHER_INVALID_CODE } from '../../constants';
import { useCart } from '../../features/cart/CartContext';
import { selectSubtotal } from '../../features/cart/selectors';
import { useCreateCounterOrder, useStaffProducts } from '../../hooks/staff';
import { newRequestId } from '../../lib/id';
import { formatVnd } from '../../lib/money';
import { toCounterOrderRequest } from '../../mappers/staff';
import MenuFilter, { useMenuFilter } from '../components/MenuFilter';
import PaymentDialog from '../components/PaymentDialog';
import Receipt from '../components/Receipt';
import styles from './PosPage.module.css';

const TABLE_ERROR = `Nhập số bàn (1–${TABLE_MAX} ký tự)`;
const VOUCHER_GONE_TEXT = 'Mã không còn dùng được';

function ProductGrid({ onPick }) {
  const products = useStaffProducts();
  const filter = useMenuFilter();

  if (products.isPending) return <Skeleton height="420px" />;
  if (products.isError) return <ErrorState message={products.error.message} onRetry={products.refetch} />;
  const shown = filter.apply(products.data);

  return (
    <div className={styles.menu}>
      <MenuFilter filter={filter} />
      {shown.length === 0 ? <p className={styles.empty}>Không tìm thấy món nào</p> : (
        <div className={styles.grid}>
          {shown.map((p) => (
            <button key={p.id} type="button" className={styles.card} disabled={!p.isAvailable} onClick={() => onPick(p)}>
              <span className={styles.photo}><ProductImage src={p.image} name={p.name} alt="" fill /></span>
              <span className={styles.cardName}>{p.name}</span>
              <span className={styles.cardPrice}>{p.isAvailable ? formatVnd(p.basePrice) : 'Hết hàng'}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function PickDialog({ product, onClose }) {
  return (
    <div className={styles.backdrop}>
      <div role="dialog" aria-modal="true" aria-label={product.name} className={styles.pick}>
        <button type="button" className={styles.pickClose} aria-label="Đóng" onClick={onClose}>×</button>
        <ProductForm key={product.id} product={product} onDone={onClose} submitLabel="Thêm vào đơn" />
      </div>
    </div>
  );
}

export default function PosPage() {
  const { items, setQuantity, remove, clear } = useCart();
  const create = useCreateCounterOrder();
  const [picking, setPicking] = useState(null);
  const [serviceType, setServiceType] = useState('dine_in');
  const [table, setTable] = useState('');
  const [tableError, setTableError] = useState('');
  const [applied, setApplied] = useState(null);
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const [receipt, setReceipt] = useState(null);
  // Một id cho mỗi đơn: bấm lại sau lỗi mạng không tạo đơn trùng; chỉ "Đơn mới" mới sinh id khác.
  const requestIdRef = useRef(newRequestId());

  const subtotal = selectSubtotal(items);
  const signature = items.map((item) => `${item.key}×${item.quantity}`).join('|');
  const activeVoucher = applied?.signature === signature ? applied : null;
  const cartChanged = applied !== null && activeVoucher === null;
  const discount = activeVoucher?.discount ?? 0;
  const total = Math.max(subtotal - discount, 0);

  const openPayment = () => {
    const trimmed = table.trim();
    if (serviceType === 'dine_in' && (trimmed.length < 1 || trimmed.length > TABLE_MAX)) {
      setTableError(TABLE_ERROR);
      document.getElementById('field-table')?.focus();
      return;
    }
    setTableError('');
    setPayError('');
    setPaying(true);
  };

  const closePayment = useCallback(() => setPaying(false), []);

  const pay = ({ paymentMethod, cashReceived }) => {
    if (create.isPending) return;
    setPayError('');
    const request = toCounterOrderRequest({
      items, serviceType, table, voucherCode: activeVoucher?.code, paymentMethod, cashReceived, clientRequestId: requestIdRef.current,
    });
    create.mutate(request, {
      onSuccess: (order) => { setPaying(false); setReceipt(order); },
      onError: (error) => {
        if (error.code === VOUCHER_INVALID_CODE) {
          setApplied(null);
          setPayError(VOUCHER_GONE_TEXT);
        } else {
          setPayError(error.message);
        }
      },
    });
  };

  const newOrder = () => {
    clear();
    setApplied(null);
    setReceipt(null);
    setServiceType('dine_in');
    setTable('');
    requestIdRef.current = newRequestId();
    create.reset();
  };

  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Bán hàng</h1>
      <div className={styles.layout}>
        <ProductGrid onPick={setPicking} />

        <aside className={styles.side}>
          {receipt ? (
            <div className={styles.done}>
              <Receipt order={receipt} />
              <div className={styles.doneActions}>
                <button type="button" className={styles.secondary} onClick={() => window.print()}>In hoá đơn</button>
                <button type="button" className={styles.primary} onClick={newOrder}>Đơn mới</button>
              </div>
            </div>
          ) : (
            <section aria-label="Đơn hiện tại" className={styles.cart}>
              <fieldset className={styles.service}>
                <legend>Hình thức</legend>
                <label><input type="radio" name="service" checked={serviceType === 'dine_in'} onChange={() => setServiceType('dine_in')} /> Tại bàn</label>
                <label><input type="radio" name="service" checked={serviceType === 'takeaway'} onChange={() => { setServiceType('takeaway'); setTableError(''); }} /> Mang đi</label>
              </fieldset>
              {serviceType === 'dine_in' && (
                <FormField name="table" label="Số bàn" error={tableError}>
                  <input type="text" autoComplete="off" maxLength={TABLE_MAX} {...fieldProps('table', tableError)} value={table} onChange={(e) => setTable(e.target.value)} />
                </FormField>
              )}

              {items.length === 0 ? <p className={styles.empty}>Chưa có món nào</p> : (
                <ul className={styles.lines}>
                  {items.map((line) => (
                    <li key={line.key} className={styles.line}>
                      <div className={styles.lineInfo}>
                        <span className={styles.lineName}>{line.name}</span>
                        {line.summary && <small>{line.summary}</small>}
                        {line.note && <small>Ghi chú: {line.note}</small>}
                      </div>
                      <div className={styles.qty}>
                        <button type="button" aria-label={`Giảm số lượng ${line.name}`} disabled={line.quantity <= MIN_QTY} onClick={() => setQuantity(line.key, line.quantity - 1)}>−</button>
                        <span>{line.quantity}</span>
                        <button type="button" aria-label={`Tăng số lượng ${line.name}`} disabled={line.quantity >= MAX_QTY} onClick={() => setQuantity(line.key, line.quantity + 1)}>+</button>
                      </div>
                      <span className={styles.linePrice}>{formatVnd(line.unitPrice * line.quantity)}</span>
                      <button type="button" className={styles.removeLine} aria-label={`Xoá ${line.name}`} onClick={() => remove(line.key)}>×</button>
                    </li>
                  ))}
                </ul>
              )}

              {items.length > 0 && (
                <VoucherBox
                  items={items}
                  source="counter"
                  applied={activeVoucher}
                  cartChanged={cartChanged}
                  onApplied={(result) => setApplied({ code: result.code, title: result.title, discount: result.discount, signature })}
                  onRemove={() => setApplied(null)}
                />
              )}

              <dl className={styles.sums}>
                <dt>Tạm tính</dt><dd>{formatVnd(subtotal)}</dd>
                {discount > 0 && <><dt>Giảm giá</dt><dd>−{formatVnd(discount)}</dd></>}
              </dl>
              <p className={styles.total}>Thành tiền <strong data-testid="pos-total">{formatVnd(total)}</strong></p>
              <div className={styles.actions}>
                <button type="button" className={styles.danger} disabled={items.length === 0} onClick={() => setConfirmClear(true)}>Xoá hết</button>
                <button type="button" className={styles.primary} disabled={items.length === 0} onClick={openPayment}>Thanh toán</button>
              </div>
            </section>
          )}
        </aside>
      </div>

      {picking && <PickDialog product={picking} onClose={() => setPicking(null)} />}
      {paying && <PaymentDialog total={total} pending={create.isPending} error={payError} onSubmit={pay} onClose={closePayment} />}
      <ConfirmDialog
        open={confirmClear}
        title="Xoá hết món trong đơn?"
        message="Các món đang chọn sẽ bị xoá khỏi đơn."
        confirmLabel="Xoá hết"
        onConfirm={() => { clear(); setApplied(null); setConfirmClear(false); }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
