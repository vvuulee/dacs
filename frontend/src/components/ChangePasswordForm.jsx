import { useState } from 'react';
import { validateChangePassword } from '../features/auth/validate';
import { useChangePassword } from '../hooks/useChangePassword';
import PasswordField from './PasswordField';
import styles from './AccountForm.module.css';

const EMPTY = { current: '', next: '', confirm: '' };
const UNPROCESSABLE = 422;

export default function ChangePasswordForm({ useMutationHook = useChangePassword }) {
  const change = useMutationHook();
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [done, setDone] = useState(false);

  const update = (patch) => {
    setForm((current) => ({ ...current, ...patch }));
    setDone(false);
  };

  const submit = (event) => {
    event.preventDefault();
    if (change.isPending) return;
    const result = validateChangePassword(form);
    setErrors(result.errors);
    setDone(false);
    if (!result.valid) {
      document.getElementById(`field-${Object.keys(result.errors)[0]}`)?.focus();
      return;
    }
    change.mutate(
      { currentPassword: form.current, newPassword: form.next },
      {
        onSuccess: () => { setForm(EMPTY); setDone(true); },
        // 422: backend từ chối mật khẩu hiện tại (hoặc mật khẩu mới); hiện ngay dưới ô hiện tại.
        onError: (error) => { if (error.status === UNPROCESSABLE) setErrors({ current: error.message }); },
      },
    );
  };

  const showAlert = change.isError && change.error.status !== UNPROCESSABLE;
  return (
    <form onSubmit={submit} noValidate className={styles.form}>
      <PasswordField name="current" label="Mật khẩu hiện tại" autoComplete="current-password" value={form.current} error={errors.current} onChange={(current) => update({ current })} />
      <PasswordField name="next" label="Mật khẩu mới" autoComplete="new-password" value={form.next} error={errors.next} onChange={(next) => update({ next })} />
      <PasswordField name="confirm" label="Nhập lại mật khẩu mới" autoComplete="new-password" value={form.confirm} error={errors.confirm} onChange={(confirm) => update({ confirm })} />
      {showAlert && <p role="alert" className={styles.error}>{change.error.message}</p>}
      {done && <p role="status" className={styles.status}>Đã đổi mật khẩu</p>}
      <button type="submit" className={styles.submit} disabled={change.isPending}>Đổi mật khẩu</button>
    </form>
  );
}
