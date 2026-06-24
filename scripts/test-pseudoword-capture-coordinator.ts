import assert from "assert";
import {
  PseudowordCaptureCoordinator,
  type PseudowordCaptureClip,
  type PseudowordSender,
} from "../lib/voice/pseudowordCaptureCoordinator";
import type { PseudowordClipCaptureInput } from "../lib/voice/captureClient";

type Deferred<T> = {
  promise: Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

type SendCall = {
  input: PseudowordClipCaptureInput;
  deferred: Deferred<{ voiceSessionId?: string } | null>;
};

function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function makeClip(expectedText: string, overrides: Partial<PseudowordCaptureClip> = {}): PseudowordCaptureClip {
  return {
    blob: new Blob([expectedText], { type: "audio/webm" }),
    lessonTargetCode: "a_e",
    expectedText,
    wordIndex: expectedText.length,
    speakerAgeBand: "7-8",
    clipDurationMs: expectedText.length * 100,
    ...overrides,
  };
}

async function waitFor(condition: () => boolean, label: string) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (condition()) return;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error(`Timed out waiting for ${label}`);
}

function makeControlledSender() {
  const calls: SendCall[] = [];
  const send: PseudowordSender = (input) => {
    const next = deferred<{ voiceSessionId?: string } | null>();
    calls.push({ input, deferred: next });
    return next.promise;
  };
  return { send, calls };
}

async function assertStillPending(promise: Promise<unknown>, label: string) {
  const pendingMarker = Symbol("pending");
  const result = await Promise.race([
    promise.then(() => "resolved"),
    new Promise<symbol>((resolve) => setTimeout(() => resolve(pendingMarker), 0)),
  ]);
  assert.strictEqual(result, pendingMarker, label);
}

async function testInitialAndSerializedIdReuse() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  const pendingEvents: boolean[] = [];
  coordinator.subscribePending((pending) => pendingEvents.push(pending));

  assert.strictEqual(coordinator.hasPending(), false);
  await coordinator.whenIdle();

  const clipA = makeClip("zake", { wordIndex: 0, clipDurationMs: 111 });
  const clipB = makeClip("mave", { wordIndex: 1, clipDurationMs: 222 });
  coordinator.enqueue(clipA);
  coordinator.enqueue(clipB);
  assert.strictEqual(coordinator.hasPending(), true);
  await waitFor(() => calls.length === 1, "first send");

  assert.strictEqual(calls[0].input.voiceSessionId, null);
  assert.strictEqual(calls[0].input.expectedText, "zake");
  assert.strictEqual(calls[0].input.blob, clipA.blob);
  assert.strictEqual(calls.length, 1, "second send must wait for the first response");

  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await waitFor(() => calls.length === 2, "second send after first id");
  assert.strictEqual(calls[1].input.voiceSessionId, "vs-1");
  assert.strictEqual(calls[1].input.expectedText, "mave");
  assert.strictEqual(calls[1].input.wordIndex, 1);
  assert.strictEqual(calls[1].input.clipDurationMs, 222);
  assert.strictEqual(calls[1].input.blob, clipB.blob);

  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(coordinator.hasPending(), false);
  assert.deepStrictEqual(pendingEvents, [false, true, false]);
}

async function testLateEnqueueWhenIdleAndReuseAfterIdle() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  const pendingEvents: boolean[] = [];
  coordinator.subscribePending((pending) => pendingEvents.push(pending));

  coordinator.enqueue(makeClip("zake"));
  await waitFor(() => calls.length === 1, "first send for late enqueue");
  const idle = coordinator.whenIdle();
  coordinator.enqueue(makeClip("mave"));
  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await waitFor(() => calls.length === 2, "late second send");
  await assertStillPending(idle, "whenIdle must include work enqueued while waiting");
  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await idle;

  coordinator.enqueue(makeClip("pame"));
  await waitFor(() => calls.length === 3, "send after idle");
  assert.strictEqual(calls[2].input.voiceSessionId, "vs-1");
  calls[2].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();
  assert.deepStrictEqual(pendingEvents, [false, true, false, true, false]);
}

