import { prisma } from "@/shared/db/prisma";
import { HttpError } from "@/shared/lib/http";

function ingredientAbbrev(name: string) {
  const letters = name.replace(/[^A-Za-z]/g, "").toUpperCase();
  if (letters.length >= 3) return letters.slice(0, 3);
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return parts
      .slice(0, 3)
      .map((p) => p[0]?.toUpperCase() ?? "")
      .join("")
      .padEnd(3, "X");
  }
  return (letters || "LOT").padEnd(3, "X").slice(0, 3);
}

function dateStamp(date: Date) {
  const yy = String(date.getFullYear()).slice(-2);
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yy}${mm}${dd}`;
}

export async function nextLotCode(ingredientId: string, receivedAt = new Date()) {
  const ingredient = await prisma.ingredient.findUnique({ where: { id: ingredientId } });
  if (!ingredient) throw new HttpError(404, "Bahan tidak ditemukan.");

  const abbr = ingredientAbbrev(ingredient.name);
  const stamp = dateStamp(receivedAt);
  const prefix = `LOT-${abbr}-${stamp}`;
  const existing = await prisma.ingredientLot.count({
    where: { lotCode: { startsWith: prefix } },
  });
  return `${prefix}-${String(existing + 1).padStart(2, "0")}`;
}
