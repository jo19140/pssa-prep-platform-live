import { readFileSync, writeFileSync } from "fs";
import path from "path";

type Catalog = {
  videos: VideoRow[];
  collections: CollectionRow[];
  [key: string]: unknown;
};

type VideoRow = {
  candidate_id: number;
  video_id: string | null;
  video_title: string;
  channel_name: string;
  platform: string;
  watch_url: string | null;
  embed_url: string | null;
  thumbnail_url: string | null;
  thumbnail_hd_url?: string | null;
  duration_seconds: number | null;
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

type CollectionRow = {
  collection_id: string;
  collection_name: string;
  provider: string;
  channel_name: string;
  channel_id?: string;
  platform: string;
  kind: string;
  playlist_id?: string;
  playlist_url?: string;
  grade_level: number;
  [key: string]: unknown;
};

const JSON_PATH = path.join(process.cwd(), "data", "oer-videos.json");
const API_KEY = process.env.YOUTUBE_API_KEY;

if (!API_KEY) {
  console.error("Missing YOUTUBE_API_KEY environment variable.");
  process.exit(1);
}

async function fetchPlaylistItems(playlistId: string) {
  const items: any[] = [];
  let pageToken: string | undefined;
  let pageCount = 0;
  do {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "snippet,contentDetails");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", API_KEY!);
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Playlist fetch failed for ${playlistId} (${res.status}): ${text}`);
    }
    const data = (await res.json()) as any;
    items.push(...(data.items || []));
    pageToken = data.nextPageToken;
    pageCount += 1;
    if (pageCount > 20) throw new Error(`Pagination overflow on ${playlistId}`);
  } while (pageToken);
  items.sort((a: any, b: any) => (a.snippet?.position ?? 0) - (b.snippet?.position ?? 0));
  return items;
}

async function fetchVideoDurations(videoIds: string[]) {
  const durations = new Map<string, number>();
  const titles = new Map<string, string>();
  const thumbnails = new Map<string, { hi?: string; max?: string }>();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50).filter(Boolean);
    if (!chunk.length) continue;
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "contentDetails,snippet");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", API_KEY!);
    const res = await fetch(url.toString());
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Video details fetch failed (${res.status}): ${text}`);
    }
    const data = (await res.json()) as any;
    for (const item of data.items || []) {
      durations.set(item.id, parseIsoDuration(item.contentDetails?.duration || "PT0S"));
      if (item.snippet?.title) titles.set(item.id, item.snippet.title);
      thumbnails.set(item.id, {
        hi: item.snippet?.thumbnails?.high?.url || item.snippet?.thumbnails?.default?.url,
        max: item.snippet?.thumbnails?.maxres?.url || item.snippet?.thumbnails?.standard?.url,
      });
    }
  }
  return { durations, titles, thumbnails };
}

function parseIsoDuration(iso: string): number {
  const match = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) return 0;
  const hours = parseInt(match[1] || "0", 10);
  const minutes = parseInt(match[2] || "0", 10);
  const seconds = parseInt(match[3] || "0", 10);
  return hours * 3600 + minutes * 60 + seconds;
}

async function main() {
  const catalog: Catalog = JSON.parse(readFileSync(JSON_PATH, "utf8"));
  const collectionsById = new Map(catalog.collections.map((c) => [c.collection_id, c]));

  const placeholders = catalog.videos.filter((v) => v.is_placeholder);
  const expandable = placeholders.filter((v) => v.collection_id && (v.pa_core_tags?.length || 0) > 0);
  const courseIntros = placeholders.filter((v) => !v.pa_core_tags?.length);

  console.log(`Total placeholders: ${placeholders.length}`);
  console.log(`  Expandable (have collection + PA tags): ${expandable.length}`);
  console.log(`  Course intros (will skip): ${courseIntros.length}`);
  console.log("");

  const byCollection = new Map<string, VideoRow[]>();
  for (const v of expandable) {
    const key = v.collection_id!;
    if (!byCollection.has(key)) byCollection.set(key, []);
    byCollection.get(key)!.push(v);
  }

  let totalFilled = 0;
  let totalUnmatched = 0;

  for (const [collectionId, placeholders] of byCollection.entries()) {
    const collection = collectionsById.get(collectionId);
    if (!collection?.playlist_id) {
      console.log(`  Skipping collection ${collectionId} (no playlist_id)`);
      totalUnmatched += placeholders.length;
      continue;
    }

    console.log(`Collection ${collectionId}: ${placeholders.length} placeholders, playlist ${collection.playlist_id}`);
    let items: any[];
    try {
      items = await fetchPlaylistItems(collection.playlist_id);
    } catch (err) {
      console.log(`  ERROR: ${err instanceof Error ? err.message : err}`);
      totalUnmatched += placeholders.length;
      continue;
    }
    console.log(`  Playlist has ${items.length} videos`);

    const videoIds = items.map((it: any) => it.contentDetails?.videoId).filter(Boolean);
    const { durations, titles, thumbnails } = await fetchVideoDurations(videoIds);

    for (const ph of placeholders) {
      const position = (ph.sequence_order ?? 0) - 1;
      const item = items[position];
      if (!item) {
        console.log(`  Position ${ph.sequence_order} not in playlist (skill: ${ph.skill_name})`);
        totalUnmatched += 1;
        continue;
      }
      const videoId = item.contentDetails?.videoId;
      if (!videoId) {
        console.log(`  Position ${ph.sequence_order} has no videoId (skill: ${ph.skill_name})`);
        totalUnmatched += 1;
        continue;
      }
      const title = titles.get(videoId) || item.snippet?.title || ph.video_title;
      const thumb = thumbnails.get(videoId) || {};
      ph.video_id = videoId;
      ph.video_title = title;
      ph.watch_url = `https://www.youtube.com/watch?v=${videoId}`;
      ph.embed_url = `https://www.youtube.com/embed/${videoId}`;
      ph.thumbnail_url = thumb.hi || `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
      ph.thumbnail_hd_url = thumb.max || `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
      ph.duration_seconds = durations.get(videoId) ?? null;
      ph.is_placeholder = false;
      ph.status = "PENDING";
      totalFilled += 1;
    }
  }

  catalog.videos = catalog.videos.filter((v) => !(v.is_placeholder && !v.pa_core_tags?.length));
  const removedIntros = courseIntros.length;

  writeFileSync(JSON_PATH, JSON.stringify(catalog, null, 2));

  console.log("");
  console.log("Done.");
  console.log(`  Placeholders filled: ${totalFilled}`);
  console.log(`  Placeholders unmatched: ${totalUnmatched}`);
  console.log(`  Course-intro entries removed: ${removedIntros}`);
  console.log(`  Updated ${JSON_PATH}`);
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
