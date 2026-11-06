import { useState } from 'react';
import { Link } from 'react-router-dom';
import FormField, { fieldProps } from '../components/FormField';
import { env } from '../config/env';
import { FORGOT_SENT_TEXT } from '../features/auth/messages';
import { validateForgot } from '../features/auth/validate';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { peekResetToken } from '../services/authService';
import styles from './AuthPage.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(false);
  const [mailboxToken, setMailboxToken] = useState(null);
  const forgot = useForgotPassword();

  const readMockMailbox = async () => {
    if (env.apiMode !== 'mock') return;
    try {
      setMailboxToken(await peekResetToken(email));
    } catch (error) {
      console.warn(`Không đọc được hộp thư giả lập: ${error.name}`);
    }
  };

  const submit = (event) => {
    event.preventDefault();
    if (forgot.isPending) return;
    const result = validateForgot({ email });
    setErrors(result.errors);
    setSent(false);
    setMailboxToken(null);
    if (!result.valid) {
      document.getElementById('field-email')?.focus();
      return;
    }
    forgot.mutate(email, { onSuccess: () => { setSent(true); readMockMailbox(); } });
  };

  return (
    <section className={styles.page}>
      <h1>Quên mật khẩu</h1>
      <form onSubmit={submit} noValidate>
        <FormField name="email" label="Email" error={errors.email}>
          <input type="email" autoComplete="email" {...fieldProps('email', errors.email)} value={email} onChange={(e) => setEmail(e.target.value)} />
        </FormField>
        {forgot.isError && <p role="alert" className={styles.error}>{forgot.error.message}</p>}
        {sent && <p role="status" className={styles.notice}>{FORGOT_SENT_TEXT}</p>}
        <button type="submit" className={styles.submit} disabled={forgot.isPending}>Gửi hướng dẫn</button>
      </form>
      {mailboxToken && (
        <aside aria-label="Hộp thư giả lập" className={styles.notice}>
          <p>Hộp thư giả lập (chỉ có ở chế độ mock):</p>
          <Link to={`/reset-password?token=${mailboxToken}`}>Đặt lại mật khẩu</Link>
        </aside>
      )}
      <div className={styles.links}>
        <Link to="/login">Quay lại đăng nhập</Link>
      </div>
    </section>
  );
}
