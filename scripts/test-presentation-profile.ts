import assert from "node:assert/strict";
import { presentationProfileForGrade } from "@/lib/literacy/presentationProfile";

assert.equal(presentationProfileForGrade(3), "BAND_K_3");
assert.equal(presentationProfileForGrade(7), "BAND_7_8");
assert.equal(presentationProfileForGrade(null), "BAND_K_3");
assert.equal(presentationProfileForGrade(undefined), "BAND_K_3");
assert.equal(presentationProfileForGrade(4), "BAND_4_6");
assert.equal(presentationProfileForGrade(6), "BAND_4_6");
assert.equal(presentationProfileForGrade(8), "BAND_7_8");

console.log("presentation profile checks passed");
