export type UserRole = "ATASAN" | "BAWAHAN";

export type Department =
  | "PROJECT_LEADER"
  | "ENGINEER_PRODUCT"
  | "ENGINEERING_NEW_PART"
  | "CCO"
  | "PROCUREMENT";

export type Priority = "HIGH" | "MEDIUM" | "LOW";

export type ProjectStatus =
  | "BELUM_MULAI"
  | "DALAM_PROSES"
  | "SELESAI"
  | "TERLAMBAT"
  | "TUNDA";

export type Fase = "RFQ" | "DIE_GO" | "EVENT_PROJECT" | "MASS_PRO";

export type HinanhyoDRType = "HINANHYO" | "DR";
export type HinanhyoDRStatus = "DITERIMA" | "DITOLAK" | "PENDING";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department | null;
  createdAt: string;
}

export interface Project {
  id: string;
  code: string;
  name: string;
  description: string | null;
  customer: string;
  picId: string;
  pic: User;
  priority: Priority;
  status: ProjectStatus;
  currentFase: Fase;
  startDate: string;
  endDate: string;
  kebutuhanMp: number;
  aktualMp: number | null;
  cycleTimeTarget: number;
  cycleTimeAktual: number | null;
  rfqProgress: number;
  dieGoProgress: number;
  eventProjectProgress: number;
  massProProgress: number;
  overallProgress: number;
  hinanhyoDRs?: HinanhyoDR[];
  activityLogs?: ActivityLog[];
  createdAt: string;
  updatedAt: string;
  _count?: {
    hinanhyoDRs: number;
  };
}

export interface HinanhyoDR {
  id: string;
  projectId: string;
  type: HinanhyoDRType;
  title: string;
  description: string | null;
  status: HinanhyoDRStatus;
  picId: string;
  pic?: User;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  projectId: string;
  userId: string;
  user?: User;
  action: string;
  detail: string | null;
  createdAt: string;
}

// Label maps for UI display
export const DEPARTMENT_LABELS: Record<Department, string> = {
  PROJECT_LEADER: "Project Leader",
  ENGINEER_PRODUCT: "Engineer Product",
  ENGINEERING_NEW_PART: "Engineering New Part",
  CCO: "CCO",
  PROCUREMENT: "Procurement",
};

export const PRIORITY_LABELS: Record<Priority, string> = {
  HIGH: "High",
  MEDIUM: "Medium",
  LOW: "Low",
};

export const STATUS_LABELS: Record<ProjectStatus, string> = {
  BELUM_MULAI: "Belum Mulai",
  DALAM_PROSES: "Dalam Proses",
  SELESAI: "Selesai",
  TERLAMBAT: "Terlambat",
  TUNDA: "Tunda",
};

export const FASE_LABELS: Record<Fase, string> = {
  RFQ: "RFQ",
  DIE_GO: "Die Go",
  EVENT_PROJECT: "Event Project",
  MASS_PRO: "Mass Pro",
};

export const HINANHYO_STATUS_LABELS: Record<HinanhyoDRStatus, string> = {
  DITERIMA: "Diterima",
  DITOLAK: "Ditolak",
  PENDING: "Pending",
};

export const HINANHYO_TYPE_LABELS: Record<HinanhyoDRType, string> = {
  HINANHYO: "Hinanhyo",
  DR: "Design Review",
};
