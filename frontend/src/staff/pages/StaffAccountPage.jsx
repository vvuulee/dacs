import ChangePasswordForm from '../../components/ChangePasswordForm';
import { useStaffAuth } from '../../features/staff/StaffAuthContext';
import { useStaffChangePassword } from '../../hooks/staff';
import styles from './StaffAccountPage.module.css';

const ROLE_LABELS = { staff: 'Nhân viên' };

export default function StaffAccountPage() {
  const { staff, logout } = useStaffAuth();
  return (
    <div className={styles.page}>
      <h1 className={styles.heading}>Tài khoản</h1>
      <section aria-label="Hồ sơ nhân viên" className={styles.card}>
        <dl className={styles.profile}>
          <dt>Họ tên</dt><dd>{staff.name}</dd>
          <dt>Email</dt><dd>{staff.email}</dd>
          <dt>Vai trò</dt><dd>{ROLE_LABELS[staff.role] ?? staff.role}</dd>
        </dl>
        <button type="button" className={styles.logout} aria-label="Đăng xuất khỏi tài khoản" onClick={logout}>Đăng xuất</button>
      </section>
      <section aria-label="Đổi mật khẩu" className={styles.card}>
        <h2>Đổi mật khẩu</h2>
        <ChangePasswordForm useMutationHook={useStaffChangePassword} />
      </section>
    </div>
  );
}
