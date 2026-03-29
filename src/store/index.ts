import { create } from "zustand";
import { Project, Task } from "@/types";

interface AppState {
  // Selected project
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;

  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Modal states
  createProjectOpen: boolean;
  setCreateProjectOpen: (open: boolean) => void;
  createTaskOpen: boolean;
  setCreateTaskOpen: (open: boolean) => void;
  selectedTask: Task | null;
  setSelectedTask: (task: Task | null) => void;

  // Active project id for navigation
  activeProjectId: string | null;
  setActiveProjectId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedProject: null,
  setSelectedProject: (project) => set({ selectedProject: project }),

  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),

  createProjectOpen: false,
  setCreateProjectOpen: (open) => set({ createProjectOpen: open }),

  createTaskOpen: false,
  setCreateTaskOpen: (open) => set({ createTaskOpen: open }),

  selectedTask: null,
  setSelectedTask: (task) => set({ selectedTask: task }),

  activeProjectId: null,
  setActiveProjectId: (id) => set({ activeProjectId: id }),
}));
