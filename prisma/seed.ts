import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await db.activityLog.deleteMany();
  await db.hinanhyoDR.deleteMany();
  await db.subFase.deleteMany();
  await db.projectFase.deleteMany();
  await db.project.deleteMany();
  await db.session.deleteMany();
  await db.account.deleteMany();
  await db.user.deleteMany();

  const password = await bcrypt.hash("password123", 10);

  // Create users
  const budi = await db.user.create({
    data: {
      name: "Budi Santoso",
      email: "budi@perusahaan.com",
      password,
      role: "ATASAN",
      department: null,
    },
  });

  const rina = await db.user.create({
    data: {
      name: "Rina Wijaya",
      email: "rina@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "PROJECT_LEADER",
    },
  });

  const agus = await db.user.create({
    data: {
      name: "Agus Prasetyo",
      email: "agus@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "ENGINEERING",
    },
  });

  const dewi = await db.user.create({
    data: {
      name: "Dewi Lestari",
      email: "dewi@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "ENGINEERING",
    },
  });

  const faisal = await db.user.create({
    data: {
      name: "Faisal Hakim",
      email: "faisal@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "CCO",
    },
  });

  const siti = await db.user.create({
    data: {
      name: "Siti Rahayu",
      email: "siti@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "PROCUREMENT",
    },
  });

  console.log("✅ Users created");

  const faseTypes = ["RFQ", "DIE_GO", "EVENT_PROJECT", "MASS_PRO"] as const;

  // Helper to create a project with its 4 fases
  async function createProject(data: {
    model: string;
    assNumber: string;
    assName: string;
    customer: string;
    description?: string;
    projectLeaderId: string;
    kebutuhanMp: number;
    aktualMp?: number;
    startDate: Date;
    targetDate: Date;
    priority: "HIGH" | "MEDIUM" | "LOW";
    status: "BELUM_MULAI" | "DALAM_PROSES" | "SELESAI" | "TERLAMBAT" | "TUNDA";
    currentFase: "RFQ" | "DIE_GO" | "EVENT_PROJECT" | "MASS_PRO";
  }) {
    const project = await db.project.create({ data });
    for (const fase of faseTypes) {
      await db.projectFase.create({
        data: { projectId: project.id, fase },
      });
    }
    return project;
  }

  // PRJ-001: Bracket Assembly Honda — In Progress, Event Project
  const prj001 = await createProject({
    model: "CRV Gen-6",
    assNumber: "51400-K1A",
    assName: "Bracket Assembly Honda CRV Gen-6",
    description: "Development and production of bracket assembly for Honda CRV Gen-6. Includes design, prototyping, validation testing, and mass production.",
    customer: "PT. Honda Prospect Motor",
    projectLeaderId: agus.id,
    priority: "HIGH",
    status: "DALAM_PROSES",
    currentFase: "EVENT_PROJECT",
    startDate: new Date("2025-01-01"),
    targetDate: new Date("2025-12-31"),
    kebutuhanMp: 5,
    aktualMp: 6,
  });

  // PRJ-002: Jig Board Toyota — Completed, Mass Pro
  const prj002 = await createProject({
    model: "AGYA 1.2",
    assNumber: "52100-AA",
    assName: "Jig Board Toyota Astra",
    description: "Production of jig board for Toyota Astra assembly line.",
    customer: "Toyota Astra",
    projectLeaderId: rina.id,
    priority: "MEDIUM",
    status: "SELESAI",
    currentFase: "MASS_PRO",
    startDate: new Date("2024-11-15"),
    targetDate: new Date("2025-01-14"),
    kebutuhanMp: 4,
    aktualMp: 4,
  });

  // PRJ-003: Part New Suzuki — Overdue, Die Go
  const prj003 = await createProject({
    model: "ERTIGA 1.5",
    assNumber: "53200-BB",
    assName: "Part New Suzuki Indomobil",
    description: "Development of new parts for Suzuki Indomobil vehicles.",
    customer: "Suzuki Indomobil",
    projectLeaderId: dewi.id,
    priority: "HIGH",
    status: "TERLAMBAT",
    currentFase: "DIE_GO",
    startDate: new Date("2024-10-01"),
    targetDate: new Date("2025-02-28"),
    kebutuhanMp: 6,
    aktualMp: 8,
  });

  // PRJ-004: Checker Board Yamaha — Completed, Mass Pro
  const prj004 = await createProject({
    model: "NMAX 155",
    assNumber: "54300-CC",
    assName: "Checker Board Yamaha Indonesia",
    description: "Production of checker board for Yamaha quality control line.",
    customer: "Yamaha Indonesia",
    projectLeaderId: siti.id,
    priority: "LOW",
    status: "SELESAI",
    currentFase: "MASS_PRO",
    startDate: new Date("2024-12-01"),
    targetDate: new Date("2025-01-15"),
    kebutuhanMp: 3,
    aktualMp: 3,
  });

  // PRJ-005: Press Machine Daihatsu — In Progress, RFQ
  const prj005 = await createProject({
    model: "XENIA 1.3",
    assNumber: "55400-DD",
    assName: "Press Machine Daihatsu",
    description: "Development of press machine for Astra Daihatsu factory.",
    customer: "Astra Daihatsu",
    projectLeaderId: faisal.id,
    priority: "HIGH",
    status: "DALAM_PROSES",
    currentFase: "RFQ",
    startDate: new Date("2025-02-01"),
    targetDate: new Date("2025-07-31"),
    kebutuhanMp: 8,
    aktualMp: 7,
  });

  // PRJ-006: Tooling Mitsubishi — Not Started, RFQ
  const prj006 = await createProject({
    model: "PAJERO SPORT",
    assNumber: "56500-EE",
    assName: "Tooling Mitsubishi Motor",
    description: "Tooling development for Mitsubishi Motor Indonesia.",
    customer: "Mitsubishi Motor",
    projectLeaderId: agus.id,
    priority: "MEDIUM",
    status: "BELUM_MULAI",
    currentFase: "RFQ",
    startDate: new Date("2025-04-01"),
    targetDate: new Date("2025-09-30"),
    kebutuhanMp: 5,
  });

  // PRJ-007: Part Upgrade Isuzu — On Hold, Event Project
  const prj007 = await createProject({
    model: "ELF NMR",
    assNumber: "57600-FF",
    assName: "Part Upgrade Isuzu Astra",
    description: "Part upgrade for Isuzu Astra commercial vehicles.",
    customer: "Isuzu Astra",
    projectLeaderId: rina.id,
    priority: "MEDIUM",
    status: "TUNDA",
    currentFase: "EVENT_PROJECT",
    startDate: new Date("2025-01-15"),
    targetDate: new Date("2025-06-30"),
    kebutuhanMp: 4,
    aktualMp: 4,
  });

  // PRJ-008: Components Hino — In Progress, Die Go
  const prj008 = await createProject({
    model: "RANGER 4X4",
    assNumber: "58700-GG",
    assName: "Components Hino Motors",
    description: "Production of components for Hino Motors trucks.",
    customer: "Hino Motors",
    projectLeaderId: dewi.id,
    priority: "LOW",
    status: "DALAM_PROSES",
    currentFase: "DIE_GO",
    startDate: new Date("2025-03-01"),
    targetDate: new Date("2025-08-31"),
    kebutuhanMp: 6,
    aktualMp: 5,
  });

  console.log("✅ Projects and fases created");

  // ─── SubFases for PRJ-001 (Event Project phase) ───
  const prj001Fases = await db.projectFase.findMany({ where: { projectId: prj001.id } });
  const prj001RFQ = prj001Fases.find((f) => f.fase === "RFQ")!;
  const prj001DieGo = prj001Fases.find((f) => f.fase === "DIE_GO")!;
  const prj001EventProject = prj001Fases.find((f) => f.fase === "EVENT_PROJECT")!;

  // Update fase dates
  await db.projectFase.update({
    where: { id: prj001RFQ.id },
    data: { startDate: new Date("2025-01-01"), targetDate: new Date("2025-01-31") },
  });
  await db.projectFase.update({
    where: { id: prj001DieGo.id },
    data: { startDate: new Date("2025-02-01"), targetDate: new Date("2025-03-31") },
  });
  await db.projectFase.update({
    where: { id: prj001EventProject.id },
    data: { startDate: new Date("2025-04-01"), targetDate: new Date("2025-09-30") },
  });

  const now = new Date("2026-04-11");

  // SubFases for RFQ (done)
  await db.subFase.createMany({
    data: [
      {
        projectFaseId: prj001RFQ.id,
        projectId: prj001.id,
        name: "Drawing Review",
        description: "Initial drawing review and specification alignment",
        picId: agus.id,
        customerStartDate: new Date("2025-01-01"),
        customerTargetDate: new Date("2025-01-15"),
        picStartDate: new Date("2025-01-01"),
        picTargetDate: new Date("2025-01-12"),
        isDone: true,
      },
      {
        projectFaseId: prj001RFQ.id,
        projectId: prj001.id,
        name: "Quotation Submission",
        description: "Prepare and submit quotation to customer",
        picId: faisal.id,
        customerStartDate: new Date("2025-01-10"),
        customerTargetDate: new Date("2025-01-25"),
        picStartDate: new Date("2025-01-10"),
        picTargetDate: new Date("2025-01-22"),
        isDone: true,
      },
    ],
  });

  // SubFases for Event Project (in progress)
  await db.subFase.createMany({
    data: [
      {
        projectFaseId: prj001EventProject.id,
        projectId: prj001.id,
        name: "Dankaku PP1",
        description: "First prototype approval process",
        picId: agus.id,
        customerStartDate: new Date("2025-04-01"),
        customerTargetDate: new Date("2026-05-31"),
        picStartDate: new Date("2025-04-01"),
        picTargetDate: new Date("2026-04-20"),
        isDone: false,
      },
      {
        projectFaseId: prj001EventProject.id,
        projectId: prj001.id,
        name: "FMEA Review",
        description: "Failure Mode and Effect Analysis review",
        picId: dewi.id,
        customerStartDate: new Date("2025-05-01"),
        customerTargetDate: new Date("2026-06-15"),
        picStartDate: new Date("2025-05-01"),
        picTargetDate: new Date("2026-04-13"),
        isDone: false,
      },
      {
        projectFaseId: prj001EventProject.id,
        projectId: prj001.id,
        name: "Trial Shot",
        description: "Trial production run",
        picId: rina.id,
        customerStartDate: new Date("2025-06-01"),
        customerTargetDate: new Date("2026-07-31"),
        picStartDate: new Date("2025-06-01"),
        picTargetDate: new Date("2026-05-15"),
        isDone: false,
      },
    ],
  });

  console.log("✅ SubFases created");

  // ─── Hinanhyo & DR ───
  const hinanhyoData = [
    {
      projectId: prj001.id,
      type: "HINANHYO" as const,
      title: "Dimension Tolerance Exceeded",
      description: "Part dimensions do not match drawing revision 3",
      status: "DITERIMA" as const,
      createdAt: new Date("2025-01-10"),
    },
    {
      projectId: prj001.id,
      type: "DR" as const,
      title: "Material Spec Review",
      description: "Proposed material does not meet JIS standard",
      status: "PENDING" as const,
      createdAt: new Date("2025-01-15"),
    },
    {
      projectId: prj001.id,
      type: "HINANHYO" as const,
      title: "Coating Thickness Inconsistent",
      description: "Coating thickness varies between 8-14 microns, target 10±1 microns",
      status: "DITERIMA" as const,
      createdAt: new Date("2025-01-20"),
    },
    {
      projectId: prj001.id,
      type: "KOMARIGOTO" as const,
      title: "Assembly Noise Issue",
      description: "Friction noise occurring during bracket assembly process",
      status: "PENDING" as const,
      createdAt: new Date("2025-02-10"),
    },
    {
      projectId: prj002.id,
      type: "HINANHYO" as const,
      title: "Cycle Time Below Target",
      description: "Machine cycle time 15% slower than target",
      status: "DITERIMA" as const,
      createdAt: new Date("2025-02-05"),
    },
    {
      projectId: prj002.id,
      type: "DR" as const,
      title: "Jig Fixture Design",
      description: "Jig layout not optimal for left-handed operators",
      status: "DITOLAK" as const,
      createdAt: new Date("2025-02-12"),
    },
    {
      projectId: prj003.id,
      type: "HINANHYO" as const,
      title: "Surface Defect on Part",
      description: "Scratches on surface A that passed QC inspection",
      status: "DITERIMA" as const,
      createdAt: new Date("2025-02-20"),
    },
    {
      projectId: prj003.id,
      type: "VA_VE" as const,
      title: "Paint Process Optimization",
      description: "Propose alternative coating method to reduce cost by 15%",
      status: "PENDING" as const,
      createdAt: new Date("2025-02-25"),
    },
    {
      projectId: prj005.id,
      type: "HINANHYO" as const,
      title: "Motor Spec Mismatch",
      description: "Available motor does not meet minimum torque specification",
      status: "PENDING" as const,
      createdAt: new Date("2025-02-15"),
    },
  ];

  for (const data of hinanhyoData) {
    await db.hinanhyoDR.create({ data });
  }

  console.log("✅ Hinanhyo & DR created");

  // ─── Activity Logs ───
  const activityData = [
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Phase Update",
      detail: "Phase changed from RFQ to Die Go",
      createdAt: new Date("2025-01-20"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Phase Update",
      detail: "Phase changed from Die Go to Event Project",
      createdAt: new Date("2025-02-05"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "SubFase Added",
      detail: "Added SubFase: Dankaku PP1",
      createdAt: new Date("2025-02-20"),
    },
    {
      projectId: prj002.id,
      userId: rina.id,
      action: "Status Update",
      detail: "Project status changed to Completed",
      createdAt: new Date("2025-01-14"),
    },
    {
      projectId: prj003.id,
      userId: budi.id,
      action: "Status Update",
      detail: "Project status automatically changed to Overdue (deadline passed)",
      createdAt: new Date("2025-03-01"),
    },
    {
      projectId: prj007.id,
      userId: budi.id,
      action: "Status Update",
      detail: "Project status changed to On Hold",
      createdAt: new Date("2025-02-28"),
    },
  ];

  for (const data of activityData) {
    await db.activityLog.create({ data });
  }

  console.log("✅ Activity logs created");
  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials (password: password123):");
  console.log("  Manager: budi@perusahaan.com");
  console.log("  PIC:     rina@perusahaan.com");
  console.log("  PIC:     agus@perusahaan.com");
  console.log("  PIC:     dewi@perusahaan.com");
  console.log("  PIC:     faisal@perusahaan.com");
  console.log("  PIC:     siti@perusahaan.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
