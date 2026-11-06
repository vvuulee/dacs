import { render, screen } from '@testing-library/react';
import QrPlaceholder from './QrPlaceholder';

const markup = (content) => render(<QrPlaceholder content={content} />).container.querySelector('svg').innerHTML;

it('cùng content cho cùng SVG, khác content cho SVG khác', () => {
  expect(markup('COFFEE-CF1-129000')).toBe(markup('COFFEE-CF1-129000'));
  expect(markup('COFFEE-CF1-129000')).not.toBe(markup('COFFEE-CF2-129000'));
});
it('có role img tên "Mã QR mẫu" và chú thích không quét được', () => {
  render(<QrPlaceholder content="x" />);
  expect(screen.getByRole('img', { name: 'Mã QR mẫu' })).toBeInTheDocument();
  expect(screen.getByText('Mã QR mẫu, không quét được')).toBeInTheDocument();
});
