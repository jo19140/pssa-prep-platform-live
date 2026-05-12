import { db } from "@/lib/db";

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeJoinCode(code: string) {
  const compact = code.trim().toUpperCase().replace(/\s+/g, "").replace(/-/g, "");
  if (!compact) return "";
  return compact.startsWith("PSSA") ? `PSSA-${compact.slice(4)}` : compact;
}

export async function createUniqueClassJoinCode() {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let suffix = "";
    for (let index = 0; index < 6; index += 1) {
      suffix += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
    }
    const joinCode = `PSSA-${suffix}`;
    const existing = await db.classRoom.findUnique({ where: { joinCode } });
    if (!existing) return joinCode;
  }
  throw new Error("Could not create a unique class code.");
}

export async function ensureClassJoinCode(classRoomId: string) {
  const classRoom = await db.classRoom.findUnique({ where: { id: classRoomId } });
  if (!classRoom) return null;
  if (classRoom.joinCode) return classRoom.joinCode;
  const joinCode = await createUniqueClassJoinCode();
  await db.classRoom.update({ where: { id: classRoom.id }, data: { joinCode, joinEnabled: true } });
  return joinCode;
}
