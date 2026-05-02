import OpenAI from "openai";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = (session.user as any).role;
  if (role !== "STUDENT" && role !== "ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const formData = await req.formData();
  const assignmentId = String(formData.get("assignmentId") || "").trim();
  const manualTranscript = String(formData.get("manualTranscript") || "").trim();
  const audioSeconds = Number.parseInt(String(formData.get("audioSeconds") || "0"), 10) || null;
  const audio = formData.get("audio");

  if (!assignmentId) return NextResponse.json({ error: "Reading Coach assignment is required." }, { status: 400 });

  const student = await db.studentProfile.findUnique({
    where: { userId: (session.user as any).id },
    include: { enrollments: true },
  });
  if (!student) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const classIds = student.enrollments.map((enrollment) => enrollment.classRoomId);
  const assignment = await db.readingCoachAssignment.findFirst({
    where: { id: assignmentId, classRoomId: { in: classIds }, status: "ASSIGNED" },
  });
  if (!assignment) return NextResponse.json({ error: "Reading Coach assignment not found." }, { status: 404 });

  const expectedText = assignment.expectedText;
  const activityType = assignment.activityType;
  const gradeLevel = assignment.gradeLevel;

  let transcript = manualTranscript;
  let provider = manualTranscript ? "MANUAL_TRANSCRIPT" : "FALLBACK";

  if (!transcript && audio instanceof File && process.env.OPENAI_API_KEY) {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const transcription = await openai.audio.transcriptions.create({
      file: audio,
      model: process.env.OPENAI_TRANSCRIPTION_MODEL || "whisper-1",
    });
    transcript = transcription.text || "";
    provider = "OPENAI_TRANSCRIPTION";
  }

  if (!transcript) {
    transcript = "";
    provider = "NO_TRANSCRIPT";
  }

  const analysis = analyzeReading({ expectedText, transcript, audioSeconds });
  const attempt = await db.readingCoachAttempt.create({
    data: {
      assignmentId: assignment.id,
      userId: (session.user as any).id,
      gradeLevel,
      activityType,
      expectedText,
      transcript,
      wordCount: analysis.wordCount,
      correctWords: analysis.correctWords,
      accuracy: analysis.accuracy,
      wordsPerMinute: analysis.wordsPerMinute,
      focusAreas: analysis.focusAreas as Prisma.InputJsonValue,
      miscues: analysis.miscues as Prisma.InputJsonValue,
      feedback: analysis.feedback as Prisma.InputJsonValue,
      provider,
      audioSeconds,
    },
  });

  return NextResponse.json({ attempt, analysis, provider });
}

function analyzeReading({
  expectedText,
  transcript,
  audioSeconds,
}: {
  expectedText: string;
  transcript: string;
  audioSeconds: number | null;
}) {
  const expectedWords = tokenize(expectedText);
  const spokenWords = tokenize(transcript);
  let correctWords = 0;
  const miscues: { expected: string; heard?: string; type: string }[] = [];
  const usedSpoken = new Set<number>();

  expectedWords.forEach((word, index) => {
    const heard = spokenWords[index];
    if (heard === word) {
      correctWords += 1;
      usedSpoken.add(index);
      return;
    }
    const nearbyIndex = spokenWords.findIndex((candidate, spokenIndex) => !usedSpoken.has(spokenIndex) && Math.abs(spokenIndex - index) <= 2 && candidate === word);
    if (nearbyIndex >= 0) {
      correctWords += 1;
      usedSpoken.add(nearbyIndex);
      return;
    }
    miscues.push({ expected: word, heard, type: heard ? "substitution" : "omission" });
  });

  const wordCount = expectedWords.length;
  const accuracy = wordCount ? Math.round((correctWords / wordCount) * 100) : 0;
  const wordsPerMinute = audioSeconds && audioSeconds > 0 ? Math.round((spokenWords.length / audioSeconds) * 60) : null;
  const focusAreas = inferFocusAreas(miscues, wordsPerMinute, accuracy);
  const feedback = buildFeedback({ accuracy, wordsPerMinute, focusAreas, miscues });

  return { wordCount, correctWords, accuracy, wordsPerMinute, miscues: miscues.slice(0, 12), focusAreas, feedback };
}

