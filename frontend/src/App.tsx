import { BrowserRouter, Route, Routes } from "react-router-dom"
import { GoogleOAuthProvider } from "@react-oauth/google"
import { AuthProvider } from "@/auth/AuthContext"
import { ProtectedRoute } from "@/auth/ProtectedRoute"
import { CartProvider } from "@/store/CartContext"
import { Layout } from "@/components/Layout"
import { HomePage } from "@/pages/HomePage"
import { ProductDetailPage } from "@/pages/ProductDetailPage"
import { CartPage } from "@/pages/CartPage"
import { CheckoutResultPage } from "@/pages/CheckoutResultPage"
import { OrdersPage } from "@/pages/OrdersPage"
import { LoginPage } from "@/pages/LoginPage"
import { AdminPage } from "@/pages/AdminPage"

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? ""

export default function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <CartProvider>
          <BrowserRouter>
            <Routes>
              <Route element={<Layout />}>
                {/* public */}
                <Route path="/" element={<HomePage />} />
                <Route path="/products/:id" element={<ProductDetailPage />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/login" element={<LoginPage />} />

                {/* customer */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/orders" element={<OrdersPage />} />
                  <Route path="/checkout/success" element={<CheckoutResultPage outcome="success" />} />
                  <Route path="/checkout/cancel" element={<CheckoutResultPage outcome="cancel" />} />
                </Route>

                {/* admin */}
                <Route element={<ProtectedRoute adminOnly />}>
                  <Route path="/admin" element={<AdminPage />} />
                </Route>
              </Route>
            </Routes>
          </BrowserRouter>
        </CartProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  )
}
