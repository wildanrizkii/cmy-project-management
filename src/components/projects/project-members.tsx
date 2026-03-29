"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Project } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { UserPlus, Trash2, Loader2 } from "lucide-react";

export function ProjectMembers({ project }: { project: Project }) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("MEMBER");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch(`/api/projects/${project.id}/members`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, role }),
    });

    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["project", project.id] });
      setEmail("");
    } else {
      const data = await res.json();
      setError(data.error ?? "Terjadi kesalahan");
    }
    setLoading(false);
  }

  async function handleRemove(userId: string) {
    await fetch(`/api/projects/${project.id}/members`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId }),
    });
    queryClient.invalidateQueries({ queryKey: ["project", project.id] });
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Anggota Proyek ({project.members?.length ?? 0})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {project.members?.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src={member.user?.image ?? ""} />
                    <AvatarFallback className="bg-primary/10 text-primary text-sm">
                      {(member.user?.name ?? member.user?.email ?? "?")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm">{member.user?.name ?? member.user?.email}</p>
                    <p className="text-xs text-muted-foreground">{member.user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className={
                      member.role === "LEADER"
                        ? "bg-blue-50 text-blue-700"
                        : "bg-gray-50 text-gray-700"
                    }
                  >
                    {member.role === "LEADER" ? "Leader" : "Member"}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(member.userId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div>
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <UserPlus className="h-4 w-4" /> Tambah Anggota
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAdd} className="space-y-3">
              {error && (
                <div className="p-2.5 rounded-md bg-red-50 text-red-700 text-sm">{error}</div>
              )}
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  placeholder="user@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={role} onValueChange={setRole}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LEADER">Leader</SelectItem>
                    <SelectItem value="MEMBER">Member</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                Tambah
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
