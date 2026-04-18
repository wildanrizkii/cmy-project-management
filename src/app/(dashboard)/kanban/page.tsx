"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { AlertCircle, Clock, Users, LayoutGrid } from "lucide-react";
import { KanbanLoader } from "@/components/layout/page-loader";
import {
  getPriorityColor, getFaseColor, formatDate, getDaysRemaining, computeProjectProgress, computeFaseProgress,
} from "@/lib/utils";
import {
  STATUS_LABELS, FASE_LABELS, PRIORITY_LABELS,
} from "@/types";
import type { Project, ProjectStatus, FaseType } from "@/types";
import { ProjectDetailModal } from "@/components/proyek/project-detail-modal";
import { useToast } from "@/components/layout/toast-context";
import { useLanguage } from "@/contexts/language-context";
import { X } from "lucide-react";

type Mode = "status" | "fase";

const STATUS_COLUMNS: { id: ProjectStatus; label: string; color: string }[] = [
  { id: "BELUM_MULAI", label: "Not Started", color: "bg-gray-100 border-gray-300" },
  { id: "DALAM_PROSES", label: "In Progress", color: "bg-blue-50 border-blue-300" },
  { id: "TERLAMBAT", label: "Overdue", color: "bg-red-50 border-red-300" },
  { id: "TUNDA", label: "On Hold", color: "bg-orange-50 border-orange-300" },
  { id: "SELESAI", label: "Completed", color: "bg-green-50 border-green-300" },
];

const FASE_COLUMNS: { id: FaseType; label: string; color: string }[] = [
  { id: "RFQ", label: "RFQ", color: "bg-blue-50 border-blue-300" },
  { id: "DIE_GO", label: "Die Go", color: "bg-green-50 border-green-300" },
  { id: "EVENT_PROJECT", label: "Event Project", color: "bg-emerald-50 border-emerald-300" },
  { id: "MASS_PRO", label: "Mass Pro", color: "bg-yellow-50 border-yellow-300" },
];

