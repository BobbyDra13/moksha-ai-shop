import { useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { Product } from "@/lib/types"
import { ProductCard } from "@/components/ProductCard"
import { Skeleton } from "@/components/ui/skeleton"

export function HomePage() {
  const [products, setProducts] = useState<Product[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .get<Product[]>("/products")
      .then(setProducts)
      .catch((e) => setError(e.message))
  }, [])

  if (error) return <p className="text-destructive">Could not load products: {error}</p>

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">Small demo catalogue. Stripe runs in test mode.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products
          ? products.map((p) => <ProductCard key={p.id} product={p} />)
          : Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[3/4] rounded-xl" />
            ))}
      </div>
    </section>
  )
}
