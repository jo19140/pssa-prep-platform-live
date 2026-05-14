import { readFileSync, writeFileSync } from "fs";
import path from "path";

const JSON_PATH = path.join(process.cwd(), "data", "oer-videos.json");
const YOUTUBE_KEY = process.env.YOUTUBE_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

if (!YOUTUBE_KEY) { console.error("Missing YOUTUBE_API_KEY"); process.exit(1); }
if (!OPENAI_KEY) { console.error("Missing OPENAI_API_KEY"); process.exit(1); }

const playlistUrl = process.argv[2];
const gradeArg = process.argv[3];
const collectionIdArg = process.argv[4];
if (!playlistUrl || !gradeArg) {
  console.error("Usage: npx tsx scripts/add-playlist-to-catalog.ts <playlist_url> <grade_level> [collection_id]");
  console.error("Example: npx tsx scripts/add-playlist-to-catalog.ts 'https://www.youtube.com/playlist?list=PLvJNSf-7NfrN_fffbuZYKrbZYw099BDne' 7 miacademy_level_h");
  process.exit(1);
}

const gradeLevel = parseInt(gradeArg, 10);
if (!Number.isInteger(gradeLevel) || gradeLevel < 3 || gradeLevel > 8) {
  console.error("grade_level must be 3-8");
  process.exit(1);
}

function extractPlaylistId(input: string): string {
  const m = input.match(/[?&]list=([^&]+)/);
  return m ? m[1] : input;
}

const playlistId = extractPlaylistId(playlistUrl);
const collectionId = collectionIdArg || `miacademy_level_${"abcdefgh"[gradeLevel - 1]}`;

async function fetchPlaylistItems(id: string) {
  const items: any[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", id);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", YOUTUBE_KEY!);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Playlist fetch failed (${res.status}): ${await res.text()}`);
    const data = (await res.json()) as any;
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    pageCount += 1;
    if (pageCount > 20) throw new Error("Pagination overflow");
  } while (pageToken);
  items.sort((a: any, b: any) => (a.snippet?.position ?? 0) - (b.snippet?.position ?? 0));
  return items;
}

async function fetchPlaylistMetadata(id: string) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet,contentDetails");
  url.searchParams.set("id", id);
  url.searchParams.set("key", YOUTUBE_KEY!);
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`Playlist metadata fetch failed (${res.status})`);
  const data = (await res.json()) as any;
  return data.items?.[0] || null;
}

async function fetchVideoDetails(videoIds: string[]) {
  const out = new Map<string, { duration: number; title: string; description: string; thumbHi?: string; thumbMax?: string; channel: string }>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50).filter(Boolean);
    if (!chunk.length) continue;
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", YOUTUBE_KEY!);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Video details fetch failed (${res.status})`);
    const data = (await res.json()) as any;
    for (const item of data.items || []) {
      out.set(item.id, {
        duration: parseIsoDuration(item.contentDetails?.duration || "PT0S"),
        title: item.snippet?.title || "",
        description: item.snippet?.description || "",
        thumbHi: item.snippet?.thumbnails?.high?.url,
        thumbMax: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.standard?.url,
        channel: item.snippet?.channelTitle || "",
      });
    }
  }
  return out;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!m) return 0;
  return parseInt(m[1] || "0", 10) * 3600 + parseInt(m[2] || "0", 10) * 60 + parseInt(m[3] || "0", 10);
}

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60);
}

