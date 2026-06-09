import { getServerSession } from "next-auth";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { phase3EntryLessonContentFor } from "@/lib/content/phase3EntryLessonContent";

export const dynamic = "force-dynamic";

const phaseBSilentEWords = new Set(["cake", "cape", "made", "lake", "game", "take", "name", "plate"]);

const isolatedWordItems = [
  corpusItem("isolated_word", "cake", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "cack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "cape", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "cap", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "made", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "mad", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "lake", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "lack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "game", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "gam", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "take", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "tack", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "name", false, "ASR-scoreable-real-word", ["A", "B"]),
  corpusItem("isolated_word", "nam", false, "ASR-scoreable-real-word"),
  corpusItem("isolated_word", "plate", false, "ASR-scoreable-real-word", ["A", "B"]),
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
  corpusItem("connected_sentence", sentence, false, "ASR-scoreable-real-word", ["A", "B"]),
);

const connectedPassageItems = [
  corpusItem(
    "connected_passage",
    aELessonContent.mockPassageText,
    false,
    "ASR-scoreable-real-word",
    ["A", "B"],
  ),
];

const corpus = [...isolatedWordItems, ...connectedSentenceItems, ...connectedPassageItems];

const tableColumns = [
  "utteranceId",
  "phase",
  "surfaceType",
  "target",
  "screenTarget",
  "intendedRead",
  "isPseudoword",
  "groundTruthSource",
  "humanHeardAs",
  "humanHeardAs2",
  "webspeech_transcript",
  "webspeech_conf",
  "webspeech_latencyMs",
  "whisper_transcript",
  "whisper_confidence_or_proxy",
  "whisper_latencyMs",
  "uncertaintyScore",
  "falseCreditWebSpeech",
  "falseCreditTranscribe",
  "falseNegativeWebSpeech",
  "falseNegativeTranscribe",
  "excludeFromThreshold",
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
            Corpus mode
            <select id="phase" className="w-full rounded border border-slate-300 p-2">
              <option value="A">Phase A adult scripted</option>
              <option value="B">Phase B child target-only</option>
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
            <div>
              <h2 className="text-xl font-black">Corpus</h2>
              <p id="status" className="mt-1 text-sm font-bold text-slate-600" aria-live="polite">Ready.</p>
              <div id="latestResult" className="mt-3 hidden rounded border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-950" aria-live="polite" />
            </div>
            <button id="copyTable" type="button" className="rounded bg-slate-900 px-4 py-2 text-sm font-bold text-white">Copy table (CSV/markdown)</button>
          </div>
          <div id="reviewPanel" className="mb-4 hidden rounded border border-sky-200 bg-sky-50 p-4 text-sm text-sky-950">
            <div className="mb-3">
              <p id="reviewTitle" className="font-black">Review recording</p>
              <p className="text-xs font-bold uppercase text-sky-700">Blob is held in browser memory only until commit/cancel.</p>
            </div>
            <audio id="reviewAudio" className="mb-3 w-full" controls />
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1 font-bold">
                Human heard as
                <input id="reviewHumanHeardAs" placeholder="required: word, phrase, or unclear" className="w-full rounded border border-sky-300 p-2" />
              </label>
              <label className="space-y-1 font-bold">
                Human heard as 2 (optional)
                <input id="reviewHumanHeardAs2" placeholder="optional second listener" className="w-full rounded border border-sky-300 p-2" />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button id="commitReview" type="button" disabled className="rounded bg-sky-900 px-4 py-2 font-black text-white disabled:opacity-50">Commit row</button>
              <button id="cancelReview" type="button" className="rounded border border-sky-300 px-4 py-2 font-black text-sky-950">Cancel</button>
              <span id="reviewValidation" className="font-bold text-sky-800">Enter what was heard, or exactly unclear.</span>
            </div>
          </div>
          <div id="corpus" className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {corpus.map((item, index) => (
              <article key={`${item.surfaceType}-${item.target}-${index}`} className="corpus-card rounded border border-slate-200 p-3" data-phase-modes={item.phaseModes.join(",")}>
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
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: `
const corpus = ${JSON.stringify(corpus)};
const columns = ${JSON.stringify(tableColumns)};
const rows = [];
const buttons = Array.from(document.querySelectorAll(".record"));
let active = null;
let pendingReview = null;

function recognitionCtor() {
  return window.SpeechRecognition || window.webkitSpeechRecognition || null;
}

async function startAttempt(button) {
  if (active) return finishAttempt();
  clearPendingReview("discarded because a new recording started");
  const item = corpus[Number(button.dataset.index)];
  const utteranceId = crypto.randomUUID();
  const chunks = [];
  let transcript = "";
  let webConfidence = null;
  let webError = "";
  const startedAt = performance.now();
  buttons.forEach((entry) => { if (entry !== button) entry.disabled = true; });
  button.disabled = true;
  button.textContent = "Requesting mic...";
  setStatus("Requesting microphone access...");
  let stream;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new Error("getUserMedia unavailable");
    stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  } catch (error) {
    setStatus("Microphone permission was denied or unavailable. Allow microphone access for this local page, then try Record again.");
    button.disabled = false;
    button.textContent = "Record";
    buttons.forEach((entry) => { entry.disabled = false; });
    console.error(error);
    return;
  }
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
  button.disabled = false;
  setStatus("Recording. Click Stop when finished.");
  active = { button, item, utteranceId, chunks, recorder, stream, recognition, startedAt, getTranscript: () => transcript, getConfidence: () => webConfidence, getError: () => webError };
}

async function finishAttempt() {
  const attempt = active;
  active = null;
  attempt.button.disabled = true;
  attempt.button.textContent = "Working...";
  setStatus("Transcribing the same recorded blob, then preparing replay...");
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

  const rowBase = {
    utteranceId: attempt.utteranceId,
    phase: document.getElementById("phase").value,
    surfaceType: attempt.item.surfaceType,
    target: attempt.item.target,
    screenTarget: attempt.item.target,
    intendedRead: document.getElementById("phase").value === "B" ? "" : attempt.item.target,
    isPseudoword: String(attempt.item.isPseudoword),
    groundTruthSource: document.getElementById("groundTruthSource").value,
    humanHeardAs: "",
    humanHeardAs2: "",
    webspeech_transcript: attempt.getTranscript(),
    webspeech_conf: attempt.getConfidence() ?? "",
    webspeech_latencyMs: webspeechLatencyMs,
    whisper_transcript: transcribe.transcript || "",
    whisper_confidence_or_proxy: transcribe.confidenceProxy ?? "",
    whisper_latencyMs: transcribe.latencyMs || "",
    uncertaintyScore: typeof transcribe.uncertaintyScore === "number" ? transcribe.uncertaintyScore.toFixed(3) : "",
    falseCreditWebSpeech: "false",
    falseCreditTranscribe: "false",
    falseNegativeWebSpeech: "false",
    falseNegativeTranscribe: "false",
    excludeFromThreshold: "false",
    engineError,
    audioQualityNote: document.getElementById("audioQualityNote").value.trim(),
    expectedFeedbackFamily: attempt.item.expectedFeedbackFamily,
    safe_branch: "",
  };
  showReviewPanel(rowBase, audioBlob);
  setStatus("Replay the recording, label humanHeardAs, then commit or cancel.");
  buttons.forEach((entry) => { entry.disabled = false; });
  attempt.button.textContent = "Record";
}

function setStatus(message) {
  const status = document.getElementById("status");
  if (status) status.textContent = message;
}

function appendRow(row) {
  const tr = document.createElement("tr");
  if (isTrue(row.falseCreditWebSpeech) || isTrue(row.falseCreditTranscribe)) {
    tr.className = "bg-red-50";
  } else if (isTrue(row.falseNegativeWebSpeech) || isTrue(row.falseNegativeTranscribe)) {
    tr.className = "bg-amber-50";
  }
  for (const column of columns) {
    const td = document.createElement("td");
    td.className = "border border-slate-200 p-2 align-top";
    td.textContent = row[column] ?? "";
    tr.appendChild(td);
  }
  document.getElementById("rows").appendChild(tr);
}

function showReviewPanel(rowBase, audioBlob) {
  clearPendingReview();
  const objectUrl = URL.createObjectURL(audioBlob);
  pendingReview = { rowBase, audioBlob, objectUrl };
  const panel = document.getElementById("reviewPanel");
  const audio = document.getElementById("reviewAudio");
  const heard = document.getElementById("reviewHumanHeardAs");
  const heard2 = document.getElementById("reviewHumanHeardAs2");
  document.getElementById("reviewTitle").textContent = "Review recording: " + rowBase.screenTarget;
  audio.src = objectUrl;
  heard.value = document.getElementById("humanHeardAs").value.trim();
  heard2.value = "";
  panel.classList.remove("hidden");
  updateCommitState();
}

function clearPendingReview(reason) {
  if (!pendingReview) return;
  URL.revokeObjectURL(pendingReview.objectUrl);
  pendingReview = null;
  const audio = document.getElementById("reviewAudio");
  if (audio) {
    audio.pause();
    audio.removeAttribute("src");
    audio.load();
  }
  document.getElementById("reviewPanel")?.classList.add("hidden");
  if (reason) setStatus("Review discarded: " + reason + ". Audio blob released.");
}

function updateCommitState() {
  const input = document.getElementById("reviewHumanHeardAs");
  const button = document.getElementById("commitReview");
  const validation = document.getElementById("reviewValidation");
  const value = input.value.trim();
  const valid = value.length > 0 || norm(value) === "unclear";
  button.disabled = !valid || !pendingReview;
  validation.textContent = valid ? "Ready to commit." : "Enter what was heard, or exactly unclear.";
}

function commitReview() {
  if (!pendingReview) return;
  const humanHeardAs = document.getElementById("reviewHumanHeardAs").value.trim();
  if (!humanHeardAs) {
    updateCommitState();
    return;
  }
  const humanHeardAs2 = document.getElementById("reviewHumanHeardAs2").value.trim();
  const row = finalizeRow(pendingReview.rowBase, humanHeardAs, humanHeardAs2);
  rows.push(row);
  appendRow(row);
  showLatestResult(row);
  clearPendingReview();
  setStatus("Row added below. Audio blob deleted from the page.");
}

function finalizeRow(rowBase, humanHeardAs, humanHeardAs2) {
  const heard = norm(humanHeardAs);
  const heard2 = norm(humanHeardAs2);
  const screen = norm(rowBase.screenTarget);
  const web = norm(rowBase.webspeech_transcript);
  const transcribe = norm(rowBase.whisper_transcript);
  const hasListenerDisagreement = Boolean(heard2) && heard !== heard2;
  const isUnclear = heard === "unclear";
  return {
    ...rowBase,
    humanHeardAs,
    humanHeardAs2,
    falseCreditWebSpeech: String(heard !== "unclear" && heard !== screen && web === screen),
    falseCreditTranscribe: String(heard !== "unclear" && heard !== screen && transcribe === screen),
    falseNegativeWebSpeech: String(heard !== "unclear" && heard === screen && web !== screen),
    falseNegativeTranscribe: String(heard !== "unclear" && heard === screen && transcribe !== screen),
    excludeFromThreshold: String(isUnclear || hasListenerDisagreement),
  };
}

function norm(value) {
  return String(value ?? "")
    .toLowerCase()
    .trim()
    .replaceAll(/[^\\p{L}\\p{N}\\s]/gu, "")
    .replaceAll(/\\s+/g, " ");
}

function isTrue(value) {
  return value === true || value === "true";
}

function showLatestResult(row) {
  const latest = document.getElementById("latestResult");
  if (!latest) return;
  latest.classList.remove("hidden");
  latest.innerHTML = [
    "<div class='font-black'>Latest result: " + escapeHtml(row.screenTarget || row.target) + "</div>",
    "<div>Web Speech: <span class='font-bold'>" + escapeHtml(row.webspeech_transcript || "(blank)") + "</span></div>",
    "<div>OpenAI: <span class='font-bold'>" + escapeHtml(row.whisper_transcript || "(blank)") + "</span></div>",
    "<div>Human heard as: <span class='font-bold'>" + escapeHtml(row.humanHeardAs || "(blank)") + "</span></div>",
    isTrue(row.falseCreditWebSpeech) || isTrue(row.falseCreditTranscribe) ? "<div class='mt-1 font-black text-red-700'>False credit flagged</div>" : "",
    isTrue(row.falseNegativeWebSpeech) || isTrue(row.falseNegativeTranscribe) ? "<div class='mt-1 font-black text-amber-700'>False negative flagged</div>" : "",
    row.engineError ? "<div class='mt-1 text-red-700'>Issue: " + escapeHtml(row.engineError) + "</div>" : "",
  ].filter(Boolean).join("");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
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
  navigator.clipboard.writeText(csv + "\\n\\n" + surfaceTypeRateReport() + "\\n\\n" + markdown);
}

function surfaceTypeRateReport() {
  const surfaceTypes = ["isolated_word", "connected_sentence", "connected_passage"];
  const lines = [
    "SurfaceType rate breakout (threshold rows exclude unclear/listener-disagreement rows)",
    "| surfaceType | thresholdRows | falseCreditWebSpeechRate | falseCreditTranscribeRate | falseNegativeWebSpeechRate | falseNegativeTranscribeRate |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
  ];
  for (const surfaceType of surfaceTypes) {
    const eligible = rows.filter((row) => row.surfaceType === surfaceType && !isTrue(row.excludeFromThreshold));
    const denominator = eligible.length || 0;
    lines.push("| " + [
      surfaceType,
      String(denominator),
      rate(eligible, "falseCreditWebSpeech"),
      rate(eligible, "falseCreditTranscribe"),
      rate(eligible, "falseNegativeWebSpeech"),
      rate(eligible, "falseNegativeTranscribe"),
    ].join(" | ") + " |");
  }
  lines.push("");
  lines.push("Part-3 autonomy decision uses isolated_word rows only; connected rows are advisory.");
  return lines.join("\\n");
}

function rate(rowsForSurface, key) {
  if (rowsForSurface.length === 0) return "n/a";
  const count = rowsForSurface.filter((row) => isTrue(row[key])).length;
  return count + "/" + rowsForSurface.length + " (" + (count / rowsForSurface.length).toFixed(3) + ")";
}

function updateCorpusForPhase() {
  clearPendingReview("corpus mode changed");
  const phase = document.getElementById("phase").value;
  for (const card of document.querySelectorAll(".corpus-card")) {
    const modes = String(card.dataset.phaseModes || "A").split(",");
    card.classList.toggle("hidden", !modes.includes(phase));
  }
}

for (const button of buttons) button.addEventListener("click", () => startAttempt(button));
document.getElementById("phase").addEventListener("change", updateCorpusForPhase);
document.getElementById("reviewHumanHeardAs").addEventListener("input", updateCommitState);
document.getElementById("reviewHumanHeardAs2").addEventListener("input", updateCommitState);
document.getElementById("commitReview").addEventListener("click", commitReview);
document.getElementById("cancelReview").addEventListener("click", () => clearPendingReview("review canceled"));
document.getElementById("copyTable").addEventListener("click", copyTable);
window.addEventListener("beforeunload", () => clearPendingReview());
updateCorpusForPhase();
          `,
        }}
      />
    </main>
  );
}

function corpusItem(
  surfaceType: "isolated_word" | "connected_sentence" | "connected_passage",
  target: string,
  isPseudoword: boolean,
  expectedFeedbackFamily: string,
  phaseModes: Array<"A" | "B"> = ["A"],
) {
  return { surfaceType, target, isPseudoword, expectedFeedbackFamily, phaseModes };
}
