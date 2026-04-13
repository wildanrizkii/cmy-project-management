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
    model: "",
    assNumber: "",
    assName: "",
    customer: "",
    description: "",
    projectLeaderId: "",
    priority: "MEDIUM",
    startDate: "",
    targetDate: "",
    kebutuhanMp: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: () => apiFetch("/api/users").then((r) => r.json()),
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
      }),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      const msg = data.error ?? "Failed to create project";
      setError(msg);
      toast("error", msg);
      return;
    }

    toast("success", `Project ${data.assNumber} created successfully`);
    onCreate();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Add New Project</h2>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Model *</label>
              <input
                required
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. CRV Gen-6"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                Assy Number
                <span className="ml-1 text-gray-400 font-normal">(leave blank for auto)</span>
              </label>
              <input
                value={form.assNumber}
                onChange={(e) => setForm({ ...form, assNumber: e.target.value.toUpperCase() })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                placeholder="51400-K1A"
              />
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Assy Name *</label>
              <input
                required
                value={form.assName}
                onChange={(e) => setForm({ ...form, assName: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Assembly name..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Customer *</label>
              <input
                required
                value={form.customer}
                onChange={(e) => setForm({ ...form, customer: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Customer / client name..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Project Leader *</label>
              <select
                required
                value={form.projectLeaderId}
                onChange={(e) => setForm({ ...form, projectLeaderId: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Project Leader...</option>

                {users
                  .filter(
                    (u) =>
                      u.department === "PROJECT_LEADER" ||
                      u.department === "PROJECT_LEADER_COORDINATOR"
                  )
                  .map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} — {DEPARTMENT_LABELS[u.department!] ?? u.role}
                    </option>
                  ))}
              </select>
            </div>

            <div className="col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-16"
                placeholder="Project description (optional)..."
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Priority</label>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Required MP (persons) *</label>
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
              <label className="block text-xs font-semibold text-gray-600 mb-1">Start Date *</label>
              <input
                required
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Target Date *</label>
              <input
                required
                type="date"
                min={form.startDate}
                value={form.targetDate}
                onChange={(e) => setForm({ ...form, targetDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              Create Project
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
