import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PaymentMethodPicker from './PaymentMethodPicker';

it('có 3 phương thức và đánh dấu giá trị hiện tại', () => {
  render(<PaymentMethodPicker value="cash" onChange={() => {}} />);
  expect(screen.getAllByRole('radio')).toHaveLength(3);
  expect(screen.getByRole('radio', { name: 'Tiền mặt, thanh toán khi nhận hàng' })).toBeChecked();
});
it('chọn "Chuyển khoản QR" gọi onChange("bank_transfer")', async () => {
  const onChange = vi.fn();
  render(<PaymentMethodPicker value="cash" onChange={onChange} />);
  await userEvent.click(screen.getByRole('radio', { name: 'Chuyển khoản QR' }));
  expect(onChange).toHaveBeenCalledWith('bank_transfer');
});
it('radio đầu có id field-paymentMethod để focus khi lỗi; hiện thông điệp lỗi', () => {
  render(<PaymentMethodPicker value="" onChange={() => {}} error="Chọn phương thức thanh toán" />);
  expect(document.getElementById('field-paymentMethod')).toBe(screen.getAllByRole('radio')[0]);
  expect(screen.getByText('Chọn phương thức thanh toán')).toBeInTheDocument();
});
