import { api } from "@/lib/api"

/** Ask the backend for a Stripe Checkout URL and go there. Works for pending, failed and cancelled orders. */
export async function payOrder(orderId: string) {
  const { checkout_url } = await api.post<{ checkout_url: string }>(`/payments/checkout/${orderId}`)
  window.location.href = checkout_url
}
