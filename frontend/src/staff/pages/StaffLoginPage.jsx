import { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import FormField, { fieldProps } from '../../components/FormField';
import PasswordField from '../../components/PasswordField';
import { LOGIN_FAILED_TEXT } from '../../features/auth/messages';
import { safeReturnTo } from '../../features/auth/safeReturnTo';
import { validateLogin } from '../../features/auth/validate';
import { useStaffAuth } from '../../features/staff/StaffAuthContext';
import styles from './StaffLoginPage.module.css';

const UNAUTHORIZED = 401;
const STAFF_HOME = '/staff';

// Chỉ quay về trang trong khu nhân viên.
function staffReturnTo(value) {
  const target = safeReturnTo(value, STAFF_HOME);
  return target === STAFF_HOME || target.startsWith(`${STAFF_HOME}/`) || target.startsWith(`${STAFF_HOME}?`) ? target : STAFF_HOME;
}

export default function StaffLoginPage() {
  const { status, login } = useStaffAuth();
  const [params] = useSearchParams();
  const returnTo = staffReturnTo(params.get('returnTo'));
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [failure, setFailure] = useState('');
  const [pending, setPending] = useState(false);

  if (status === 'authenticated') return <Navigate to={returnTo} replace />;

  const update = (patch) => setForm((current) => ({ ...current, ...patch }));

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
      await login(form);
    } catch (error) {
      setFailure(error.status === UNAUTHORIZED ? LOGIN_FAILED_TEXT : error.message);
      setPending(false);
    }
  };

  return (
    <div className={styles.screen}>
      <section className={styles.card}>
        <h1 className={styles.title}>Đăng nhập nhân viên</h1>
        <form onSubmit={submit} noValidate>
          <FormField name="email" label="Email" error={errors.email}>
            <input type="email" autoComplete="username" {...fieldProps('email', errors.email)} value={form.email} onChange={(e) => update({ email: e.target.value })} />
          </FormField>
          <PasswordField name="password" label="Mật khẩu" autoComplete="current-password" value={form.password} error={errors.password} onChange={(password) => update({ password })} />
          {failure && <p role="alert" className={styles.error}>{failure}</p>}
          <button type="submit" className={styles.submit} disabled={pending}>Đăng nhập</button>
        </form>
      </section>
    </div>
  );
}
