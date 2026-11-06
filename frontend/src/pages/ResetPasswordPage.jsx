import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import PasswordField from '../components/PasswordField';
import { RESET_LINK_INVALID_TEXT } from '../features/auth/messages';
import { validateReset } from '../features/auth/validate';
import { useResetPassword } from '../hooks/useResetPassword';
import styles from './AuthPage.module.css';

const BAD_REQUEST = 400;

export default function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const reset = useResetPassword();

  if (!token || reset.error?.status === BAD_REQUEST) {
    return (
      <section className={styles.page}>
        <h1>Đặt lại mật khẩu</h1>
        <p role="alert" className={styles.error}>{RESET_LINK_INVALID_TEXT}</p>
        <Link to="/forgot-password">Yêu cầu liên kết mới</Link>
      </section>
    );
  }
  if (reset.isSuccess) {
    return (
      <section className={styles.page}>
        <h1>Đặt lại mật khẩu</h1>
        <p role="status" className={styles.notice}>Đã đặt lại mật khẩu</p>
        <Link to="/login">Đăng nhập</Link>
      </section>
    );
  }

  const submit = (event) => {
    event.preventDefault();
    if (reset.isPending) return;
    const result = validateReset(form);
    setErrors(result.errors);
    if (!result.valid) {
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    reset.mutate({ token, newPassword: form.password });
  };

  return (
    <section className={styles.page}>
      <h1>Đặt lại mật khẩu</h1>
      <form onSubmit={submit} noValidate>
        <PasswordField name="password" label="Mật khẩu mới" autoComplete="new-password" value={form.password} error={errors.password} onChange={(password) => setForm((f) => ({ ...f, password }))} />
        <PasswordField name="confirm" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={(confirm) => setForm((f) => ({ ...f, confirm }))} />
        {reset.isError && <p role="alert" className={styles.error}>{reset.error.message}</p>}
        <button type="submit" className={styles.submit} disabled={reset.isPending}>Đặt lại mật khẩu</button>
      </form>
    </section>
  );
}
