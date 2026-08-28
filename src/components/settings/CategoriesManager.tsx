// Path: src/components/settings/CategoriesManager.tsx
"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2, Lock, Check, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { useRole } from "@/lib/useRole";
import { useCategories, invalidateCategories, type Category } from "@/lib/useCategories";
import { showError, showConfirm, showSuccess } from "@/lib/swal";

export function CategoriesManager() {
  const { t } = useI18n();
  const { canCreate, canDelete } = useRole();
  const { categories, loading, refresh } = useCategories();

  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function reload() {
    invalidateCategories();
    await refresh();
  }

  return (
    <div className="space-y-3">
      {canCreate && !adding && (
        <div className="flex justify-end">
          <button
            onClick={() => setAdding(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-border rounded-md bg-surface hover:bg-surface-hover text-gray-300 hover:text-gray-100 transition-colors"
          >
            <Plus size={12} /> {t("settings.categoryAdd")}
          </button>
        </div>
      )}

      {loading && <p className="text-xs text-[var(--text-muted)] py-4">…</p>}

      {adding && (
        <CategoryEditor
          onCancel={() => setAdding(false)}
          onSaved={async () => { setAdding(false); await reload(); }}
        />
      )}

      <div className="space-y-1.5">
        {categories.map((cat) => (
          editingId === cat.id ? (
            <CategoryEditor
              key={cat.id}
              category={cat}
              onCancel={() => setEditingId(null)}
              onSaved={async () => { setEditingId(null); await reload(); }}
            />
          ) : (
            <CategoryRow
              key={cat.id}
              category={cat}
              canEdit={canCreate}
              canDelete={canDelete}
              onEdit={() => setEditingId(cat.id)}
              onDelete={async () => {
                const confirmed = await showConfirm({
                  title: t("settings.categoryDeleteTitle"),
                  text: t("settings.categoryDeleteConfirm", cat.label),
                  confirmText: t("common.delete"),
                  cancelText: t("common.cancel"),
                  danger: true,
                });
                if (!confirmed) return;
                const res = await fetch(`/api/categories/${cat.id}`, { method: "DELETE" });
                if (!res.ok) {
                  const { error } = await res.json().catch(() => ({ error: "" }));
                  showError(error || t("settings.categoryDeleteFailed"));
                  return;
                }
                await reload();
                showSuccess(t("settings.categoryDeleted"), cat.label);
              }}
            />
          )
        ))}
      </div>
    </div>
  );
}

function CategoryRow({
  category, canEdit, canDelete, onEdit, onDelete,
}: {
  category: Category;
  canEdit: boolean;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--surface-raised)] hover:border-[var(--border-strong)] transition-colors">
      <span className="text-lg w-6 text-center leading-none">{category.emoji || "📦"}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{category.label}</p>
        <p className="text-[10px] text-[var(--text-subtle)] font-mono uppercase tracking-wider">{category.key}</p>
      </div>
      {category.isDefault && (
        <span className="text-[10px] text-[var(--text-subtle)] flex items-center gap-1">
          <Lock size={10} />
        </span>
      )}
      {canEdit && (
        <button
          onClick={onEdit}
          className="p-1.5 rounded-md text-[var(--text-subtle)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)] transition"
          aria-label="Edit"
        >
          <Pencil size={13} />
        </button>
      )}
      {canDelete && !category.isDefault && (
        <button
          onClick={onDelete}
          className="p-1.5 rounded-md text-[var(--text-subtle)] hover:text-red-400 hover:bg-red-500/10 transition"
          aria-label="Delete"
        >
          <Trash2 size={13} />
        </button>
      )}
    </div>
  );
}

function CategoryEditor({
  category, onCancel, onSaved,
}: {
  category?: Category;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isEdit = !!category;
  const [key, setKey] = useState(category?.key || "");
  const [label, setLabel] = useState(category?.label || "");
  const [emoji, setEmoji] = useState(category?.emoji || "");
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!label.trim()) { showError(t("settings.categoryLabelRequired")); return; }
    if (!isEdit && !key.trim()) { showError(t("settings.categoryKeyRequired")); return; }

    setSaving(true);
    try {
      const url = isEdit ? `/api/categories/${category!.id}` : "/api/categories";
      const method = isEdit ? "PATCH" : "POST";
      const body = isEdit
        ? { label: label.trim(), emoji: emoji.trim() || null }
        : { key: key.trim().toUpperCase(), label: label.trim(), emoji: emoji.trim() || null };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({ error: "" }));
        showError(error || t("settings.categorySaveFailed"));
        setSaving(false);
        return;
      }
      onSaved();
    } catch {
      showError(t("settings.categorySaveFailed"));
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 px-3 py-2.5 rounded-lg border border-brand-500/30 bg-brand-500/5">
      <input
        value={emoji}
        onChange={(e) => setEmoji(e.target.value)}
        placeholder="📦"
        maxLength={4}
        className="input py-1.5 text-base w-full sm:w-14 text-center"
      />
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={t("settings.categoryLabelPlaceholder")}
        className="input py-1.5 text-sm flex-1"
        autoFocus={!isEdit}
      />
      {!isEdit && (
        <input
          value={key}
          onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""))}
          placeholder={t("settings.categoryKeyPlaceholder")}
          className="input py-1.5 text-xs font-mono uppercase w-full sm:w-28"
          maxLength={32}
        />
      )}
      <div className="flex gap-1.5 justify-end">
        <button
          onClick={save}
          disabled={saving}
          className="p-1.5 rounded-md bg-brand-500 text-black hover:bg-brand-400 transition disabled:opacity-50"
          aria-label={t("forms.save") || "Save"}
        >
          <Check size={14} />
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          className="p-1.5 rounded-md border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--text-default)] hover:bg-[var(--surface-hover)] transition"
          aria-label={t("forms.cancel") || "Cancel"}
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}
