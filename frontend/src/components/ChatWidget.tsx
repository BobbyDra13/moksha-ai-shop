import { useEffect, useRef, useState, type FormEvent } from "react"
import { MessageCircle, Send, X } from "lucide-react"
import { api } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

interface Msg {
  role: "user" | "assistant"
  content: string
}

const GREETING: Msg = {
  role: "assistant",
  content: "Hi! Ask me about products, prices, or your orders.",
}

/** Floating support chat. Talks to /chat which runs the LangChain agent. */
export function ChatWidget() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([GREETING])
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, open])

  async function send(e: FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || sending) return

    const next: Msg[] = [...messages, { role: "user", content: text }]
    setMessages(next)
    setInput("")
    setSending(true)
    try {
      // history excludes the greeting and the message we just added
      const history = next.slice(1, -1)
      const res = await api.post<{ reply: string }>("/chat", { message: text, history })
      setMessages([...next, { role: "assistant", content: res.reply }])
    } catch {
      setMessages([...next, { role: "assistant", content: "Sorry, something went wrong." }])
    } finally {
      setSending(false)
    }
  }

  if (!open) {
    return (
      <Button
        size="icon"
        className="fixed right-4 bottom-4 z-50 size-12 rounded-full shadow-lg"
        onClick={() => setOpen(true)}
        aria-label="Open support chat"
      >
        <MessageCircle className="size-6" />
      </Button>
    )
  }

  return (
    <div className="fixed right-4 bottom-4 z-50 flex h-[28rem] w-[calc(100vw-2rem)] max-w-sm flex-col rounded-xl border bg-background shadow-xl">
      <div className="flex items-center justify-between border-b px-4 py-2">
        <span className="font-medium">Support</span>
        <Button variant="ghost" size="icon" onClick={() => setOpen(false)} aria-label="Close chat">
          <X className="size-4" />
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3 text-sm">
        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] whitespace-pre-wrap rounded-lg px-3 py-2 ${
              m.role === "user" ? "ml-auto bg-primary text-primary-foreground" : "bg-muted"
            }`}
          >
            {m.content}
          </div>
        ))}
        {sending && <div className="w-fit rounded-lg bg-muted px-3 py-2">Thinking...</div>}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={send} className="flex gap-2 border-t p-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask something..."
          disabled={sending}
        />
        <Button type="submit" size="icon" disabled={sending} aria-label="Send">
          <Send className="size-4" />
        </Button>
      </form>
    </div>
  )
}
