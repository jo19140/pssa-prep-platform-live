import assert from "assert";
import { formatCopy } from "@/lib/literacy/formatCopy";
import { buildDemoPairItems } from "@/lib/literacy/tappableItem";

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

testDemoPairBuilder();
testFormatCopy();
console.log("coach demo pair primitive checks passed");
