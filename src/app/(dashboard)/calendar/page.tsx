"use client";
import { apiFetch } from "@/lib/fetch-client";

import { useState, useMemo, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Calendar, List, LayoutGrid, ChevronLeft, ChevronRight, CheckCircle2, Clock, AlertTriangle, AlertCircle, Info, X, Edit2, Save, Loader2 } from "lucide-react";
import { FASE_LABELS } from "@/types";
import type { FaseType } from "@/types";
import { formatDate } from "@/lib/utils";

type EventStatus = "ON_PROGRESS" | "NEAR_DEADLINE" | "LATE_INTERNAL" | "LATE_CRITICAL" | "DONE";

type CalendarEvent = {
  id: string;
  subFaseName: string;
  projectId: string;
  assNumber: string;
  assName: string;
  customer: string;
  fase: FaseType;
  picId: string;
  picName: string;
  picStartDate: string | null;
  picTargetDate: string | null;
  customerStartDate: string | null;
  customerTargetDate: string | null;
  isDone: boolean;
  status: EventStatus;
  daysFromPicTarget: number;
  bufferCustomerDays: number | null;
};

const STATUS_CONFIG: Record<EventStatus, { label: string; color: string; bg: string; border: string; dot: string; icon: React.ElementType }> = {
  ON_PROGRESS: { label: "On Progress", color: "text-blue-700", bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", icon: Clock },
  NEAR_DEADLINE: { label: "Near Deadline", color: "text-yellow-700", bg: "bg-yellow-50", border: "border-yellow-200", dot: "bg-yellow-400", icon: Info },
  LATE_INTERNAL: { label: "Late Internal", color: "text-orange-700", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", icon: AlertCircle },
  LATE_CRITICAL: { label: "Late Critical", color: "text-red-700", bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", icon: AlertTriangle },
  DONE: { label: "Done", color: "text-green-700", bg: "bg-green-50", border: "border-green-200", dot: "bg-green-500", icon: CheckCircle2 },
};

type ViewMode = "list" | "month";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Edit Event Modal Component
function EditEventModal({
  isOpen,
  onClose,
  event,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  event: CalendarEvent | null;
  onSave: (updatedEvent: CalendarEvent) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    picStartDate: "",
    picTargetDate: "",
    customerStartDate: "",
    customerTargetDate: "",
  });

  // Reset form when event changes
  useMemo(() => {
    if (event) {
      setForm({
        picStartDate: event.picStartDate?.slice(0, 10) ?? "",
        picTargetDate: event.picTargetDate?.slice(0, 10) ?? "",
        customerStartDate: event.customerStartDate?.slice(0, 10) ?? "",
        customerTargetDate: event.customerTargetDate?.slice(0, 10) ?? "",
      });
    }
  }, [event]);

  if (!isOpen || !event) return null;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch(`/api/subfases/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          picStartDate: form.picStartDate || null,
          picTargetDate: form.picTargetDate || null,
          customerStartDate: form.customerStartDate || null,
          customerTargetDate: form.customerTargetDate || null,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to update");
      }

      // Create updated event object
      const updatedEvent: CalendarEvent = {
        ...event,
        picStartDate: form.picStartDate || null,
        picTargetDate: form.picTargetDate || null,
        customerStartDate: form.customerStartDate || null,
        customerTargetDate: form.customerTargetDate || null,
      };

      onSave(updatedEvent);
      onClose();
    } catch (error) {
      console.error("Failed to save:", error);
      alert("Failed to save changes. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Edit Event Dates</h3>
            <p className="text-sm text-gray-500 truncate max-w-62.5">{event.subFaseName}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">PIC Start Date</label>
              <input
                type="date"
                value={form.picStartDate}
                onChange={(e) => setForm({ ...form, picStartDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">PIC Target Date</label>
              <input
                type="date"
                value={form.picTargetDate}
                onChange={(e) => setForm({ ...form, picTargetDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Start Date</label>
              <input
                type="date"
                value={form.customerStartDate}
                onChange={(e) => setForm({ ...form, customerStartDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Customer Target Date</label>
              <input
                type="date"
                value={form.customerTargetDate}
                onChange={(e) => setForm({ ...form, customerTargetDate: e.target.value })}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Event Info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-600 space-y-1">
            <p><span className="font-medium">Project:</span> {event.assNumber} - {event.assName}</p>
            <p><span className="font-medium">PIC:</span> {event.picName}</p>
            <p><span className="font-medium">Phase:</span> {FASE_LABELS[event.fase]}</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Saving..." : "Save Changes"}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event, onEdit }: { event: CalendarEvent; onEdit: (event: CalendarEvent) => void }) {
  const cfg = STATUS_CONFIG[event.status];
  const Icon = cfg.icon;

  return (
    <div className={`rounded-lg border p-3 ${cfg.bg} ${cfg.border} group relative`}>
      {/* Edit Button - appears on hover */}
      <button
        onClick={() => onEdit(event)}
        className="absolute top-2 right-2 p-1.5 text-blue-500 hover:text-blue-600 bg-white/80 rounded-lg transition-all"
        title="Edit dates"
      >
        <Edit2 className="w-4 h-4" />
      </button>

      <div className="flex items-start justify-between gap-2 mb-1 pr-8">
        <div className="flex items-center gap-1.5 min-w-0">
          <Icon className={`w-3.5 h-3.5 shrink-0 ${cfg.color}`} />
          <span className={`text-xs font-semibold ${cfg.color}`}>{cfg.label}</span>
        </div>
        <span className="text-xs font-mono text-gray-400 shrink-0">{event.assNumber}</span>
      </div>
      <p className="text-sm font-semibold text-gray-900 leading-snug mb-0.5">{event.subFaseName}</p>
      <p className="text-xs text-gray-500 mb-2">{event.assName} · {FASE_LABELS[event.fase]}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
        <span>PIC: <span className="font-medium text-gray-700">{event.picName}</span></span>
        {event.picTargetDate && (
          <span>PIC Target: <span className="font-medium text-gray-700">{formatDate(event.picTargetDate)}</span></span>
        )}
        {event.customerTargetDate && (
          <span>Cust. Target: <span className="font-medium text-gray-700">{formatDate(event.customerTargetDate)}</span></span>
        )}
      </div>
      {!event.isDone && event.picTargetDate && (
        <p className={`text-xs font-medium mt-1.5 ${cfg.color}`}>
          {event.daysFromPicTarget < 0
            ? `Overdue by ${Math.abs(event.daysFromPicTarget)} day(s) from PIC target`
            : event.daysFromPicTarget === 0
              ? "Due today"
              : `${event.daysFromPicTarget} day(s) remaining`}
        </p>
      )}
    </div>
  );
}

// Popup Modal Component
function DayEventsModal({
  isOpen,
  onClose,
  date,
  events,
  onEditEvent,
}: {
  isOpen: boolean;
  onClose: () => void;
  date: Date | null;
  events: CalendarEvent[];
  onEditEvent: (event: CalendarEvent) => void;
}) {
  if (!isOpen || !date) return null;

  const formattedDate = date.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric"
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Events on {formattedDate}</h3>
            <p className="text-sm text-gray-500">{events.length} event(s)</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {events.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Calendar className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No events on this date</p>
            </div>
          ) : (
            <div className="space-y-3">
              {events.map((ev) => (
                <EventCard key={ev.id} event={ev} onEdit={onEditEvent} />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [filterLeader, setFilterLeader] = useState("");
  const [filterPic, setFilterPic] = useState("");
  const [filterFase, setFilterFase] = useState<FaseType | "">("");
  const [filterStatus, setFilterStatus] = useState("");

  // State untuk popup day events
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // State untuk edit event
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const params = new URLSearchParams();
  if (filterLeader) params.set("leaderId", filterLeader);
  if (filterPic) params.set("picId", filterPic);
  if (filterFase) params.set("fase", filterFase);
  if (filterStatus) params.set("status", filterStatus);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["calendar", filterLeader, filterPic, filterFase, filterStatus],
    queryFn: () => apiFetch(`/api/calendar?${params}`).then((r) => r.json()),
  });

  const [events, setEvents] = useState<CalendarEvent[]>([]);

  // Sync events with data
  useEffect(() => {
    if (data?.events) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEvents(data.events);
    }
  }, [data]);

  const filterOptions = data?.filterOptions ?? { leaders: [], pics: [] };

  // Group events by picTargetDate for month view
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      if (!ev.picTargetDate) continue;
      const key = ev.picTargetDate.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  // Calendar grid for month view
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days: (Date | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(new Date(year, month, d));
    // Fill to complete last week
    while (days.length % 7 !== 0) days.push(null);
    return days;
  }, [currentMonth]);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

  const hasFilters = filterLeader || filterPic || filterFase || filterStatus;

  // Handler untuk klik tanggal
  const handleDayClick = (day: Date) => {
    setSelectedDate(day);
    setIsModalOpen(true);
  };

  // Handler tutup modal
  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedDate(null);
  };

  // Handler untuk edit event dari List View
  const handleEditEvent = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  // Handler untuk edit event dari Day Modal
  const handleEditEventFromModal = (event: CalendarEvent) => {
    setEditingEvent(event);
    setIsEditModalOpen(true);
  };

  // Handler save event
  const handleSaveEvent = (updatedEvent: CalendarEvent) => {
    // Update local state
    setEvents(prev => prev.map(ev => ev.id === updatedEvent.id ? updatedEvent : ev));

    // Invalidate query to refresh data
    queryClient.invalidateQueries({ queryKey: ["calendar"] });

    // Also refetch to ensure consistency
    refetch();
  };

  // Handler tutup edit modal
  const handleCloseEditModal = () => {
    setIsEditModalOpen(false);
    setEditingEvent(null);
  };

  // Get events untuk tanggal yang dipilih
  const selectedDateEvents = useMemo(() => {
    if (!selectedDate) return [];
    const key = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, "0")}-${String(selectedDate.getDate()).padStart(2, "0")}`;
    return eventsByDate.get(key) ?? [];
  }, [selectedDate, eventsByDate]);

  return (
    <div className="p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calendar of Events</h1>
          <p className="text-sm text-gray-500 mt-0.5">{events.length} SubPhase event(s)</p>
        </div>
        {/* View mode toggle */}
        <div className="flex items-center bg-gray-100 p-1 rounded-xl gap-1">
          <button
            onClick={() => setViewMode("list")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "list" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            <List className="w-4 h-4" /> List
          </button>
          <button
            onClick={() => setViewMode("month")}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${viewMode === "month" ? "bg-white shadow text-blue-600" : "text-gray-500 hover:text-gray-700"}`}
          >
            <LayoutGrid className="w-4 h-4" /> Month
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <select
          value={filterLeader}
          onChange={(e) => setFilterLeader(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All Project Leaders</option>
          {filterOptions.leaders.map((l: { id: string; name: string }) => (
            <option key={l.id} value={l.id}>{l.name}</option>
          ))}
        </select>
        <select
          value={filterPic}
          onChange={(e) => setFilterPic(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All PICs</option>
          {filterOptions.pics.map((p: { id: string; name: string }) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <select
          value={filterFase}
          onChange={(e) => setFilterFase(e.target.value as FaseType | "")}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All Phases</option>
          {Object.entries(FASE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-700"
        >
          <option value="">All Statuses</option>
          <option value="HIDE_DONE">Hide Completed</option>
          <option value="ONLY_LATE">Late Only</option>
        </select>
        {hasFilters && (
          <button
            onClick={() => { setFilterLeader(""); setFilterPic(""); setFilterFase(""); setFilterStatus(""); }}
            className="px-3 py-2 text-sm text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Reset
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(STATUS_CONFIG).map(([status, cfg]) => {
          return (
            <div key={status} className="flex items-center gap-1.5 text-xs text-gray-600">
              <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
              {cfg.label}
            </div>
          );
        })}
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-gray-400">
          <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          Loading events...
        </div>
      ) : viewMode === "list" ? (
        /* List View */
        <div className="space-y-3">
          {events.length === 0 ? (
            <div className="py-16 text-center text-gray-400 bg-white rounded-xl border border-gray-100">
              <Calendar className="w-8 h-8 mx-auto mb-2 text-gray-200" />
              No events found
            </div>
          ) : (
            events.map((ev) => <EventCard key={ev.id} event={ev} onEdit={handleEditEvent} />)
          )}
        </div>
      ) : (
        /* Month View */
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {/* Month navigation */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h2 className="text-base font-bold text-gray-900">
              {MONTHS[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 border-b border-gray-100">
            {DAYS.map((d) => (
              <div key={d} className="py-2 text-center text-xs font-semibold text-gray-500 uppercase">
                {d}
              </div>
            ))}
          </div>

          {/* Calendar grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-gray-50">
            {calendarDays.map((day, idx) => {
              if (!day) return <div key={`empty-${idx}`} className="min-h-24 bg-gray-50/50" />;

              const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
              const dayEvents = eventsByDate.get(key) ?? [];
              const isToday = key === todayKey;
              const hasEvents = dayEvents.length > 0;

              return (
                <div
                  key={key}
                  onClick={() => handleDayClick(day)}
                  className={`min-h-24 p-1.5 transition-colors ${isToday ? "bg-blue-50/50" : ""
                    } ${hasEvents
                      ? "cursor-pointer hover:bg-blue-50/70"
                      : "cursor-pointer hover:bg-gray-50"
                    }`}
                >
                  <div className={`text-xs font-semibold mb-1 w-6 h-6 flex items-center justify-center rounded-full ${isToday ? "bg-blue-600 text-white" : "text-gray-500"
                    }`}>
                    {day.getDate()}
                  </div>
                  <div className="space-y-0.5">
                    {dayEvents.slice(0, 3).map((ev) => {
                      const cfg = STATUS_CONFIG[ev.status];
                      return (
                        <div key={ev.id} className={`text-[10px] font-medium px-1 py-0.5 rounded truncate ${cfg.bg} ${cfg.color}`}>
                          {ev.subFaseName}
                        </div>
                      );
                    })}
                    {dayEvents.length > 3 && (
                      <div className="text-[10px] text-gray-400 px-1">+{dayEvents.length - 3} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day Events Popup Modal */}
      <DayEventsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        date={selectedDate}
        events={selectedDateEvents}
        onEditEvent={handleEditEventFromModal}
      />

      {/* Edit Event Modal */}
      <EditEventModal
        isOpen={isEditModalOpen}
        onClose={handleCloseEditModal}
        event={editingEvent}
        onSave={handleSaveEvent}
      />
    </div>
  );
}