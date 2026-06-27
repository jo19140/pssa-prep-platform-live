import fs from "node:fs";
import path from "node:path";

export type PssaDokLevel = 1 | 2 | 3;

const DOK_CROSSWALK_PATH = path.resolve("data/pssa/dok_crosswalk_grade3.csv");
let cached: Map<string, PssaDokLevel> | null = null;

export function loadDokCrosswalk(): Map<string, PssaDokLevel> {
  if (cached) return new Map(cached);
  const rows = parseCsv(fs.readFileSync(DOK_CROSSWALK_PATH, "utf8"));
  if (!rows.length) throw new Error("pssa_dok_crosswalk_empty");
  const [headers, ...body] = rows;
  const itemIdIndex = headers.indexOf("itemId");
  const dokIndex = headers.indexOf("dokLevel");
  if (itemIdIndex < 0 || dokIndex < 0) throw new Error("pssa_dok_crosswalk_missing_columns");

  const map = new Map<string, PssaDokLevel>();
  for (const [rowIndex, row] of body.entries()) {
    if (!row.some((cell) => cell.trim())) continue;
    const itemId = row[itemIdIndex]?.trim();
    const dokRaw = row[dokIndex]?.trim();
    const dokLevel = Number(dokRaw);
    if (!itemId) throw new Error(`pssa_dok_crosswalk_missing_item_id:${rowIndex + 2}`);
    if (map.has(itemId)) throw new Error(`pssa_dok_crosswalk_duplicate_item:${itemId}`);
    if (![1, 2, 3].includes(dokLevel)) throw new Error(`pssa_dok_crosswalk_invalid_dok:${itemId}:${dokRaw}`);
    map.set(itemId, dokLevel as PssaDokLevel);
  }
  cached = map;
  return new Map(cached);
}

export function dokLevelFor(itemId: string): PssaDokLevel | null {
  return loadDokCrosswalk().get(itemId) ?? null;
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === "\"" && next === "\"") {
        cell += "\"";
        index += 1;
      } else if (char === "\"") {
        quoted = false;
      } else {
        cell += char;
      }
      continue;
    }
    if (char === "\"") quoted = true;
    else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ""));
    rows.push(row);
  }
  return rows;
}
