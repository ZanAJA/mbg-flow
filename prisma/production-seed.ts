import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const safetyRules = [
  {
    componentKey: "nasi",
    label: "Nasi / karbohidrat matang",
    safeWindowMinutes: 240,
    affectsSafetyDeadline: true,
    validated: true,
    notes: "Aturan BGN: maksimal 4 jam sejak makanan matang.",
  },
  {
    componentKey: "protein",
    label: "Lauk protein matang",
    safeWindowMinutes: 240,
    affectsSafetyDeadline: true,
    validated: true,
    notes: "Aturan BGN: maksimal 4 jam sejak makanan matang.",
  },
  {
    componentKey: "sayur",
    label: "Sayur matang",
    safeWindowMinutes: 180,
    affectsSafetyDeadline: true,
    validated: true,
    notes: "Ruleset tervalidasi internal SPPG: sayur 3 jam.",
  },
  {
    componentKey: "packing",
    label: "Pengemasan",
    safeWindowMinutes: 0,
    affectsSafetyDeadline: false,
    validated: true,
    notes: "Tidak menentukan batas aman konsumsi.",
  },
  {
    componentKey: "qc",
    label: "Quality check",
    safeWindowMinutes: 0,
    affectsSafetyDeadline: false,
    validated: true,
    notes: "Tidak menentukan batas aman konsumsi.",
  },
] as const;

const starterMenu = {
  name: "Ayam Katsu, Nasi, Tumis Sayur",
  source: "CATALOG",
  recipeJson: JSON.stringify({
    porsiDasar: 100,
    langkah: [
      "Kukus beras hingga matang menjadi nasi putih.",
      "Lumuri dada ayam dengan tepung, telur, dan tepung roti, lalu goreng hingga keemasan.",
      "Tumis brokoli dan wortel dengan bawang putih hingga matang.",
    ],
    bahan: [
      { name: "Beras", qtyPer100: 12, unit: "kg" },
      { name: "Dada ayam", qtyPer100: 8, unit: "kg" },
      { name: "Tepung terigu", qtyPer100: 1.2, unit: "kg" },
      { name: "Telur", qtyPer100: 20, unit: "butir" },
      { name: "Wortel", qtyPer100: 3, unit: "kg" },
      { name: "Brokoli", qtyPer100: 3, unit: "kg" },
      { name: "Minyak goreng", qtyPer100: 1.5, unit: "L" },
    ],
  }),
  recommendedComponents: JSON.stringify([
    { key: "nasi", name: "Masak nasi", sortOrder: 1 },
    { key: "protein", name: "Masak ayam katsu", sortOrder: 2 },
    { key: "sayur", name: "Masak sayur", sortOrder: 3 },
    { key: "packing", name: "Pengemasan", sortOrder: 4 },
    { key: "qc", name: "Quality check", sortOrder: 5 },
  ]),
  durabilityNote: "Protein goreng padat; sayur harus dikonsumsi lebih cepat dari nasi.",
};

async function main() {
  for (const rule of safetyRules) {
    await prisma.safetyRule.upsert({
      where: { componentKey: rule.componentKey },
      update: rule,
      create: rule,
    });
  }

  const existingMenu = await prisma.menu.findFirst({
    where: { name: starterMenu.name },
    select: { id: true },
  });

  if (!existingMenu) {
    await prisma.menu.create({ data: starterMenu });
  }

  let demoSppg = await prisma.sppg.findFirst({
    where: { name: "SPPG Cilandak (Demo)" },
  });

  if (!demoSppg) {
    demoSppg = await prisma.sppg.create({
      data: {
        name: "SPPG Cilandak (Demo)",
        address: "Jl. TB Simatupang No. 12, Cilandak, Jakarta Selatan",
        lat: -6.2895,
        lng: 106.8003,
      },
    });
  }

  const demoLocation = await prisma.productionLocation.findFirst({
    where: { sppgId: demoSppg.id, name: "Dapur Utama Cilandak" },
    select: { id: true },
  });

  if (!demoLocation) {
    await prisma.productionLocation.create({
      data: {
        sppgId: demoSppg.id,
        name: "Dapur Utama Cilandak",
        address: demoSppg.address,
        lat: demoSppg.lat,
        lng: demoSppg.lng,
      },
    });
  }

  const demoUsers = [
    {
      name: "Rina Supervisor",
      email: "supervisor@sppg.local",
      password: "supervisor",
      role: "SUPERVISOR",
    },
    {
      name: "Budi Dapur",
      email: "dapur@sppg.local",
      password: "dapur",
      role: "KITCHEN",
    },
    {
      name: "Andi Distributor",
      email: "distributor@sppg.local",
      password: "distributor",
      role: "DISTRIBUTOR",
    },
  ] as const;

  for (const user of demoUsers) {
    const passwordHash = await bcrypt.hash(user.password, 10);
    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        passwordHash,
        role: user.role,
        sppgId: demoSppg.id,
        active: true,
      },
      create: {
        name: user.name,
        email: user.email,
        passwordHash,
        role: user.role,
        sppgId: demoSppg.id,
      },
    });
  }

  const supervisor = await prisma.user.findUniqueOrThrow({
    where: { email: "supervisor@sppg.local" },
  });
  const team = await prisma.team.upsert({
    where: { inviteCode: "CILAND" },
    update: {
      name: "Tim Operasional Cilandak (Demo)",
      sppgId: demoSppg.id,
      createdById: supervisor.id,
    },
    create: {
      name: "Tim Operasional Cilandak (Demo)",
      inviteCode: "CILAND",
      sppgId: demoSppg.id,
      createdById: supervisor.id,
    },
  });
  const users = await prisma.user.findMany({
    where: { email: { in: demoUsers.map((user) => user.email) } },
    select: { id: true },
  });

  for (const user of users) {
    await prisma.teamMember.upsert({
      where: { teamId_userId: { teamId: team.id, userId: user.id } },
      update: {},
      create: { teamId: team.id, userId: user.id },
    });
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
