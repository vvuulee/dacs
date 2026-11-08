import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ConfirmDialog from './ConfirmDialog';

const setup = (open = true) => {
  const onConfirm = vi.fn();
  const onCancel = vi.fn();
  render(<ConfirmDialog open={open} title="Xoá mã CHAO10?" message="Khách sẽ không dùng được mã này nữa." confirmLabel="Xoá" onConfirm={onConfirm} onCancel={onCancel} />);
  return { onConfirm, onCancel };
};

it('đóng thì không render gì', () => {
  setup(false);
  expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
});
it('mở ra: có tiêu đề, nội dung, focus ở nút Không', () => {
  setup();
  expect(screen.getByRole('alertdialog', { name: 'Xoá mã CHAO10?' })).toHaveTextContent('Khách sẽ không dùng được mã này nữa.');
  expect(screen.getByRole('button', { name: 'Không' })).toHaveFocus();
});
it('Esc và nút Không gọi onCancel; nút xác nhận gọi onConfirm', async () => {
  const { onConfirm, onCancel } = setup();
  await userEvent.keyboard('{Escape}');
  await userEvent.click(screen.getByRole('button', { name: 'Không' }));
  expect(onCancel).toHaveBeenCalledTimes(2);
  await userEvent.click(screen.getByRole('button', { name: 'Xoá' }));
  expect(onConfirm).toHaveBeenCalledTimes(1);
});
