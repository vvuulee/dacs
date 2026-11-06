import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PhoneGate from './PhoneGate';

it('SĐT sai hiện lỗi và không gọi onSubmit', async () => {
  const onSubmit = vi.fn();
  render(<PhoneGate onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText('Số điện thoại'), '123');
  await userEvent.click(screen.getByRole('button', { name: 'Xem đơn' }));
  expect(screen.getByText(/Số điện thoại không hợp lệ/)).toBeInTheDocument();
  expect(onSubmit).not.toHaveBeenCalled();
});
it('SĐT "+84 901 234 567" gọi onSubmit với số đã chuẩn hóa', async () => {
  const onSubmit = vi.fn();
  render(<PhoneGate onSubmit={onSubmit} />);
  await userEvent.type(screen.getByLabelText('Số điện thoại'), '+84 901 234 567');
  await userEvent.click(screen.getByRole('button', { name: 'Xem đơn' }));
  expect(onSubmit).toHaveBeenCalledWith('0901234567');
});
