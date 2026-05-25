// Path: src/app/(features)/users/UsersClient.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { showSuccess, showError, showConfirm } from "@/lib/swal";
import { Pagination } from "@/components/Pagination";
import { usePagination } from "@/lib/usePagination";
import { Modal } from "@/components/ui/Modal";
import { Shield, ShieldCheck, Eye, Plus, Pencil, Trash2 } from "lucide-react";

interface User {
  id: string;
  name: string | null;
  email: string;
  role: string;
  image: string | null;
  createdAt: Date;
  _count: {
    assignments: number;
    bookings: number;
  };
}

const ROLE_CONFIG: Record<string, { icon: typeof Shield; color: string; bg: string; badgeClass: string; borderColor: string; label: Record<string, string> }> = {
  ADMIN: {
    icon: ShieldCheck,
    color: "text-amber-400",
    bg: "bg-amber-500/10",
    badgeClass: "badge-admin",
    borderColor: "border-t-amber-500",
    label: { th: "ผู้ดูแลระบบ", en: "Admin", ja: "管理者" },
  },
  USER: {
    icon: Shield,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    badgeClass: "badge-user",
    borderColor: "border-t-blue-500",
    label: { th: "ผู้ใช้งาน", en: "User", ja: "ユーザー" },
  },
  VIEWER: {
    icon: Eye,
    color: "text-gray-400",
    bg: "bg-gray-500/10",
    badgeClass: "badge-viewer",
    borderColor: "border-t-gray-400",
    label: { th: "ผู้ดูอย่างเดียว", en: "Viewer", ja: "閲覧者" },
  },
};

const ROLE_DESC_KEYS: Record<string, string> = {
  ADMIN: "users.adminDesc",
  USER: "users.userDesc",
  VIEWER: "users.viewerDesc",
};

const AVATAR_GRADIENTS = [
  "from-red-500 to-orange-500",
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-green-500 to-teal-500",
  "from-amber-500 to-yellow-500",
];

function getAvatarGradient(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_GRADIENTS[Math.abs(hash) % AVATAR_GRADIENTS.length];
}

