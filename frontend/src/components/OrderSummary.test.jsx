import { render, screen } from '@testing-library/react';
import OrderSummary from './OrderSummary';

const lines = [{ key: 'k1', name: 'Trà đào', summary: 'Vừa', note: 'ít đá', quantity: 2, lineTotal: 60000 }];

it('chỉ có tạm tính khi chưa có phí giao và tổng', () => {
  render(<OrderSummary lines={lines} subtotal={60000} />);
  expect(screen.getByText('Tạm tính').parentElement).toHaveTextContent(/60\.000/);
  expect(screen.queryByText('Phí giao hàng')).toBeNull();
  expect(screen.queryByText('Tổng cộng')).toBeNull();
});
it('hiện món, số lượng, ghi chú và thành tiền từng dòng', () => {
  render(<OrderSummary lines={lines} subtotal={60000} />);
  expect(screen.getByText('Trà đào')).toBeInTheDocument();
  expect(screen.getByText(/× 2/)).toBeInTheDocument();
  expect(screen.getByText(/ít đá/)).toBeInTheDocument();
});
it('có phí giao và tổng thì hiện đủ ba dòng đúng định dạng VND', () => {
  render(<OrderSummary lines={lines} subtotal={60000} deliveryFee={15000} total={75000} />);
  expect(screen.getByText('Phí giao hàng').parentElement).toHaveTextContent(/15\.000/);
  expect(screen.getByText('Tổng cộng').parentElement).toHaveTextContent(/75\.000/);
});

describe('giảm giá', () => {
  const termsOf = (container) => [...container.querySelectorAll('dt')].map((dt) => dt.textContent);
  it('discount > 0: dòng Giảm giá có dấu trừ và đúng thứ tự', () => {
    const { container } = render(<OrderSummary lines={lines} subtotal={102000} deliveryFee={15000} discount={10200} total={106800} />);
    expect(termsOf(container)).toEqual(['Tạm tính', 'Phí giao hàng', 'Giảm giá', 'Tổng cộng']);
    const row = screen.getByText('Giảm giá').parentElement;
    expect(row).toHaveTextContent(/−/);
    expect(row).toHaveTextContent(/10\.200/);
  });
  it('trang Thanh toán: có tạm tính và giảm giá nhưng chưa có phí giao/tổng', () => {
    const { container } = render(<OrderSummary lines={lines} subtotal={102000} discount={10200} />);
    expect(termsOf(container)).toEqual(['Tạm tính', 'Giảm giá']);
  });
  it.each([[0], [undefined]])('discount %s không hiện dòng Giảm giá', (discount) => {
    render(<OrderSummary lines={lines} subtotal={60000} discount={discount} />);
    expect(screen.queryByText('Giảm giá')).toBeNull();
  });
});
