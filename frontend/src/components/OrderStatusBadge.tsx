import type { OrderStatus } from "@/lib/types"
import { Badge } from "@/components/ui/badge"

const STYLES: Record<OrderStatus, string> = {
  paid: "bg-green-100 text-green-800",
  pending: "bg-yellow-100 text-yellow-800",
  failed: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <Badge variant="outline" className={`capitalize ${STYLES[status]}`}>
      {status}
    </Badge>
  )
}
