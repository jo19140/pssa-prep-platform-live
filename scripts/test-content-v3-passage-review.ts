import assert from "assert/strict";
import { firstLookRecommendation } from "../lib/literacy/passageReview";

async function main() {
  assert.equal(firstLookRecommendation(null), "UNEVALUATED");
  assert.equal(firstLookRecommendation({ recommendation: "APPROVE" }), "APPROVE");
  assert.equal(firstLookRecommendation({ recommendation: "FLAG_FOR_HUMAN" }), "FLAG_FOR_HUMAN");
  assert.equal(firstLookRecommendation({ recommendation: "REJECT" }), "REJECT");
  assert.equal(firstLookRecommendation({ recommendation: "APPROVE" }, { firstLookStale: true }), "UNEVALUATED");

  console.log("content-v3 passage review checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
