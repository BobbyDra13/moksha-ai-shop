import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import type { CartItem, Product } from "@/lib/types"

const CART_KEY = "shop_cart"

interface CartState {
  items: CartItem[]
  add: (product: Product, qty?: number) => void
  setQuantity: (productId: string, qty: number) => void
  remove: (productId: string) => void
  clear: () => void
  count: number
  total: number
}

const CartContext = createContext<CartState | null>(null)

function load(): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(CART_KEY) ?? "[]")
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>(load)

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items))
  }, [items])

  function add(product: Product, qty = 1) {
    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (!existing) return [...prev, { product, quantity: Math.min(qty, product.stock) }]
      // Never exceed stock
      const next = Math.min(existing.quantity + qty, product.stock)
      return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: next } : i))
    })
  }

  function setQuantity(productId: string, qty: number) {
    setItems((prev) =>
      prev
        .map((i) =>
          i.product.id === productId
            ? { ...i, quantity: Math.max(0, Math.min(qty, i.product.stock)) }
            : i,
        )
        .filter((i) => i.quantity > 0),
    )
  }

  function remove(productId: string) {
    setItems((prev) => prev.filter((i) => i.product.id !== productId))
  }

  function clear() {
    setItems([])
  }

  const count = items.reduce((n, i) => n + i.quantity, 0)
  const total = items.reduce((n, i) => n + i.product.price * i.quantity, 0)

  return (
    <CartContext.Provider value={{ items, add, setQuantity, remove, clear, count, total }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error("useCart must be inside CartProvider")
  return ctx
}
