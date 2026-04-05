"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Plus, Trash2, Edit2, X, Loader2, Search, Users, ShieldCheck, UserIcon,
} from "lucide-react";
import { DEPARTMENT_LABELS } from "@/types";
import type { User, Department } from "@/types";
import { useToast } from "@/components/layout/toast-context";

const ROLE_OPTIONS = [
  { value: "ATASAN", label: "Atasan (Manager)" },
  { value: "BAWAHAN", label: "Bawahan (PIC)" },
];

const DEPT_OPTIONS = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }));

interface UserForm {
  name: string;
  email: string;
  password: string;
  role: string;
  department: string;
}

const emptyForm: UserForm = { name: "", email: "", password: "", role: "BAWAHAN", department: "PROJECT_LEADER" };

export default function UsersPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [filterRole, setFilterRole] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  // Redirect non-ATASAN
  if (session && session.user.role !== "ATASAN") {
    router.replace("/dashboard");
    return null;
  }

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (u: User) => apiFetch(`/api/users/${u.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("success", `User ${u.name} berhasil dihapus`);
    },
    onError: () => toast("error", "Gagal menghapus user"),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterRole && u.role !== filterRole) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  const openAdd = () => {
    setEditUser(null);
    setForm(emptyForm);
    setFormError("");
    setShowModal(true);
  };

  const openEdit = (u: User) => {
    setEditUser(u);
    setForm({
      name: u.name,
      email: u.email,
      password: "",
      role: u.role,
      department: u.department ?? "PROJECT_LEADER",
    });
    setFormError("");
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setSaving(true);

    let res: Response;

    if (editUser) {
      const body: Record<string, string> = { name: form.name, role: form.role, department: form.department };
      if (form.password) body.password = form.password;
      res = await apiFetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "Terjadi kesalahan");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["users"] });
    setShowModal(false);
    toast("success", editUser ? `User ${form.name} berhasil diperbarui` : `User ${form.name} berhasil ditambahkan`);
  };

  const handleDelete = (u: User) => {
    if (u.id === session?.user?.id) return;
    if (confirm(`Hapus user "${u.name}"? Tindakan ini tidak dapat dibatalkan.`)) {
      deleteMutation.mutate(u);
    }
  };

  const atasan = filtered.filter((u) => u.role === "ATASAN").length;
  const bawahan = filtered.filter((u) => u.role === "BAWAHAN").length;

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Manajemen User</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} user terdaftar</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total User", value: users.length, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: "Atasan", value: users.filter((u) => u.role === "ATASAN").length, icon: ShieldCheck, color: "text-purple-600 bg-purple-50" },
          { label: "Bawahan (PIC)", value: users.filter((u) => u.role === "BAWAHAN").length, icon: UserIcon, color: "text-green-600 bg-green-50" },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
              <Icon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-gray-500">{label}</p>
              <p className="text-2xl font-bold text-gray-900">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <div className="flex-1 min-w-52 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder="Cari nama atau email..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterRole}
          onChange={(e) => { setFilterRole(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">Semua Role</option>
          {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
        {(search || filterRole) && (
          <button
            onClick={() => { setSearch(""); setFilterRole(""); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {["Nama", "Email", "Role", "Department", "Aksi"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-400">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  Memuat data...
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-16 text-center text-gray-400">Tidak ada user ditemukan</td>
              </tr>
            ) : (
              paginated.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-500 to-blue-700 flex items-center justify-center shrink-0">
                        <span className="text-xs font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                      </div>
                      <span className="font-medium text-gray-900">{u.name}</span>
                      {u.id === session?.user?.id && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Anda</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      u.role === "ATASAN"
                        ? "bg-purple-100 text-purple-700"
                        : "bg-green-100 text-green-700"
                    }`}>
                      {u.role === "ATASAN" ? "Atasan" : "Bawahan"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {u.department ? DEPARTMENT_LABELS[u.department as Department] ?? u.department : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {u.id !== session?.user?.id && (
                        <button
                          onClick={() => handleDelete(u)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Hapus"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} dari {filtered.length} user
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &laquo;
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`px-3 py-1.5 text-sm border rounded transition-colors ${page === n ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 hover:bg-gray-50"}`}
                >
                  {n}
                </button>
              ))}
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                &raquo;
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
              <h2 className="text-lg font-bold text-gray-900">
                {editUser ? "Edit User" : "Tambah User Baru"}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{formError}</div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Lengkap *</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nama lengkap..."
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Email *</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!!editUser}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                  placeholder="email@perusahaan.com"
                />
                {editUser && <p className="text-xs text-gray-400 mt-1">Email tidak dapat diubah</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  {editUser ? "Password Baru (kosongkan jika tidak diubah)" : "Password *"}
                </label>
                <input
                  required={!editUser}
                  type="password"
                  minLength={8}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Minimal 8 karakter"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Role *</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {form.role === "BAWAHAN" && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Department *</label>
                  <select
                    value={form.department}
                    onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editUser ? "Simpan Perubahan" : "Tambah User"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Batal
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
