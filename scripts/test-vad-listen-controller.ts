import assert from "assert";
import {
  createVadListenControllerLifecycle,
} from "@/components/literacy/useVadListenController";
import {
  VadListenController,
  type VadListenControllerDeps,
  type VadListenControllerOptions,
  type VadListenSnapshot,
} from "@/lib/voice/vadListenController";
import type { PseudowordCaptureClip } from "@/lib/voice/pseudowordCaptureCoordinator";
import type { VoiceActivityHandle } from "@/lib/voice/voiceActivity";

type FakeVoiceHandle = VoiceActivityHandle & {
  heard: boolean;
  stopped: boolean;
};

function createCopy() {
  return {
    listenAttempt: {
      noVoiceTryAgain: "Try again.",
      micUnavailable: "Mic unavailable.",
      stopEarlyTryAgain: "Try once more.",
      fallbackConfirm: "Ask an adult.",
      adultSupportThanks: "Thanks for reading with support.",
    },
  };
}

function createHarness(overrides: Partial<VadListenControllerOptions> = {}) {
  const handles: FakeVoiceHandle[] = [];
  const stoppedHandles: FakeVoiceHandle[] = [];
  const recorderStops: Array<() => void> = [];
  const enqueued: PseudowordCaptureClip[] = [];
  const stateEmissions: VadListenSnapshot[] = [];
  const messages: string[] = [];
  const buddyStates: string[] = [];
  const spoken: string[] = [];
  const intervals: Array<() => void> = [];
  const timeouts: Array<{ callback: () => void; delayMs: number }> = [];
  let now = 1000;
  let startThrows = false;
  let recorderBlob: Blob | null = new Blob(["audio"], { type: "audio/webm" });
  let pendingCoordinatorResolve: (() => void) | null = null;
  let createCoordinatorCount = 0;

  const coordinator = {
    enqueue(input: PseudowordCaptureClip) {
      enqueued.push(input);
      if (pendingCoordinatorResolve) return;
      return undefined;
    },
    hasPending() {
      return pendingCoordinatorResolve !== null;
    },
    whenIdle() {
      return pendingCoordinatorResolve ? new Promise<void>((resolve) => { pendingCoordinatorResolve = resolve; }) : Promise.resolve();
    },
    subscribePending(listener: (pending: boolean) => void) {
      listener(this.hasPending());
      return () => undefined;
    },
  };

  const deps: VadListenControllerDeps = {
    startVoiceActivity: async () => {
      if (startThrows) throw new Error("mic unavailable");
      const handle = {
        startedAt: now,
        stream: {} as MediaStream,
        frames: [],
        heard: false,
        stopped: false,
        get voicedMs() {
          return this.heard ? 600 : 0;
        },
        heardSpeech() {
          return this.heard;
        },
        stop() {
          this.stopped = true;
        },
      } satisfies FakeVoiceHandle;
      handles.push(handle);
      return handle;
    },
    stopVoiceActivity: (handle) => {
      if (!handle) return;
      const fake = handle as FakeVoiceHandle;
      fake.stopped = true;
      stoppedHandles.push(fake);
    },
    startClipRecorder: () => ({
      stop() {
        recorderStops.push(() => undefined);
        return Promise.resolve(recorderBlob);
      },
    }),
    now: () => now,
    setTimeout: (callback, delayMs) => {
      timeouts.push({ callback, delayMs });
      return callback;
    },
    clearTimeout: (timer) => {
      const index = timeouts.findIndex((entry) => entry.callback === timer);
      if (index >= 0) timeouts.splice(index, 1);
    },
    setInterval: (callback) => {
      intervals.push(callback);
      return callback;
    },
    clearInterval: (timer) => {
      const index = intervals.indexOf(timer as () => void);
      if (index >= 0) intervals.splice(index, 1);
    },
    cooldown: async () => undefined,
    createCoordinator: () => {
      createCoordinatorCount += 1;
      return coordinator as never;
    },
  };

  const options: VadListenControllerOptions = {
    surface: "pseudoword",
    copy: createCopy(),
    prompt: "Read it.",
    encourage: "Nice reading.",
    captureEnabled: true,
    lessonTargetCode: "a_e",
    captureCoordinator: coordinator as never,
    speakEncouragement: true,
    onHarperMessage: (message) => messages.push(message),
    onBuddyState: (state) => buddyStates.push(state),
    onSpeak: async (text) => {
      spoken.push(text);
    },
    ...overrides,
  };

  const controller = new VadListenController(options, deps);
  controller.subscribe((state) => stateEmissions.push(cloneState(state)));

  return {
    controller,
    deps,
    options,
    handles,
    stoppedHandles,
    recorderStops,
    enqueued,
    stateEmissions,
    messages,
    buddyStates,
    spoken,
    intervals,
    timeouts,
    coordinator,
    setNow(value: number) {
      now = value;
    },
    setStartThrows(value: boolean) {
      startThrows = value;
    },
    setRecorderBlob(value: Blob | null) {
      recorderBlob = value;
    },
    setPendingCoordinator() {
      pendingCoordinatorResolve = () => {
        pendingCoordinatorResolve = null;
      };
    },
    getCreateCoordinatorCount() {
      return createCoordinatorCount;
    },
  };
}

