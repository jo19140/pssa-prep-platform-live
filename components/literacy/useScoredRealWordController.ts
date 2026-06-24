"use client";

import { useEffect, useRef, useState } from "react";
import {
  ScoredRealWordController,
  type ScoredRealWordCallbacks,
  type ScoredRealWordControllerDeps,
  type ScoredRealWordControllerOptions,
  type ScoredRealWordEntry,
  type ScoredRealWordState,
} from "@/lib/literacy/scoredRealWordController";
import { startAudioCapture, stopAudioCapture } from "@/lib/voice/audioCapture";

type UseScoredRealWordControllerOptions = ScoredRealWordCallbacks & Omit<ScoredRealWordControllerOptions, keyof ScoredRealWordCallbacks>;

const initialState: ScoredRealWordState = {
  statuses: {},
  attempts: {},
  technicalFailures: {},
  wordFeedback: {},
  recording: false,
  thinking: false,
  recordingStartInFlight: false,
  requestInFlight: false,
  rateLimitedUntil: null,
  showFallback: false,
};

export function useScoredRealWordController(options: UseScoredRealWordControllerOptions) {
  const [state, setState] = useState<ScoredRealWordState>(initialState);
  const depsRef = useRef<ScoredRealWordControllerDeps | null>(null);
  const controllerRef = useRef<ScoredRealWordController | null>(null);

  if (!depsRef.current) {
    depsRef.current = {
      startAudioCapture,
      stopAudioCapture,
      fetch: globalThis.fetch.bind(globalThis),
      now: () => Date.now(),
      setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
      clearTimeout: (timer) => window.clearTimeout(timer as number),
      wait: (delayMs) => new Promise((resolve) => window.setTimeout(resolve, delayMs)),
      createBlob: (chunks, type) => new Blob(chunks, { type }),
      createFile: (blob, name, type) => new File([blob], name, { type }),
      createFormData: () => new FormData(),
      createAbortController: () => new AbortController(),
    };
  }

  if (!controllerRef.current) {
    controllerRef.current = new ScoredRealWordController(options, depsRef.current);
  }

  useEffect(() => {
    controllerRef.current!.updateOptions(options);
  }, [options]);

  useEffect(() => {
    const controller = controllerRef.current!;
    return controller.subscribe(setState);
  }, []);

  useEffect(() => {
    const controller = controllerRef.current!;
    return () => controller.dispose();
  }, []);

  const controller = controllerRef.current;
  return {
    state,
    beginRecording: (entry: ScoredRealWordEntry, readDisabled: boolean) => controller.beginRecording(entry, readDisabled),
    stopAndScore: (entry: ScoredRealWordEntry) => controller.stopAndScore(entry),
    adultSupportAdvance: (entry: ScoredRealWordEntry) => controller.adultSupportAdvance(entry),
  };
}
