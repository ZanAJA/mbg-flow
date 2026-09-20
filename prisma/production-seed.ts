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
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