async function testFailureModesContinueAndDoNotEscape() {
  const nullCalls: PseudowordClipCaptureInput[] = [];
  const nullCoordinator = new PseudowordCaptureCoordinator({
    send: async (input) => {
      nullCalls.push(input);
      return null;
    },
  });
  assert.doesNotThrow(() => nullCoordinator.enqueue(makeClip("zake")));
  assert.doesNotThrow(() => nullCoordinator.enqueue(makeClip("mave")));
  await nullCoordinator.whenIdle();
  assert.strictEqual(nullCalls.length, 2);
  assert.strictEqual(nullCalls[1].voiceSessionId, null);

  const rejectCalls: PseudowordClipCaptureInput[] = [];
  const rejectCoordinator = new PseudowordCaptureCoordinator({
    send: async (input) => {
      rejectCalls.push(input);
      if (rejectCalls.length === 1) throw new Error("network");
      return { voiceSessionId: "vs-2" };
    },
  });
  assert.doesNotThrow(() => rejectCoordinator.enqueue(makeClip("pame")));
  assert.doesNotThrow(() => rejectCoordinator.enqueue(makeClip("vade")));
  await rejectCoordinator.whenIdle();
  assert.strictEqual(rejectCalls.length, 2);
  assert.strictEqual(rejectCalls[1].voiceSessionId, null);

  const throwCalls: PseudowordClipCaptureInput[] = [];
  const throwCoordinator = new PseudowordCaptureCoordinator({
    send: (input) => {
      throwCalls.push(input);
      if (throwCalls.length === 1) throw new Error("sync");
      return Promise.resolve({ voiceSessionId: "vs-3" });
    },
  });
  assert.doesNotThrow(() => throwCoordinator.enqueue(makeClip("sape")));
  assert.doesNotThrow(() => throwCoordinator.enqueue(makeClip("nace")));
  await throwCoordinator.whenIdle();
  assert.strictEqual(throwCalls.length, 2);
}

async function testSessionIdMonotonicity() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  coordinator.enqueue(makeClip("zake"));
  coordinator.enqueue(makeClip("mave"));
  await waitFor(() => calls.length === 1, "monotonic first send");
  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await waitFor(() => calls.length === 2, "monotonic second send");
  assert.strictEqual(calls[1].input.voiceSessionId, "vs-1");
  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();

  coordinator.enqueue(makeClip("pame"));
  await waitFor(() => calls.length === 3, "known id after idle");
  assert.strictEqual(calls[2].input.voiceSessionId, "vs-1");
  calls[2].deferred.resolve(null);
  await coordinator.whenIdle();

  coordinator.enqueue(makeClip("vade"));
  await waitFor(() => calls.length === 4, "known id after null");
  assert.strictEqual(calls[3].input.voiceSessionId, "vs-1");
  calls[3].deferred.resolve({ voiceSessionId: "vs-other" });
  await coordinator.whenIdle();

  coordinator.enqueue(makeClip("sape"));
  await waitFor(() => calls.length === 5, "known id after conflict");
  assert.strictEqual(calls[4].input.voiceSessionId, "vs-1");
  calls[4].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();
}

async function testSubscriptionRobustnessAndUnsubscribe() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  assert.doesNotThrow(() => {
    coordinator.subscribePending(() => {
      throw new Error("immediate");
    });
  });
  const events: boolean[] = [];
  const unsubscribe = coordinator.subscribePending((pending) => {
    events.push(pending);
    if (pending) throw new Error("transition");
  });
  unsubscribe();
  unsubscribe();

  const liveEvents: boolean[] = [];
  coordinator.subscribePending((pending) => liveEvents.push(pending));
  assert.doesNotThrow(() => coordinator.enqueue(makeClip("zake")));
  await waitFor(() => calls.length === 1, "subscription send");
  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();
  coordinator.enqueue(makeClip("mave"));
  await waitFor(() => calls.length === 2, "subscription send after idle");
  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();

  assert.deepStrictEqual(events, [false]);
  assert.deepStrictEqual(liveEvents, [false, true, false, true, false]);
}