async function flush() {
  await Promise.resolve();
  await Promise.resolve();
}

function cloneState(state: VadListenSnapshot): VadListenSnapshot {
  return {
    statuses: { ...state.statuses },
    attempts: { ...state.attempts },
    messageByWord: { ...state.messageByWord },
    fallbackAccepted: { ...state.fallbackAccepted },
    micUnavailable: state.micUnavailable,
    activeWord: state.activeWord,
    interactionBusy: state.interactionBusy,
  };
}

async function testHeardCapturePath() {
  const h = createHarness();
  await h.controller.handleWordTap("zake", { wordIndex: 4 });
  assert.equal(h.handles.length, 1);
  assert.equal(h.controller.getSnapshot().statuses.zake, "listening");
  assert.equal(h.controller.getSnapshot().activeWord, "zake");
  h.setNow(2300);
  h.handles[0]!.heard = true;
  await h.controller.handleWordTap("zake", { wordIndex: 4 });
  assert.equal(h.controller.getSnapshot().statuses.zake, "heard");
  assert.equal(h.controller.getSnapshot().activeWord, null);
  assert.equal(h.enqueued.length, 1);
  assert.equal(h.enqueued[0]!.expectedText, "zake");
  assert.equal(h.enqueued[0]!.wordIndex, 4);
  assert.equal(h.enqueued[0]!.clipDurationMs, 1300);
  assert.deepEqual(h.messages.slice(-1), ["Nice reading."]);
  assert.deepEqual(h.spoken, ["Nice reading."]);
}

async function testCaptureGateAndFireAndForget() {
  for (const overrides of [
    { captureEnabled: false },
    { surface: "warmup" as const },
    { lessonTargetCode: "" },
  ]) {
    const h = createHarness(overrides);
    await h.controller.handleWordTap("mave", { wordIndex: 1 });
    h.handles[0]!.heard = true;
    await h.controller.handleWordTap("mave", { wordIndex: 1 });
    assert.equal(h.enqueued.length, 0, `unexpected enqueue for ${JSON.stringify(overrides)}`);
  }

  const h = createHarness();
  h.setPendingCoordinator();
  await h.controller.handleWordTap("pame", { wordIndex: 2 });
  h.handles[0]!.heard = true;
  await h.controller.handleWordTap("pame", { wordIndex: 2 });
  assert.equal(h.enqueued.length, 1);
  assert.equal(h.controller.getSnapshot().interactionBusy, false, "background coordinator pending must not keep learner busy");
}

