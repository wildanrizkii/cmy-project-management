export type ProjectStatus = "ACTIVE" | "COMPLETED" | "ARCHIVED" | "ON_HOLD";
export type TaskStatus = "TODO" | "IN_PROGRESS" | "DONE";
export type Priority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";
export type ProjectRole = "LEADER" | "MEMBER";

export interface Project {
  id: string;
  name: string;
  description?: string | null;
  status: ProjectStatus;
  startDate?: string | null;
  endDate?: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
  owner?: { id: string; name: string | null; email: string; image?: string | null };
  members?: Member[];
  phases?: Phase[];
  _count?: { tasks: number; members: number };
}

export interface Phase {
  id: string;
  name: string;
  description?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  order: number;
  projectId: string;
  tasks?: Task[];
}

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  status: TaskStatus;
  priority: Priority;
  startDate?: string | null;
  dueDate?: string | null;
  duration?: number | null;
  progress: number;
  projectId: string;
  phaseId?: string | null;
  assigneeId?: string | null;
  createdById: string;
  parentId?: string | null;
  createdAt: string;
  updatedAt: string;
  assignee?: { id: string; name: string | null; email: string; image?: string | null } | null;
  phase?: Phase | null;
  subtasks?: Task[];
}

export interface Member {
  id: string;
  userId: string;
  projectId: string;
  role: ProjectRole;
  joinedAt: string;
  user?: { id: string; name: string | null; email: string; image?: string | null };
}

// Gantt types
export interface GanttTask {
  id: string;
  text: string;
  start_date: string;
  duration: number;
  progress: number;
  parent?: string;
  type?: string;
}

// Kanban column types
export interface KanbanColumn {
  id: TaskStatus;
  title: string;
  tasks: Task[];
}
