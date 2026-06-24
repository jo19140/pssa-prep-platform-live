"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

export const initialScoredRealWordState: ScoredRealWordState = {
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

type ScoredRealWordControllerLifecycleOptions = {
  deps: ScoredRealWordControllerDeps;
  getOptions: () => UseScoredRealWordControllerOptions;
  setState: (state: ScoredRealWordState) => void;
  createController?: (options: ScoredRealWordControllerOptions, deps: ScoredRealWordControllerDeps) => ScoredRealWordController;
};

export function createScoredRealWordControllerLifecycle({
  deps,
  getOptions,
  setState,
  createController = (options, controllerDeps) => new ScoredRealWordController(options, controllerDeps),
}: ScoredRealWordControllerLifecycleOptions) {
  let controller: ScoredRealWordController | null = null;

  const activeController = () => {
    const current = controller;
    current?.updateOptions(getOptions());
    return current;
  };

  return {
    setup() {
      const current = createController(getOptions(), deps);
      controller = current;
      setState(current.getSnapshot());
      const unsubscribe = current.subscribe(setState);
      return () => {
        unsubscribe();
        current.dispose();
        if (controller === current) controller = null;
      };
    },
    updateOptions() {
      controller?.updateOptions(getOptions());
    },
    beginRecording(entry: ScoredRealWordEntry, readDisabled: boolean) {
      return activeController()?.beginRecording(entry, readDisabled);
    },
    stopAndScore(entry: ScoredRealWordEntry) {
      return activeController()?.stopAndScore(entry);
    },
    adultSupportAdvance(entry: ScoredRealWordEntry) {
      return activeController()?.adultSupportAdvance(entry);
    },
    getControllerForTests() {
      return controller;
    },
  };
}

export function useScoredRealWordController(options: UseScoredRealWordControllerOptions) {
  const [state, setState] = useState<ScoredRealWordState>(initialScoredRealWordState);
  const latestOptionsRef = useRef(options);
  const depsRef = useRef<ScoredRealWordControllerDeps | null>(null);
  const lifecycleRef = useRef<ReturnType<typeof createScoredRealWordControllerLifecycle> | null>(null);

  latestOptionsRef.current = options;

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

  if (!lifecycleRef.current) {
    lifecycleRef.current = createScoredRealWordControllerLifecycle({
      deps: depsRef.current,
      getOptions: () => latestOptionsRef.current,
      setState,
    });
  }

  useEffect(() => {
    lifecycleRef.current?.updateOptions();
  }, [options]);

  useEffect(() => {
    return lifecycleRef.current!.setup();
  }, []);

  const beginRecording = useCallback(
    (entry: ScoredRealWordEntry, readDisabled: boolean) => lifecycleRef.current?.beginRecording(entry, readDisabled),
    [],
  );
  const stopAndScore = useCallback((entry: ScoredRealWordEntry) => lifecycleRef.current?.stopAndScore(entry), []);
  const adultSupportAdvance = useCallback((entry: ScoredRealWordEntry) => lifecycleRef.current?.adultSupportAdvance(entry), []);

  return {
    state,
    beginRecording,
    stopAndScore,
    adultSupportAdvance,
  };
}
