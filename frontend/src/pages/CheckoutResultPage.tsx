import { useEffect, useState } from "react"
import { Link, useSearchParams } from "react-router-dom"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"
import { api, formatPrice } from "@/lib/api"
import type { Order } from "@/lib/types"
import { Button } from "@/components/ui/button"

/**
 * Stripe redirects here after payment.
 * success -> POST /payments/verify (backend re-checks with Stripe)
 * cancel  -> POST /payments/cancel
 */
export function CheckoutResultPage({ outcome }: { outcome: "success" | "cancel" }) {
  const [params] = useSearchParams()
  const orderId = params.get("order_id")
  const [order, setOrder] = useState<Order | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!orderId) return
    api
      .post<Order>(`/payments/${outcome === "success" ? "verify" : "cancel"}/${orderId}`)
      .then(setOrder)
      .catch((e) => setError(e.message))
  }, [orderId, outcome])

  if (error) return <p className="text-destructive">{error}</p>
  if (!order)
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="size-8 animate-spin" />
      </div>
    )

  const paid = order.status === "paid"

  return (
    <div className="mx-auto max-w-md space-y-4 py-16 text-center">
      {paid ? (
        <CheckCircle2 className="mx-auto size-16 text-green-600" />
      ) : (
        <XCircle className="mx-auto size-16 text-destructive" />
      )}
      <h1 className="text-2xl font-bold">
        {paid ? "Payment successful" : order.status === "cancelled" ? "Payment cancelled" : "Payment pending"}
      </h1>
      <p className="text-muted-foreground">
        Order <span className="font-mono">{order.id}</span> · {formatPrice(order.total)} ·{" "}
        <span className="capitalize">{order.status}</span>
      </p>
      <div className="flex justify-center gap-2">
        <Button render={<Link to="/orders" />}>View orders</Button>
        <Button variant="outline" render={<Link to="/" />}>
          Continue shopping
        </Button>
      </div>
    </div>
  )
}
