// Path: src/app/(features)/profile/page.tsx
"use client";

import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { User, Key, LogOut, Save, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { showSuccess, showError } from "@/lib/swal";

const ROLE_LABELS: Record<string, Record<string, string>> = {
  ADMIN: { th: "ผู้ดูแลระบบ", en: "Administrator", ja: "管理者", zh: "管理员", fr: "Administrateur" },
  USER: { th: "ผู้ใช้งาน", en: "User", ja: "ユーザー", zh: "用户", fr: "Utilisateur" },
  VIEWER: { th: "ผู้ดูเท่านั้น", en: "Viewer", ja: "閲覧者", zh: "查看者", fr: "Lecteur" },
};

const ROLE_BADGE: Record<string, string> = {
  ADMIN: "badge-admin",
  USER: "badge-user",
  VIEWER: "badge-viewer",
};

export default function ProfilePage() {
  const { data: session, update } = useSession();
  const { locale, t } = useI18n();

  const userName = session?.user?.name ?? "";
  const userEmail = session?.user?.email ?? "";
  const userRole = (session?.user as any)?.role ?? "";
  const userInitial = ((session?.user?.name || session?.user?.email || "?")[0]).toUpperCase();

  const [name, setName] = useState(userName);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savingPw, setSavingPw] = useState(false);

  const roleLabel = ROLE_LABELS[userRole]?.[locale] ?? ROLE_LABELS[userRole]?.en ?? userRole;
  const roleBadge = ROLE_BADGE[userRole] ?? ROLE_BADGE.VIEWER;

  const handleSaveName = async () => {
    if (!name.trim() || name === userName) return;
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      await update({ name });
      showSuccess(t("profile.saved"));
    } catch (err: any) {
      showError(err.message || t("profile.error"));
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword) return;
    if (newPassword !== confirmPassword) {
      showError(t("profile.passwordMismatch"));
      return;
    }
    if (newPassword.length < 6) {
      showError(t("profile.passwordMinLength"));
      return;
    }
    setSavingPw(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showSuccess(t("profile.passwordChanged"));
    } catch (err: any) {
      showError(err.message || t("profile.error"));
    } finally {
      setSavingPw(false);
    }
  };

  return (
    <div className="page-enter max-w-2xl mx-auto space-y-5">
      {/* Profile Card */}
      <div className="card p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl font-black text-brand-500">{userInitial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold truncate" style={{ color: "var(--text-default)" }}>{userName || "—"}</h1>
          <p className="text-sm text-gray-500 truncate mt-0.5">{userEmail}</p>
          <span className={`${roleBadge} mt-2 inline-flex items-center gap-1.5`}>
            <ShieldCheck size={11} />
            {roleLabel}
          </span>
        </div>
      </div>

      {/* Edit Name */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <User size={15} className="text-brand-500" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{t("profile.personalInfo")}</h2>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("profile.fullName")}</label>
          <input
            className="input w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSaveName()}
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("profile.email")}</label>
          <input
            className="input w-full cursor-not-allowed"
            value={userEmail}
            readOnly
            style={{ opacity: 0.5 }}
          />
          <p className="text-[11px] text-gray-600 mt-1.5">{t("profile.emailReadonly")}</p>
        </div>
        <button
          onClick={handleSaveName}
          disabled={saving || !name.trim() || name === userName}
          className="btn-primary flex items-center gap-2"
        >
          <Save size={13} />
          {saving ? t("profile.saving") : t("profile.save")}
        </button>
      </div>

      {/* Change Password */}
      <div className="card p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Key size={15} className="text-brand-500" />
          <h2 className="text-sm font-semibold" style={{ color: "var(--text-default)" }}>{t("profile.changePassword")}</h2>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("profile.currentPassword")}</label>
          <div className="relative">
            <input
              className="input w-full pr-10"
              type={showCurrent ? "text" : "password"}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowCurrent((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showCurrent ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("profile.newPassword")}</label>
          <div className="relative">
            <input
              className="input w-full pr-10"
              type={showNew ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowNew((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
            >
              {showNew ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1.5">{t("profile.confirmNewPassword")}</label>
          <input
            className="input w-full"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
          />
        </div>
        <button
          onClick={handleChangePassword}
          disabled={savingPw || !currentPassword || !newPassword || !confirmPassword}
          className="btn-primary flex items-center gap-2"
        >
          <Key size={13} />
          {savingPw ? t("profile.changingPassword") : t("profile.changePasswordBtn")}
        </button>
      </div>

      {/* Logout */}
      <div className="card p-6">
        <h2 className="text-sm font-semibold mb-4" style={{ color: "var(--text-default)" }}>{t("profile.account")}</h2>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="btn-danger text-sm"
        >
          <LogOut size={14} />
          {t("profile.logout")}
        </button>
      </div>
    </div>
  );
}
