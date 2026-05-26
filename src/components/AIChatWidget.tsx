// Path: src/components/AIChatWidget.tsx
"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { MessageCircle, X, Send, Sparkles, Loader2, Trash2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "ai_chat_history_v1";

export function AIChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [toolStatus, setToolStatus] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const fabRef = useRef<HTMLButtonElement>(null);
  const { locale } = useI18n();

  // Load persisted history on mount
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setMessages(parsed);
      }
    } catch {
      // ignore corrupt storage
    }
  }, []);

  // Persist on change
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      // ignore quota errors
    }
  }, [messages]);

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
  }, [messages, toolStatus]);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  const toolLabel = useCallback((name: string) => {
    const map: Record<string, { th: string; ja: string; en: string }> = {
      get_summary_stats: { th: "กำลังดูภาพรวม...", ja: "概要を確認中...", en: "Checking overview..." },
      search_assets: { th: "กำลังค้นหาอุปกรณ์...", ja: "機器を検索中...", en: "Searching equipment..." },
      get_asset_details: { th: "กำลังดึงรายละเอียด...", ja: "詳細を取得中...", en: "Fetching details..." },
      get_maintenance_history: { th: "กำลังดึงประวัติซ่อม...", ja: "修理履歴を取得中...", en: "Fetching maintenance history..." },
      get_assignments: { th: "กำลังดูการเบิกใช้...", ja: "割り当てを確認中...", en: "Checking assignments..." },
      get_upcoming_attention: { th: "กำลังตรวจสิ่งที่ต้องดูแล...", ja: "注意項目を確認中...", en: "Checking attention items..." },
    };
    const entry = map[name];
    if (!entry) return locale === "th" ? "กำลังดึงข้อมูล..." : locale === "ja" ? "データ取得中..." : "Fetching data...";
    return entry[(locale as "th" | "ja" | "en") || "en"];
  }, [locale]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = { role: "user", content: text.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput("");
    setLoading(true);
    setToolStatus(null);

    // Placeholder assistant message we'll fill as deltas arrive
    setMessages((prev) => [...prev, { role: "assistant", content: "" }]);

    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          locale,
        }),
      });

      if (!res.ok || !res.body) {
        const err = await res.json().catch(() => ({ error: "Connection error" }));
        setMessages((prev) => {
          const next = [...prev];
          next[next.length - 1] = { role: "assistant", content: `⚠️ ${err.error || "Error"}` };
          return next;
        });
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE frames separated by blank line
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (!payload) continue;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "tool") {
              setToolStatus(toolLabel(evt.name));
            } else if (evt.type === "delta") {
              setToolStatus(null);
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant") {
                  next[next.length - 1] = { ...last, content: last.content + (evt.text || "") };
                }
                return next;
              });
            } else if (evt.type === "error") {
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: `⚠️ ${evt.message}` };
                return next;
              });
            }
          } catch {
            // ignore malformed frame
          }
        }
      }
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        const errMsg = locale === "th" ? "เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง" : locale === "ja" ? "接続エラー。再試行してください" : "Connection error. Please try again.";
        if (last?.role === "assistant" && !last.content) {
          next[next.length - 1] = { role: "assistant", content: `⚠️ ${errMsg}` };
        } else {
          next.push({ role: "assistant", content: `⚠️ ${errMsg}` });
        }
        return next;
      });
    } finally {
      setLoading(false);
      setToolStatus(null);
    }
  }, [loading, messages, locale, toolLabel]);

  const send = useCallback(() => sendMessage(input), [input, sendMessage]);

  const clearChat = useCallback(() => {
    setMessages([]);
    try { sessionStorage.removeItem(STORAGE_KEY); } catch { /* ignore */ }
  }, []);

  const suggestions = useMemo(() =>
    locale === "th"
      ? ["สรุปภาพรวมอุปกรณ์ทั้งหมด", "อุปกรณ์ที่กำลังซ่อมอยู่ตอนนี้", "อุปกรณ์ไหนต้องซ่อมเร็วๆนี้?", "อุปกรณ์แต่ละประเภทมีกี่ชิ้น?"]
      : locale === "ja"
        ? ["機器の全体概要を見せて", "現在修理中の機器", "修理が必要な機器は?", "カテゴリ別の機器数は?"]
        : ["Show me the overall equipment summary", "Equipment currently under maintenance", "Which equipment needs repair soon?", "How many items per category?"],
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
          className="fixed z-50 bg-[var(--surface)] border border-[var(--border)] flex flex-col overflow-hidden animate-in slide-in-from-bottom-4 bottom-16 right-3 left-3 h-[65vh] max-h-[520px] rounded-2xl sm:bottom-24 sm:right-6 sm:left-auto sm:w-[380px] sm:h-[520px] sm:max-h-[calc(100vh-120px)] sm:rounded-2xl"
          style={{ boxShadow: "0 24px 48px rgba(0,0,0,0.35), 0 0 0 1px rgba(255,255,255,0.03) inset" }}
        >
          {/* Header */}
          <div className="border-b border-[var(--border)] px-4 py-3 flex items-center gap-3 relative">
            <div className="absolute bottom-0 left-4 right-4 h-px" style={{ background: "linear-gradient(90deg, transparent, rgb(var(--brand-rgb) / 0.1), transparent)" }} />
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgb(var(--brand-rgb) / 0.1)", border: "1px solid rgb(var(--brand-rgb) / 0.15)" }}>
              <Sparkles size={16} className="text-brand-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-bold">Asset Management AI</h3>
              <p className="text-[10px]" style={{ color: "var(--text-subtle)" }}>
                {locale === "th" ? "ผู้ช่วยอัจฉริยะ" : locale === "ja" ? "AIアシスタント" : "Smart Assistant"}
              </p>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                disabled={loading}
                title={locale === "th" ? "ล้างประวัติ" : locale === "ja" ? "履歴をクリア" : "Clear history"}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-30"
                style={{ color: "var(--text-subtle)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-default)"; (e.currentTarget as HTMLElement).style.background = "var(--surface-hover)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--text-subtle)"; (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <Trash2 size={14} />
              </button>
            )}
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
                  "max-w-[85%] text-sm rounded-2xl px-3.5 py-2.5",
                  msg.role === "user"
                    ? "ml-auto bg-brand-500 text-black rounded-br-md whitespace-pre-wrap"
                    : "rounded-bl-md border ai-markdown"
                )}
                style={msg.role === "assistant" ? {
                  background: "var(--surface-hover)",
                  borderColor: "var(--border)",
                  color: "var(--text-default)",
                } : undefined}
              >
                {msg.role === "assistant" ? (
                  msg.content ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        ul: ({ children }) => <ul className="list-disc pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal pl-4 mb-2 last:mb-0 space-y-0.5">{children}</ol>,
                        li: ({ children }) => <li className="text-sm">{children}</li>,
                        strong: ({ children }) => <strong className="font-semibold text-brand-400">{children}</strong>,
                        code: ({ children }) => <code className="px-1 py-0.5 rounded text-[11px]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>{children}</code>,
                        a: ({ children, href }) => <a href={href} target="_blank" rel="noreferrer" className="text-brand-500 underline">{children}</a>,
                        h1: ({ children }) => <h1 className="text-sm font-bold mb-1">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-bold mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-bold mb-1">{children}</h3>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    <span className="typing-dots" aria-label={locale === "th" ? "กำลังคิด" : locale === "ja" ? "考え中" : "Thinking"}>
                      <span />
                      <span />
                      <span />
                    </span>
                  )
                ) : (
                  msg.content
                )}
              </div>
            ))}

            {loading && toolStatus && (
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--text-subtle)" }}>
                <Loader2 size={12} className="animate-spin text-brand-500" />
                <span>{toolStatus}</span>
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
