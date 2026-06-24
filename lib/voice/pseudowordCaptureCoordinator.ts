import { capturePseudowordClip, type PseudowordClipCaptureInput } from "@/lib/voice/captureClient";

export type PseudowordCaptureClip = Omit<PseudowordClipCaptureInput, "voiceSessionId">;

export type PseudowordSender = (
  input: PseudowordClipCaptureInput,
) => Promise<{ voiceSessionId?: string } | null>;

type PendingListener = (pending: boolean) => void;

export class PseudowordCaptureCoordinator {
  private readonly send: PseudowordSender;
  private tail: Promise<void> = Promise.resolve();
  private voiceSessionId: string | null = null;
  private pendingCount = 0;
  private lastPending = false;
  private readonly listeners = new Set<PendingListener>();
  private idleResolvers: Array<() => void> = [];

  constructor(opts?: { send?: PseudowordSender }) {
    this.send = opts?.send ?? capturePseudowordClip;
  }

  enqueue(clip: PseudowordCaptureClip): void {
    const snapshot = snapshotClip(clip);
    this.incrementPending();
    this.tail = this.tail
      .catch(() => undefined)
      .then(async () => {
        try {
          const result = await this.send({
            ...snapshot,
            voiceSessionId: this.voiceSessionId,
          });
          this.acceptVoiceSessionId(result?.voiceSessionId);
        } catch {
          // Capture is best-effort. A failed clip must not block later clips.
        } finally {
          this.decrementPending();
        }
      });
  }

  hasPending(): boolean {
    return this.pendingCount > 0;
  }

  subscribePending(listener: PendingListener): () => void {
    this.listeners.add(listener);
    safeNotify(listener, this.hasPending());
    let subscribed = true;
    return () => {
      if (!subscribed) return;
      subscribed = false;
      this.listeners.delete(listener);
    };
  }

  whenIdle(): Promise<void> {
    if (!this.hasPending()) return Promise.resolve();
    return new Promise((resolve) => {
      this.idleResolvers.push(resolve);
    });
  }

  private acceptVoiceSessionId(nextId?: string | null) {
    if (!nextId) return;
    if (!this.voiceSessionId) {
      this.voiceSessionId = nextId;
      return;
    }
    if (this.voiceSessionId === nextId) return;
  }

  private incrementPending() {
    this.pendingCount += 1;
    this.emitPendingIfChanged();
  }

  private decrementPending() {
    this.pendingCount = Math.max(0, this.pendingCount - 1);
    this.emitPendingIfChanged();
    if (!this.hasPending()) this.resolveIdle();
  }

  private emitPendingIfChanged() {
    const pending = this.hasPending();
    if (pending === this.lastPending) return;
    this.lastPending = pending;
    for (const listener of this.listeners) {
      safeNotify(listener, pending);
    }
  }

  private resolveIdle() {
    const resolvers = this.idleResolvers;
    this.idleResolvers = [];
    for (const resolve of resolvers) resolve();
  }
}

function snapshotClip(clip: PseudowordCaptureClip): PseudowordCaptureClip {
  return {
    blob: clip.blob,
    lessonTargetCode: clip.lessonTargetCode,
    expectedText: clip.expectedText,
    wordIndex: clip.wordIndex,
    speakerAgeBand: clip.speakerAgeBand,
    clipDurationMs: clip.clipDurationMs,
  };
}

function safeNotify(listener: PendingListener, pending: boolean) {
  try {
    listener(pending);
  } catch {
    // Subscriber failures must not affect capture queueing.
  }
}
