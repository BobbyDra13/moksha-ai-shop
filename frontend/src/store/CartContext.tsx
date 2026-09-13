import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type { CartItem, Product } from "@/lib/types"
import { useAuth } from "@/auth/AuthContext"

// One cart per account, plus a guest cart. Logging out switches to the guest cart,
// so a shared browser never shows another person's items.
const cartKey = (userId: string | null) => `shop_cart:${userId ?? "guest"}`

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

function load(key: string): CartItem[] {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]")
  } catch {
    return []
  }
}

function merge(a: CartItem[], b: CartItem[]): CartItem[] {
  const out = [...a]
  for (const item of b) {
    const hit = out.find((i) => i.product.id === item.product.id)
    if (hit) hit.quantity = Math.min(hit.quantity + item.quantity, item.product.stock)
    else out.push(item)
  }
  return out
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  const [items, setItems] = useState<CartItem[]>(() => load(cartKey(null)))
  const activeKey = useRef(cartKey(null))

  // Switch carts when the signed-in user changes.
  // Guest -> user: carry the guest cart into the account (merge), then empty the guest cart.
  // User -> guest (logout): show the guest cart, leave the account cart stored for next login.
  useEffect(() => {
    if (loading) return
    const nextKey = cartKey(userId)
    if (nextKey === activeKey.current) return
    let next = load(nextKey)
    if (userId && activeKey.current === cartKey(null)) {
      next = merge(next, load(cartKey(null)))
      localStorage.removeItem(cartKey(null))
    }
    activeKey.current = nextKey
    setItems(next)
  }, [userId, loading])

  useEffect(() => {
    localStorage.setItem(activeKey.current, JSON.stringify(items))
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

  // stable identity so consumers can list it as an effect dependency
  const clear = useCallback(() => setItems([]), [])

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
