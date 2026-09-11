import { useState, type FormEvent } from "react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import type { Product } from "@/lib/types"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

interface Props {
  product: Product | null // null = create
  onClose: () => void
  onSaved: () => void
}

/** Create/edit dialog for admin. Plain controlled form, no form library. */
export function ProductForm({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: product?.name ?? "",
    description: product?.description ?? "",
    price: product?.price ?? 0,
    stock: product?.stock ?? 0,
    category: product?.category ?? "general",
    image: product?.image ?? "",
  })
  const [saving, setSaving] = useState(false)

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      if (product) await api.patch(`/products/${product.id}`, form)
      else await api.post("/products", form)
      toast.success("Saved")
      onSaved()
    } catch (err) {
      toast.error((err as Error).message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product ? "Edit product" : "New product"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <Field label="Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} required />
          </Field>
          <Field label="Description">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (USD)">
              <Input
                type="number"
                min={1}
                step="0.01"
                value={form.price}
                onChange={(e) => set("price", Number(e.target.value))}
                required
              />
            </Field>
            <Field label="Stock">
              <Input
                type="number"
                min={0}
                value={form.stock}
                onChange={(e) => set("stock", Number(e.target.value))}
                required
              />
            </Field>
          </div>
          <Field label="Category">
            <Input value={form.category} onChange={(e) => set("category", e.target.value)} />
          </Field>
          <Field label="Image URL">
            <Input value={form.image} onChange={(e) => set("image", e.target.value)} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label>{label}</Label>
      {children}
    </div>
  )
}