async function testTimeoutFallbackAndAdultSupportNoCapture() {
  const h = createHarness();
  await h.controller.handleWordTap("nace", { wordIndex: 3 });
  h.timeouts.at(-1)!.callback();
  await flush();
  assert.equal(h.controller.getSnapshot().statuses.nace, "tryAgain");
  await h.controller.handleWordTap("nace", { wordIndex: 3 });
  h.timeouts.at(-1)!.callback();
  await flush();
  assert.equal(h.controller.getSnapshot().statuses.nace, "tryAgain");
  await h.controller.handleWordTap("nace", { wordIndex: 3 });
  h.timeouts.at(-1)!.callback();
  await flush();
  assert.equal(h.controller.getSnapshot().statuses.nace, "fallback");
  const recorderStopsBeforeFallback = h.recorderStops.length;
  await h.controller.acceptFallback("nace");
  assert.equal(h.controller.getSnapshot().statuses.nace, "heard");
  assert.equal(h.controller.getSnapshot().fallbackAccepted.nace, true);
  assert.equal(h.enqueued.length, 0);
  assert.equal(h.recorderStops.length, recorderStopsBeforeFallback);
}

async function testMicUnavailableIsGlobalAndSticky() {
  const h = createHarness();
  h.setStartThrows(true);
  await h.controller.handleWordTap("zake", { wordIndex: 0 });
  assert.equal(h.controller.getSnapshot().micUnavailable, true);
  assert.equal(h.controller.getSnapshot().statuses.zake, "fallback");
  h.setStartThrows(false);
  await h.controller.handleWordTap("mave", { wordIndex: 1 });
  assert.equal(h.controller.getSnapshot().micUnavailable, true);
}

async function testOneActiveAttemptAndCleanup() {
  const h = createHarness();
  await h.controller.handleWordTap("zake", { wordIndex: 0 });
  await h.controller.handleWordTap("mave", { wordIndex: 1 });
  assert.equal(h.handles.length, 1);
  assert.equal(h.controller.getSnapshot().activeWord, "zake");
  h.controller.dispose();
  assert.equal(h.handles[0]!.stopped, true);
  assert.equal(h.intervals.length, 0);
  assert.equal(h.timeouts.length, 0);
  await h.controller.handleWordTap("mave", { wordIndex: 1 });
  assert.equal(h.handles.length, 1, "disposed controller commands must no-op");
}

async function testLatestRefLifecycleAndFreshRemount() {
  const states: string[] = [];
  const makeOptions = (label: string): VadListenControllerOptions => ({
    surface: "warmup",
    copy: createCopy(),
    prompt: `${label} prompt`,
    encourage: `${label} encourage`,
    captureEnabled: false,
    speakEncouragement: false,
    onHarperMessage: (message) => states.push(message),
    onBuddyState: () => undefined,
    onSpeak: async () => undefined,
  });
  let currentOptions = makeOptions("A");
  const h = createHarness({ surface: "warmup", captureEnabled: false, speakEncouragement: false });
  let created = 0;
  const lifecycle = createVadListenControllerLifecycle({
    deps: h.deps,
    getOptions: () => currentOptions,
    setState: () => undefined,
    createController: (options, deps) => {
      created += 1;
      return new VadListenController(options, deps);
    },
  });
  const cleanupA = lifecycle.setup();
  currentOptions = makeOptions("B");
  lifecycle.updateOptions();
  await lifecycle.handleWordTap("zake", { wordIndex: 0 });
  const controllerBTarget = lifecycle.getControllerForTests()!;
  (controllerBTarget as VadListenController).dispose();
  assert(states.includes("B prompt"));
  assert(!states.includes("A prompt"));
  cleanupA();
  const cleanupB = lifecycle.setup();
  assert.equal(created, 2);
  cleanupB();
}

async function testDefaultCoordinatorCreatedOnce() {
  const h = createHarness({ captureCoordinator: undefined });
  assert.equal(h.getCreateCoordinatorCount(), 1);
  await h.controller.handleWordTap("zake", { wordIndex: 0 });
  h.handles[0]!.heard = true;
  await h.controller.handleWordTap("zake", { wordIndex: 0 });
  assert.equal(h.getCreateCoordinatorCount(), 1);
}

async function main() {
  await testHeardCapturePath();
  await testCaptureGateAndFireAndForget();
  await testTimeoutFallbackAndAdultSupportNoCapture();
  await testMicUnavailableIsGlobalAndSticky();
  await testOneActiveAttemptAndCleanup();
  await testLatestRefLifecycleAndFreshRemount();
  await testDefaultCoordinatorCreatedOnce();
  console.log("VAD listen controller tests passed.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
