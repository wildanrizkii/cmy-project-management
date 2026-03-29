import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().min(1, "Nama proyek wajib diisi").max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const updateProjectSchema = createProjectSchema.partial();

export const createPhaseSchema = z.object({
  name: z.string().min(1, "Nama fase wajib diisi").max(100),
  description: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  order: z.number().optional(),
  projectId: z.string().min(1),
});

export const createTaskSchema = z.object({
  title: z.string().min(1, "Judul tugas wajib diisi").max(200),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
  duration: z.number().optional(),
  progress: z.number().min(0).max(100).optional(),
  projectId: z.string().min(1),
  phaseId: z.string().optional(),
  assigneeId: z.string().optional(),
  parentId: z.string().optional(),
});

export const updateTaskSchema = createTaskSchema.partial();

export const registerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
});

export const addMemberSchema = z.object({
  email: z.string().email(),
  role: z.enum(["LEADER", "MEMBER"]).optional(),
  projectId: z.string().min(1),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
