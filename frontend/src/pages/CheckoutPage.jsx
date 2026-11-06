import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AddressFields from '../components/AddressFields';
import EmptyState from '../components/EmptyState';
import FormField, { fieldProps } from '../components/FormField';
import OrderSummary from '../components/OrderSummary';
import VoucherBox from '../components/VoucherBox';
import PaymentMethodPicker from '../components/PaymentMethodPicker';
import { NOTE_MAX_LENGTH, VOUCHER_INVALID_CODE } from '../constants';
import { useAuth } from '../features/auth/AuthContext';
import { CHECKOUT_SESSION_EXPIRED_TEXT } from '../features/auth/messages';
import { validateCheckout, FIELD_ORDER } from '../features/checkout/validate';
import { useCart } from '../features/cart/CartContext';
import { selectSubtotal } from '../features/cart/selectors';
import { isOnlinePayment } from '../features/orders/orderStatus';
import { addRecentOrder } from '../features/orders/recentOrders';
import { useCreateOrder } from '../hooks/useCreateOrder';
import { newRequestId } from '../lib/id';
import { normalizePhone } from '../lib/phone';
import styles from './CheckoutPage.module.css';

const UNAUTHORIZED = 401;
const EMPTY_FORM = { name: '', phone: '', provinceId: '', wardId: '', street: '', note: '', paymentMethod: 'cash' };

