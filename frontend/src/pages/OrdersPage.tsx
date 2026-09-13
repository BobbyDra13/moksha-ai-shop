import { useEffect, useState } from "react"
import { api, formatPrice } from "@/lib/api"
import { payOrder } from "@/lib/checkout"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import type { Order } from "@/lib/types"
import { OrderStatusBadge } from "@/components/OrderStatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export function OrdersPage() {
  const [orders, setOrders] = useState<Order[] | null>(null)

  useEffect(() => {
    api.get<Order[]>("/orders/me").then(setOrders)
  }, [])

  async function pay(id: string) {
    try {
      await payOrder(id)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function cancel(id: string) {
    try {
      const updated = await api.post<Order>(`/payments/cancel/${id}`)
      setOrders((prev) => prev?.map((o) => (o.id === id ? updated : o)) ?? null)
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  if (!orders) return <Skeleton className="h-40 rounded-xl" />

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My orders</h1>
      {orders.length === 0 && <p className="text-muted-foreground">No orders yet.</p>}
      {orders.map((o) => (
        <Card key={o.id}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              <span className="font-mono text-muted-foreground">{o.id}</span>
              <span className="ml-3 text-xs text-muted-foreground">
                {new Date(o.created_at).toLocaleString()}
              </span>
            </CardTitle>
            <OrderStatusBadge status={o.status} />
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            {o.items.map((i) => (
              <div key={i.product_id} className="flex justify-between">
                <span>
                  {i.name} × {i.quantity}
                </span>
                <span>{formatPrice(i.price * i.quantity)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total</span>
              <span>{formatPrice(o.total)}</span>
            </div>
            {o.status === "failed" && o.failure_reason && (
              <p className="text-xs text-destructive">{o.failure_reason}</p>
            )}
            {/* Unpaid orders can be resumed or dropped; stock is re-checked on resume */}
            {o.status !== "paid" && (
              <div className="flex gap-2 pt-2">
                <Button size="sm" onClick={() => pay(o.id)}>
                  {o.status === "pending" ? "Complete payment" : "Pay again"}
                </Button>
                {o.status === "pending" && (
                  <Button size="sm" variant="outline" onClick={() => cancel(o.id)}>
                    Cancel order
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
