"use client";

import { useEffect, useMemo, useState } from "react";
import type { StudentDiagnosticItemDTO } from "@/lib/literacy/diagnosticItemDTO";
import { validateDiagnosticNextResponse } from "@/lib/literacy/diagnosticItemDTO";
import { DiagnosticCard } from "./DiagnosticCard";
import { WelcomeScreen } from "./WelcomeScreen";
import { MicCheckScreen } from "./MicCheckScreen";
import { PracticeItemScreen } from "./PracticeItemScreen";
import { DecodingCardView } from "./DecodingCardView";
import { ChoiceView } from "./ChoiceView";
import { PaItemView } from "./PaItemView";
import { ListeningCompView } from "./ListeningCompView";
import { ReadingCompView } from "./ReadingCompView";
import { FluencyPassageView } from "./FluencyPassageView";
import { CompletionScreen } from "./CompletionScreen";
import { WhatHappensNextScreen } from "./WhatHappensNextScreen";
import type { DiagnosticAttemptPayload } from "./types";

type Stage = "loading" | "welcome" | "mic-check" | "practice" | "running" | "complete" | "next";

export function DiagnosticSessionShell({ sessionId: initialSessionId, completeOnly = false }: { sessionId?: string; completeOnly?: boolean }) {
  const [stage, setStage] = useState<Stage>(completeOnly ? "complete" : "loading");
  const [sessionId, setSessionId] = useState(initialSessionId || "");
  const [item, setItem] = useState<StudentDiagnosticItemDTO | null>(null);
  const [hasResume, setHasResume] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (completeOnly) return;
    if (initialSessionId) {
      fetchNext(initialSessionId);
      return;
    }
    fetchCurrent();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeOnly, initialSessionId]);

  async function fetchCurrent() {
    setError("");
    try {
      const response = await fetch("/api/literacy/diagnostic/current", { cache: "no-store" });
      const json = validateDiagnosticNextResponse(await response.json());
      if (json.sessionComplete) {
        setStage("complete");
        return;
      }
      if (json.nextItem && json.sessionId) {
        setSessionId(json.sessionId);
        setItem(json.nextItem);
        setHasResume(true);
      }
      setStage("welcome");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the diagnostic.");
      setStage("welcome");
    }
  }

  async function fetchNext(id = sessionId) {
    if (!id) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/literacy/diagnostic/${encodeURIComponent(id)}/next-item`, { cache: "no-store" });
      const json = validateDiagnosticNextResponse(await response.json());
      if (json.sessionComplete) {
        await completeSession(id);
        return;
      }
      if (json.nextItem) {
        setSessionId(json.sessionId || id);
        setItem(json.nextItem);
        setStage("running");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load the next item.");
    } finally {
      setBusy(false);
    }
  }

  async function startSession() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/literacy/diagnostic/start", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
      const json = validateDiagnosticNextResponse(await response.json());
      if (json.sessionId) setSessionId(json.sessionId);
      if (json.nextItem) setItem(json.nextItem);
      setStage("running");
      if (json.sessionId) window.history.replaceState(null, "", `/student/diagnostic/${encodeURIComponent(json.sessionId)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start the diagnostic.");
    } finally {
      setBusy(false);
    }
  }

  async function submitAttempt(payload: Omit<DiagnosticAttemptPayload, "itemId">) {
    if (!item || !sessionId || busy) return;
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`/api/literacy/diagnostic/${encodeURIComponent(sessionId)}/item-attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ itemId: item.id, ...payload }),
      });
      const json = validateDiagnosticNextResponse(await response.json());
      if (json.sessionComplete) {
        await completeSession(sessionId);
        return;
      }
      if (json.nextItem) setItem(json.nextItem);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save that answer.");
    } finally {
      setBusy(false);
    }
  }

  async function completeSession(id = sessionId) {
    if (!id) return;
    const response = await fetch(`/api/literacy/diagnostic/${encodeURIComponent(id)}/complete`, { method: "POST" });
    validateDiagnosticNextResponse(await response.json());
    setStage("complete");
    window.history.replaceState(null, "", `/student/diagnostic/${encodeURIComponent(id)}/complete`);
  }

  const body = useMemo(() => {
    if (stage === "loading") return <DiagnosticCard><p className="font-bold text-slate-700">Loading Reading Buddy...</p></DiagnosticCard>;
    if (stage === "welcome") return <WelcomeScreen hasResume={hasResume} onResume={() => setStage("running")} onStart={() => setStage("mic-check")} busy={busy} />;
    if (stage === "mic-check") return <MicCheckScreen onDone={() => setStage("practice")} />;
    if (stage === "practice") return <PracticeItemScreen onDone={startSession} />;
    if (stage === "complete") return <CompletionScreen onNext={() => setStage("next")} />;
    if (stage === "next") return <WhatHappensNextScreen />;
    if (!item) return <DiagnosticCard><p className="font-bold text-slate-700">Harper is getting the next item ready.</p></DiagnosticCard>;
    return <DiagnosticItemRenderer key={item.id} item={item} disabled={busy} onSubmit={submitAttempt} />;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, hasResume, busy, item]);

  return (
    <main className="min-h-[calc(100vh-120px)] bg-[#f6f3ea] px-4 py-8">
      <div className="mx-auto max-w-4xl">
        {error ? <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{error}</div> : null}
        {body}
      </div>
    </main>
  );
}

function DiagnosticItemRenderer({ item, disabled, onSubmit }: { item: StudentDiagnosticItemDTO; disabled: boolean; onSubmit: (payload: Omit<DiagnosticAttemptPayload, "itemId">) => void }) {
  const key = `${item.displayMode}:${item.responseMode}`;
  return (
    <DiagnosticCard>
      {key === "AUDIO_ONLY:speech_response" ? <PaItemView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {key === "TEXT_CARD_ONE_WORD:speech_response" ? <DecodingCardView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {key === "TEXT_CHOICE:selected_choice" ? <ChoiceView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {key === "AUDIO_THEN_TEXT_CHOICES:selected_choice" ? <ListeningCompView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {key === "SILENT_READING_THEN_TEXT_CHOICES:selected_choice" ? <ReadingCompView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {key === "ORAL_READING_PASSAGE:speech_response" ? <FluencyPassageView item={item} disabled={disabled} onSubmit={onSubmit} /> : null}
      {!["AUDIO_ONLY:speech_response", "TEXT_CARD_ONE_WORD:speech_response", "TEXT_CHOICE:selected_choice", "AUDIO_THEN_TEXT_CHOICES:selected_choice", "SILENT_READING_THEN_TEXT_CHOICES:selected_choice", "ORAL_READING_PASSAGE:speech_response"].includes(key) ? (
        <ChoiceView item={item} disabled={disabled} onSubmit={onSubmit} />
      ) : null}
    </DiagnosticCard>
  );
}