async function testMetadataSnapshot() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  const first = makeClip("zake");
  const originalBlob = new Blob(["mave"], { type: "audio/webm" });
  const mutableClip: PseudowordCaptureClip = {
    blob: originalBlob,
    lessonTargetCode: "a_e",
    expectedText: "mave",
    wordIndex: 4,
    speakerAgeBand: "7-8",
    clipDurationMs: 444,
  };
  coordinator.enqueue(first);
  coordinator.enqueue(mutableClip);
  mutableClip.lessonTargetCode = "changed";
  mutableClip.expectedText = "changed";
  mutableClip.wordIndex = 99;
  mutableClip.speakerAgeBand = "99";
  mutableClip.clipDurationMs = 999;

  await waitFor(() => calls.length === 1, "snapshot first send");
  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await waitFor(() => calls.length === 2, "snapshot second send");
  assert.strictEqual(calls[1].input.lessonTargetCode, "a_e");
  assert.strictEqual(calls[1].input.expectedText, "mave");
  assert.strictEqual(calls[1].input.wordIndex, 4);
  assert.strictEqual(calls[1].input.speakerAgeBand, "7-8");
  assert.strictEqual(calls[1].input.clipDurationMs, 444);
  assert.strictEqual(calls[1].input.blob, originalBlob);
  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinator.whenIdle();
}

async function testBlockIsolation() {
  const first = makeControlledSender();
  const coordinatorA = new PseudowordCaptureCoordinator({ send: first.send });
  coordinatorA.enqueue(makeClip("zake"));
  await waitFor(() => first.calls.length === 1, "block A send");
  first.calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await coordinatorA.whenIdle();

  const second = makeControlledSender();
  const coordinatorB = new PseudowordCaptureCoordinator({ send: second.send });
  assert.notStrictEqual(coordinatorA, coordinatorB);
  coordinatorB.enqueue(makeClip("mave"));
  await waitFor(() => second.calls.length === 1, "block B send");
  assert.strictEqual(second.calls[0].input.voiceSessionId, null);
  second.calls[0].deferred.resolve({ voiceSessionId: "vs-2" });
  await coordinatorB.whenIdle();
}

async function testWhenIdleReentrancy() {
  const { send, calls } = makeControlledSender();
  const coordinator = new PseudowordCaptureCoordinator({ send });
  let reentered = false;
  let sawPending = false;
  coordinator.subscribePending((pending) => {
    if (pending) sawPending = true;
    if (!pending && sawPending && !reentered) {
      reentered = true;
      coordinator.enqueue(makeClip("gake"));
    }
  });
  coordinator.enqueue(makeClip("zake"));
  await waitFor(() => calls.length === 1, "reentrant first send");
  const idle = coordinator.whenIdle();
  calls[0].deferred.resolve({ voiceSessionId: "vs-1" });
  await waitFor(() => calls.length === 2, "reentrant send");
  await assertStillPending(idle, "whenIdle must wait for reentrant enqueue");
  assert.strictEqual(calls[1].input.voiceSessionId, "vs-1");
  calls[1].deferred.resolve({ voiceSessionId: "vs-1" });
  await idle;
}

async function main() {
  await testInitialAndSerializedIdReuse();
  await testLateEnqueueWhenIdleAndReuseAfterIdle();
  await testFailureModesContinueAndDoNotEscape();
  await testSessionIdMonotonicity();
  await testSubscriptionRobustnessAndUnsubscribe();
  await testMetadataSnapshot();
  await testBlockIsolation();
  await testWhenIdleReentrancy();
  console.log("pseudoword capture coordinator: PASS");
}

void main().catch((error) => {
  console.error(error);
  process.exit(1);
});
