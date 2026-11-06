import { useState } from 'react';
import { useAuth } from '../features/auth/AuthContext';
import { validateProfile } from '../features/auth/validate';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import AddressFields from './AddressFields';
import FormField, { fieldProps } from './FormField';
import styles from './AccountForm.module.css';

const fromUser = (user) => ({
  name: user.name,
  phone: user.phone,
  provinceId: user.address?.provinceId ?? '',
  wardId: user.address?.wardId ?? '',
  street: user.address?.street ?? '',
});

export default function ProfileForm() {
  const { user } = useAuth();
  const update = useUpdateProfile();
  const [form, setForm] = useState(() => fromUser(user));
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);

  const change = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setSaved(false);
  };

  const submit = (event) => {
    event.preventDefault();
    if (update.isPending) return;
    const result = validateProfile(form);
    setErrors(result.errors);
    setSaved(false);
    if (!result.valid) {
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    update.mutate(form, { onSuccess: () => setSaved(true) });
  };

  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      <FormField name="name" label="Họ tên" error={errors.name}>
        <input type="text" autoComplete="name" {...fieldProps('name', errors.name)} value={form.name} onChange={(e) => change({ name: e.target.value })} />
      </FormField>
      <FormField name="email" label="Email">
        <input type="email" readOnly {...fieldProps('email')} value={user.email} />
      </FormField>
      <FormField name="phone" label="Số điện thoại" error={errors.phone}>
        <input type="tel" autoComplete="tel" {...fieldProps('phone', errors.phone)} value={form.phone} onChange={(e) => change({ phone: e.target.value })} />
      </FormField>
      <AddressFields value={form} errors={errors} onChange={change} />
      {update.isError && <p role="alert" className={styles.error}>{update.error.message}</p>}
      {saved && <p role="status" className={styles.status}>Đã lưu</p>}
      <button type="submit" className={styles.submit} disabled={update.isPending}>Lưu thay đổi</button>
    </form>
  );
}
