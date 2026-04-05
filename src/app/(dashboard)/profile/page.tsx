"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Loader2, User, Lock, CheckCircle } from "lucide-react";
import { DEPARTMENT_LABELS } from "@/types";
import type { Department } from "@/types";

export default function ProfilePage() {
  const { data: session, update } = useSession();

  const [name, setName] = useState(session?.user?.name ?? "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (newPassword && newPassword !== confirmPassword) {
      setError("Konfirmasi password tidak cocok");
      return;
    }

    setSaving(true);
    const res = await apiFetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, currentPassword: currentPassword || undefined, newPassword: newPassword || undefined }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setError(data.error ?? "Terjadi kesalahan");
      return;
    }

    await update({ name: data.name });
    setSuccess("Profil berhasil diperbarui");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
  };

  const user = session?.user;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Profil Saya</h1>
        <p className="text-sm text-gray-500 mt-0.5">Kelola informasi akun dan keamanan</p>
      </div>

      {/* Avatar & info card */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex items-center gap-5">
        <div className="w-16 h-16 rounded-2xl bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0 shadow-lg">
          <span className="text-2xl font-bold text-white">
            {user?.name?.charAt(0).toUpperCase() ?? "U"}
          </span>
        </div>
        <div>
          <p className="text-lg font-bold text-gray-900">{user?.name}</p>
          <p className="text-sm text-gray-500">{user?.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
              user?.role === "ATASAN" ? "bg-purple-100 text-purple-700" : "bg-green-100 text-green-700"
            }`}>
              {user?.role === "ATASAN" ? "Atasan (Manager)" : "Bawahan (PIC)"}
            </span>
            {user?.department && (
              <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                {DEPARTMENT_LABELS[user.department as Department] ?? user.department}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
          <User className="w-4 h-4 text-gray-400" />
          <h2 className="font-semibold text-gray-900">Edit Profil</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              {success}
            </div>
          )}

          {/* Nama */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Lengkap</label>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Email (readonly) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Email</label>
            <input
              value={user?.email ?? ""}
              disabled
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-gray-50 text-gray-400"
            />
            <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>
          </div>

          {/* Password section */}
          <div className="pt-2 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-4">
              <Lock className="w-4 h-4 text-gray-400" />
              <p className="text-sm font-semibold text-gray-700">Ganti Password</p>
              <span className="text-xs text-gray-400">(opsional)</span>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password Saat Ini</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Masukkan password saat ini"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Password Baru</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimal 8 karakter"
                  minLength={newPassword ? 8 : undefined}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Konfirmasi Password Baru</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Ulangi password baru"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Simpan Perubahan
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