export default function CheckoutPage() {
  const { items, clear } = useCart();
  const { status, user } = useAuth();
  const navigate = useNavigate();
  const createOrder = useCreateOrder();
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  // Mã đã áp chỉ sống trong trang này (không lưu): gắn với chữ ký giỏ hàng lúc áp.
  const [applied, setApplied] = useState(null);
  // Một id cho mỗi lần thử: bấm lại hoặc thử lại sau lỗi mạng không tạo đơn thứ hai.
  const requestIdRef = useRef(null);

  const touchedRef = useRef(false);
  const prefilledRef = useRef(false);

  const update = (patch) => {
    touchedRef.current = true;
    setForm((current) => ({ ...current, ...patch }));
  };

  // Điền sẵn từ hồ sơ đúng một lần, và không bao giờ ghi đè dữ liệu khách đã gõ.
  useEffect(() => {
    if (status !== 'authenticated' || touchedRef.current || prefilledRef.current) return;
    prefilledRef.current = true;
    setForm((current) => ({
      ...current,
      name: user.name,
      phone: user.phone,
      provinceId: user.address?.provinceId ?? '',
      wardId: user.address?.wardId ?? '',
      street: user.address?.street ?? '',
    }));
  }, [status, user]);

  if (items.length === 0) {
    return (
      <>
        <h1>Thanh toán</h1>
        <EmptyState title="Giỏ hàng trống" hint="Chọn món trước khi thanh toán." />
        <p className={styles.center}><Link to="/menu">Về Menu</Link></p>
      </>
    );
  }

  const signature = items.map((item) => `${item.key}×${item.quantity}`).join('|');
  const activeVoucher = applied?.signature === signature ? applied : null;
  const cartChanged = applied !== null && activeVoucher === null;

  // Mã không còn hợp lệ lúc đặt: gỡ mã và đổi clientRequestId vì nội dung request đã khác
  // (backend chặt chẽ có thể nhớ cả khóa của lần bị từ chối). Lỗi khác giữ nguyên mã và khóa.
  const onError = (error) => {
    if (error.code !== VOUCHER_INVALID_CODE) return;
    setApplied(null);
    requestIdRef.current = null;
  };

  const onSuccess = (order) => {
    addRecentOrder({ id: order.id, phone: normalizePhone(form.phone), createdAt: order.createdAt });
    requestIdRef.current = null;
    navigate(isOnlinePayment(order.paymentMethod) ? `/payment/${order.id}` : `/orders/${order.id}`);
    clear();
  };

  const submit = (event) => {
    event.preventDefault();
    if (createOrder.isPending) return;
    const result = validateCheckout(form);
    setErrors(result.errors);
    if (!result.valid) {
      const firstInvalid = FIELD_ORDER.find((field) => result.errors[field]);
      document.getElementById(`field-${firstInvalid}`)?.focus();
      return;
    }
    requestIdRef.current ??= newRequestId();
    createOrder.mutate(
      { form, items, clientRequestId: requestIdRef.current, voucherCode: activeVoucher?.code },
      { onSuccess, onError },
    );
  };

  const lines = items.map((item) => ({
    key: item.key, name: item.name, image: item.image, summary: item.summary ?? '', note: item.note,
    quantity: item.quantity, lineTotal: item.unitPrice * item.quantity,
  }));

  return (
    <>
      <div className={styles.titleRow}>
        <h1 className={styles.title}>Thanh toán</h1>
        <ol className={styles.steps} aria-label="Các bước đặt hàng">
          <li className={styles.stepDone}><i className="ph-bold ph-check-circle" aria-hidden="true" />Giỏ hàng</li>
          <li className={styles.stepLine} aria-hidden="true" />
          <li className={styles.stepCurrent} aria-current="step"><span className={styles.stepNo}>2</span>Giao hàng &amp; thanh toán</li>
          <li className={styles.stepLine} aria-hidden="true" />
          <li className={styles.step}><span className={styles.stepNo}>3</span>Theo dõi đơn</li>
        </ol>
      </div>
      <div className={styles.layout}>
        <form id="checkout-form" onSubmit={submit} noValidate className={styles.form}>
          <section className={styles.section} aria-labelledby="checkout-contact">
            <h2 id="checkout-contact" className={styles.sectionTitle}><span className={styles.sectionIcon} aria-hidden="true"><i className="ph-bold ph-user" /></span>Người nhận</h2>
            <FormField name="name" label="Họ tên" error={errors.name}>
              <input type="text" autoComplete="name" {...fieldProps('name', errors.name)} value={form.name} onChange={(e) => update({ name: e.target.value })} />
            </FormField>
            <FormField name="phone" label="Số điện thoại" error={errors.phone}>
              <input type="tel" autoComplete="tel" {...fieldProps('phone', errors.phone)} value={form.phone} onChange={(e) => update({ phone: e.target.value })} />
            </FormField>
          </section>
          <section className={styles.section} aria-labelledby="checkout-address">
            <h2 id="checkout-address" className={styles.sectionTitle}><span className={styles.sectionIcon} aria-hidden="true"><i className="ph-bold ph-map-pin" /></span>Địa chỉ giao hàng</h2>
            <AddressFields value={form} errors={errors} onChange={update} />
            <FormField name="note" label="Ghi chú cho tài xế" error={errors.note}>
              <textarea rows={3} maxLength={NOTE_MAX_LENGTH} placeholder="Ví dụ: gọi trước khi tới, để ở quầy lễ tân" {...fieldProps('note', errors.note)} value={form.note} onChange={(e) => update({ note: e.target.value })} />
            </FormField>
          </section>
          <section className={styles.section} aria-labelledby="checkout-payment">
            <h2 id="checkout-payment" className={styles.sectionTitle}><span className={styles.sectionIcon} aria-hidden="true"><i className="ph-bold ph-wallet" /></span>Phương thức thanh toán</h2>
            <PaymentMethodPicker value={form.paymentMethod} error={errors.paymentMethod} onChange={(paymentMethod) => update({ paymentMethod })} />
          </section>
        </form>
        <aside className={styles.aside}>
          <OrderSummary
            title="Đơn của bạn"
            action={<Link to="/cart" className={styles.editCart}>Sửa giỏ hàng</Link>}
            lines={lines}
            subtotal={selectSubtotal(items)}
            discount={activeVoucher?.discount}
            footer={(
              <>
                {createOrder.isError && <p role="alert" className={styles.error}>{createOrder.error.status === UNAUTHORIZED ? CHECKOUT_SESSION_EXPIRED_TEXT : createOrder.error.message}</p>}
                <button type="submit" form="checkout-form" className={styles.submit} disabled={createOrder.isPending}>
                  {createOrder.isPending ? 'Đang đặt hàng…' : 'Đặt hàng'}
                  {!createOrder.isPending && <i className="ph-bold ph-arrow-right" aria-hidden="true" />}
                </button>
              </>
            )}
          >
            <VoucherBox
              items={items}
              applied={activeVoucher}
              cartChanged={cartChanged}
              onApplied={(result) => setApplied({ code: result.code, title: result.title, discount: result.discount, signature })}
              onRemove={() => setApplied(null)}
            />
          </OrderSummary>
          <Link to="/offers" className={styles.offersLink}>
            <i className="ph-bold ph-tag" aria-hidden="true" /><span>Xem các mã giảm giá khác</span><i className="ph-bold ph-arrow-right" aria-hidden="true" />
          </Link>
        </aside>
      </div>
    </>
  );
}
