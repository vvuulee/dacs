import { screen } from '@testing-library/react';
import { renderWithProviders } from './test/renderWithProviders';
import App from './App';

beforeEach(() => localStorage.clear());

it('route lạ hiện NotFoundPage với link về trang chủ', () => {
  renderWithProviders(<App />, { route: '/khong-co-trang-nay' });
  expect(screen.getByRole('heading', { name: 'Không tìm thấy trang' })).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /về trang chủ/i })).toHaveAttribute('href', '/');
});
it('có header và footer trên mọi trang', () => {
  renderWithProviders(<App />, { route: '/khong-co-trang-nay' });
  expect(screen.getByRole('banner')).toBeInTheDocument();
  expect(screen.getByRole('contentinfo')).toBeInTheDocument();
});
