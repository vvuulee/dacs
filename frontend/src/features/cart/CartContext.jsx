import { createContext, useContext, useEffect, useMemo, useReducer } from 'react';
import { cartReducer } from './cartReducer';
import { CART_STORAGE_KEY } from '../../constants';
import { loadCart, saveCart } from './storage';

const CartContext = createContext(null);

export function CartProvider({ children, storageKey = CART_STORAGE_KEY }) {
  const [items, dispatch] = useReducer(cartReducer, storageKey, loadCart);

  useEffect(() => saveCart(items, storageKey), [items, storageKey]);

  const value = useMemo(
    () => ({
      items,
      add: (item) => dispatch({ type: 'ADD', item }),
      setQuantity: (key, quantity) => dispatch({ type: 'SET_QTY', key, quantity }),
      remove: (key) => dispatch({ type: 'REMOVE', key }),
      clear: () => dispatch({ type: 'CLEAR' }),
    }),
    [items],
  );
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart phải được dùng bên trong CartProvider');
  return context;
}
