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

export type FaseType = "RFQ" | "DIE_GO" | "EVENT_PROJECT" | "MASS_PRO";

export type HinanhyoDRType = "HINANHYO" | "DR" | "KOMARIGOTO" | "VA_VE";
export type HinanhyoDRStatus = "DITERIMA" | "DITOLAK" | "PENDING";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  department: Department | null;
  createdAt: string;
}

export interface SubFase {
  id: string;
  projectFaseId: string;
  projectId: string;
  name: string;
  description: string | null;
  picId: string;
  pic?: User;
  customerStartDate: string | null;
  customerTargetDate: string | null;
  picStartDate: string | null;
  picTargetDate: string | null;
  documentUrl: string | null;
  isDone: boolean;
  gcalEventId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectFase {
  id: string;
  projectId: string;
  fase: FaseType;
  startDate: string | null;
  targetDate: string | null;
  subFases: SubFase[];
  createdAt: string;
  updatedAt: string;
}

export interface Project {
  id: string;
  model: string;
  assNumber: string;
  assName: string;
  customer: string;
  description: string | null;
  projectLeaderId: string;
  projectLeader: User;
  kebutuhanMp: number;
  aktualMp: number | null;
  startDate: string;
  targetDate: string;
  priority: Priority;
  status: ProjectStatus;
  currentFase: FaseType;
  fases?: ProjectFase[];
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
  subFaseId: string | null;
  subFase?: { id: string; name: string } | null;
  type: HinanhyoDRType;
  title: string;
  description: string | null;
  status: HinanhyoDRStatus;
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
  BELUM_MULAI: "Not Started",
  DALAM_PROSES: "In Progress",
  SELESAI: "Completed",
  TERLAMBAT: "Overdue",
  TUNDA: "On Hold",
};

export const FASE_LABELS: Record<FaseType, string> = {
  RFQ: "RFQ",
  DIE_GO: "Die Go",
  EVENT_PROJECT: "Event Project",
  MASS_PRO: "Mass Pro",
};

export const HINANHYO_STATUS_LABELS: Record<HinanhyoDRStatus, string> = {
  DITERIMA: "Accepted",
  DITOLAK: "Rejected",
  PENDING: "Pending",
};

export const HINANHYO_TYPE_LABELS: Record<HinanhyoDRType, string> = {
  HINANHYO: "Hinanhyo",
  DR: "Design Review",
  KOMARIGOTO: "Komarigoto",
  VA_VE: "VA/VE",
};

export const FASE_ORDER: FaseType[] = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"];
