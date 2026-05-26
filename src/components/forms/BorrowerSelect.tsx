// Path: src/components/forms/BorrowerSelect.tsx
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, UserRound, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export interface PickerUser {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface BorrowerValue {
  userId?: string;
  personName: string;
}

interface Props {
  value: BorrowerValue;
  onChange: (v: BorrowerValue) => void;
  externalLabel?: string;
  externalPlaceholder?: string;
}

export function BorrowerSelect({ value, onChange, externalLabel, externalPlaceholder }: Props) {
  const { t } = useI18n();
  const [users, setUsers] = useState<PickerUser[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [external, setExternal] = useState<boolean>(!!value.personName && !value.userId);

  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/users/picker")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => { if (!cancelled) setUsers(j.data || []); })
      .catch(() => { if (!cancelled) { setUsers([]); setLoadError(true); } });
    return () => { cancelled = true; };
  }, []);

  const selected = useMemo(
    () => (users || []).find((u) => u.id === value.userId) || null,
    [users, value.userId]
  );

  const filtered = useMemo(() => {
    if (!users) return [];
    const q = query.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) =>
      (u.name || "").toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q)
    );
  }, [users, query]);

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

  function commit(u: PickerUser) {
    onChange({ userId: u.id, personName: u.name || u.email });
    setOpen(false);
  }

  function onInputKey(e: React.KeyboardEvent) {
    if (filtered.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % filtered.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h - 1 + filtered.length) % filtered.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const u = filtered[highlight];
      if (u) commit(u);
    }
  }

  const handleToggle = (next: boolean) => {
    setExternal(next);
    if (next) {
      onChange({ userId: undefined, personName: value.personName });
    } else {
      onChange({ userId: value.userId, personName: value.userId ? value.personName : "" });
    }
  };

  if (external) {
    return (
      <div className="space-y-2">
        <label className="block text-xs text-gray-500 font-semibold mb-1">
          {externalLabel || t("forms.personName")} *
        </label>
        <input
          value={value.personName}
          onChange={(e) => onChange({ userId: undefined, personName: e.target.value })}
          required
          maxLength={100}
          placeholder={externalPlaceholder}
          className="input"
        />
        <button
          type="button"
          onClick={() => handleToggle(false)}
          className="text-xs text-gray-500 hover:text-brand-500 transition"
        >
          ← {t("forms.pickUser")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-500 font-semibold">
        {t("forms.pickUser")} *
      </label>
      <div ref={rootRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="listbox"
          aria-expanded={open}
          className="input flex items-center justify-between gap-2 text-left cursor-pointer pr-9 relative w-full"
        >
          <span className="flex items-center gap-2 min-w-0">
            <UserRound size={14} className="text-gray-500 flex-shrink-0" />
            {selected ? (
              <span className="truncate" style={{ color: "var(--text-default)" }}>
                {selected.name || selected.email}
                {selected.name && (
                  <span className="text-gray-500 ml-2 text-xs">{selected.email}</span>
                )}
              </span>
            ) : (
              <span className="truncate" style={{ color: "var(--text-subtle)" }}>
                {t("forms.pickUser")}
              </span>
            )}
          </span>
          <ChevronDown
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
          />
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-surface shadow-2xl animate-fade-in overflow-hidden">
            <div className="relative p-2 border-b border-border">
              <Search
                size={14}
                className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none"
              />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => { setQuery(e.target.value); setHighlight(0); }}
                onKeyDown={onInputKey}
                placeholder={t("forms.pickUserSearchPlaceholder")}
                className="input input-sm pl-8 pr-8"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => { setQuery(""); inputRef.current?.focus(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-5 h-5 rounded flex items-center justify-center text-gray-500 hover:text-gray-300 hover:bg-surface-dark transition"
                  aria-label={t("picker.clear")}
                >
                  <X size={12} />
                </button>
              )}
            </div>

            <ul role="listbox" className="py-1 max-h-64 overflow-y-auto">
              {users === null ? (
                <li className="px-3 py-4 text-xs text-center text-gray-500">...</li>
              ) : filtered.length === 0 ? (
                <li className="px-3 py-4 text-xs text-center text-gray-500">
                  {users.length === 0 ? t("forms.pickUserEmpty") : t("picker.noMatch")}
                </li>
              ) : (
                filtered.map((u, i) => {
                  const isSel = u.id === value.userId;
                  const isHi = highlight === i;
                  return (
                    <li key={u.id}>
                      <button
                        type="button"
                        onMouseEnter={() => setHighlight(i)}
                        onClick={() => commit(u)}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-left text-sm transition-colors ${
                          isHi ? "bg-[var(--surface-hover)]" : ""
                        } ${isSel ? "text-brand-500 font-semibold" : ""}`}
                      >
                        <span className="flex-1 min-w-0">
                          <span className="block truncate" style={{ color: isSel ? undefined : "var(--text-default)" }}>
                            {u.name || u.email}
                          </span>
                          {u.name && (
                            <span className="block truncate text-xs text-gray-500">{u.email}</span>
                          )}
                        </span>
                        {isSel && <Check size={14} className="text-brand-500 flex-shrink-0" />}
                      </button>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>

      {loadError && (
        <p className="text-xs text-red-400">{t("forms.error")}</p>
      )}

      <button
        type="button"
        onClick={() => handleToggle(true)}
        className="text-xs text-gray-500 hover:text-brand-500 transition"
      >
        + {t("forms.externalToggle")}
      </button>
    </div>
  );
}