export function UsersClient({ users: initialUsers, currentUserId }: { users: User[]; currentUserId: string }) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [users, setUsers] = useState(initialUsers);
  const { items: pagedUsers, total: usersTotal } = usePagination(users, 15);
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState({ name: "", email: "", password: "", role: "USER" });
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditUser(null);
    setForm({ name: "", email: "", password: "", role: "USER" });
    setShowModal(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({ name: user.name || "", email: user.email, password: "", role: user.role });
    setShowModal(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      if (editUser) {
        // Update
        const body: any = { name: form.name, email: form.email, role: form.role };
        if (form.password) body.password = form.password;

        const res = await fetch(`/api/users/${editUser.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
        showSuccess(t("users.updated"));
      } else {
        // Create
        if (!form.password) {
          showError(t("users.passwordRequired"));
          setSaving(false);
          return;
        }
        const res = await fetch("/api/users", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed");
        }
        showSuccess(t("users.created"));
      }
      setShowModal(false);
      router.refresh();
    } catch (err: any) {
      showError(err.message || t("forms.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (user: User) => {
    if (user.id === currentUserId) {
      showError(t("users.cannotDeleteSelf"));
      return;
    }

    const confirmed = await showConfirm({
      title: t("users.deleteTitle"),
      text: t("users.deleteMsg", user.name || user.email),
      confirmText: t("common.delete"),
      cancelText: t("confirm.cancel"),
      danger: true,
    });
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/users/${user.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      showSuccess(t("users.deleted"));
      router.refresh();
    } catch {
      showError(t("forms.error"));
    }
  };

  return (
    <div className="page-enter">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold">{t("users.title")}</h1>
        <button onClick={openCreate} className="btn-primary text-sm flex items-center gap-1.5">
          <Plus size={16} />
          {t("users.addNew")}
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6 animate-stagger">
        {(["ADMIN", "USER", "VIEWER"] as const).map((role) => {
          const config = ROLE_CONFIG[role];
          const count = users.filter((u) => u.role === role).length;
          const RoleIcon = config.icon;
          return (
            <div key={role} className={`card stat-card border-t-2 ${config.borderColor} pt-4`}>
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-gray-500 uppercase">{config.label[locale] || config.label.en}</p>
                <div className={`w-9 h-9 rounded-lg ${config.bg} flex items-center justify-center flex-shrink-0`}>
                  <RoleIcon size={18} className={config.color} />
                </div>
              </div>
              <p className={`text-3xl font-bold ${config.color}`}>{count}</p>
            </div>
          );
        })}
      </div>

      <div className="table-container">
        <table className="table table-row-hover animate-table-rows">
          <thead>
            <tr>
              <th>{t("users.name")}</th>
              <th>{t("users.email")}</th>
              <th>{t("users.role")}</th>
              <th>{t("users.activity")}</th>
              <th className="text-right">{t("users.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {pagedUsers.map((user) => {
              const config = ROLE_CONFIG[user.role] || ROLE_CONFIG.USER;
              const RoleIcon = config.icon;
              const isSelf = user.id === currentUserId;
              const initials = (user.name || user.email || "?")[0].toUpperCase();
              const gradient = getAvatarGradient(user.email);
              return (
                <tr key={user.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      {user.image ? (
                        <img src={user.image} alt="" className="w-9 h-9 rounded-full object-cover ring-2 ring-border" />
                      ) : (
                        <div className={`w-9 h-9 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-sm font-bold text-white flex-shrink-0 ring-2 ring-border`}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold block truncate max-w-[180px]" style={{ color: "var(--text-default)" }}>{user.name || "-"}</span>
                        {isSelf && <span className="text-[10px] text-brand-500 ml-1.5 font-medium">({t("users.you")})</span>}
                      </div>
                    </div>
                  </td>
                  <td>{user.email}</td>
                  <td>
                    <span className={`${config.badgeClass} inline-flex items-center gap-1.5`}>
                      <RoleIcon size={12} />
                      {config.label[locale] || config.label.en}
                    </span>
                  </td>
                  <td className="text-xs">
                    {user._count.assignments} {t("users.assigns")} / {user._count.bookings} {t("users.books")}
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(user)}
                        className="btn-icon"
                        title={t("actions.edit")}
                      >
                        <Pencil size={14} />
                      </button>
                      {!isSelf && (
                        <button
                          onClick={() => handleDelete(user)}
                          className="btn-icon text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          title={t("actions.delete")}
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Pagination total={usersTotal} pageSize={15} />

      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editUser ? t("users.editUser") : t("users.addNew")}
        width="max-w-md"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>{t("users.name")}</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>{t("users.email")}</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="input"
              required
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold mb-1.5 uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>
              {t("users.password")} {editUser && <span className="normal-case" style={{ color: "var(--text-subtle)" }}>({t("users.leaveBlank")})</span>}
            </label>
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="input"
              placeholder="••••••••"
              {...(!editUser ? { required: true, minLength: 6 } : {})}
            />
          </div>

          {/* Role visual card selector */}
          <div>
            <label className="block text-[11px] font-semibold mb-2 uppercase tracking-wide" style={{ color: "var(--text-subtle)" }}>{t("users.role")}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["ADMIN", "USER", "VIEWER"] as const).map((role) => {
                const rc = ROLE_CONFIG[role];
                const RoleIcon = rc.icon;
                const isSelected = form.role === role;
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => setForm({ ...form, role })}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                      isSelected
                        ? `${rc.bg} ${rc.color} border-current`
                        : "border-border text-gray-500 hover:border-gray-600 hover:text-gray-400"
                    }`}
                  >
                    <RoleIcon size={20} />
                    <span className="text-xs font-semibold">{rc.label[locale] || rc.label.en}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Role description */}
          <div className="rounded-xl border border-border bg-surface-dark p-4 space-y-2">
            {(["ADMIN", "USER", "VIEWER"] as const).map((role) => {
              const rc = ROLE_CONFIG[role];
              const isActive = form.role === role;
              return (
                <div key={role} className={`flex items-start gap-2 text-xs transition-opacity ${isActive ? "opacity-100" : "opacity-40"}`}>
                  <span className={`${rc.badgeClass} flex-shrink-0 mt-0.5`}>{role}</span>
                  <span className="text-gray-400">{t(ROLE_DESC_KEYS[role])}</span>
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 pt-2">
            <button onClick={() => setShowModal(false)} className="btn-ghost flex-1">{t("forms.cancel")}</button>
            <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 disabled:opacity-50">
              {saving ? t("forms.saving") : t("forms.save")}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
