import { startClipRecorder, type ClipRecorder } from "@/lib/voice/captureRecorder";
import { PseudowordCaptureCoordinator, type PseudowordCaptureClip } from "@/lib/voice/pseudowordCaptureCoordinator";
import {
  startVoiceActivity,
  stopVoiceActivity,
  VOICE_ACTIVITY_MAX_LISTEN_MS,
  type VoiceActivityHandle,
} from "@/lib/voice/voiceActivity";

export type VadListenStatus = "idle" | "listening" | "heard" | "tryAgain" | "fallback";

export type VadListenSnapshot = {
  statuses: Record<string, VadListenStatus>;
  attempts: Record<string, number>;
  messageByWord: Record<string, string>;
  fallbackAccepted: Record<string, boolean>;
  micUnavailable: boolean;
  activeWord: string | null;
  interactionBusy: boolean;
};

export type VadListenCopy = {
  listenAttempt: {
    noVoiceTryAgain: string;
    micUnavailable: string;
    stopEarlyTryAgain: string;
    fallbackConfirm: string;
    adultSupportThanks: string;
  };
};

export type VadListenControllerOptions = {
  surface: "warmup" | "pseudoword";
  copy: VadListenCopy;
  prompt: string;
  encourage: string;
  captureEnabled: boolean;
  lessonTargetCode?: string;
  captureCoordinator?: PseudowordCaptureCoordinator;
  speakEncouragement: boolean;
  onHarperMessage: (text: string) => void;
  onBuddyState: (state: "idle" | "listening" | "speaking" | "confused") => void;
  onSpeak: (text: string) => Promise<void>;
};

export type VadListenControllerDeps = {
  startVoiceActivity: () => Promise<VoiceActivityHandle>;
  stopVoiceActivity: (handle: VoiceActivityHandle | null | undefined) => void;
  startClipRecorder: (stream: MediaStream) => ClipRecorder | null;
  now: () => number;
  setTimeout: (callback: () => void, delayMs: number) => unknown;
  clearTimeout: (timer: unknown) => void;
  setInterval: (callback: () => void, delayMs: number) => unknown;
  clearInterval: (timer: unknown) => void;
  cooldown: (delayMs: number) => Promise<void>;
  createCoordinator: () => PseudowordCaptureCoordinator;
};

export type VadListenWordContext = {
  wordIndex: number;
};

type Listener = (snapshot: VadListenSnapshot) => void;

export const initialVadListenSnapshot: VadListenSnapshot = {
  statuses: {},
  attempts: {},
  messageByWord: {},
  fallbackAccepted: {},
  micUnavailable: false,
  activeWord: null,
  interactionBusy: false,
};

export function createBrowserVadListenDeps(): VadListenControllerDeps {
  return {
    startVoiceActivity,
    stopVoiceActivity,
    startClipRecorder,
    now: () => Date.now(),
    setTimeout: (callback, delayMs) => window.setTimeout(callback, delayMs),
    clearTimeout: (timer) => window.clearTimeout(timer as number),
    setInterval: (callback, delayMs) => window.setInterval(callback, delayMs),
    clearInterval: (timer) => window.clearInterval(timer as number),
    cooldown: (delayMs) => new Promise((resolve) => window.setTimeout(resolve, delayMs)),
    createCoordinator: () => new PseudowordCaptureCoordinator(),
  };
}

export class VadListenController {
  private options: VadListenControllerOptions;
  private deps: VadListenControllerDeps;
  private state: VadListenSnapshot = { ...initialVadListenSnapshot };
  private readonly listeners = new Set<Listener>();
  private readonly coordinator: PseudowordCaptureCoordinator;
  private voiceActivity: VoiceActivityHandle | null = null;
  private clipRecorder: ClipRecorder | null = null;
  private listenStartedAt: number | null = null;
  private pollTimer: unknown = null;
  private timeoutTimer: unknown = null;
  private starting = false;
  private completing = false;
  private speakPromise: Promise<void> | null = null;
  private disposed = false;

