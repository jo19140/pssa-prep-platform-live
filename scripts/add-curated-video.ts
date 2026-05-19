import { spawnSync } from "child_process";
import { readFileSync, writeFileSync } from "fs";
import path from "path";
import { db } from "../lib/db";

type Confidence = "high" | "medium";
type Tier = "on_grade" | "foundational" | "advanced";

type Args = {
  url: string;
  grade: number;
  standards: string[];
  skill: string;
  collection: string;
  tier: Tier;
  confidence: Confidence;
};

type Catalog = {
  total_videos: number;
  total_collections: number;
  collections: Array<Record<string, unknown>>;
  videos: Array<Record<string, unknown> & { candidate_id?: number; video_id?: string; pa_core_tags?: string[] }>;
  [key: string]: unknown;
};

const JSON_PATH = path.join(process.cwd(), "data", "oer-videos.json");
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

async function main() {
  if (!YOUTUBE_API_KEY) {
    throw new Error("Missing YOUTUBE_API_KEY environment variable.");
  }

  const args = parseArgs(process.argv.slice(2));
  const videoId = extractVideoId(args.url);
  if (!videoId) throw new Error(`Could not extract a YouTube video ID from ${args.url}`);

  const metadata = await fetchVideoMetadata(videoId);
  const catalog = JSON.parse(readFileSync(JSON_PATH, "utf8")) as Catalog;
  const addedOrUpdated = upsertCatalogEntry(catalog, args, videoId, metadata);
  writeFileSync(JSON_PATH, `${JSON.stringify(catalog, null, 2)}\n`);

  const deletedCache = await db.heroMatchCache.deleteMany({
    where: { lessonSkill: { contains: normalizeHeroCacheSkill(args.skill), mode: "insensitive" } },
  });

  const importResult = spawnSync("npx", ["tsx", "scripts/import-oer-videos.ts"], {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  });
  if (importResult.status !== 0) {
    throw new Error(`scripts/import-oer-videos.ts exited with status ${importResult.status}`);
  }

  const rows = await db.resourceLink.findMany({
    where: { url: { contains: videoId } },
    select: { id: true, title: true, gradeLevel: true, standardCode: true, skill: true, url: true },
    orderBy: [{ gradeLevel: "asc" }, { standardCode: "asc" }],
  });

  console.log("\nCurated video added.");
  console.log(`  Catalog action: ${addedOrUpdated}`);
  console.log(`  Video: ${metadata.title}`);
  console.log(`  Provider: ${metadata.channelTitle}`);
  console.log(`  Standards: ${args.standards.join(", ")}`);
  console.log(`  Skill: ${args.skill}`);
  console.log(`  HeroMatchCache rows invalidated: ${deletedCache.count}`);
  console.log("  ResourceLink rows:");
  for (const row of rows) {
    console.log(`    - ${row.id} | grade ${row.gradeLevel ?? "any"} | ${row.standardCode} | ${row.skill}`);
  }
}