async function classifyVideo(title: string, description: string, gradeLevel: number, skillLibrary: any[]) {
  const skillHints = skillLibrary
    .map((s) => `${s.skill_id}: ${s.skill_name} [strand: ${s.strand}, pa: ${(s.pa_core || []).join(", ")}]`)
    .slice(0, 80)
    .join("\n");

  const systemPrompt = `You classify educational YouTube videos for PSSA grade ${gradeLevel} ELA prep.
Return JSON with: skill_id (slug), skill_name (human-readable), strand (one of: "RL", "RI", "RL/RI", "L", "W"), text_type (one of: "literary", "informational", "vocabulary", "conventions", "writing", "general"), ccss_tags (array of CCSS codes for this grade like "RL.${gradeLevel}.2" or "L.${gradeLevel}.1"), pa_core_tags (array of PA Core codes for this grade like "CC.1.3.${gradeLevel}.A" or "CC.1.4.${gradeLevel}.F"), confidence (1-5).
Use existing skill_id from the library when the video matches one. If the video is off-topic or non-ELA, set confidence=1 and skill_id="off_topic".
Return only valid JSON.`;

  const userPrompt = `Video title: ${title}\n\nVideo description (truncated): ${(description || "").slice(0, 500)}\n\nGrade level: ${gradeLevel}\n\nExisting skill library (use these slugs when they match):\n${skillHints}`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI classification failed (${res.status}): ${await res.text()}`);
  const data = (await res.json()) as any;
  const content = data.choices?.[0]?.message?.content || "{}";
  try {
    const parsed = JSON.parse(content);
    return {
      skill_id: String(parsed.skill_id || "general"),
      skill_name: String(parsed.skill_name || "General"),
      strand: String(parsed.strand || "RL/RI"),
      text_type: String(parsed.text_type || "general"),
      ccss_tags: Array.isArray(parsed.ccss_tags) ? parsed.ccss_tags.map(String) : [],
      pa_core_tags: Array.isArray(parsed.pa_core_tags) ? parsed.pa_core_tags.map(String) : [],
      confidence: Number(parsed.confidence) || 1,
    };
  } catch {
    return { skill_id: "general", skill_name: "General", strand: "RL/RI", text_type: "general", ccss_tags: [], pa_core_tags: [], confidence: 1 };
  }
}

async function main() {
  console.log(`Adding playlist ${playlistId} (grade ${gradeLevel}) as collection ${collectionId}\n`);

  const catalog = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const skillLibrary = catalog.skill_library || [];

  const meta = await fetchPlaylistMetadata(playlistId);
  if (!meta) throw new Error("Playlist not found via YouTube API");
  const playlistTitle = meta.snippet?.title || `Grade ${gradeLevel} playlist`;
  const channelTitle = meta.snippet?.channelTitle || "";
  console.log(`Playlist: "${playlistTitle}" by ${channelTitle}`);

  const items = await fetchPlaylistItems(playlistId);
  console.log(`Items in playlist: ${items.length}`);

  const videoIds = items.map((it: any) => it.contentDetails?.videoId).filter(Boolean);
  const details = await fetchVideoDetails(videoIds);
  console.log(`Fetched details for ${details.size} videos`);

  if (!catalog.collections.find((c: any) => c.collection_id === collectionId)) {
    catalog.collections.push({
      collection_id: collectionId,
      collection_name: playlistTitle,
      provider: "Miacademy",
      channel_name: channelTitle,
      platform: "youtube",
      kind: "playlist",
      playlist_id: playlistId,
      playlist_url: `https://www.youtube.com/playlist?list=${playlistId}`,
      grade_level: gradeLevel,
      grade_range_min: gradeLevel,
      grade_range_max: gradeLevel,
      tier: "on_grade",
      subject: "ELA",
      video_count: items.length,
      discovered_at: new Date().toISOString().slice(0, 10),
      status: "PENDING_EXPANSION",
    });
    console.log(`Added collection ${collectionId}`);
  }

  const existingByVideoId = new Set((catalog.videos || []).map((v: any) => v.video_id).filter(Boolean));
  const nextCandidateId = Math.max(0, ...catalog.videos.map((v: any) => v.candidate_id || 0)) + 1;

  let added = 0;
  let skipped = 0;
  let lowConfidence = 0;

  for (let i = 0; i < items.length; i += 1) {
    const item = items[i];
    const videoId = item.contentDetails?.videoId;
    if (!videoId) { skipped += 1; continue; }
    if (existingByVideoId.has(videoId)) { skipped += 1; continue; }

    const detail = details.get(videoId);
    if (!detail) { skipped += 1; continue; }
    if (detail.duration < 60 || detail.duration > 1800) {
      console.log(`  Skip ${videoId} (duration ${detail.duration}s out of range): ${detail.title}`);
      skipped += 1;
      continue;
    }

    const classification = await classifyVideo(detail.title, detail.description, gradeLevel, skillLibrary);
    if (classification.skill_id === "off_topic" || classification.confidence < 2 || !classification.pa_core_tags.length) {
      console.log(`  Skip ${videoId} (low confidence or off-topic): ${detail.title}`);
      lowConfidence += 1;
      continue;
    }

    catalog.videos.push({
      candidate_id: nextCandidateId + added,
      video_id: videoId,
      video_title: detail.title,
      channel_name: detail.channel || channelTitle,
      platform: "youtube",
      watch_url: `https://www.youtube.com/watch?v=${videoId}`,
      embed_url: `https://www.youtube.com/embed/${videoId}`,
      thumbnail_url: detail.thumbHi || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
      thumbnail_hd_url: detail.thumbMax || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
      duration_seconds: detail.duration,
      skill_id: classification.skill_id,
      skill_name: classification.skill_name,
      strand: classification.strand,
      text_type: classification.text_type,
      ccss_tags: classification.ccss_tags,
      pa_core_tags: classification.pa_core_tags,
      grade_level: gradeLevel,
      grade_range_min: gradeLevel,
      grade_range_max: gradeLevel,
      tier: "on_grade",
      subject: "ELA",
      collection_id: collectionId,
      sequence_order: i + 1,
      status: "PENDING",
      is_placeholder: false,
      discovered_at: new Date().toISOString().slice(0, 10),
      source: collectionId,
      classification_confidence: classification.confidence,
    });
    added += 1;
    console.log(`  Added [${classification.confidence}/5] ${detail.title} → ${classification.skill_name} (${classification.pa_core_tags.join(", ")})`);
  }

  catalog.total_videos = catalog.videos.length;
  catalog.total_collections = catalog.collections.length;
  writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2));

  console.log("\nDone.");
  console.log(`  Videos added: ${added}`);
  console.log(`  Skipped (duplicates / out-of-range duration): ${skipped}`);
  console.log(`  Skipped low confidence or off-topic: ${lowConfidence}`);
  console.log(`  Updated ${JSON_PATH}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