  constructor(options: VadListenControllerOptions, deps: VadListenControllerDeps) {
    this.options = options;
    this.deps = deps;
    this.coordinator = options.captureCoordinator ?? deps.createCoordinator();
  }

  updateOptions(options: VadListenControllerOptions) {
    this.options = options;
  }

  updateDeps(deps: VadListenControllerDeps) {
    this.deps = deps;
  }

  getSnapshot() {
    return this.state;
  }

  subscribe(listener: Listener) {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  async handleWordTap(word: string, context: VadListenWordContext) {
    if (this.disposed) return;
    if (this.completing) return;
    if (this.starting) return;
    if (this.state.fallbackAccepted[word] || this.state.statuses[word] === "heard") return;
    if (this.state.activeWord === word && this.voiceActivity) {
      await this.stopEarly(word, context);
      return;
    }
    if (this.voiceActivity) return;

    this.starting = true;
    this.updateInteractionBusy();
    if (this.speakPromise) {
      await this.speakPromise.catch(() => undefined);
      this.speakPromise = null;
    }
    await this.deps.cooldown(250);
    if (this.disposed) {
      this.starting = false;
      this.updateInteractionBusy();
      return;
    }
    this.options.onHarperMessage(this.options.prompt);
    this.options.onBuddyState("listening");
    this.setState({
      statuses: { ...this.state.statuses, [word]: "listening" },
      messageByWord: { ...this.state.messageByWord, [word]: this.options.prompt },
      attempts: { ...this.state.attempts, [word]: (this.state.attempts[word] ?? 0) + 1 },
      activeWord: word,
    });

    try {
      const handle = await this.deps.startVoiceActivity();
      if (this.disposed) {
        this.deps.stopVoiceActivity(handle);
        return;
      }
      this.voiceActivity = handle;
      this.listenStartedAt = this.deps.now();
      if (this.options.captureEnabled === true && this.options.surface === "pseudoword") {
        this.clipRecorder = this.deps.startClipRecorder(handle.stream);
      }
      this.pollTimer = this.deps.setInterval(() => {
        if (handle.heardSpeech()) void this.completeHeard(word, context);
      }, 100);
      this.timeoutTimer = this.deps.setTimeout(() => {
        void this.markTryAgain(word, this.options.copy.listenAttempt.noVoiceTryAgain);
      }, VOICE_ACTIVITY_MAX_LISTEN_MS);
    } catch {
      this.setState({ micUnavailable: true });
      this.showFallback(word, this.options.copy.listenAttempt.micUnavailable);
    } finally {
      this.starting = false;
      this.updateInteractionBusy();
    }
  }

  async stopEarly(word: string, context: VadListenWordContext) {
    if (this.disposed) return;
    const handle = this.voiceActivity;
    if (handle?.heardSpeech()) {
      await this.completeHeard(word, context);
    } else {
      await this.markTryAgain(word, this.options.copy.listenAttempt.stopEarlyTryAgain);
    }
  }

  async acceptFallback(word: string) {
    if (this.disposed) return;
    this.stopActiveListening();
    this.setState({
      fallbackAccepted: { ...this.state.fallbackAccepted, [word]: true },
      statuses: { ...this.state.statuses, [word]: "heard" },
      messageByWord: { ...this.state.messageByWord, [word]: this.options.copy.listenAttempt.adultSupportThanks },
    });
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    this.stopActiveListening();
    this.speakPromise = null;
    this.completing = false;
    this.starting = false;
    this.updateInteractionBusy();
    this.options.onBuddyState("idle");
  }

  private async completeHeard(word: string, context: VadListenWordContext) {
    if (this.disposed) return;
    if (this.completing) return;
    this.completing = true;
    this.updateInteractionBusy();
    const clipDurationMs = this.listenStartedAt ? this.deps.now() - this.listenStartedAt : 0;
    let blob: Blob | null = null;
    try {
      this.clearTimers();
      const clipRecorder = this.clipRecorder;
      this.clipRecorder = null;
      if (this.options.captureEnabled === true && this.options.surface === "pseudoword" && clipRecorder) {
        try {
          blob = await clipRecorder.stop();
        } catch {
          blob = null;
        }
      }
      this.stopActiveListening();
    } finally {
      this.completing = false;
      this.updateInteractionBusy();
    }

    if (this.disposed) return;
    if (blob && this.options.lessonTargetCode) {
      const clip: PseudowordCaptureClip = {
        blob,
        lessonTargetCode: this.options.lessonTargetCode,
        expectedText: word,
        wordIndex: context.wordIndex,
        speakerAgeBand: undefined,
        clipDurationMs,
      };
      this.coordinator.enqueue(clip);
    }
    this.setState({
      statuses: { ...this.state.statuses, [word]: "heard" },
      messageByWord: { ...this.state.messageByWord, [word]: this.options.encourage },
    });
    this.options.onHarperMessage(this.options.encourage);
    this.options.onBuddyState("idle");
    if (this.options.speakEncouragement) {
      const promise = this.options.onSpeak(this.options.encourage)
        .catch(() => undefined)
        .finally(() => {
          if (this.speakPromise === promise) {
            this.speakPromise = null;
            this.updateInteractionBusy();
          }
        });
      this.speakPromise = promise;
      this.updateInteractionBusy();
      await promise;
    }
  }

  private async markTryAgain(word: string, text: string) {
    if (this.disposed) return;
    this.stopActiveListening();
    const currentAttempts = this.state.attempts[word] ?? 0;
    if (currentAttempts >= 3) {
      this.showFallback(word, this.options.copy.listenAttempt.fallbackConfirm);
      return;
    }
    this.setState({
      statuses: { ...this.state.statuses, [word]: "tryAgain" },
      messageByWord: { ...this.state.messageByWord, [word]: text },
    });
    this.options.onHarperMessage(text);
    this.options.onBuddyState("idle");
  }

  private showFallback(word: string, text: string) {
    if (this.disposed) return;
    this.stopActiveListening();
    this.setState({
      statuses: { ...this.state.statuses, [word]: "fallback" },
      messageByWord: { ...this.state.messageByWord, [word]: text },
    });
    this.options.onHarperMessage(text);
    this.options.onBuddyState("idle");
  }

  private stopActiveListening() {
    if (this.clipRecorder) {
      void this.clipRecorder.stop();
      this.clipRecorder = null;
    }
    this.listenStartedAt = null;
    this.clearTimers();
    this.deps.stopVoiceActivity(this.voiceActivity);
    this.voiceActivity = null;
    this.setState({ activeWord: null });
  }

  private clearTimers() {
    if (this.pollTimer) this.deps.clearInterval(this.pollTimer);
    if (this.timeoutTimer) this.deps.clearTimeout(this.timeoutTimer);
    this.pollTimer = null;
    this.timeoutTimer = null;
  }

  private setState(patch: Partial<VadListenSnapshot>) {
    if (this.disposed) return;
    const next = { ...this.state, ...patch };
    next.interactionBusy = this.computeInteractionBusy(next);
    this.state = next;
    for (const listener of this.listeners) listener(this.state);
  }

  private updateInteractionBusy() {
    if (this.disposed) return;
    const interactionBusy = this.computeInteractionBusy(this.state);
    if (this.state.interactionBusy === interactionBusy) return;
    this.state = { ...this.state, interactionBusy };
    for (const listener of this.listeners) listener(this.state);
  }

  private computeInteractionBusy(state: VadListenSnapshot) {
    return Boolean(state.activeWord || this.voiceActivity || this.starting || this.completing || this.speakPromise);
  }
}