function parseArgs(argv: string[]): Args {
  const values = new Map<string, string[]>();
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (!token.startsWith("--")) throw new Error(`Unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[i + 1];
    if (!value || value.startsWith("--")) throw new Error(`Missing value for --${key}`);
    values.set(key, [...(values.get(key) || []), value]);
    i += 1;
  }

  const url = required(values, "url");
  const grade = Number(required(values, "grade"));
  if (!Number.isInteger(grade) || grade < 1 || grade > 12) throw new Error("--grade must be an integer from 1-12");

  const standards = values.get("standard") || [];
  if (!standards.length) throw new Error("--standard is required and can be repeated");
  for (const standard of standards) {
    if (!/^CC\.1\.[1234]\.\d{1,2}\.[A-Z0-9]+$/.test(standard)) {
      throw new Error(`Invalid PA Core standard code: ${standard}`);
    }
  }

  const tier = (values.get("tier")?.[0] || "on_grade") as Tier;
  if (!["on_grade", "foundational", "advanced"].includes(tier)) throw new Error("--tier must be on_grade, foundational, or advanced");

  const confidence = (values.get("confidence")?.[0] || "high") as Confidence;
  if (!["high", "medium"].includes(confidence)) throw new Error("--confidence must be high or medium");

  return {
    url,
    grade,
    standards,
    skill: required(values, "skill"),
    collection: values.get("collection")?.[0] || "curated",
    tier,
    confidence,
  };
}

function required(values: Map<string, string[]>, key: string) {
  const value = values.get(key)?.[0]?.trim();
  if (!value) throw new Error(`--${key} is required`);
  return value;
}

function extractVideoId(input: string) {
  try {
    const parsed = new URL(input);
    if (parsed.hostname.includes("youtu.be")) return parsed.pathname.slice(1).split("/")[0] || null;
    if (parsed.hostname.includes("youtube.com")) return parsed.searchParams.get("v");
  } catch {
    return null;
  }
  return null;
}

async function fetchVideoMetadata(videoId: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", videoId);
  url.searchParams.set("key", YOUTUBE_API_KEY!);
  const response = await fetch(url.toString());
  if (!response.ok) throw new Error(`YouTube metadata fetch failed (${response.status}): ${await response.text()}`);
  const data = (await response.json()) as any;
  const item = data.items?.[0];
  if (!item) throw new Error(`YouTube video not found: ${videoId}`);
  return {
    title: String(item.snippet?.title || ""),
    channelTitle: String(item.snippet?.channelTitle || "YouTube"),
    channelId: String(item.snippet?.channelId || ""),
    durationSeconds: parseIsoDuration(String(item.contentDetails?.duration || "PT0S")),
    thumbnailUrl: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    thumbnailHdUrl: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.standard?.url || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
  };
}

function upsertCatalogEntry(
  catalog: Catalog,
  args: Args,
  videoId: string,
  metadata: Awaited<ReturnType<typeof fetchVideoMetadata>>,
) {
  const existingCollection = catalog.collections.find((collection) => collection.collection_id === args.collection);
  if (existingCollection) {
    existingCollection.video_count = Number(existingCollection.video_count || 0) + 1;
    existingCollection.last_updated_source = new Date().toISOString().slice(0, 10);
  } else {
    catalog.collections.push({
      collection_id: args.collection,
      collection_name: "Teacher Curated Resources",
      provider: metadata.channelTitle,
      channel_name: metadata.channelTitle,
      channel_id: metadata.channelId,
      platform: "youtube",
      kind: "curated",
      grade_level: args.grade,
      grade_range_min: args.grade,
      grade_range_max: args.grade,
      tier: args.tier,
      subject: "ELA",
      video_count: 1,
      discovered_at: new Date().toISOString().slice(0, 10),
      status: "CURATED",
    });
  }

  const existing = catalog.videos.find(
    (video) =>
      video.video_id === videoId &&
      Number(video.grade_level) === args.grade &&
      String(video.skill_name || "").toLowerCase() === args.skill.toLowerCase() &&
      JSON.stringify(video.pa_core_tags || []) === JSON.stringify(args.standards),
  );
  const row = {
    candidate_id: existing?.candidate_id || nextCandidateId(catalog),
    video_id: videoId,
    video_title: metadata.title,
    channel_name: metadata.channelTitle,
    platform: "youtube",
    watch_url: `https://www.youtube.com/watch?v=${videoId}`,
    embed_url: `https://www.youtube.com/embed/${videoId}`,
    thumbnail_url: metadata.thumbnailUrl,
    thumbnail_hd_url: metadata.thumbnailHdUrl,
    duration_seconds: metadata.durationSeconds,
    skill_id: slugify(args.skill),
    skill_name: args.skill,
    strand: strandForStandard(args.standards[0]),
    text_type: textTypeForStandard(args.standards[0], args.skill),
    ccss_tags: [],
    pa_core_tags: args.standards,
    grade_level: args.grade,
    grade_range_min: args.grade,
    grade_range_max: args.grade,
    tier: args.tier,
    subject: "ELA",
    collection_id: args.collection,
    sequence_order: nextCollectionSequence(catalog, args.collection),
    status: "CURATED",
    is_placeholder: false,
    is_curated: true,
    discovered_at: new Date().toISOString().slice(0, 10),
    source: args.collection,
    confidence: args.confidence,
    classification_confidence: args.confidence === "high" ? 5 : 4,
  };

  if (existing) {
    Object.assign(existing, row);
    return "updated existing matching catalog row";
  }
  catalog.videos.push(row);
  catalog.total_videos = catalog.videos.length;
  catalog.total_collections = catalog.collections.length;
  return "added new catalog row";
}

function nextCandidateId(catalog: Catalog) {
  return Math.max(0, ...catalog.videos.map((video) => Number(video.candidate_id || 0))) + 1;
}

function nextCollectionSequence(catalog: Catalog, collectionId: string) {
  return catalog.videos.filter((video) => video.collection_id === collectionId).length + 1;
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  return Number(match[1] || 0) * 3600 + Number(match[2] || 0) * 60 + Number(match[3] || 0);
}

function normalizeHeroCacheSkill(skill: string) {
  return skill.trim().toLowerCase().replace(/\s+/g, " ");
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 80);
}

function strandForStandard(standard: string) {
  if (standard.startsWith("CC.1.4.")) return "W";
  if (standard.startsWith("CC.1.3.")) return "RL";
  if (standard.startsWith("CC.1.2.")) return "RI";
  if (standard.startsWith("CC.1.1.")) return "RF";
  return "ELA";
}

function textTypeForStandard(standard: string, skill: string) {
  const lower = skill.toLowerCase();
  if (lower.includes("vocab") || lower.includes("word") || lower.includes("tense")) return "conventions";
  if (standard.startsWith("CC.1.4.")) return "writing";
  if (standard.startsWith("CC.1.3.")) return "literary";
  if (standard.startsWith("CC.1.2.")) return "informational";
  return "general";
}

main()
  .catch((error) => {
    console.error("Fatal:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