export default function KanbanPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useLanguage();
  const kb = t.kanban;
  const [mode, setMode] = useState<Mode>("status");
  const [confirmSelesai, setConfirmSelesai] = useState<{ id: string; assName: string } | null>(null);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [filterLeader, setFilterLeader] = useState("");
  const [filterPriority, setFilterPriority] = useState("");
  const [expandedCols, setExpandedCols] = useState<Set<string>>(new Set());
  const COL_LIMIT = 5;

  const { data: projects = [], isLoading } = useQuery<Project[]>({
    queryKey: ["projects"],
    queryFn: () => apiFetch("/api/projects").then((r) => r.json()),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, string> }) =>
      apiFetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      if (vars.data.status) toast("success", `Status updated to ${STATUS_LABELS[vars.data.status as ProjectStatus]}`);
      if (vars.data.currentFase) toast("success", `Phase updated to ${FASE_LABELS[vars.data.currentFase as FaseType]}`);
    },
    onError: () => toast("error", "Failed to update project"),
  });

  const filtered = projects.filter((p) => {
    if (filterLeader && p.projectLeaderId !== filterLeader) return false;
    if (filterPriority && p.priority !== filterPriority) return false;
    return true;
  });

  const columns = mode === "status" ? STATUS_COLUMNS : FASE_COLUMNS;

  const getColumnProjects = (columnId: string) =>
    filtered.filter((p) =>
      mode === "status" ? p.status === columnId : p.currentFase === columnId
    );

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;

    const project = projects.find((p) => p.id === draggableId);
    if (!project) return;

    const targetId = destination.droppableId;

    if (mode === "status") {
      if (targetId === "SELESAI") {
        setConfirmSelesai({ id: draggableId, assName: project.assName });
        return;
      }
      updateMutation.mutate({ id: draggableId, data: { status: targetId } });
    } else {
      // Fase mode: validate previous fase is 100%
      const faseOrder: FaseType[] = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"];
      const targetIdx = faseOrder.indexOf(targetId as FaseType);
      if (targetIdx > 0) {
        const prevFase = faseOrder[targetIdx - 1];
        const prevFaseData = project.fases?.find((f) => f.fase === prevFase);
        const prevProgress = prevFaseData ? computeFaseProgress(prevFaseData.subFases ?? []) : 0;
        if (prevProgress < 100) {
          toast("error", `Phase ${FASE_LABELS[prevFase]} is not 100% complete - cannot move to ${FASE_LABELS[targetId as FaseType]}`);
          return;
        }
      }
      updateMutation.mutate({ id: draggableId, data: { currentFase: targetId } });
    }
  };

  const uniqueLeaders = Array.from(
    new Map(projects.map((p) => [p.projectLeaderId, p.projectLeader])).values()
  ).filter(Boolean);

  if (isLoading) return <KanbanLoader />;

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header bar */}
      <div className="px-6 py-4 bg-white border-b border-gray-100 shrink-0 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Kanban Board</h1>
            <p className="text-sm text-gray-500">{filtered.length} {kb.projectCount}</p>
          </div>

          {/* Mode toggle */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
            <button
              onClick={() => setMode("status")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "status" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {kb.byStatus}
            </button>
            <button
              onClick={() => setMode("fase")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === "fase" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              {kb.byPhase}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <select
            value={filterLeader}
            onChange={(e) => setFilterLeader(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">{kb.allLeaders}</option>
            {uniqueLeaders.map((leader) => leader && (
              <option key={leader.id} value={leader.id}>{leader.name}</option>
            ))}
          </select>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
          >
            <option value="">{kb.allPriorities}</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {(filterLeader || filterPriority) && (
            <button
              onClick={() => { setFilterLeader(""); setFilterPriority(""); }}
              className="px-3 py-1.5 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              {t.reset}
            </button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-4 h-full min-w-max">
            {columns.map((col) => {
              const colProjects = getColumnProjects(col.id);
              const isExpanded = expandedCols.has(col.id);
              const visible = isExpanded ? colProjects : colProjects.slice(0, COL_LIMIT);
              const hidden = colProjects.length - COL_LIMIT;
              return (
                <div key={col.id} className={`flex flex-col w-72 rounded-2xl border-2 ${col.color}`}>
                  {/* Column header */}
                  <div className="px-4 py-3 border-b border-current/10">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-gray-800">{col.label}</span>
                      <span className="text-xs font-bold text-gray-500 bg-white/70 px-2 py-0.5 rounded-full">
                        {colProjects.length}
                      </span>
                    </div>
                  </div>

                  {/* Cards */}
                  <Droppable droppableId={col.id}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 p-3 space-y-3 overflow-y-auto transition-colors ${
                          snapshot.isDraggingOver ? "bg-white/50" : ""
                        }`}
                      >
                        {visible.map((project, index) => (
                          <KanbanCard
                            key={project.id}
                            project={project}
                            index={index}
                            onClick={() => setSelectedProject(project)}
                          />
                        ))}
                        {provided.placeholder}
                        {colProjects.length === 0 && (
                          <div className="py-8 text-center text-gray-400 text-xs">
                            {kb.noProjects}
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>

                  {/* Show more / less */}
                  {colProjects.length > COL_LIMIT && (
                    <button
                      onClick={() =>
                        setExpandedCols((prev) => {
                          const next = new Set(prev);
                          if (isExpanded) next.delete(col.id);
                          else next.add(col.id);
                          return next;
                        })
                      }
                      className="mx-3 mb-3 py-1.5 text-xs text-gray-500 hover:text-gray-800 bg-white/60 hover:bg-white/90 rounded-lg border border-current/10 transition-colors"
                    >
                      {isExpanded ? kb.showLess : `+${hidden} ${kb.moreSuffix}`}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </DragDropContext>
      </div>

      {selectedProject && (
        <ProjectDetailModal
          project={selectedProject}
          onClose={() => setSelectedProject(null)}
          onUpdate={(updated) => {
            setSelectedProject(updated);
            queryClient.invalidateQueries({ queryKey: ["projects"] });
          }}
        />
      )}

      {/* Confirm Complete Modal */}
      {confirmSelesai && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmSelesai(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <span className="text-green-600 text-lg">✓</span>
              </div>
              <button onClick={() => setConfirmSelesai(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
            <h3 className="text-base font-bold text-gray-900 mb-1">{kb.confirmComplete}</h3>
            <p className="text-sm text-gray-500 mb-5">
              Project <span className="font-medium text-gray-800">{confirmSelesai.assName}</span> {kb.confirmCompleteMsg}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  updateMutation.mutate({ id: confirmSelesai.id, data: { status: "SELESAI" } });
                  setConfirmSelesai(null);
                }}
                className="flex-1 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {kb.yesComplete}
              </button>
              <button
                onClick={() => setConfirmSelesai(null)}
                className="flex-1 py-2.5 border border-gray-200 hover:bg-gray-50 text-gray-600 rounded-lg text-sm font-medium transition-colors"
              >
                {t.cancel}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KanbanCard({
  project,
  index,
  onClick,
}: {
  project: Project;
  index: number;
  onClick: () => void;
}) {
  const daysLeft = getDaysRemaining(project.targetDate);
  const isLate = daysLeft < 0;
  const isNear = !isLate && daysLeft <= 7;

  const progress = computeProjectProgress(project.fases ?? []);
  const pendingCount = project._count?.hinanhyoDRs ?? 0;

  return (
    <Draggable draggableId={project.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`bg-white rounded-xl shadow-sm border border-gray-100 p-4 cursor-pointer hover:shadow-md transition-all ${
            snapshot.isDragging ? "rotate-1 shadow-xl" : ""
          }`}
        >
          {/* Top row */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="font-mono text-xs text-gray-400">{project.assNumber}</span>
            <span className={`inline-flex px-1.5 py-0.5 rounded text-xs font-semibold ${getPriorityColor(project.priority)}`}>
              {PRIORITY_LABELS[project.priority]}
            </span>
          </div>

          {/* Name */}
          <h3 className="text-sm font-semibold text-gray-900 mb-0.5 leading-snug line-clamp-2">
            {project.assName}
          </h3>
          <p className="text-xs text-gray-400 mb-1">{project.model}</p>
          <p className="text-xs text-gray-400 mb-3">{project.customer}</p>

          {/* Progress */}
          <div className="mb-3">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500">Progress</span>
              <span className="text-xs font-semibold text-blue-600">{progress}%</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full">
              <div
                className="h-1.5 bg-blue-500 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* Bottom row */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-1 text-gray-500">
              <Users className="w-3 h-3" />
              <span className="truncate max-w-20">{project.projectLeader?.name?.split(" ")[0]}</span>
            </div>

            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <span className="flex items-center gap-0.5 text-orange-600 font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {pendingCount}
                </span>
              )}
              <span className={`flex items-center gap-0.5 font-medium text-xs ${isLate ? "text-red-600" : isNear ? "text-yellow-600" : "text-gray-500"}`}>
                <Clock className="w-3 h-3 shrink-0" />
                {isLate
                  ? `Overdue ${-daysLeft}d`
                  : daysLeft === 0
                  ? "Today"
                  : `${daysLeft}d left`}
              </span>
            </div>
          </div>
        </div>
      )}
    </Draggable>
  );
}
