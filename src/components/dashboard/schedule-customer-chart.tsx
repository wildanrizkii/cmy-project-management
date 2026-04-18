"use client";
import { useState } from "react";
import { Calendar, ChevronDown } from "lucide-react";
import { useLanguage } from "@/contexts/language-context";

type Revision = {
  id: string;
  revisionDate: string;
  rfqDate: string | null;
  dieGoDate: string | null;
  pp1Date: string | null;
  pp2Date: string | null;
  pp3Date: string | null;
  mpDate: string | null;
  notes: string | null;
};

type ProjectSchedule = {
  projectId: string;
  assNumber: string;
  assName: string;
  revisions: Revision[];
};

interface Props {
  scheduleByProject: ProjectSchedule[];
}

const MILESTONES = [
  { key: "rfqDate", label: "RFQ" },
  { key: "dieGoDate", label: "DIEGO" },
  { key: "pp1Date", label: "PP1" },
  { key: "pp2Date", label: "PP2" },
  { key: "pp3Date", label: "PP3" },
  { key: "mpDate", label: "MP" },
] as const;

function fmt(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

function isChanged(
  revision: Revision,
  prev: Revision | null,
  key: keyof Revision,
): boolean {
  if (!prev) return false;
  const a = revision[key]
    ? new Date(revision[key] as string).toDateString()
    : null;
  const b = prev[key] ? new Date(prev[key] as string).toDateString() : null;
  return a !== b;
}

export function ScheduleCustomerChart({ scheduleByProject }: Props) {
  const { t } = useLanguage();
  const sw = t.scheduleWidget;
  const [selectedProjectId, setSelectedProjectId] = useState<string>("all");

  const filtered =
    selectedProjectId === "all"
      ? scheduleByProject
      : scheduleByProject.filter((p) => p.projectId === selectedProjectId);

  if (scheduleByProject.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center gap-2 mb-1">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">{sw.title}</h2>
        </div>
        <div className="h-48 flex items-center justify-center text-gray-400 text-sm">
          {sw.noData}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-indigo-500" />
          <h2 className="text-sm font-semibold text-gray-900">{sw.title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full font-medium">
            {filtered.length} {sw.projects}
          </span>
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="appearance-none text-xs bg-gray-50 border border-gray-200 rounded-lg pl-2.5 pr-7 py-1.5 text-gray-700 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer max-w-40 truncate"
            >
              <option value="all">{sw.allProjects}</option>
              {scheduleByProject.map((p) => (
                <option key={p.projectId} value={p.projectId}>
                  {p.assNumber} — {p.assName}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Scrollable list — shows 2 fully, rest scrollable */}
      <div
        className="space-y-4 overflow-y-auto pr-1"
        style={{ maxHeight: "320px" }}
      >
        {filtered.map((proj) => (
          <div
            key={proj.projectId}
            className="border border-gray-100 rounded-xl overflow-hidden"
          >
            {/* Project header */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="font-mono text-xs font-semibold bg-white text-gray-600 px-2 py-0.5 rounded border border-gray-200">
                {proj.assNumber}
              </span>
              <span className="text-xs text-gray-600 font-medium truncate">
                {proj.assName}
              </span>
            </div>

            {/* Revisions */}
            {proj.revisions.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-gray-400">
                {sw.noRevisions}
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {proj.revisions.map((rev, i) => {
                  const prev = i > 0 ? proj.revisions[i - 1] : null;
                  return (
                    <div key={rev.id} className="px-4 py-3">
                      <p className="text-[11px] font-semibold text-gray-500 mb-2.5">
                        {fmt(rev.revisionDate)}
                      </p>

                      {/* Line + dots */}
                      <div className="relative h-6 flex items-center">
                        <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gray-300 -translate-y-1/2 rounded-full" />
                        {MILESTONES.map((m) => (
                          <div
                            key={m.key}
                            className="flex-1 flex justify-center relative z-10"
                          >
                            <div className="w-5 h-5 rounded-full bg-yellow-400 border-2 border-yellow-600 shadow-sm" />
                          </div>
                        ))}
                      </div>

                      {/* Labels + dates */}
                      <div className="flex mt-1.5">
                        {MILESTONES.map((m) => {
                          const changed = isChanged(
                            rev,
                            prev,
                            m.key as keyof Revision,
                          );
                          const val = rev[m.key as keyof Revision] as
                            | string
                            | null;
                          return (
                            <div key={m.key} className="flex-1 text-center">
                              <p className="text-[9px] font-bold text-gray-500 uppercase">
                                {m.label}
                              </p>
                              <p
                                className={`text-[9px] mt-0.5 leading-tight whitespace-nowrap ${changed ? "text-blue-600 font-semibold" : "text-gray-500"}`}
                              >
                                {fmt(val)}
                              </p>
                            </div>
                          );
                        })}
                      </div>

                      {rev.notes && (
                        <p className="text-[10px] text-gray-400 mt-1.5 italic">
                          {rev.notes}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <p className="mt-3 text-[10px] text-gray-400">
        <span className="text-blue-600 font-semibold">●</span> {sw.legend}
      </p>
    </div>
  );
}
