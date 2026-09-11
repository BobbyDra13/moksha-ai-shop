import { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { Minus, Plus, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { api, formatPrice } from "@/lib/api"
import type { Order } from "@/lib/types"
import { useAuth } from "@/auth/AuthContext"
import { useCart } from "@/store/CartContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export function CartPage() {
  const { items, setQuantity, remove, total, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [busy, setBusy] = useState(false)

  /** Create order -> ask backend for Stripe URL -> redirect. */
  async function checkout() {
    if (!user) {
      navigate("/login", { state: { from: { pathname: "/cart" } } })
      return
    }
    setBusy(true)
    try {
      const order = await api.post<Order>("/orders", {
        items: items.map((i) => ({ product_id: i.product.id, quantity: i.quantity })),
      })
      const { checkout_url } = await api.post<{ checkout_url: string }>(
        `/payments/checkout/${order.id}`,
      )
      clear()
      window.location.href = checkout_url
    } catch (e) {
      toast.error((e as Error).message)
      setBusy(false)
    }
  }

  if (items.length === 0) {
    return (
      <div className="py-20 text-center">
        <h1 className="text-xl font-semibold">Your cart is empty</h1>
        <Button className="mt-4" render={<Link to="/" />}>
          Browse products
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
      <div className="space-y-3">
        <h1 className="text-2xl font-bold">Cart</h1>
        {items.map(({ product, quantity }) => (
          <Card key={product.id}>
            <CardContent className="flex items-center gap-4">
              <img
                src={product.image}
                alt={product.name}
                className="size-16 shrink-0 rounded-md object-cover"
              />
              <div className="min-w-0 flex-1">
                <Link to={`/products/${product.id}`} className="font-medium hover:underline">
                  {product.name}
                </Link>
                <p className="text-sm text-muted-foreground">{formatPrice(product.price)}</p>
              </div>
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(product.id, quantity - 1)}
                  aria-label="Decrease"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center text-sm">{quantity}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQuantity(product.id, quantity + 1)}
                  disabled={quantity >= product.stock}
                  aria-label="Increase"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => remove(product.id)}
                aria-label="Remove"
              >
                <Trash2 className="size-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="h-fit">
        <CardContent className="space-y-4">
          <h2 className="font-semibold">Summary</h2>
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Separator />
          <div className="flex justify-between font-semibold">
            <span>Total</span>
            <span>{formatPrice(total)}</span>
          </div>
          <Button className="w-full" onClick={checkout} disabled={busy}>
            {busy ? "Redirecting..." : user ? "Checkout with Stripe" : "Sign in to checkout"}
          </Button>
          <p className="text-xs text-muted-foreground">
            Test card: 4242 4242 4242 4242, any future date, any CVC.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
