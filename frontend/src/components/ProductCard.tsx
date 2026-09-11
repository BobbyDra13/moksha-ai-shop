import { Link } from "react-router-dom"
import { toast } from "sonner"
import type { Product } from "@/lib/types"
import { formatPrice } from "@/lib/api"
import { useCart } from "@/store/CartContext"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter } from "@/components/ui/card"

export function ProductCard({ product }: { product: Product }) {
  const { add } = useCart()
  const soldOut = product.stock === 0

  function handleAdd() {
    add(product)
    toast.success(`${product.name} added to cart`)
  }

  return (
    <Card className="flex flex-col overflow-hidden pt-0">
      <Link to={`/products/${product.id}`} className="block aspect-square overflow-hidden bg-muted">
        <img
          src={product.image}
          alt={product.name}
          loading="lazy"
          className="size-full object-cover transition-transform hover:scale-105"
        />
      </Link>
      <CardContent className="flex-1 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/products/${product.id}`} className="font-medium leading-tight hover:underline">
            {product.name}
          </Link>
          <Badge variant="secondary" className="shrink-0 capitalize">
            {product.category}
          </Badge>
        </div>
        <p className="line-clamp-2 text-sm text-muted-foreground">{product.description}</p>
      </CardContent>
      <CardFooter className="flex items-center justify-between">
        <span className="font-semibold">{formatPrice(product.price)}</span>
        <Button size="sm" onClick={handleAdd} disabled={soldOut}>
          {soldOut ? "Sold out" : "Add to cart"}
        </Button>
      </CardFooter>
    </Card>
  )
}
