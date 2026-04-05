"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { X, Loader2 } from "lucide-react";
import type { User } from "@/types";
import { DEPARTMENT_LABELS } from "@/types";
import { useToast } from "@/components/layout/toast-context";

interface Props {
  onClose: () => void;
  onCreate: () => void;
}

export function CreateProjectModal({ onClose, onCreate }: Props) {
  const { toast } = useToast();
  const [form, setForm] = useState({
    code: "",
    name: "",
    description: "",
    customer: "",
    picId: "",
    priority: "MEDIUM",
    startDate: "",
    endDate: "",
    kebutuhanMp: "",
    cycleTimeTarget: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: bawahanList = [] } = useQuery<User[]>({
    queryKey: ["users", "BAWAHAN"],
    queryFn: () => apiFetch("/api/users?role=BAWAHAN").then((r) => r.json()),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);

    const res = await apiFetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        kebutuhanMp: parseInt(form.kebutuhanMp),
        cycleTimeTarget: parseInt(form.cycleTimeTarget),
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      const msg = data.error ?? "Gagal membuat proyek";
      setError(msg);
      toast("error", msg);
      return;
    }

    toast("success", `Proyek ${data.code} berhasil dibuat`);
    onCreate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Tambah Proyek Baru</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Kode Proyek
                <span className="ml-1 text-gray-400 font-normal">(kosongkan untuk auto)</span>
              </label>
              <input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="PRJ-009"
              />
              {form.code && !/^[A-Z0-9][A-Z0-9-]{1,19}$/.test(form.code) && (
                <p className="text-xs text-red-500 mt-1">Format tidak valid. Gunakan huruf kapital, angka, tanda hubung (contoh: PRJ-009)</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Nama Proyek *</label>
              <input
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nama proyek yang unik..."
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Deskripsi</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-16"
                placeholder="Deskripsi proyek (opsional)..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer *</label>
              <input
                required
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Nama pelanggan/klien..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">PIC (Bawahan) *</label>
              <select
                required
                value={form.picId}
                onChange={(e) => setForm({ ...form, picId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Pilih PIC...</option>
                {bawahanList.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} — {DEPARTMENT_LABELS[u.department!] ?? u.department}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Prioritas</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Kebutuhan MP (orang) *</label>
              <input
                required
                type="number"
                min="1"
                value={form.kebutuhanMp}
                onChange={(e) => setForm({ ...form, kebutuhanMp: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 5"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Mulai *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Tanggal Berakhir *</label>
              <input
                required
                type="date"
                min={form.startDate}
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Cycle Time Target (hari kerja) *</label>
              <input
                required
                type="number"
                min="1"
                value={form.cycleTimeTarget}
                onChange={(e) => setForm({ ...form, cycleTimeTarget: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. 90"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Buat Proyek
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Batal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
