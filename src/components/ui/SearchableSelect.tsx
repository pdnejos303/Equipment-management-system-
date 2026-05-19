// Path: src/components/ui/SearchableSelect.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface SearchableOption {
  value: string;
  label: string;
  prefix?: string;
}

interface Props {
  name?: string;
  value: string;
  onChange: (value: string) => void;
  options: SearchableOption[];
  allLabel: string;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

export function SearchableSelect({
  name,
  value,
  onChange,
  options,
  allLabel,
  placeholder,
  className = "",
  ariaLabel,
}: Props) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const current = options.find((o) => o.value === value);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        o.value.toLowerCase().includes(q),
    );
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setHighlight(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  function commit(v: string) {
    onChange(v);
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent) {
    const total = filtered.length + 1; // +1 for the "all" row
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % total);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + total) % total);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlight === 0) commit("");
      else commit(filtered[highlight - 1]?.value ?? "");
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      {name && <input type="hidden" name={name} value={value} />}

      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="input flex items-center justify-between gap-2 text-left cursor-pointer pr-9 relative"
      >
        <span
          className="truncate"
          style={{ color: current ? "var(--text-default)" : "var(--text-subtle)" }}
        >
          {current
            ? `${current.prefix ? `${current.prefix} ` : ""}${current.label}`
            : allLabel}
        </span>
        <ChevronDown
          size={14}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full min-w-[220px] rounded-xl border border-border bg-surface shadow-2xl animate-fade-in overflow-hidden">
          <div className="relative p-2 border-b border-border">
            <Search
              size={14}
              className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setHighlight(0);
              }}
              onKeyDown={onInputKey}
              placeholder={placeholder || t("picker.searchPlaceholder")}
              className="input input-sm pl-8 pr-8"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-surface-dark transition"
                aria-label={t("picker.clear")}
              >
                <X size={12} />
              </button>
            )}
          </div>

          <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
            <li>
              <button
                type="button"
                onMouseEnter={() => setHighlight(0)}
                onClick={() => commit("")}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                  highlight === 0 ? "bg-[var(--surface-hover)]" : ""
                } ${value === "" ? "text-brand-500 font-semibold" : ""}`}
              >
                <span>{allLabel}</span>
                {value === "" && <Check size={14} className="text-brand-500" />}
              </button>
            </li>
            {filtered.length === 0 ? (
              <li className="px-3 py-4 text-xs text-center text-gray-500">
                {t("picker.noMatch")}
              </li>
            ) : (
              filtered.map((opt, i) => {
                const selected = opt.value === value;
                const isHi = highlight === i + 1;
                return (
                  <li key={opt.value}>
                    <button
                      type="button"
                      onMouseEnter={() => setHighlight(i + 1)}
                      onClick={() => commit(opt.value)}
                      className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                        isHi ? "bg-[var(--surface-hover)]" : ""
                      } ${selected ? "text-brand-500 font-semibold" : ""}`}
                    >
                      <span className="truncate">
                        {opt.prefix && (
                          <span className="mr-1.5">{opt.prefix}</span>
                        )}
                        {opt.label}
                      </span>
                      {selected && (
                        <Check size={14} className="text-brand-500 flex-shrink-0" />
                      )}
                    </button>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
