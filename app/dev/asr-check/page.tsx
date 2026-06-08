import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";

export const dynamic = "force-dynamic";

const isolatedWordItems = [
  corpusItem("isolated_word", "cake", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cape", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cap", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "made", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "mad", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "lake", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "lack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "game", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "gam", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "take", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "tack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "name", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "nam", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "plate", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "plat", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "said", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "was", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cake/take", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "made/maid", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cape/tape", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "lake/make", false, "ASR-scoreable-real-word"),
  ...["zake", "mave", "pame", "vade", "sape", "nace", "gake", "tave"].map((word) =>
    corpusItem("isolated_word", word, true, "self/adult-confirm-pseudoword"),
  ),
];

const aELessonContent = phase3EntryLessonContentFor("a_e");

const connectedSentenceItems = aELessonContent.sentences.map((sentence) =>
  corpusItem("connected_sentence", sentence, false, "ASR-scoreable-real-word"),
);

const connectedPassageItems = [
  corpusItem(
    "connected_passage",
    aELessonContent.mockPassageText,
    false,
    "ASR-scoreable-real-word",
  ),
];

const corpus = [...isolatedWordItems, ...connectedSentenceItems, ...connectedPassageItems];

const tableColumns = [
  "utteranceId",
  "phase",
  "surfaceType",
  "target",
  "isPseudoword",
  "groundTruthSource",
  "humanHeardAs",
  "webspeech_transcript",
  "webspeech_conf",
  "webspeech_latencyMs",
  "whisper_transcript",
  "whisper_confidence_or_proxy",
  "whisper_latencyMs",
  "uncertaintyScore",
  "engineError",
  "audioQualityNote",
  "expectedFeedbackFamily",
  "safe_branch",
];

