import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function hoursFromNow(hours: number) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function daysFromNow(days: number) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + days);
  return d;
}

const ayamKatsuRecipe = {
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
};

const telurDadarRecipe = {
  porsiDasar: 100,
  langkah: [
    "Masak nasi putih.",
    "Kocok telur dengan bumbu, dadar hingga matang merata.",
    "Rebus wortel dan buncis untuk sayur sop.",
  ],
  bahan: [
    { name: "Beras", qtyPer100: 12, unit: "kg" },
    { name: "Telur", qtyPer100: 80, unit: "butir" },
    { name: "Wortel", qtyPer100: 4, unit: "kg" },
    { name: "Buncis", qtyPer100: 3, unit: "kg" },
    { name: "Minyak goreng", qtyPer100: 0.8, unit: "L" },
  ],
};

const ayamKecapRecipe = {
  porsiDasar: 100,
  langkah: [
    "Masak nasi putih.",
    "Tumiskan ayam dengan kecap hingga meresap.",
    "Tumis capcay wortel, brokoli, dan buncis.",
  ],
  bahan: [
    { name: "Beras", qtyPer100: 12, unit: "kg" },
    { name: "Dada ayam", qtyPer100: 8, unit: "kg" },
    { name: "Wortel", qtyPer100: 2.5, unit: "kg" },
    { name: "Brokoli", qtyPer100: 2.5, unit: "kg" },
    { name: "Buncis", qtyPer100: 2, unit: "kg" },
    { name: "Minyak goreng", qtyPer100: 1, unit: "L" },
  ],
};

const tempeOrekRecipe = {
  porsiDasar: 100,
  langkah: [
    "Masak nasi putih.",
    "Potong tempe, goreng, lalu orek dengan bumbu manis.",
    "Tumis kangkung hingga layu.",
  ],
  bahan: [
    { name: "Beras", qtyPer100: 12, unit: "kg" },
    { name: "Tempe", qtyPer100: 6, unit: "kg" },
    { name: "Kangkung", qtyPer100: 4, unit: "kg" },
    { name: "Minyak goreng", qtyPer100: 1, unit: "L" },
  ],
};

const ikanBaladoRecipe = {
  porsiDasar: 100,
  langkah: [
    "Masak nasi putih.",
    "Goreng ikan, balur sambal balado.",
    "Tumis buncis hingga matang.",
  ],
  bahan: [
    { name: "Beras", qtyPer100: 12, unit: "kg" },
    { name: "Ikan", qtyPer100: 8, unit: "kg" },
    { name: "Buncis", qtyPer100: 4, unit: "kg" },
    { name: "Minyak goreng", qtyPer100: 1.2, unit: "L" },
  ],
};

const katsuComponents = [
  { key: "nasi", name: "Masak nasi", sortOrder: 1 },
  { key: "protein", name: "Masak ayam katsu", sortOrder: 2 },
  { key: "sayur", name: "Masak sayur", sortOrder: 3 },
  { key: "packing", name: "Pengemasan", sortOrder: 4 },
  { key: "qc", name: "Quality check", sortOrder: 5 },
];

