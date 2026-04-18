"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "next-auth/react";
import {
  Plus, Trash2, Edit2, X, Loader2, Search, Users, ShieldCheck, UserIcon, AlertTriangle,
} from "lucide-react";
import { DEPARTMENT_LABELS } from "@/types";
import type { User, Department } from "@/types";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";

const DEPT_OPTIONS = Object.entries(DEPARTMENT_LABELS).map(([value, label]) => ({ value, label }));

// Departemen yang bisa akses web (punya password)
const WEB_ACCESS_DEPARTMENTS = ["PROJECT_LEADER", "PROJECT_LEADER_COORDINATOR"];

interface UserForm {
  name: string;
  email: string;
  password: string;
  department: string;
}

const emptyForm: UserForm = { name: "", email: "", password: "", department: "PROJECT_LEADER" };

export default function UsersPage() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const us = t.users;

  const [search, setSearch] = useState("");
  const [filterDept, setFilterDept] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [page, setPage] = useState(1);
  const perPage = 10;

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users").then((r) => r.json()),
  });

  const deleteMutation = useMutation({
    mutationFn: (u: User) => apiFetch(`/api/users/${u.id}`, { method: "DELETE" }).then((r) => r.json()),
    onSuccess: (_, u) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      toast("success", `User ${u.name} ${us.toastDeleted}`);
    },
    onError: () => toast("error", us.toastDeleteFailed),
  });

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    if (q && !u.name.toLowerCase().includes(q) && !u.email.toLowerCase().includes(q)) return false;
    if (filterDept && u.department !== filterDept) return false;
    return true;
  });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paginated = filtered.slice((page - 1) * perPage, page * perPage);

  // Cek apakah departemen yang dipilih bisa akses web
  const canAccessWeb = WEB_ACCESS_DEPARTMENTS.includes(form.department);

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
      const body: Record<string, string> = {
        name: form.name,
        email: form.email,
        department: form.department,
      };
      // Hanya kirim password jika departemen bisa akses web dan password diisi
      if (canAccessWeb && form.password) body.password = form.password;

      res = await apiFetch(`/api/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    } else {
      const body: Record<string, string> = {
        name: form.name,
        email: form.email,
        department: form.department
      };
      // Hanya kirim password jika departemen bisa akses web
      if (canAccessWeb) body.password = form.password;

      res = await apiFetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
    }

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setFormError(data.error ?? "An error occurred");
      return;
    }

    queryClient.invalidateQueries({ queryKey: ["users"] });
    setShowModal(false);
    toast("success", editUser ? `User ${form.name} ${us.toastUpdated}` : `User ${form.name} ${us.toastAdded}`);
  };

  const handleDelete = (u: User) => {
    if (u.id === session?.user?.id) return;
    if (confirm(`${us.confirmDelete} "${u.name}"? ${us.confirmDeleteMsg}`)) {
      deleteMutation.mutate(u);
    }
  };

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">{users.length} {us.subtitle}</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          {us.addUser}
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: us.kpiTotal, value: users.length, icon: Users, color: "text-blue-600 bg-blue-50" },
          { label: us.kpiWebAccess, value: users.filter((u) => WEB_ACCESS_DEPARTMENTS.includes(u.department ?? "")).length, icon: ShieldCheck, color: "text-purple-600 bg-purple-50" },
          { label: us.kpiPicOnly, value: users.filter((u) => !WEB_ACCESS_DEPARTMENTS.includes(u.department ?? "")).length, icon: UserIcon, color: "text-green-600 bg-green-50" },
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
            placeholder={us.searchPlaceholder}
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterDept}
          onChange={(e) => { setFilterDept(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">{us.allDepartments}</option>
          {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
        </select>
        {(search || filterDept) && (
          <button
            onClick={() => { setSearch(""); setFilterDept(""); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {t.reset}
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-blue-600 text-white">
              {[us.colName, us.colEmail, us.colDept, us.colWebAccess, us.colActions].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-400">Loading...</p>
                </td>
              </tr>
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-20 text-center">
                  <p className="text-sm font-medium text-gray-400">{us.noUsers}</p>
                </td>
              </tr>
            ) : (
              paginated.map((u) => {
                const hasWebAccess = WEB_ACCESS_DEPARTMENTS.includes(u.department ?? "");
                return (
                  <tr key={u.id} className="hover:bg-blue-50/20 transition-colors group">
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm ${hasWebAccess
                          ? "bg-linear-to-br from-blue-500 to-blue-700"
                          : "bg-linear-to-br from-gray-400 to-gray-500"
                          }`}>
                          <span className="text-sm font-bold text-white">{u.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-gray-900">{u.name}</span>
                            {u.id === session?.user?.id && (
                              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">{us.youBadge}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-gray-500">{u.email}</td>
                    <td className="px-4 py-3.5">
                      <span className="text-sm text-gray-600">
                        {u.department ? DEPARTMENT_LABELS[u.department as Department] ?? u.department : "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${hasWebAccess
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                        }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${hasWebAccess ? "bg-green-500" : "bg-gray-400"}`} />
                        {hasWebAccess ? us.webYes : us.webNo}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(u)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {u.id !== session?.user?.id && (
                          <button
                            onClick={() => handleDelete(u)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              {(page - 1) * perPage + 1}–{Math.min(page * perPage, filtered.length)} {us.ofLabel} {filtered.length} {us.usersSuffix}
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
                {editUser ? us.editTitle : us.addTitle}
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
                <label className="block text-xs font-semibold text-gray-600 mb-1">{us.formDept}</label>
                <select
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DEPT_OPTIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{us.formName}</label>
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={us.formNamePh}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{us.formEmail}</label>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="email@company.com"
                />
              </div>

              {/* Alert untuk user yang tidak bisa akses web */}
              {!canAccessWeb && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-800">
                    {us.noWebAlert}
                  </p>
                </div>
              )}

              {/* Field Password hanya muncul untuk departemen dengan akses web */}
              {canAccessWeb && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    {editUser ? us.formPasswordEdit : us.formPassword}
                  </label>
                  <input
                    required={!editUser}
                    type="password"
                    minLength={8}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder={us.formMinPass}
                  />
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                  {editUser ? us.saveChanges : us.addUserBtn}
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {t.cancel}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}