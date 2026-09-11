import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { ChatWidget } from "./ChatWidget"
import { Toaster } from "@/components/ui/sonner"

export function Layout() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <Outlet />
      </main>
      <ChatWidget />
      <Toaster />
    </div>
  )
}
