"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { TaskStatus, Phase } from "@/types";

interface Props {
  projectId: string;
  open: boolean;
  onClose: () => void;
  defaultStatus?: TaskStatus;
}

export function CreateTaskDialog({ projectId, open, onClose, defaultStatus = "TODO" }: Props) {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    status: defaultStatus,
    priority: "MEDIUM",
    startDate: "",
    dueDate: "",
    phaseId: "",
    assigneeId: "",
  });

  const { data: phases } = useQuery<Phase[]>({
    queryKey: ["phases", projectId],
    queryFn: () => fetch(`/api/phases?projectId=${projectId}`).then((r) => r.json()),
    enabled: open,
  });

  const { data: members } = useQuery({
    queryKey: ["project", projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
    enabled: open,
    select: (data) => data.members,
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        projectId,
        phaseId: form.phaseId || undefined,
        assigneeId: form.assigneeId || undefined,
        startDate: form.startDate || undefined,
        dueDate: form.dueDate || undefined,
      }),
    });

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      onClose();
      setForm({ title: "", description: "", status: defaultStatus, priority: "MEDIUM", startDate: "", dueDate: "", phaseId: "", assigneeId: "" });
    }
    setLoading(false);
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tambah Tugas Baru</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Judul Tugas *</Label>
            <Input
              placeholder="Masukkan judul tugas"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              required
            />
          </div>
          <div className="space-y-2">
            <Label>Deskripsi</Label>
            <Textarea
              placeholder="Deskripsi tugas..."
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as TaskStatus }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TODO">Belum</SelectItem>
                  <SelectItem value="IN_PROGRESS">Proses</SelectItem>
                  <SelectItem value="DONE">Selesai</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioritas</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Rendah</SelectItem>
                  <SelectItem value="MEDIUM">Sedang</SelectItem>
                  <SelectItem value="HIGH">Tinggi</SelectItem>
                  <SelectItem value="URGENT">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tanggal Mulai</Label>
              <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>Tenggat Waktu</Label>
              <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
            </div>
          </div>
          {phases && phases.length > 0 && (
            <div className="space-y-2">
              <Label>Fase</Label>
              <Select value={form.phaseId} onValueChange={(v) => setForm((f) => ({ ...f, phaseId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih fase" /></SelectTrigger>
                <SelectContent>
                  {phases.map((phase) => (
                    <SelectItem key={phase.id} value={phase.id}>{phase.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {members && members.length > 0 && (
            <div className="space-y-2">
              <Label>Ditugaskan ke</Label>
              <Select value={form.assigneeId} onValueChange={(v) => setForm((f) => ({ ...f, assigneeId: v }))}>
                <SelectTrigger><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                <SelectContent>
                  {members.map((m: { user: { id: string; name: string | null; email: string } }) => (
                    <SelectItem key={m.user.id} value={m.user.id}>
                      {m.user.name ?? m.user.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Tambah Tugas
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
