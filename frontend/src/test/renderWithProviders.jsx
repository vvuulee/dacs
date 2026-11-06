import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { createQueryClient } from '../api/queryClient';
import { AuthProvider } from '../features/auth/AuthContext';
import { CartProvider } from '../features/cart/CartContext';

export function LocationDisplay() {
  const { pathname, search } = useLocation();
  return <div data-testid="location">{pathname + search}</div>;
}

export function renderWithProviders(ui, { route = '/' } = {}) {
  return render(
    <QueryClientProvider client={createQueryClient()}>
      <AuthProvider>
        <CartProvider>
          <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>,
  );
}
