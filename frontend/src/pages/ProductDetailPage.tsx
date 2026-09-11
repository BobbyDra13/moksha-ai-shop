import { useEffect, useState } from "react"
import { Link, useParams } from "react-router-dom"
import { ArrowLeft, Minus, Plus } from "lucide-react"
import { toast } from "sonner"
import { api, formatPrice } from "@/lib/api"
import type { Product } from "@/lib/types"
import { useCart } from "@/store/CartContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"

export function ProductDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { add } = useCart()
  const [product, setProduct] = useState<Product | null>(null)
  const [qty, setQty] = useState(1)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Product>(`/products/${id}`)
      .then(setProduct)
      .catch((e) => setError(e.message))
  }, [id])

  if (error) return <p className="text-destructive">{error}</p>
  if (!product) return <Skeleton className="h-96 rounded-xl" />

  const soldOut = product.stock === 0

  function handleAdd() {
    if (!product) return
    add(product, qty)
    toast.success(`${qty} x ${product.name} added to cart`)
  }

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" render={<Link to="/" />}>
        <ArrowLeft className="mr-1 size-4" /> Back
      </Button>

      <div className="grid gap-8 md:grid-cols-2">
        <div className="overflow-hidden rounded-xl bg-muted">
          <img src={product.image} alt={product.name} className="aspect-square w-full object-cover" />
        </div>

        <div className="space-y-4">
          <Badge variant="secondary" className="capitalize">
            {product.category}
          </Badge>
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-2xl font-semibold">{formatPrice(product.price)}</p>
          <p className="text-muted-foreground">{product.description}</p>
          <p className="text-sm">
            {soldOut ? (
              <span className="text-destructive">Out of stock</span>
            ) : (
              <span>{product.stock} in stock</span>
            )}
          </p>

          {!soldOut && (
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-md border">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  aria-label="Decrease"
                >
                  <Minus className="size-4" />
                </Button>
                <span className="w-8 text-center">{qty}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                  aria-label="Increase"
                >
                  <Plus className="size-4" />
                </Button>
              </div>
              <Button onClick={handleAdd} className="flex-1 sm:flex-none">
                Add to cart
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
