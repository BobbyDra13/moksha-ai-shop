import { useEffect, useState } from "react"
import { toast } from "sonner"
import { api, formatPrice } from "@/lib/api"
import type { Order, OrderStatus, Product } from "@/lib/types"
import { ProductForm } from "@/components/ProductForm"
import { OrderStatusBadge } from "@/components/OrderStatusBadge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

const STATUSES: OrderStatus[] = ["pending", "paid", "failed", "cancelled"]

export function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [editing, setEditing] = useState<Product | null | "new">(null)

  async function loadAll() {
    const [p, o] = await Promise.all([
      api.get<Product[]>("/products"),
      api.get<Order[]>("/orders"),
    ])
    setProducts(p)
    setOrders(o)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function deleteProduct(id: string) {
    try {
      await api.delete(`/products/${id}`)
      toast.success("Deleted")
      loadAll()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  async function changeStatus(id: string, status: OrderStatus) {
    try {
      await api.patch(`/orders/${id}/status`, { status })
      toast.success("Status updated")
      loadAll()
    } catch (e) {
      toast.error((e as Error).message)
    }
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Admin</h1>

      {/* ---- Products ---- */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Products</CardTitle>
          <Button size="sm" onClick={() => setEditing("new")}>
            Add product
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead className="text-right">Price</TableHead>
                <TableHead className="text-right">Stock</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell className="capitalize">{p.category}</TableCell>
                  <TableCell className="text-right">{formatPrice(p.price)}</TableCell>
                  <TableCell className="text-right">{p.stock}</TableCell>
                  <TableCell className="space-x-1 text-right whitespace-nowrap">
                    <Button variant="outline" size="sm" onClick={() => setEditing(p)}>
                      Edit
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => deleteProduct(p.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ---- Orders ---- */}
      <Card>
        <CardHeader>
          <CardTitle>All orders</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Order</TableHead>
                <TableHead>Items</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Change</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-mono text-xs">{o.id}</TableCell>
                  <TableCell className="text-sm">
                    {o.items.map((i) => `${i.name} ×${i.quantity}`).join(", ")}
                  </TableCell>
                  <TableCell className="text-right">{formatPrice(o.total)}</TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell>
                    <select
                      className="rounded-md border bg-background px-2 py-1 text-sm"
                      value={o.status}
                      onChange={(e) => changeStatus(o.id, e.target.value as OrderStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {editing !== null && (
        <ProductForm
          product={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            loadAll()
          }}
        />
      )}
    </div>
  )
}
