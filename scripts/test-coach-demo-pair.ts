import assert from "assert";
import { readFileSync } from "node:fs";
import { formatCopy } from "@/lib/literacy/formatCopy";
import { buildDemoPairItems } from "@/lib/literacy/tappableItem";
import { itemSetKeyFor, nextTappableHeardState, shouldBlockTappableInteraction } from "@/components/literacy/TappableItemPractice";

function testDemoPairBuilder() {
  const pair = { before: "cap", after: "cape", pairIndex: 3 };
  const helpers = { beforeHelper: "Before", afterHelper: "Silent e word" };
  const pairSnapshot = { ...pair };
  const helperSnapshot = { ...helpers };

  const items = buildDemoPairItems(pair, helpers);
  assert.strictEqual(items.length, 2);
  assert.deepStrictEqual(items, [
    { id: "demo:3:before", label: "cap", helper: "Before", utterance: "cap." },
    { id: "demo:3:after", label: "cape", helper: "Silent e word", utterance: "cape." },
  ]);
  assert.deepStrictEqual(pair, pairSnapshot);
  assert.deepStrictEqual(helpers, helperSnapshot);

  const repeatedZero = buildDemoPairItems({ before: "cap", after: "cape", pairIndex: 0 }, helpers);
  const repeatedOne = buildDemoPairItems({ before: "cap", after: "cape", pairIndex: 1 }, helpers);
  assert.notStrictEqual(repeatedZero[0].id, repeatedOne[0].id);
  assert.notStrictEqual(repeatedZero[1].id, repeatedOne[1].id);

  assert.throws(() => buildDemoPairItems({ before: "", after: "cape", pairIndex: 0 }, helpers), /before word/);
  assert.throws(() => buildDemoPairItems({ before: "   ", after: "cape", pairIndex: 0 }, helpers), /before word/);
  assert.throws(() => buildDemoPairItems({ before: "cap", after: "", pairIndex: 0 }, helpers), /after word/);
  assert.throws(() => buildDemoPairItems({ before: "cap", after: "   ", pairIndex: 0 }, helpers), /after word/);
}

function testFormatCopy() {
  assert.strictEqual(formatCopy("{a}-{b}", { a: "cap", b: "cape" }), "cap-cape");
  assert.strictEqual(formatCopy("{x} {x}", { x: "read" }), "read read");
  assert.strictEqual(formatCopy("{known} {z}", { known: "ok" }), "ok {z}");
}

function testHeardStateHelper() {
  const items = buildDemoPairItems(
    { before: "cap", after: "cape", pairIndex: 2 },
    { beforeHelper: "Before", afterHelper: "After" },
  );
  assert.strictEqual(itemSetKeyFor(items), "demo:2:before\u001fdemo:2:after");

  const first = nextTappableHeardState({
    items,
    heard: {},
    itemId: "demo:2:before",
    firedItemSetKey: null,
  });
  assert.deepStrictEqual(first.heard, { "demo:2:before": true });
  assert.strictEqual(first.heardCount, 1);
  assert.strictEqual(first.allHeard, false);
  assert.strictEqual(first.shouldFireAllHeard, false);

  const second = nextTappableHeardState({
    items,
    heard: first.heard,
    itemId: "demo:2:after",
    firedItemSetKey: null,
  });
  assert.deepStrictEqual(second.heard, { "demo:2:before": true, "demo:2:after": true });
  assert.strictEqual(second.heardCount, 2);
  assert.strictEqual(second.allHeard, true);
  assert.strictEqual(second.shouldFireAllHeard, true);

  const replay = nextTappableHeardState({
    items,
    heard: second.heard,
    itemId: "demo:2:before",
    firedItemSetKey: second.itemSetKey,
  });
  assert.strictEqual(replay.shouldFireAllHeard, false, "same item set must not fire all-heard twice");

  const changedItems = buildDemoPairItems(
    { before: "man", after: "mane", pairIndex: 3 },
    { beforeHelper: "Before", afterHelper: "After" },
  );
  const changed = nextTappableHeardState({
    items: changedItems,
    heard: replay.heard,
    itemId: "demo:3:before",
    firedItemSetKey: second.itemSetKey,
  });
  assert.notStrictEqual(changed.itemSetKey, second.itemSetKey);
  assert.strictEqual(changed.shouldFireAllHeard, false);
}

function testOnAllHeardSourceOrder() {
  const source = readFileSync("components/literacy/TappableItemPractice.tsx", "utf8");
  const awaitIndex = source.indexOf("await onSpeak(item.utterance)");
  const allHeardIndex = source.indexOf("if (guardedInteraction && next.shouldFireAllHeard)");
  assert.ok(awaitIndex > -1, "TappableItemPractice must await onSpeak");
  assert.ok(allHeardIndex > -1, "TappableItemPractice must gate onAllHeard");
  assert.ok(awaitIndex < allHeardIndex, "onAllHeard must run after awaited onSpeak settles");
  assert.match(source, /speakInFlightRef\.current/, "double taps must be blocked by an in-flight ref");
}

function testInFlightGuardScope() {
  assert.strictEqual(
    shouldBlockTappableInteraction({
      hideCompleteButton: false,
      interactionDisabled: false,
      speakInFlight: true,
    }),
    false,
    "default scrolling variant must allow overlapping taps while speech is unsettled",
  );
  assert.strictEqual(
    shouldBlockTappableInteraction({
      hideCompleteButton: false,
      interactionDisabled: true,
      speakInFlight: false,
    }),
    false,
    "interactionDisabled is a stepper-only guard and must not alter default scrolling variant",
  );
  assert.strictEqual(
    shouldBlockTappableInteraction({
      hideCompleteButton: true,
      interactionDisabled: false,
      speakInFlight: true,
    }),
    true,
    "stepper hidden-complete variant must block double taps while speech is unsettled",
  );
  assert.strictEqual(
    shouldBlockTappableInteraction({
      hideCompleteButton: true,
      interactionDisabled: true,
      speakInFlight: false,
    }),
    true,
    "stepper hidden-complete variant must honor interactionDisabled",
  );
}

testDemoPairBuilder();
testFormatCopy();
testHeardStateHelper();
testOnAllHeardSourceOrder();
testInFlightGuardScope();
console.log("coach demo pair primitive checks passed");