const telurComponents = [
  { key: "nasi", name: "Masak nasi", sortOrder: 1 },
  { key: "protein", name: "Masak telur dadar", sortOrder: 2 },
  { key: "sayur", name: "Masak sayur sop", sortOrder: 3 },
  { key: "packing", name: "Pengemasan", sortOrder: 4 },
  { key: "qc", name: "Quality check", sortOrder: 5 },
];

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.deliveryBatch.deleteMany();
  await prisma.schoolAllocation.deleteMany();
  await prisma.productionComponent.deleteMany();
  await prisma.productionBatch.deleteMany();
  await prisma.productionLocation.deleteMany();
  await prisma.menu.deleteMany();
  await prisma.ingredientLot.deleteMany();
  await prisma.ingredient.deleteMany();
  await prisma.school.deleteMany();
  await prisma.user.deleteMany();
  await prisma.sppg.deleteMany();
  await prisma.safetyRule.deleteMany();

  await prisma.safetyRule.createMany({
    data: [
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
    ],
  });

  const sppg = await prisma.sppg.create({
    data: {
      name: "SPPG Cilandak",
      address: "Jl. TB Simatupang No. 12, Cilandak, Jakarta Selatan",
      lat: -6.2895,
      lng: 106.8003,
    },
  });

  const productionLocation = await prisma.productionLocation.create({
    data: {
      name: "Dapur Utama Cilandak",
      address: sppg.address,
      lat: sppg.lat,
      lng: sppg.lng,
      sppgId: sppg.id,
    },
  });

  const password = {
    supervisor: await bcrypt.hash("supervisor", 10),
    dapur: await bcrypt.hash("dapur", 10),
    distributor: await bcrypt.hash("distributor", 10),
  };

  await prisma.user.createMany({
    data: [
      {
        name: "Rina Supervisor",
        email: "supervisor@sppg.local",
        passwordHash: password.supervisor,
        role: "SUPERVISOR",
        sppgId: sppg.id,
      },
      {
        name: "Budi Dapur",
        email: "dapur@sppg.local",
        passwordHash: password.dapur,
        role: "KITCHEN",
        sppgId: sppg.id,
      },
      {
        name: "Andi Distributor",
        email: "distributor@sppg.local",
        passwordHash: password.distributor,
        role: "DISTRIBUTOR",
        sppgId: sppg.id,
      },
    ],
  });

  const schools = await Promise.all([
    prisma.school.create({
      data: {
        name: "SDN 01 Cilandak",
        address: "Jl. Cilandak KKO No. 1, Jakarta Selatan",
        distanceKm: 2.4,
        lat: -6.29,
        lng: 106.8,
      },
    }),
    prisma.school.create({
      data: {
        name: "SMPN 08 Jakarta",
        address: "Jl. Radio Dalam Raya, Kebayoran Baru",
        distanceKm: 6.8,
        lat: -6.26,
        lng: 106.79,
      },
    }),
    prisma.school.create({
      data: {
        name: "SDN 05 Pondok Labu",
        address: "Jl. Pondok Labu I, Cilandak",
        distanceKm: 4.1,
        lat: -6.31,
        lng: 106.8,
      },
    }),
    prisma.school.create({
      data: {
        name: "SMKN 20 Jakarta",
        address: "Jl. Flamboyan, Pasar Minggu",
        distanceKm: 9.5,
        lat: -6.28,
        lng: 106.84,
      },
    }),
  ]);

  const ingredients = await Promise.all(
    [
      { name: "Beras", category: "Karbohidrat", unit: "kg" },
      { name: "Dada ayam", category: "Protein", unit: "kg" },
      { name: "Telur", category: "Protein", unit: "butir" },
      { name: "Tempe", category: "Protein", unit: "kg" },
      { name: "Ikan", category: "Protein", unit: "kg" },
      { name: "Wortel", category: "Sayur", unit: "kg" },
      { name: "Brokoli", category: "Sayur", unit: "kg" },
      { name: "Buncis", category: "Sayur", unit: "kg" },
      { name: "Kangkung", category: "Sayur", unit: "kg" },
      { name: "Tepung terigu", category: "Bahan olahan", unit: "kg" },
      { name: "Minyak goreng", category: "Minyak", unit: "L" },
    ].map((item) => prisma.ingredient.create({ data: item })),
  );

  const byName = Object.fromEntries(ingredients.map((i) => [i.name, i]));

  await prisma.ingredientLot.createMany({
    data: [
      {
        ingredientId: byName.Beras.id,
        lotCode: "LOT-BRS-240915",
        quantity: 180,
        expiryDate: daysFromNow(90),
        receivedAt: hoursFromNow(-20),
        storageType: "Kering",
        supplier: "Bulog DKI",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName["Dada ayam"].id,
        lotCode: "LOT-AYM-240915",
        quantity: 64,
        expiryDate: daysFromNow(1),
        receivedAt: hoursFromNow(-8),
        storageType: "Chiller 0-4°C",
        supplier: "Mitra Unggas Sejahtera",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Telur.id,
        lotCode: "LOT-TLR-240914",
        quantity: 600,
        expiryDate: daysFromNow(12),
        receivedAt: hoursFromNow(-30),
        storageType: "Chiller 0-4°C",
        supplier: "Peternakan Bogor",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Tempe.id,
        lotCode: "LOT-TMP-240915",
        quantity: 28,
        expiryDate: daysFromNow(2),
        receivedAt: hoursFromNow(-6),
        storageType: "Chiller 0-4°C",
        supplier: "Koperasi Tempe Cilandak",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Ikan.id,
        lotCode: "LOT-IKN-240915",
        quantity: 20,
        expiryDate: daysFromNow(1),
        receivedAt: hoursFromNow(-5),
        storageType: "Freezer",
        supplier: "TPI Muara Angke",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Wortel.id,
        lotCode: "LOT-WTL-240914",
        quantity: 22,
        expiryDate: daysFromNow(4),
        receivedAt: hoursFromNow(-18),
        storageType: "Chiller 0-4°C",
        supplier: "Tani Pasar Minggu",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Brokoli.id,
        lotCode: "LOT-BKL-240915",
        quantity: 12,
        expiryDate: daysFromNow(3),
        receivedAt: hoursFromNow(-10),
        storageType: "Chiller 0-4°C",
        supplier: "Tani Pasar Minggu",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Buncis.id,
        lotCode: "LOT-BNS-240915",
        quantity: 10,
        expiryDate: daysFromNow(3),
        receivedAt: hoursFromNow(-10),
        storageType: "Chiller 0-4°C",
        supplier: "Tani Pasar Minggu",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName.Kangkung.id,
        lotCode: "LOT-KNG-240915",
        quantity: 8,
        expiryDate: daysFromNow(2),
        receivedAt: hoursFromNow(-4),
        storageType: "Chiller 0-4°C",
        supplier: "Tani Pasar Minggu",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName["Tepung terigu"].id,
        lotCode: "LOT-TGP-240901",
        quantity: 25,
        expiryDate: daysFromNow(120),
        receivedAt: hoursFromNow(-240),
        storageType: "Kering",
        supplier: "Bogasari",
        status: "AVAILABLE",
      },
      {
        ingredientId: byName["Minyak goreng"].id,
        lotCode: "LOT-MYK-240820",
        quantity: 40,
        expiryDate: daysFromNow(180),
        receivedAt: hoursFromNow(-400),
        storageType: "Kering",
        supplier: "Pertamina Retail",
        status: "AVAILABLE",
      },
    ],
  });

  await prisma.menu.createMany({
    data: [
      {
        name: "Ayam Katsu, Nasi, Tumis Sayur",
        source: "CATALOG",
        recipeJson: JSON.stringify(ayamKatsuRecipe),
        recommendedComponents: JSON.stringify(katsuComponents),
        durabilityNote:
          "Protein goreng padat; sayur harus dikonsumsi lebih cepat dari nasi.",
      },
      {
        name: "Telur Dadar, Nasi, Sayur Sop",
        source: "CATALOG",
        recipeJson: JSON.stringify(telurDadarRecipe),
        recommendedComponents: JSON.stringify(telurComponents),
        durabilityNote:
          "Telur dadar relatif stabil; kuah sayur mempercepat batas aman.",
      },
      {
        name: "Ayam Kecap, Nasi, Capcay",
        source: "CATALOG",
        recipeJson: JSON.stringify(ayamKecapRecipe),
        recommendedComponents: JSON.stringify([
          { key: "nasi", name: "Masak nasi", sortOrder: 1 },
          { key: "protein", name: "Masak ayam kecap", sortOrder: 2 },
          { key: "sayur", name: "Masak capcay", sortOrder: 3 },
          { key: "packing", name: "Pengemasan", sortOrder: 4 },
          { key: "qc", name: "Quality check", sortOrder: 5 },
        ]),
        durabilityNote: "Kuah kecap menambah kelembapan; prioritas distribusi sayur.",
      },
      {
        name: "Tempe Orek, Nasi, Tumis Kangkung",
        source: "CATALOG",
        recipeJson: JSON.stringify(tempeOrekRecipe),
        recommendedComponents: JSON.stringify([
          { key: "nasi", name: "Masak nasi", sortOrder: 1 },
          { key: "protein", name: "Masak tempe orek", sortOrder: 2 },
          { key: "sayur", name: "Tumis kangkung", sortOrder: 3 },
          { key: "packing", name: "Pengemasan", sortOrder: 4 },
          { key: "qc", name: "Quality check", sortOrder: 5 },
        ]),
        durabilityNote: "Tempe orek kering lebih tahan; kangkung paling cepat layu.",
      },
      {
        name: "Ikan Balado, Nasi, Tumis Buncis",
        source: "CATALOG",
        recipeJson: JSON.stringify(ikanBaladoRecipe),
        recommendedComponents: JSON.stringify([
          { key: "nasi", name: "Masak nasi", sortOrder: 1 },
          { key: "protein", name: "Masak ikan balado", sortOrder: 2 },
          { key: "sayur", name: "Tumis buncis", sortOrder: 3 },
          { key: "packing", name: "Pengemasan", sortOrder: 4 },
          { key: "qc", name: "Quality check", sortOrder: 5 },
        ]),
        durabilityNote: "Ikan matang sensitif suhu ruang; jangan tunda pengiriman.",
      },
    ],
  });

  const menus = await prisma.menu.findMany({ orderBy: { name: "asc" } });
  const demoMenu = menus.find((menu) => menu.name.includes("Ayam Katsu")) ?? menus[0];
  const demoSchool = schools[0];
  const readyAt = hoursFromNow(-1.2);
  const departedAt = hoursFromNow(-0.4);
  const safeUntil = hoursFromNow(2.5);
  const qrToken = randomUUID();
  const { start: todayStart } = (() => {
    const day = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
    return { start: new Date(`${day}T00:00:00+07:00`) };
  })();

  const demoBatch = await prisma.productionBatch.create({
    data: {
      code: "PB-CIL-DEMO-01",
      date: todayStart,
      portionType: "BESAR",
      menuId: demoMenu.id,
      menuSnapshot: JSON.stringify({
        name: demoMenu.name,
        durabilityNote: demoMenu.durabilityNote,
      }),
      targetQty: 800,
      actualQty: 780,
      status: "PRODUCTION_COMPLETE",
      readyAt,
      safeUntil,
      sppgId: sppg.id,
      productionLocationId: productionLocation.id,
      components: {
        create: katsuComponents.map((component) => {
          const affects = ["nasi", "protein", "sayur"].includes(component.key);
          const windowMinutes = component.key === "sayur" ? 180 : 240;
          return {
            name: component.name,
            componentKey: component.key,
            affectsSafetyDeadline: affects,
            status: "FINISHED",
            startedAt: hoursFromNow(-3),
            finishedAt: hoursFromNow(-1.2),
            safeWindowMinutes: windowMinutes,
            safeUntil: affects ? hoursFromNow(windowMinutes / 60 - 1.2) : null,
            sortOrder: component.sortOrder,
          };
        }),
      },
    },
  });

  await prisma.schoolAllocation.create({
    data: {
      productionBatchId: demoBatch.id,
      schoolId: demoSchool.id,
      portionQty: 250,
      packedQty: 250,
      readyAt,
      deliveryBatch: {
        create: {
          code: "DL-CIL-DEMO-01",
          status: "IN_DELIVERY",
          etaMinutes: Math.max(15, Math.round(demoSchool.distanceKm * 6)),
          readyAt,
          departedAt,
          qrToken,
        },
      },
    },
  });

  const supervisor = await prisma.user.findUnique({ where: { email: "supervisor@sppg.local" } });
  const teamUsers = await prisma.user.findMany({
    where: { email: { in: ["supervisor@sppg.local", "dapur@sppg.local", "distributor@sppg.local"] } },
    select: { id: true },
  });
  if (supervisor) {
    await prisma.team.create({
      data: {
        name: "Tim Operasional Cilandak",
        inviteCode: "CILAND",
        sppgId: sppg.id,
        createdById: supervisor.id,
        members: {
          create: teamUsers.map((u) => ({ userId: u.id })),
        },
      },
    });
  }

  console.log("Seeded SPPG Cilandak with demo users, lots, schools, menus, teams, and delivery QR.");
  console.log(`Demo public QR path: /q/${qrToken}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
