import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import FormField, { fieldProps } from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../features/auth/AuthContext';
import { EMAIL_TAKEN_TEXT } from '../features/auth/messages';
import { safeReturnTo } from '../features/auth/safeReturnTo';
import { validateRegister } from '../features/auth/validate';
import styles from './AuthPage.module.css';

const CONFLICT = 409;
const HOME = '/';

export default function RegisterPage() {
  const { status, register } = useAuth();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));
  const loginSearch = returnTo === HOME ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const result = validateRegister(form);
    setErrors(result.errors);
    setFailure('');
    if (!result.valid) {
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    setPending(true);
    try {
      await register({ name: form.name.trim(), email: form.email, password: form.password });
    } catch (error) {
      if (error.status === CONFLICT) setErrors({ email: EMAIL_TAKEN_TEXT });
      else setFailure(error.message);
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <h1>Đăng ký</h1>
      <form onSubmit={submit} noValidate>
        <FormField name="name" label="Họ tên" error={errors.name}>
          <input type="text" autoComplete="name" {...fieldProps('name', errors.name)} value={form.name} onChange={(e) => update({ name: e.target.value })} />
        </FormField>
        <FormField name="email" label="Email" error={errors.email}>
          <input type="email" autoComplete="email" {...fieldProps('email', errors.email)} value={form.email} onChange={(e) => update({ email: e.target.value })} />
        </FormField>
        <PasswordField name="password" label="Mật khẩu" autoComplete="new-password" value={form.password} error={errors.password} onChange={(password) => update({ password })} />
        <PasswordField name="confirm" label="Nhập lại mật khẩu" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={(confirm) => update({ confirm })} />
        {failure && <p role="alert" className={styles.error}>{failure}</p>}
        <button type="submit" className={styles.submit} disabled={pending}>Tạo tài khoản</button>
      </form>
      <div className={styles.links}>
        <Link to={`/login${loginSearch}`}>Đã có tài khoản? Đăng nhập</Link>
      </div>
    </section>
  );
}
