import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import FormField, { fieldProps } from '../components/FormField';
import PasswordField from '../components/PasswordField';
import { useAuth } from '../features/auth/AuthContext';
import { LOGIN_FAILED_TEXT, SESSION_EXPIRED_TEXT } from '../features/auth/messages';
import { safeReturnTo } from '../features/auth/safeReturnTo';
import { validateLogin } from '../features/auth/validate';
import styles from './AuthPage.module.css';

const UNAUTHORIZED = 401;
const HOME = '/';

export default function LoginPage() {
  const { status, login, sessionExpired } = useAuth();
  const [params] = useSearchParams();
  const returnTo = safeReturnTo(params.get('returnTo'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));
  const registerSearch = returnTo === HOME ? '' : `?returnTo=${encodeURIComponent(returnTo)}`;

  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    const result = validateLogin(form);
    setErrors(result.errors);
    setFailure('');
    if (!result.valid) {
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    setPending(true);
    try {
      await login(form); // thành công: status đổi sang authenticated và <Navigate> ở trên chuyển trang
    } catch (error) {
      setFailure(error.status === UNAUTHORIZED ? LOGIN_FAILED_TEXT : error.message);
      setPending(false);
    }
  };

  return (
    <section className={styles.page}>
      <h1>Đăng nhập</h1>
      {sessionExpired && <p role="status" className={styles.notice}>{SESSION_EXPIRED_TEXT}</p>}
      <form onSubmit={submit} noValidate>
        <FormField name="email" label="Email" error={errors.email}>
          <input type="email" autoComplete="email" {...fieldProps('email', errors.email)} value={form.email} onChange={(e) => update({ email: e.target.value })} />
        </FormField>
        <PasswordField name="password" label="Mật khẩu" autoComplete="current-password" value={form.password} error={errors.password} onChange={(password) => update({ password })} />
        {failure && <p role="alert" className={styles.error}>{failure}</p>}
        <button type="submit" className={styles.submit} disabled={pending}>Đăng nhập</button>
      </form>
      <div className={styles.links}>
        <Link to={`/register${registerSearch}`}>Đăng ký tài khoản</Link>
        <Link to="/forgot-password">Quên mật khẩu?</Link>
      </div>
    </section>
  );
}
