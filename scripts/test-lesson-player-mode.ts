import assert from "node:assert/strict";
import { lessonPlayerModeFor } from "@/lib/literacy/lessonPlayerMode";

assert.equal(lessonPlayerModeFor(undefined), "scroll");
assert.equal(lessonPlayerModeFor("BAND_K_3"), "scroll");
assert.equal(lessonPlayerModeFor("BAND_4_6"), "scroll");
assert.equal(lessonPlayerModeFor("BAND_7_8"), "stepper");

console.log("Lesson player mode tests passed.");
