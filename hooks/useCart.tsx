// hooks/useCart.tsx
// Context global do carrinho de compras para o Modo Venda
// Usado pelo SaleModeModal, CartPanel, ProductGrid e voice assistant

'use client';

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';
import type { ProdutoVenda, ItemCarrinho } from '@/lib/produtos-venda';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface CartState {
  itens: ItemCarrinho[];
  desconto: number;
  observacoes: string;
}

type CartAction =
  | { type: 'ADD_ITEM'; produto: ProdutoVenda; quantidade?: number }
  | { type: 'REMOVE_ITEM'; produtoId: string }
  | { type: 'UPDATE_QTY'; produtoId: string; quantidade: number }
  | { type: 'SET_DESCONTO'; desconto: number }
  | { type: 'SET_OBSERVACOES'; observacoes: string }
  | { type: 'CLEAR' };

interface CartContextValue {
  itens: ItemCarrinho[];
  desconto: number;
  observacoes: string;
  subtotal: number;
  total: number;
  totalItens: number;
  addItem: (produto: ProdutoVenda, quantidade?: number) => void;
  removeItem: (produtoId: string) => void;
  updateQty: (produtoId: string, quantidade: number) => void;
  setDesconto: (desconto: number) => void;
  setObservacoes: (obs: string) => void;
  clear: () => void;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

function cartReducer(state: CartState, action: CartAction): CartState {
  switch (action.type) {

    case 'ADD_ITEM': {
      const qty = action.quantidade ?? 1;
      const existing = state.itens.find((i) => i.produto.id === action.produto.id);

      if (existing) {
        return {
          ...state,
          itens: state.itens.map((i) =>
            i.produto.id === action.produto.id
              ? {
                  ...i,
                  quantidade: i.quantidade + qty,
                  subtotal: (i.quantidade + qty) * i.produto.preco_venda,
                }
              : i,
          ),
        };
      }

      return {
        ...state,
        itens: [
          ...state.itens,
          {
            produto: action.produto,
            quantidade: qty,
            subtotal: qty * action.produto.preco_venda,
          },
        ],
      };
    }

    case 'REMOVE_ITEM':
      return {
        ...state,
        itens: state.itens.filter((i) => i.produto.id !== action.produtoId),
      };

    case 'UPDATE_QTY': {
      if (action.quantidade <= 0) {
        return {
          ...state,
          itens: state.itens.filter((i) => i.produto.id !== action.produtoId),
        };
      }
      return {
        ...state,
        itens: state.itens.map((i) =>
          i.produto.id === action.produtoId
            ? {
                ...i,
                quantidade: action.quantidade,
                subtotal: action.quantidade * i.produto.preco_venda,
              }
            : i,
        ),
      };
    }

    case 'SET_DESCONTO':
      return { ...state, desconto: Math.max(0, action.desconto) };

    case 'SET_OBSERVACOES':
      return { ...state, observacoes: action.observacoes };

    case 'CLEAR':
      return { itens: [], desconto: 0, observacoes: '' };

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cartReducer, {
    itens: [],
    desconto: 0,
    observacoes: '',
  });

  const subtotal = useMemo(
    () => state.itens.reduce((acc, i) => acc + i.subtotal, 0),
    [state.itens],
  );

  const total = useMemo(
    () => Math.max(0, subtotal - state.desconto),
    [subtotal, state.desconto],
  );

  const totalItens = useMemo(
    () => state.itens.reduce((acc, i) => acc + i.quantidade, 0),
    [state.itens],
  );

  const addItem = useCallback((produto: ProdutoVenda, quantidade = 1) => {
    dispatch({ type: 'ADD_ITEM', produto, quantidade });
  }, []);

  const removeItem = useCallback((produtoId: string) => {
    dispatch({ type: 'REMOVE_ITEM', produtoId });
  }, []);

  const updateQty = useCallback((produtoId: string, quantidade: number) => {
    dispatch({ type: 'UPDATE_QTY', produtoId, quantidade });
  }, []);

  const setDesconto = useCallback((desconto: number) => {
    dispatch({ type: 'SET_DESCONTO', desconto });
  }, []);

  const setObservacoes = useCallback((observacoes: string) => {
    dispatch({ type: 'SET_OBSERVACOES', observacoes });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'CLEAR' });
  }, []);

  const value: CartContextValue = {
    itens: state.itens,
    desconto: state.desconto,
    observacoes: state.observacoes,
    subtotal,
    total,
    totalItens,
    addItem,
    removeItem,
    updateQty,
    setDesconto,
    setObservacoes,
    clear,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart deve ser usado dentro de <CartProvider>');
  return ctx;
}