export default async function AsrCheckPage() {
  if (process.env.NODE_ENV === "production") notFound();
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  if ((session.user as any).role !== "ADMIN") redirect("/dashboard");

  const nonce = (await headers()).get("x-nonce") || undefined;

  return (
    <main className="min-h-screen bg-slate-100 px-6 py-8 text-slate-950">
      <div className="mx-auto max-w-7xl space-y-6">
        <header>
          <p className="text-sm font-bold uppercase tracking-wide text-amber-700">Dev only · admin gated · no audio persistence</p>
          <h1 className="text-3xl font-black">ASR reality-check harness</h1>
        </header>

        <section className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
          <label className="space-y-1 text-sm font-bold">
            Phase
            <select id="phase" className="w-full rounded border border-slate-300 p-2">
              <option value="A">A adult scripted</option>
              <option value="B">B child consented</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            Ground truth
            <select id="groundTruthSource" className="w-full rounded border border-slate-300 p-2">
              <option value="adult-scripted">adult-scripted</option>
              <option value="adult-listener">adult-listener</option>
              <option value="child-self-report">child-self-report</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            Model
            <select id="model" className="w-full rounded border border-slate-300 p-2">
              <option value="gpt-4o-transcribe">gpt-4o-transcribe</option>
              <option value="whisper-1">whisper-1</option>
            </select>
          </label>
          <label className="space-y-1 text-sm font-bold">
            Temperature
            <input id="temperature" placeholder="optional; e.g. 0" className="w-full rounded border border-slate-300 p-2" />
          </label>
          <label className="space-y-1 text-sm font-bold md:col-span-2">
            Prompt
            <input id="prompt" placeholder="optional prompt for over-normalization probe" className="w-full rounded border border-slate-300 p-2" />
          </label>
          <label className="space-y-1 text-sm font-bold">
            Human heard as
            <input id="humanHeardAs" placeholder="word, phrase, or unclear" className="w-full rounded border border-slate-300 p-2" />
          </label>
          <label className="space-y-1 text-sm font-bold">
            Audio quality note
            <input id="audioQualityNote" placeholder="optional" className="w-full rounded border border-slate-300 p-2" />
          </label>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-black">Corpus</h2>
            <button id="copyTable" type="button" className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white">Copy table (CSV/markdown)</button>
          </div>
          <div id="corpus" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {corpus.map((item, index) => (
              <article key={`${item.surfaceType}-${item.target}-${index}`} className="rounded border border-slate-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase text-slate-500">{item.surfaceType}{item.isPseudoword ? " · pseudoword" : ""}</p>
                    <p className="mt-1 text-lg font-black">{item.target}</p>
                  </div>
                  <button
                    type="button"
                    className="record rounded bg-amber-600 px-3 py-2 text-sm font-black text-white disabled:opacity-50"
                    data-index={index}
                  >
                    Record
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4">
          <h2 className="mb-3 text-xl font-black">Rows</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead>
                <tr>{tableColumns.map((column) => <th key={column} className="border border-slate-200 bg-slate-50 p-2">{column}</th>)}</tr>
              </thead>
              <tbody id="rows" />
            </table>
          </div>
        </section>
      </div>
      <script
        nonce={nonce}
        dangerouslySetInnerHTML={{
          __html: `
const corpus = ${JSON.stringify(corpus)};
const columns = ${JSON.stringify(tableColumns)};
const rows = [];
const buttons = Array.from(document.querySelectorAll(".record"));
let active = null;

function recognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function startAttempt(button) {
  if (active) return finishAttempt();
  const item = corpus[Number(button.dataset.index)];
  const utteranceId = crypto.randomUUID();
  const chunks = [];
  let transcript = "";
  let webConfidence = null;
  let webError = "";
  const startedAt = performance.now();
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const recorder = new MediaRecorder(stream);
  recorder.ondataavailable = (event) => { if (event.data && event.data.size > 0) chunks.push(event.data); };
  const Recognition = recognitionCtor();
  let recognition = null;
  if (Recognition) {
    recognition = new Recognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (event) => {
      const transcripts = [];
      for (let i = 0; i < event.results.length; i += 1) {
        const result = event.results[i]?.[0];
        if (result?.transcript) transcripts.push(result.transcript);
        if (typeof result?.confidence === "number") webConfidence = result.confidence;
      }
      transcript = transcripts.join(" ").trim();
    };
    recognition.onerror = () => { webError = "webspeech_error"; };
    recognition.start();
  } else {
    webError = "webspeech_unavailable";
  }
  recorder.start();
  button.textContent = "Stop";
  buttons.forEach((entry) => { if (entry !== button) entry.disabled = true; });
  active = { button, item, utteranceId, chunks, recorder, stream, recognition, startedAt, getTranscript: () => transcript, getConfidence: () => webConfidence, getError: () => webError };
}

async function finishAttempt() {
  const attempt = active;
  active = null;
  attempt.button.disabled = true;
  attempt.button.textContent = "Working...";
  const webspeechLatencyMs = Math.round(performance.now() - attempt.startedAt);
  try { attempt.recognition?.stop(); } catch {}
  const audioBlob = await new Promise((resolve) => {
    attempt.recorder.onstop = () => resolve(new Blob(attempt.chunks, { type: attempt.recorder.mimeType || "audio/webm" }));
    if (attempt.recorder.state !== "inactive") attempt.recorder.stop();
  });
  attempt.stream.getTracks().forEach((track) => track.stop());

  let transcribe = { transcript: "", confidenceProxy: null, latencyMs: 0, model: document.getElementById("model").value, uncertaintyScore: "" };
  let engineError = attempt.getError();
  try {
    const form = new FormData();
    form.append("audio", audioBlob, "utterance.webm");
    form.append("model", document.getElementById("model").value);
    form.append("expectedText", attempt.item.target);
    const prompt = document.getElementById("prompt").value.trim();
    const temperature = document.getElementById("temperature").value.trim();
    if (prompt) form.append("prompt", prompt);
    if (temperature) form.append("temperature", temperature);
    const response = await fetch("/api/voice/transcribe", { method: "POST", body: form });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "transcribe_failed");
    transcribe = payload;
  } catch (error) {
    engineError = [engineError, error instanceof Error ? error.message : "transcribe_failed"].filter(Boolean).join("; ");
  }

  const row = {
    utteranceId: attempt.utteranceId,
    phase: document.getElementById("phase").value,
    surfaceType: attempt.item.surfaceType,
    target: attempt.item.target,
    isPseudoword: String(attempt.item.isPseudoword),
    groundTruthSource: document.getElementById("groundTruthSource").value,
    humanHeardAs: document.getElementById("humanHeardAs").value.trim() || "unclear",
    webspeech_transcript: attempt.getTranscript(),
    webspeech_conf: attempt.getConfidence() ?? "",
    webspeech_latencyMs,
    whisper_transcript: transcribe.transcript || "",
    whisper_confidence_or_proxy: transcribe.confidenceProxy ?? "",
    whisper_latencyMs: transcribe.latencyMs || "",
    uncertaintyScore: typeof transcribe.uncertaintyScore === "number" ? transcribe.uncertaintyScore.toFixed(3) : "",
    engineError,
    audioQualityNote: document.getElementById("audioQualityNote").value.trim(),
    expectedFeedbackFamily: attempt.item.expectedFeedbackFamily,
    safe_branch: "",
  };
  rows.push(row);
  appendRow(row);
  // Drop the only blob reference after the table row is produced. No storage, no replay.
  buttons.forEach((entry) => { entry.disabled = false; });
  attempt.button.textContent = "Record";
}

function appendRow(row) {
  const tr = document.createElement("tr");
  for (const column of columns) {
    const td = document.createElement("td");
    td.className = "border border-slate-200 p-2 align-top";
    td.textContent = row[column] ?? "";
    tr.appendChild(td);
  }
  document.getElementById("rows").appendChild(tr);
}

function csvEscape(value) {
  return '"' + String(value ?? "").replaceAll('"', '""') + '"';
}

function markdownEscape(value) {
  return String(value ?? "").replaceAll("|", "\\\\|").replaceAll("\\n", " ");
}

function copyTable() {
  const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => csvEscape(row[column])).join(","))].join("\\n");
  const markdown = ["| " + columns.join(" | ") + " |", "| " + columns.map(() => "---").join(" | ") + " |", ...rows.map((row) => "| " + columns.map((column) => markdownEscape(row[column])).join(" | ") + " |")].join("\\n");
  navigator.clipboard.writeText(csv + "\\n\\n" + markdown);
}

for (const button of buttons) button.addEventListener("click", () => startAttempt(button));
document.getElementById("copyTable").addEventListener("click", copyTable);
          `,
        }}
      />
    </main>
  );
}

function corpusItem(surfaceType: "isolated_word" | "connected_sentence" | "connected_passage", target: string, isPseudoword: boolean, expectedFeedbackFamily: string) {
  return { surfaceType, target, isPseudoword, expectedFeedbackFamily };
}
