// Path: src/components/ui/SearchablePicker.tsx
"use client";

import { useMemo, useState, useRef, useEffect } from "react";
import { Search, X, Check } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface PickerItem {
  id: string;
  primary: string;
  secondary?: string;
  tertiary?: string;
  searchText: string;
}

interface Props {
  items: PickerItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  placeholder?: string;
  emptyText?: string;
  maxHeight?: number;
  autoFocus?: boolean;
}

export function SearchablePicker({
  items,
  selectedId,
  onSelect,
  placeholder,
  emptyText,
  maxHeight = 280,
  autoFocus = false,
}: Props) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus();
  }, [autoFocus]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((i) => i.searchText.toLowerCase().includes(q));
  }, [items, query]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search
          size={14}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder || t("picker.searchPlaceholder")}
          className="input pl-9 pr-9"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-surface-dark transition"
            aria-label={t("picker.clear")}
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div
        className="border border-border rounded-xl bg-surface-dark overflow-y-auto"
        style={{ maxHeight }}
      >
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-8 px-4">
            {items.length === 0
              ? emptyText || t("picker.empty")
              : t("picker.noMatch")}
          </p>
        ) : (
          <ul className="py-1">
            {filtered.map((item) => {
              const selected = item.id === selectedId;
              return (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => onSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
                      selected
                        ? "bg-brand-500/10"
                        : "hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-xs text-brand-500 font-semibold">
                          {item.primary}
                        </span>
                        {item.secondary && (
                          <span
                            className="text-sm truncate"
                            style={{ color: "var(--text-default)" }}
                          >
                            {item.secondary}
                          </span>
                        )}
                      </div>
                      {item.tertiary && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">
                          {item.tertiary}
                        </p>
                      )}
                    </div>
                    {selected && (
                      <Check
                        size={16}
                        className="text-brand-500 flex-shrink-0"
                      />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <p className="text-xs text-gray-600">
        {t("picker.count", filtered.length, items.length)}
      </p>
    </div>
  );
}
