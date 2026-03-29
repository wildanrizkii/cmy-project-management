"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppStore } from "@/store";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";

export function CreateProjectDialog() {
  const { createProjectOpen, setCreateProjectOpen } = useAppStore();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "",
    description: "",
    startDate: "",
    endDate: "",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      setCreateProjectOpen(false);
      setForm({ name: "", description: "", startDate: "", endDate: "" });
    } else {
      const data = await res.json();
      setError(data.error?.fieldErrors?.name?.[0] ?? "Terjadi kesalahan");
    }
    setLoading(false);
  }

  return (
    <Dialog open={createProjectOpen} onOpenChange={setCreateProjectOpen}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Buat Proyek Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="p-3 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>}
          <div className="space-y-2">
            <Label htmlFor="name">Nama Proyek *</Label>
            <Input
              id="name"
              placeholder="Contoh: Website Perusahaan"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Deskripsi</Label>
            <Textarea
              id="desc"
              placeholder="Deskripsi proyek..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="startDate">Tanggal Mulai</Label>
              <Input
                id="startDate"
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Tanggal Selesai</Label>
              <Input
                id="endDate"
                type="date"
                value={form.endDate}
                onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateProjectOpen(false)}>
              Batal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Buat Proyek
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
