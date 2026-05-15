// Path: src/components/AIChatWidget.tsx
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const { t, locale } = useI18n();

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        panelRef.current && !panelRef.current.contains(target) &&
        fabRef.current && !fabRef.current.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      });

      const data = await res.json();
      if (data.error) {
        setMessages((prev) => [...prev, { role: "assistant", content: `Error: ${data.error}` }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", content: data.message }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "Connection error. Please try again." }]);
    } finally {
      setLoading(false);
    }
  }, [loading, messages, locale]);

  const send = useCallback(() => sendMessage(input), [input, sendMessage]);

  const suggestions = useMemo(() =>
    locale === "th"
      ? ["อุปกรณ์ไหนต้องซ่อมเร็วๆนี้?", "สรุปค่าซ่อมทั้งหมด", "อุปกรณ์ไหนควรเปลี่ยนใหม่?"]
      : locale === "ja"
        ? ["修理が必要な機器は?", "修理費の合計は?", "交換すべき機器は?"]
        : ["Which equipment needs repair soon?", "Total repair costs summary", "Which equipment should be replaced?"],
  [locale]);

  return (
    <>
      {/* FAB Button */}
      <button
        ref={fabRef}
        onClick={() => setOpen(!open)}
        className={cn(
          "fixed bottom-4 right-3 sm:bottom-6 sm:right-6 z-50 w-12 h-12 sm:w-14 sm:h-14 rounded-full flex items-center justify-center transition-all duration-300",
          open
            ? "bg-[var(--surface)] border border-[var(--border)] hover:bg-[var(--surface-hover)]"
            : "bg-brand-500 hover:scale-105"
        )}
        style={open ? { boxShadow: "0 4px 16px rgba(0,0,0,0.25)" } : { boxShadow: "0 4px 20px rgba(0,0,0,0.25), 0 0 20px rgb(var(--brand-rgb) / 0.2)" }}
      >
        {open ? (
          <X size={22} style={{ color: "var(--text-muted)" }} />
        ) : (
          <div className="relative">
            <MessageCircle size={22} className="text-black" />
            <Sparkles size={10} className="absolute -top-1 -right-1 text-yellow-300" />
          </div>
        )}
      </button>

      {/* Chat Panel */}
      {open && (
        <div
          ref={panelRef}
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 bottom-16 right-3 left-3 h-[55vh] max-h-[400px] rounded-2xl sm:bottom-24 sm:right-6 sm:left-auto sm:w-[380px] sm:h-[480px] sm:max-h-[calc(100vh-120px)] sm:rounded-2xl"
          style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03) inset" }}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 relative">
            <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgb(var(--brand-rgb) / 0.1), transparent)" }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgb(var(--brand-rgb) / 0.1)", border: "1px solid rgb(var(--brand-rgb) / 0.15)" }}>
              <Sparkles size={16} className="text-brand-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold">EquipTrack AI</h3>
              <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                {locale === "th" ? "ผู้ช่วยอัจฉริยะ" : locale === "ja" ? "AIアシスタント" : "Smart Assistant"}
              </p>
            </div>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: "rgb(var(--brand-rgb) / 0.08)", border: "1px solid rgb(var(--brand-rgb) / 0.1)" }}>
                  <Sparkles size={20} className="text-brand-500" />
                </div>
                <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
                  {locale === "th" ? "ถามอะไรก็ได้เกี่ยวกับอุปกรณ์ของคุณ" : locale === "ja" ? "機器について何でも聞いてください" : "Ask anything about your equipment"}
                </p>
                <div className="space-y-2">
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(s)}
                      className="block w-full text-left text-xs border rounded-lg px-3 py-2.5 transition-all duration-200"
                      style={{
                        background: "var(--surface-hover)",
                        borderColor: "var(--border)",
                        color: "var(--text-muted)",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "rgb(var(--brand-rgb) / 0.2)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-default)";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = "var(--border)";
                        (e.currentTarget as HTMLElement).style.color = "var(--text-muted)";
                      }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5 whitespace-pre-wrap",
                  msg.role === "user"
                    ? "ml-auto bg-brand-500 text-black rounded-br-md"
                    : "rounded-bl-md border"
                )}
                style={msg.role === "assistant" ? {
                  background: "var(--surface-hover)",
                  borderColor: "var(--border)",
                  color: "var(--text-default)",
                } : undefined}
              >
                {msg.content}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm" style={{ color: "var(--text-subtle)" }}>
                <Loader2 size={14} className="animate-spin text-brand-500" />
                <span>{locale === "th" ? "กำลังคิด..." : locale === "ja" ? "考え中..." : "Thinking..."}</span>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-[var(--border)] p-3">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 border border-[var(--border)] transition-all duration-200 focus-within:border-brand-500/40" style={{ background: "var(--surface-hover)" }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
                placeholder={locale === "th" ? "ถาม AI เกี่ยวกับอุปกรณ์..." : locale === "ja" ? "機器について聞く..." : "Ask about equipment..."}
                className="flex-1 bg-transparent text-sm outline-none"
                style={{ color: "var(--text-default)" }}
                disabled={loading}
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading}
                className="w-8 h-8 rounded-lg bg-brand-500 flex items-center justify-center text-black disabled:opacity-30 hover:bg-brand-400 transition-all duration-200"
                style={{ boxShadow: input.trim() && !loading ? "0 0 8px rgb(var(--brand-rgb) / 0.2)" : "none" }}
              >
                <Send size={14} />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
