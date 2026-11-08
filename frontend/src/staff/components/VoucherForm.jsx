import { useState } from 'react';
import FormField, { fieldProps } from '../../components/FormField';
import { VOUCHER_DESCRIPTION_MAX, VOUCHER_TITLE_MAX } from '../../constants';
import { validateVoucherForm } from '../../features/staff/validateVoucher';
import { useCreateVoucher } from '../../hooks/staff';
import { toVoucherCreateRequest } from '../../mappers/staff';
import styles from './VoucherForm.module.css';

const EMPTY = { code: '', title: '', description: '', type: 'percent', value: '', maxDiscount: '', minOrder: '0', expiresOn: '', listed: true };
const CONFLICT = 409;
const UNPROCESSABLE = 422;
const FIELD_ORDER = ['code', 'title', 'description', 'value', 'maxDiscount', 'minOrder', 'expiresOn'];

export default function VoucherForm({ onDone }) {
  const create = useCreateVoucher();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

  const submit = (event) => {
    event.preventDefault();
    if (create.isPending) return;
    const result = validateVoucherForm(form);
    setErrors(result.errors);
    setFailure('');
    if (!result.valid) {
      const first = FIELD_ORDER.find((f) => result.errors[f]);
      document.getElementById(`field-${first}`)?.focus();
      return;
    }
    create.mutate(toVoucherCreateRequest(form), {
      onSuccess: () => { setForm(EMPTY); onDone(); },
      onError: (error) => {
        if (error.status === CONFLICT) {
          setErrors({ code: 'Mã đã tồn tại' });
          document.getElementById('field-code')?.focus();
        } else {
          setFailure(error.status === UNPROCESSABLE ? error.message : `Không lưu được voucher: ${error.message}`);
        }
      },
    });
  };

  const valueLabel = form.type === 'percent' ? 'Giá trị (%)' : 'Giá trị (₫)';
  return (
    <form aria-label="Tạo voucher" onSubmit={submit} noValidate className={styles.form}>
      <FormField name="code" label="Mã" error={errors.code}>
        <input type="text" autoComplete="off" className={styles.code} {...fieldProps('code', errors.code)} value={form.code} onChange={(e) => update({ code: e.target.value })} />
      </FormField>
      <FormField name="title" label="Tiêu đề" error={errors.title}>
        <input type="text" maxLength={VOUCHER_TITLE_MAX + 20} {...fieldProps('title', errors.title)} value={form.title} onChange={(e) => update({ title: e.target.value })} />
      </FormField>
      <FormField name="description" label="Mô tả" error={errors.description}>
        <textarea rows={2} {...fieldProps('description', errors.description)} value={form.description} onChange={(e) => update({ description: e.target.value })} />
      </FormField>
      <small className={styles.hint}>{form.description.length}/{VOUCHER_DESCRIPTION_MAX}</small>
      <FormField name="type" label="Loại">
        <select {...fieldProps('type')} value={form.type} onChange={(e) => update({ type: e.target.value })}>
          <option value="percent">Giảm theo %</option>
          <option value="fixed">Giảm số tiền</option>
          <option value="freeship">Miễn phí giao hàng</option>
        </select>
      </FormField>
      {form.type !== 'freeship' && (
        <FormField name="value" label={valueLabel} error={errors.value}>
          <input inputMode="numeric" {...fieldProps('value', errors.value)} value={form.value} onChange={(e) => update({ value: e.target.value })} />
        </FormField>
      )}
      {form.type === 'percent' && (
        <FormField name="maxDiscount" label="Giảm tối đa (₫)" error={errors.maxDiscount}>
          <input inputMode="numeric" placeholder="Để trống nếu không giới hạn" {...fieldProps('maxDiscount', errors.maxDiscount)} value={form.maxDiscount} onChange={(e) => update({ maxDiscount: e.target.value })} />
        </FormField>
      )}
      <FormField name="minOrder" label="Đơn tối thiểu (₫)" error={errors.minOrder}>
        <input inputMode="numeric" {...fieldProps('minOrder', errors.minOrder)} value={form.minOrder} onChange={(e) => update({ minOrder: e.target.value })} />
      </FormField>
      <FormField name="expiresOn" label="Hạn dùng" error={errors.expiresOn}>
        <input type="date" {...fieldProps('expiresOn', errors.expiresOn)} value={form.expiresOn} onChange={(e) => update({ expiresOn: e.target.value })} />
      </FormField>
      <label className={styles.check}>
        <input type="checkbox" checked={form.listed} onChange={(e) => update({ listed: e.target.checked })} /> Hiện ở trang Ưu đãi
      </label>
      {failure && <p role="alert" className={styles.error}>{failure}</p>}
      <div className={styles.actions}>
        <button type="button" className={styles.cancel} onClick={onDone}>Đóng</button>
        <button type="submit" className={styles.submit} disabled={create.isPending}>Lưu voucher</button>
      </div>
    </form>
  );
}
