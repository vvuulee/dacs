import { render, screen } from '@testing-library/react';
import OrderProgress from './OrderProgress';

it('preparing: "Đang pha chế" là bước hiện tại, "Chờ xác nhận" đã xong', () => {
  render(<OrderProgress status="preparing" />);
  expect(screen.getByText('Đang pha chế').closest('li')).toHaveAttribute('aria-current', 'step');
  expect(screen.getByText('Chờ xác nhận').closest('li')).not.toHaveAttribute('aria-current');
  expect(screen.getAllByRole('listitem')).toHaveLength(4);
});
it('delivered: bước cuối là hiện tại', () => {
  render(<OrderProgress status="delivered" />);
  expect(screen.getByText('Đã giao').closest('li')).toHaveAttribute('aria-current', 'step');
});
it('cancelled: hiện alert "Đã hủy" và không có danh sách bước', () => {
  render(<OrderProgress status="cancelled" />);
  expect(screen.getByRole('alert')).toHaveTextContent('Đã hủy');
  expect(screen.queryByRole('listitem')).toBeNull();
});
it('awaiting_payment: hiện "Chờ thanh toán", không bước nào aria-current', () => {
  const { container } = render(<OrderProgress status="awaiting_payment" />);
  expect(screen.getByText('Chờ thanh toán')).toBeInTheDocument();
  expect(container.querySelector('[aria-current]')).toBeNull();
});
