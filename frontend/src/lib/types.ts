export type Role = "customer" | "admin"

export interface User {
  id: string
  email: string
  name: string
  picture?: string | null
  role: Role
}

export interface Product {
  id: string
  name: string
  description: string
  price: number
  image: string
  stock: number
  category: string
}

export type OrderStatus = "pending" | "paid" | "failed" | "cancelled"

export interface OrderItem {
  product_id: string
  name: string
  price: number
  quantity: number
}

export interface Order {
  id: string
  user_id: string
  items: OrderItem[]
  total: number
  status: OrderStatus
  created_at: string
}

export interface CartItem {
  product: Product
  quantity: number
}
