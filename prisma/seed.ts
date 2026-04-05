import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const db = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Clean up existing data
  await db.activityLog.deleteMany();
  await db.hinanhyoDR.deleteMany();
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
      department: "ENGINEER_PRODUCT",
    },
  });

  const dewi = await db.user.create({
    data: {
      name: "Dewi Lestari",
      email: "dewi@perusahaan.com",
      password,
      role: "BAWAHAN",
      department: "ENGINEERING_NEW_PART",
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

  // PRJ-001: Bracket Assembly Honda — Dalam Proses, Event Project
  const prj001 = await db.project.create({
    data: {
      code: "PRJ-001",
      name: "Bracket Assembly Honda CRV Gen-6",
      description:
        "Pengembangan dan produksi bracket assembly untuk kendaraan Honda CRV generasi ke-6. Meliputi desain, prototyping, uji validasi, dan mass production.",
      customer: "PT. Honda Prospect Motor",
      picId: agus.id,
      priority: "HIGH",
      status: "DALAM_PROSES",
      currentFase: "EVENT_PROJECT",
      startDate: new Date("2025-01-01"),
      endDate: new Date("2025-03-31"),
      kebutuhanMp: 5,
      aktualMp: 6,
      cycleTimeTarget: 90,
      cycleTimeAktual: null,
      rfqProgress: 100,
      dieGoProgress: 100,
      eventProjectProgress: 48,
      massProProgress: 0,
      overallProgress: 62,
    },
  });

  // PRJ-002: Jig Board Toyota — Selesai, Mass Pro
  const prj002 = await db.project.create({
    data: {
      code: "PRJ-002",
      name: "Jig Board Toyota Astra",
      description: "Pembuatan jig board untuk lini produksi Toyota Astra.",
      customer: "Toyota Astra",
      picId: rina.id,
      priority: "MEDIUM",
      status: "SELESAI",
      currentFase: "MASS_PRO",
      startDate: new Date("2024-11-15"),
      endDate: new Date("2025-01-14"),
      kebutuhanMp: 4,
      aktualMp: 4,
      cycleTimeTarget: 60,
      cycleTimeAktual: 55,
      rfqProgress: 100,
      dieGoProgress: 100,
      eventProjectProgress: 100,
      massProProgress: 100,
      overallProgress: 100,
    },
  });

  // PRJ-003: Part New Suzuki — Terlambat, Die Go
  const prj003 = await db.project.create({
    data: {
      code: "PRJ-003",
      name: "Part New Suzuki Indomobil",
      description: "Pengembangan part baru untuk kendaraan Suzuki.",
      customer: "Suzuki Indomobil",
      picId: dewi.id,
      priority: "HIGH",
      status: "TERLAMBAT",
      currentFase: "DIE_GO",
      startDate: new Date("2024-10-01"),
      endDate: new Date("2025-02-28"),
      kebutuhanMp: 6,
      aktualMp: 8,
      cycleTimeTarget: 120,
      cycleTimeAktual: 135,
      rfqProgress: 100,
      dieGoProgress: 60,
      eventProjectProgress: 0,
      massProProgress: 0,
      overallProgress: 40,
    },
  });

  // PRJ-004: Checker Board Yamaha — Selesai, Mass Pro
  const prj004 = await db.project.create({
    data: {
      code: "PRJ-004",
      name: "Checker Board Yamaha Indonesia",
      description: "Pembuatan checker board untuk quality control Yamaha.",
      customer: "Yamaha Indonesia",
      picId: siti.id,
      priority: "LOW",
      status: "SELESAI",
      currentFase: "MASS_PRO",
      startDate: new Date("2024-12-01"),
      endDate: new Date("2025-01-15"),
      kebutuhanMp: 3,
      aktualMp: 3,
      cycleTimeTarget: 45,
      cycleTimeAktual: 45,
      rfqProgress: 100,
      dieGoProgress: 100,
      eventProjectProgress: 100,
      massProProgress: 100,
      overallProgress: 100,
    },
  });

  // PRJ-005: Mesin Press Daihatsu — Dalam Proses, RFQ
  const prj005 = await db.project.create({
    data: {
      code: "PRJ-005",
      name: "Mesin Press Daihatsu",
      description: "Pengembangan mesin press untuk pabrik Astra Daihatsu.",
      customer: "Astra Daihatsu",
      picId: faisal.id,
      priority: "HIGH",
      status: "DALAM_PROSES",
      currentFase: "RFQ",
      startDate: new Date("2025-02-01"),
      endDate: new Date("2025-07-31"),
      kebutuhanMp: 8,
      aktualMp: 7,
      cycleTimeTarget: 180,
      cycleTimeAktual: null,
      rfqProgress: 22,
      dieGoProgress: 0,
      eventProjectProgress: 0,
      massProProgress: 0,
      overallProgress: 6,
    },
  });

  // PRJ-006: Tooling Mitsubishi — Belum Mulai, RFQ
  const prj006 = await db.project.create({
    data: {
      code: "PRJ-006",
      name: "Tooling Mitsubishi Motor",
      description: "Pengembangan tooling untuk Mitsubishi Motor Indonesia.",
      customer: "Mitsubishi Motor",
      picId: agus.id,
      priority: "MEDIUM",
      status: "BELUM_MULAI",
      currentFase: "RFQ",
      startDate: new Date("2025-04-01"),
      endDate: new Date("2025-09-30"),
      kebutuhanMp: 5,
      aktualMp: null,
      cycleTimeTarget: 180,
      cycleTimeAktual: null,
      rfqProgress: 0,
      dieGoProgress: 0,
      eventProjectProgress: 0,
      massProProgress: 0,
      overallProgress: 0,
    },
  });

  // PRJ-007: Part Upgrade Isuzu — Tunda, Event Project
  const prj007 = await db.project.create({
    data: {
      code: "PRJ-007",
      name: "Part Upgrade Isuzu Astra",
      description: "Upgrade part untuk kendaraan komersial Isuzu Astra.",
      customer: "Isuzu Astra",
      picId: rina.id,
      priority: "MEDIUM",
      status: "TUNDA",
      currentFase: "EVENT_PROJECT",
      startDate: new Date("2025-01-15"),
      endDate: new Date("2025-06-30"),
      kebutuhanMp: 4,
      aktualMp: 4,
      cycleTimeTarget: 165,
      cycleTimeAktual: null,
      rfqProgress: 100,
      dieGoProgress: 100,
      eventProjectProgress: 30,
      massProProgress: 0,
      overallProgress: 58,
    },
  });

  // PRJ-008: Komponen Hino — Dalam Proses, Die Go
  const prj008 = await db.project.create({
    data: {
      code: "PRJ-008",
      name: "Komponen Hino Motors",
      description: "Pembuatan komponen untuk truk Hino Motors.",
      customer: "Hino Motors",
      picId: dewi.id,
      priority: "LOW",
      status: "DALAM_PROSES",
      currentFase: "DIE_GO",
      startDate: new Date("2025-03-01"),
      endDate: new Date("2025-08-31"),
      kebutuhanMp: 6,
      aktualMp: 5,
      cycleTimeTarget: 184,
      cycleTimeAktual: null,
      rfqProgress: 100,
      dieGoProgress: 45,
      eventProjectProgress: 0,
      massProProgress: 0,
      overallProgress: 36,
    },
  });

  console.log("✅ Projects created");

  // ─── Hinanhyo & DR ───
  const hinanhyoData = [
    // PRJ-001
    {
      projectId: prj001.id,
      type: "HINANHYO" as const,
      title: "Toleransi Dimensi Melebihi Batas",
      description: "Dimensi part tidak sesuai drawing revisi 3",
      status: "DITERIMA" as const,
      picId: agus.id,
      createdAt: new Date("2025-01-10"),
    },
    {
      projectId: prj001.id,
      type: "DR" as const,
      title: "Review Material Spec",
      description: "Material yang diusulkan tidak memenuhi standar JIS",
      status: "PENDING" as const,
      picId: agus.id,
      createdAt: new Date("2025-01-15"),
    },
    {
      projectId: prj001.id,
      type: "HINANHYO" as const,
      title: "Ketebalan Coating Tidak Seragam",
      description: "Ketebalan coating bervariasi antara 8-14 mikron, target 10±1 mikron",
      status: "DITERIMA" as const,
      picId: agus.id,
      createdAt: new Date("2025-01-20"),
    },
    {
      projectId: prj001.id,
      type: "DR" as const,
      title: "Revisi Desain Bracket Kanan",
      description: "Perlu penyesuaian radius fillet pada bracket kanan",
      status: "DITERIMA" as const,
      picId: agus.id,
      createdAt: new Date("2025-02-01"),
    },
    {
      projectId: prj001.id,
      type: "HINANHYO" as const,
      title: "Noise Saat Assembly",
      description: "Terjadi suara gesekan saat proses assembly bracket",
      status: "PENDING" as const,
      picId: agus.id,
      createdAt: new Date("2025-02-10"),
    },
    // PRJ-002
    {
      projectId: prj002.id,
      type: "HINANHYO" as const,
      title: "Kecepatan Siklus Mesin",
      description: "Cycle time mesin 15% lebih lambat dari target",
      status: "DITERIMA" as const,
      picId: rina.id,
      createdAt: new Date("2025-02-05"),
    },
    {
      projectId: prj002.id,
      type: "DR" as const,
      title: "Desain Jig Fixture",
      description: "Layout jig tidak optimal untuk operator kidal",
      status: "DITOLAK" as const,
      picId: rina.id,
      createdAt: new Date("2025-02-12"),
    },
    // PRJ-003
    {
      projectId: prj003.id,
      type: "HINANHYO" as const,
      title: "Cacat Permukaan Part",
      description: "Ada goresan pada permukaan A yang lolos QC",
      status: "DITERIMA" as const,
      picId: dewi.id,
      createdAt: new Date("2025-02-20"),
    },
    {
      projectId: prj003.id,
      type: "DR" as const,
      title: "Review Proses Painting",
      description: "Ketebalan cat tidak konsisten pada batch ke-3",
      status: "DITERIMA" as const,
      picId: dewi.id,
      createdAt: new Date("2025-02-25"),
    },
    // PRJ-004
    {
      projectId: prj004.id,
      type: "HINANHYO" as const,
      title: "Delay Supply Material",
      description: "Material dari vendor terlambat 2 minggu",
      status: "DITOLAK" as const,
      picId: siti.id,
      createdAt: new Date("2025-03-01"),
    },
    {
      projectId: prj004.id,
      type: "DR" as const,
      title: "Review BOM Procurement",
      description: "3 item di BOM tidak ada di vendor list approved",
      status: "DITERIMA" as const,
      picId: siti.id,
      createdAt: new Date("2025-03-08"),
    },
    // PRJ-005
    {
      projectId: prj005.id,
      type: "HINANHYO" as const,
      title: "Spesifikasi Motor Tidak Sesuai",
      description: "Motor yang tersedia tidak memenuhi spesifikasi torsi minimum",
      status: "PENDING" as const,
      picId: faisal.id,
      createdAt: new Date("2025-02-15"),
    },
    {
      projectId: prj005.id,
      type: "DR" as const,
      title: "Review Sistem Hidrolik",
      description: "Perlu penambahan safety valve pada sistem hidrolik",
      status: "PENDING" as const,
      picId: faisal.id,
      createdAt: new Date("2025-02-20"),
    },
    // PRJ-008
    {
      projectId: prj008.id,
      type: "HINANHYO" as const,
      title: "Ketidaksesuaian Material Import",
      description: "Material import tidak sesuai dengan COA yang dikirimkan",
      status: "PENDING" as const,
      picId: dewi.id,
      createdAt: new Date("2025-03-10"),
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
      action: "Update Progress",
      detail: "RFQ progress diupdate dari 80% ke 100%",
      createdAt: new Date("2025-01-20"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Update Fase",
      detail: "Fase berubah dari RFQ ke Die Go",
      createdAt: new Date("2025-01-20"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Update Progress",
      detail: "Die Go progress diupdate dari 70% ke 100%",
      createdAt: new Date("2025-02-05"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Update Fase",
      detail: "Fase berubah dari Die Go ke Event Project",
      createdAt: new Date("2025-02-05"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Update Progress",
      detail: "Event Project progress diupdate dari 30% ke 48%",
      createdAt: new Date("2025-02-20"),
    },
    {
      projectId: prj001.id,
      userId: agus.id,
      action: "Tambah Hinanhyo",
      detail: "Ditambahkan Hinanhyo: Toleransi Dimensi Melebihi Batas",
      createdAt: new Date("2025-01-10"),
    },
    {
      projectId: prj002.id,
      userId: rina.id,
      action: "Update Status",
      detail: "Status proyek diubah ke Selesai",
      createdAt: new Date("2025-01-14"),
    },
    {
      projectId: prj003.id,
      userId: budi.id,
      action: "Update Status",
      detail: "Status proyek berubah otomatis ke Terlambat karena melewati deadline",
      createdAt: new Date("2025-03-01"),
    },
    {
      projectId: prj005.id,
      userId: faisal.id,
      action: "Update Progress",
      detail: "RFQ progress diupdate dari 15% ke 22%",
      createdAt: new Date("2025-03-01"),
    },
    {
      projectId: prj007.id,
      userId: budi.id,
      action: "Update Status",
      detail: "Status proyek diubah ke Tunda",
      createdAt: new Date("2025-02-28"),
    },
  ];

  for (const data of activityData) {
    await db.activityLog.create({ data });
  }

  console.log("✅ Activity logs created");
  console.log("\n🎉 Seed complete!");
  console.log("\n📋 Login credentials (password: password123):");
  console.log("  Atasan:  budi@perusahaan.com");
  console.log("  Bawahan: rina@perusahaan.com");
  console.log("  Bawahan: agus@perusahaan.com");
  console.log("  Bawahan: dewi@perusahaan.com");
  console.log("  Bawahan: faisal@perusahaan.com");
  console.log("  Bawahan: siti@perusahaan.com");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