function tokenize(text: string) {
  return text.toLowerCase().replace(/[^a-z'\s-]/g, " ").split(/\s+/).filter(Boolean);
}

function inferFocusAreas(miscues: { expected: string; heard?: string; type: string }[], wordsPerMinute: number | null, accuracy: number) {
  const areas = new Set<string>();
  for (const miscue of miscues) {
    const word = miscue.expected;
    if (/(sh|ch|th|wh|ck|ph)/.test(word)) areas.add("Digraphs");
    if (/(bl|br|cl|cr|dr|fl|fr|gl|gr|pl|pr|sl|sm|sn|sp|st|sw|tr)/.test(word)) areas.add("Blends");
    if (/[bcdfghjklmnpqrstvwxyz]e$/.test(word) || /[aeiou][bcdfghjklmnpqrstvwxyz]e$/.test(word)) areas.add("VCE syllables");
    if (/(ar|er|ir|or|ur)/.test(word)) areas.add("R-controlled vowels");
    if (/(ai|ay|ee|ea|oa|ow|oi|oy|ou|oo)/.test(word)) areas.add("Vowel teams");
    if (word.endsWith("ed") || word.endsWith("s") || word.endsWith("ing")) areas.add("Word endings");
    if (word.length <= 4) areas.add("Short vowels and closed syllables");
  }
  if (wordsPerMinute != null && wordsPerMinute < 85) areas.add("Fluency pacing");
  if (accuracy < 90) areas.add("Accuracy with connected text");
  if (!areas.size) areas.add("Fluency expression");
  return Array.from(areas).slice(0, 5);
}

function buildFeedback({
  accuracy,
  wordsPerMinute,
  focusAreas,
  miscues,
}: {
  accuracy: number;
  wordsPerMinute: number | null;
  focusAreas: string[];
  miscues: { expected: string; heard?: string; type: string }[];
}) {
  const strengths = accuracy >= 95
    ? ["You read the passage with strong word accuracy."]
    : accuracy >= 85
      ? ["You read many of the words correctly and are ready for targeted practice."]
      : ["You completed the reading practice and gave the coach something useful to work from."];
  if (wordsPerMinute != null && wordsPerMinute >= 110) strengths.push("Your reading pace was steady.");

  const nextSteps = focusAreas.map((area) => {
    if (area === "Digraphs") return "Practice saying digraph sounds like sh, ch, th, wh, and ck in words.";
    if (area === "Blends") return "Practice sliding through blends without dropping either sound.";
    if (area === "VCE syllables") return "Look for vowel-consonant-e patterns and try the long vowel sound.";
    if (area === "R-controlled vowels") return "Practice ar, er, ir, or, and ur as vowel+r chunks.";
    if (area === "Vowel teams") return "Read vowel teams as one sound when they appear together.";
    if (area === "Word endings") return "Slow down at the end of words so -s, -ed, and -ing are not skipped.";
    if (area === "Fluency pacing") return "Reread the passage once, aiming for smooth phrases instead of word-by-word reading.";
    return "Practice reading the sentence again and checking each word with your eyes.";
  });

  return {
    summary: `Reading accuracy: ${accuracy}%.${wordsPerMinute != null ? ` Estimated pace: ${wordsPerMinute} words per minute.` : ""}`,
    strengths,
    focusAreas,
    nextSteps,
    coachPrompt: miscues[0]
      ? `Try this word again: ${miscues[0].expected}. Say each sound, blend it, then read it in the sentence.`
      : "Try rereading with expression. Pause at punctuation and read in smooth phrases.",
    safetyNote: "This is reading practice feedback, not a diagnosis.",
  };
}
