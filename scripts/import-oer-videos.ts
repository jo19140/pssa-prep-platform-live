import { readFileSync } from "fs";
import path from "path";
import { db } from "../lib/db";

type VideoRow = {
  candidate_id: number;
  video_id: string;
  video_title: string;
  channel_name: string;
  platform: string;
  watch_url: string;
  embed_url: string;
  thumbnail_url?: string;
  thumbnail_hd_url?: string;
  duration_seconds?: number;
  skill_id: string;
  skill_name: string;
  strand?: string;
  text_type?: string;
  ccss_tags?: string[];
  pa_core_tags?: string[];
  grade_level: number;
  grade_range_min?: number;
  grade_range_max?: number;
  tier?: string;
  subject?: string;
  collection_id?: string | null;
  sequence_order?: number | null;
  status?: string;
  is_placeholder?: boolean;
  discovered_at?: string;
  source?: string;
};

type Catalog = {
  schema_version: string;
  generated_at: string;
  subject: string;
  grade_range: [number, number];
  standards_frameworks: string[];
  total_videos: number;
  total_collections: number;
  total_skills: number;
  videos: VideoRow[];
};

const JSON_PATH = path.join(process.cwd(), "data", "oer-videos.json");

async function main() {
  console.log(`Reading catalog from ${JSON_PATH}`);
  const raw = readFileSync(JSON_PATH, "utf8");
  const catalog: Catalog = JSON.parse(raw);

  console.log(`Catalog metadata:`);
  console.log(`  schema_version: ${catalog.schema_version}`);
  console.log(`  subject: ${catalog.subject}`);
  console.log(`  grade_range: ${catalog.grade_range?.join("-")}`);
  console.log(`  frameworks: ${catalog.standards_frameworks?.join(", ")}`);
  console.log(`  total_videos: ${catalog.total_videos}`);
  console.log(`  total_collections: ${catalog.total_collections}`);
  console.log(`  total_skills: ${catalog.total_skills}`);
  console.log("");

  const videos = catalog.videos || [];
  if (!videos.length) {
    console.error("No videos found in catalog. Exiting.");
    process.exit(1);
  }

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let errors = 0;
  const skipReasons = new Map<string, number>();

  for (const video of videos) {
    try {
      const result = await processVideo(video);
      created += result.created;
      updated += result.updated;
      if (result.skipped) {
        skipped += 1;
        const reason = result.skipReason || "unknown";
        skipReasons.set(reason, (skipReasons.get(reason) || 0) + 1);
      }
    } catch (err) {
      errors += 1;
      console.error(`  ERROR on video ${video.candidate_id} (${video.video_id}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  console.log("");
  console.log("Import complete.");
  console.log(`  ResourceLink rows created: ${created}`);
  console.log(`  ResourceLink rows updated: ${updated}`);
  console.log(`  Videos skipped: ${skipped}`);
  if (skipReasons.size) {
    for (const [reason, count] of skipReasons.entries()) {
      console.log(`    - ${reason}: ${count}`);
    }
  }
  console.log(`  Errors: ${errors}`);
}

async function processVideo(video: VideoRow): Promise<{ created: number; updated: number; skipped: boolean; skipReason?: string }> {
  const url = video.watch_url || video.embed_url;
  if (!url) return { created: 0, updated: 0, skipped: true, skipReason: "missing_url" };

  const gradeLevel = Number(video.grade_level);
  if (!Number.isInteger(gradeLevel) || gradeLevel < 3 || gradeLevel > 8) {
    return { created: 0, updated: 0, skipped: true, skipReason: "invalid_grade_level" };
  }

  const paTags = normalizeTags(video.pa_core_tags);
  const ccssTags = normalizeTags(video.ccss_tags);
  const standardCodes = paTags.length ? paTags : ccssTags;
  if (!standardCodes.length) return { created: 0, updated: 0, skipped: true, skipReason: "no_standard_tags" };

  const title = (video.video_title || "").trim();
  if (!title) return { created: 0, updated: 0, skipped: true, skipReason: "missing_title" };

  const provider = (video.channel_name || video.platform || "YouTube").trim();
  const skill = (video.skill_name || video.skill_id || "").trim() || "General";
  const description = buildDescription(video);

  let created = 0;
  let updated = 0;

  for (const standardCode of standardCodes) {
    const existing = await db.resourceLink.findFirst({
      where: { gradeLevel, standardCode, url },
    });
    if (existing) {
      await db.resourceLink.update({
        where: { id: existing.id },
        data: { skill, title, provider, description },
      });
      updated += 1;
    } else {
      await db.resourceLink.create({
        data: { gradeLevel, standardCode, skill, title, url, provider, description },
      });
      created += 1;
    }
  }

  return { created, updated, skipped: false };
}

function normalizeTags(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  if (typeof value === "string") return value.split("|").map((entry) => entry.trim()).filter(Boolean);
  return [];
}

function buildDescription(video: VideoRow): string {
  const parts: string[] = [];
  if (video.strand) parts.push(`Strand: ${video.strand}`);
  if (video.text_type && video.text_type !== "general") parts.push(`Text type: ${video.text_type}`);
  if (video.duration_seconds) parts.push(`Duration: ${formatDuration(Number(video.duration_seconds))}`);
  if (video.tier) parts.push(`Tier: ${video.tier}`);
  if (video.collection_id) parts.push(`Collection: ${video.collection_id}`);
  return parts.join(" · ");
}

function formatDuration(seconds: number): string {
  if (!seconds || !Number.isFinite(seconds)) return "";
  const minutes = Math.floor(seconds / 60);
  const remaining = Math.round(seconds % 60);
  return `${minutes}m ${remaining}s`;
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error:", err);
    process.exit(1);
  });
