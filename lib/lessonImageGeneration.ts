import { createHash } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import OpenAI from "openai";

type LessonImageInput = {
  title: string;
  skill: string;
  gradeLevel: number;
  lessonExplanation?: string;
  workedExample?: string;
  sourcePayload: Record<string, unknown>;
  force?: boolean;
};

type LessonImageResult = {
  sourcePayload: Record<string, unknown>;
  imageUrl?: string;
  generated: boolean;
  skippedReason?: string;
};

const DEFAULT_IMAGE_MODEL = "gpt-image-1";
const DEFAULT_IMAGE_SIZE = "1536x1024";

export function lessonImageGenerationEnabled() {
  return process.env.OPENAI_LESSON_IMAGES_ENABLED === "true";
}

export async function generateLessonImageForPayload(input: LessonImageInput): Promise<LessonImageResult> {
  const sourcePayload = asRecord(input.sourcePayload);
  const visual = asRecord(sourcePayload.visual);
  const existingImageUrl = stringValue(sourcePayload.imageUrl) || stringValue(visual.imageUrl);
  if (existingImageUrl && !input.force) return { sourcePayload, imageUrl: existingImageUrl, generated: false, skippedReason: "already_exists" };

  if (!lessonImageGenerationEnabled()) {
    return withImageStatus(sourcePayload, { status: "SKIPPED", reason: "OPENAI_LESSON_IMAGES_ENABLED is not true" });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim().replace(/^['"]|['"]$/g, "");
  if (!apiKey) return withImageStatus(sourcePayload, { status: "SKIPPED", reason: "OPENAI_API_KEY is not configured" });

  const imagePrompt = buildStudentSafeImagePrompt(input);
  const slug = slugify(`${input.gradeLevel}-${input.skill}-${input.title}`);
  const digest = createHash("sha256").update(imagePrompt).digest("hex").slice(0, 10);
  const filename = `${slug}-${digest}.png`;
  const publicPath = path.join(process.cwd(), "public", "generated", "lesson-images");
  const filePath = path.join(publicPath, filename);
  const imageUrl = `/generated/lesson-images/${filename}`;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.images.generate({
      model: process.env.OPENAI_LESSON_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
      prompt: imagePrompt,
      size: process.env.OPENAI_LESSON_IMAGE_SIZE || DEFAULT_IMAGE_SIZE,
      quality: process.env.OPENAI_LESSON_IMAGE_QUALITY || "medium",
    } as any);

    const image = (response as any).data?.[0];
    const bytes = await imageBytes(image);
    if (!bytes) throw new Error("Image API returned no usable image bytes.");

    await mkdir(publicPath, { recursive: true });
    await writeFile(filePath, bytes);

    const nextPayload = mergeImagePayload(sourcePayload, {
      imageUrl,
      prompt: imagePrompt,
      model: process.env.OPENAI_LESSON_IMAGE_MODEL || DEFAULT_IMAGE_MODEL,
      size: process.env.OPENAI_LESSON_IMAGE_SIZE || DEFAULT_IMAGE_SIZE,
    });
    return { sourcePayload: nextPayload, imageUrl, generated: true };
  } catch (error) {
    console.error("Lesson image generation failed:", error);
    return withImageStatus(sourcePayload, {
      status: "FAILED",
      reason: error instanceof Error ? error.message : "Unknown image generation error",
    });
  }
}

export async function attachGeneratedImagesToLessons<T extends LessonImageInput>(lessons: T[]): Promise<T[]> {
  if (!lessonImageGenerationEnabled()) return lessons;

  const maxPerRun = Number(process.env.OPENAI_LESSON_IMAGES_MAX_PER_RUN || lessons.length || 1);
  const next: T[] = [];
  let generatedOrAttempted = 0;

  for (const lesson of lessons) {
    if (generatedOrAttempted >= maxPerRun) {
      next.push(lesson);
      continue;
    }

    const result = await generateLessonImageForPayload(lesson);
    if (result.generated || result.skippedReason !== "already_exists") generatedOrAttempted += 1;
    next.push({ ...lesson, sourcePayload: result.sourcePayload });
  }

  return next;
}

function buildStudentSafeImagePrompt(input: LessonImageInput) {
  const sourcePayload = asRecord(input.sourcePayload);
  const visual = asRecord(sourcePayload.visual);
  const basePrompt = stringValue(sourcePayload.imagePrompt) || stringValue(visual.imagePrompt);
  const topic = `${input.title} (${input.skill}, Grade ${input.gradeLevel})`;
  const lessonContext = [input.lessonExplanation, input.workedExample].filter(Boolean).join(" ").slice(0, 900);

  return [
    "Create one original, student-safe educational image for a PSSA ELA digital lesson.",
    `Lesson: ${topic}.`,
    basePrompt ? `Existing visual direction: ${basePrompt}` : "",
    lessonContext ? `Lesson context: ${lessonContext}` : "",
    "The image must directly support the reading or writing skill and help students connect to the subject matter.",
    "Use a lively scene-based educational illustration with clear composition, real subject matter, and purposeful details.",
    "Make it feel like a moment from a lesson or passage, not a worksheet, poster, chart, labeled diagram, UI screen, or infographic.",
    "Do not include copyrighted characters, brand logos, watermarks, celebrity likenesses, school district logos, or worksheet text.",
    "Do not put any letters, words, numbers, labels, captions, handwriting, printed text, or pseudo-text anywhere in the image.",
    "If papers, books, signs, or screens appear, they must use blank lines, blocks, icons, highlights, arrows, or simple shapes only.",
    "Avoid split panels, category labels, speech bubbles, and title cards.",
    "Do not include violent, frightening, sexually explicit, hateful, or otherwise inappropriate content.",
    "Avoid generic abstract graphics. Make the scene specific to the skill and lesson.",
  ]
    .filter(Boolean)
    .join("\n");
}

async function imageBytes(image: any) {
  if (image?.b64_json) return Buffer.from(String(image.b64_json), "base64");
  if (image?.url) {
    const response = await fetch(String(image.url));
    if (!response.ok) throw new Error(`Could not download generated image: ${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }
  return null;
}

function mergeImagePayload(sourcePayload: Record<string, unknown>, image: { imageUrl: string; prompt: string; model: string; size: string }) {
  const visual = asRecord(sourcePayload.visual);
  return {
    ...sourcePayload,
    imageUrl: image.imageUrl,
    visual: {
      ...visual,
      imageUrl: image.imageUrl,
    },
    imageGeneration: {
      status: "COMPLETED",
      provider: "OPENAI_IMAGES",
      model: image.model,
      size: image.size,
      prompt: image.prompt,
      generatedAt: new Date().toISOString(),
    },
  };
}

function withImageStatus(sourcePayload: Record<string, unknown>, status: { status: string; reason: string }): LessonImageResult {
  return {
    sourcePayload: {
      ...sourcePayload,
      imageGeneration: {
        status: status.status,
        reason: status.reason,
        updatedAt: new Date().toISOString(),
      },
    },
    generated: false,
    skippedReason: status.reason,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...(value as Record<string, unknown>) };
  return {};
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
