import { useState } from 'react';
import ConfirmDialog from '../../components/ConfirmDialog';
import ErrorState from '../../components/ErrorState';
import Skeleton from '../../components/Skeleton';
import { useDeleteVoucher, useStaffVouchers } from '../../hooks/staff';
import { formatVnd } from '../../lib/money';
import VoucherForm from '../components/VoucherForm';
import styles from './VouchersPage.module.css';

function describeValue(v) {
  if (v.type === 'freeship') return 'Miễn phí giao';
  if (v.type === 'fixed') return formatVnd(v.value);
  return v.maxDiscount ? `${v.value}% tối đa ${formatVnd(v.maxDiscount)}` : `${v.value}%`;
}

export default function VouchersPage() {
  const vouchers = useStaffVouchers();
  const remove = useDeleteVoucher();
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState(null);
  const [failure, setFailure] = useState('');

  const confirmDelete = () => {
    const target = deleting;
    setDeleting(null);
    setFailure('');
    remove.mutate(target.id, { onError: (error) => setFailure(`Không xoá được ${target.code}: ${error.message}`) });
  };

  return (
    <div className={styles.page}>
      <div className={styles.head}>
        <h1 className={styles.heading}>Voucher</h1>
        {!creating && <button type="button" className={styles.create} onClick={() => setCreating(true)}>Tạo voucher</button>}
      </div>
      {creating && <VoucherForm onDone={() => setCreating(false)} />}
      {failure && <p role="alert" className={styles.error}>{failure}</p>}
      {vouchers.isPending && <Skeleton height="240px" />}
      {vouchers.isError && <ErrorState message={vouchers.error.message} onRetry={vouchers.refetch} />}
      {vouchers.isSuccess && (vouchers.data.length === 0 ? <p className={styles.empty}>Chưa có voucher nào</p> : (
        <table className={styles.table}>
          <thead>
            <tr><th>Mã</th><th>Tiêu đề</th><th>Loại / giá trị</th><th>Đơn tối thiểu</th><th>Hạn dùng</th><th>Ưu đãi</th><th>Trạng thái</th><th><span className="visually-hidden">Thao tác</span></th></tr>
          </thead>
          <tbody>
            {vouchers.data.map((v) => {
              const expired = Date.parse(v.expiresAt) <= Date.now();
              return (
                <tr key={v.id}>
                  <td className={styles.code}>{v.code}</td>
                  <td>{v.title}</td>
                  <td>{describeValue(v)}</td>
                  <td>{v.minOrder > 0 ? formatVnd(v.minOrder) : '—'}</td>
                  <td>{new Date(v.expiresAt).toLocaleDateString('vi-VN')}</td>
                  <td>{v.listed ? 'Có' : 'Không'}</td>
                  <td><span className={expired ? styles.expired : styles.active}>{expired ? 'Hết hạn' : 'Còn hạn'}</span></td>
                  <td>
                    <button type="button" className={styles.delete} aria-label={`Xoá ${v.code}`} disabled={remove.isPending} onClick={() => setDeleting(v)}>Xoá</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      ))}
      <ConfirmDialog
        open={deleting !== null}
        title={`Xoá mã ${deleting?.code ?? ''}?`}
        message="Khách sẽ không dùng được mã này nữa. Đơn đã đặt không bị ảnh hưởng."
        confirmLabel="Xoá"
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
