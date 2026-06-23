import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

import {
  generatePssaFigureLongDescription,
  projectPssaFigureFeatureForStudent,
  requireSafePublicFigurePath,
  validatePssaFigureFeatureShared,
  validateUniquePssaFigureFeatureIds,
  type PssaFigureMapFeature,
  type PssaFigureStructuredData,
} from "../lib/content/pssaFigureFeature";
import { assertNoBannedKeys } from "../lib/content/pssaStudentDto";
import {
  computePssaFigureAssetSha256,
  validatePssaFigureAssetNode,
  validateSvgAllowlist,
  svgTextLabels,
} from "./content/lib/pssa-figure-feature-node";
import {
  PSSA_MOY_P1_FIGURE_ASSET_PATH,
  PSSA_MOY_P1_FIGURE_ASSET_SHA256,
  museumStructuredData,
} from "./content/lib/pssa-moy-p1-figure-data";
import {
  computePssaPassageContentHash,
  stableStringify,
} from "./content/lib/pssa-import-plan";
import {
  buildPssaStaminaSectionMap,
  evaluatePssaTextFeatureIntegrity,
} from "./content/lib/pssa-stamina-gates";

const ASSET_PATH = PSSA_MOY_P1_FIGURE_ASSET_PATH;
const ASSET_SHA256 = PSSA_MOY_P1_FIGURE_ASSET_SHA256;

function museumFigure(
  overrides: Partial<PssaFigureMapFeature> = {},
): PssaFigureMapFeature {
  const structuredData = overrides.structuredData ?? museumStructuredData();
  return {
    type: "figure",
    figureKind: "map",
    featureId: "g3_moy_p1_museum_map",
    title: "Bright Ideas Children's Museum — Visitor Floor Map",
    sectionId: "floor_map",
    assetPath: ASSET_PATH,
    assetSha256: ASSET_SHA256,
    altText: "Floor map of the Bright Ideas Children's Museum with an accessible route to the Dinosaur Dig.",
    longDescription: generatePssaFigureLongDescription(structuredData),
    structuredData,
    ...overrides,
  };
}

function passageWithFigure(figure = museumFigure()) {
  return {
    id: "fixture_museum_map",
    title: "A Map for a Day of Discovery",
    gradeLevel: 3,
    subject: "ELA",
    passageType: "informational",
    staminaBand: "released_length",
    genre: "informational_description",
    domainVocabularyLoad: "medium",
    text: "Families use maps to plan a museum visit.\n\n### Floor Map\nThe map shows two levels, symbols, exhibits, and an accessible route.",
    textFeaturesJson: [
      { type: "heading", label: "Floor Map", sectionId: "floor_map", bodyText: "### Floor Map" },
      figure,
    ],
  };
}

const figure = museumFigure();
const sections = buildPssaStaminaSectionMap(passageWithFigure()).map((row) => row.sectionId);

assert.equal(computePssaFigureAssetSha256(ASSET_PATH), ASSET_SHA256, "committed SVG digest must match fixture");
assert.equal(validatePssaFigureFeatureShared(figure, sections), true, "shared figure validation passes");
assert.equal(validateUniquePssaFigureFeatureIds([figure]), true, "single figure id is unique");
assert.throws(() => validateUniquePssaFigureFeatureIds([figure, figure]), /figure_feature_id_duplicate/);
assert.equal(validatePssaFigureAssetNode(figure).assetSha256, ASSET_SHA256, "node asset validation passes");
assert.equal(evaluatePssaTextFeatureIntegrity(passageWithFigure() as any, []), "PASS", "figure feature participates in text feature integrity");

assert.throws(() => validatePssaFigureFeatureShared({ ...figure, title: "" }, sections), /figure_title_missing/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, altText: "" }, sections), /figure_alt_text_missing/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, sectionId: "missing" }, sections), /figure_section_unknown/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, longDescription: "hand edited" }, sections), /figure_long_description_mismatch/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetPath: "https://example.com/map.svg" }, sections), /figure_asset_path_unsafe/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetPath: "data:image/svg+xml;base64,abc" }, sections), /figure_asset_path_unsafe/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetPath: "javascript:alert(1)" }, sections), /figure_asset_path_unsafe/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetPath: "/pssa/figures/../secret.svg" }, sections), /figure_asset_path_unsafe/);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetPath: "/tmp/map.svg" }, sections), /figure_asset_path_unsafe/);
assert.equal(requireSafePublicFigurePath("/pssa/figures/g3_moy_p1_museum_map.svg"), true);
assert.throws(() => validatePssaFigureFeatureShared({ ...figure, assetSha256: "sha256:nothex" }, sections), /figure_asset_sha256_invalid/);
assert.throws(() => validatePssaFigureAssetNode({ ...figure, assetSha256: `sha256:${"0".repeat(64)}` }), /figure_asset_sha256_mismatch/);

const badData = museumStructuredData();
badData.routes[0] = { ...badData.routes[0], to: "unknown_place" };
assert.throws(() => validatePssaFigureFeatureShared(museumFigure({ structuredData: badData, longDescription: generatePssaFigureLongDescription(badData) }), sections), /figure_route_ref_unknown/);
const badRelationship = museumStructuredData();
badRelationship.relationships[0] = { ...badRelationship.relationships[0], from: "unknown_place" };
assert.throws(() => validatePssaFigureFeatureShared(museumFigure({ structuredData: badRelationship, longDescription: generatePssaFigureLongDescription(badRelationship) }), sections), /figure_relationship_ref_unknown/);
const duplicateLocation = museumStructuredData();
duplicateLocation.locations[1] = { ...duplicateLocation.locations[1], id: "entrance" };
assert.throws(() => validatePssaFigureFeatureShared(museumFigure({ structuredData: duplicateLocation, longDescription: generatePssaFigureLongDescription(duplicateLocation) }), sections), /figure_locations_id_duplicate/);
assert.throws(() => validatePssaFigureFeatureShared(museumFigure({ structuredData: { ...museumStructuredData(), relationships: [] }, longDescription: "" } as any), sections), /figure_structured_data_relationships_missing/);

assert.equal(validateSvgAllowlist("<svg xmlns=\"x\" viewBox=\"0 0 1 1\"><text x=\"0\" y=\"0\">ok</text></svg>"), true);
for (const raw of [
  "<svg><script>alert(1)</script></svg>",
  "<svg><foreignObject></foreignObject></svg>",
  "<svg><image href=\"x\" /></svg>",
  "<svg><use href=\"#x\" /></svg>",
  "<svg><a href=\"x\"></a></svg>",
  "<svg><text onclick=\"x()\">bad</text></svg>",
  "<svg><text style=\"fill:red\">bad</text></svg>",
  "<!DOCTYPE svg><svg></svg>",
  "<?xml version=\"1.0\"?><svg></svg>",
]) {
  assert.throws(() => validateSvgAllowlist(raw), /figure_svg_/);
}

const dto = projectPssaFigureFeatureForStudent(figure);
assert.equal(dto.src, ASSET_PATH, "student figure DTO exposes public src");
assert.equal(JSON.stringify(dto).includes("assetSha256"), false, "student figure DTO does not expose asset digest");
assert.equal(JSON.stringify(dto).includes("public/"), false, "student figure DTO does not expose repository path");
assertNoBannedKeys(dto);

const labels = svgTextLabels(fs.readFileSync("public/pssa/figures/g3_moy_p1_museum_map.svg", "utf8")).join(" | ");
for (const expected of ["Story Stage", "Build Lab", "Art Studio", "Dinosaur Dig", "Quiet Corner", "Family Rest Area", "11:00 · 1:00 · 3:00", "Accessible route"]) {
  assert.equal(labels.includes(expected), true, `SVG labels include ${expected}`);
}
assert.equal(figure.structuredData.relationships.some((row) => row.from === "story_stage" && row.to === "build_lab" && row.type === "adjacent_to"), true);
assert.equal(figure.structuredData.relationships.some((row) => row.from === "art_studio" && row.to === "dinosaur_dig" && row.type === "adjacent_to"), true);
assert.equal(figure.structuredData.relationships.some((row) => row.from === "quiet_corner" && row.to === "build_lab" && row.type === "separated_from"), true);
assert.equal(figure.structuredData.locations.some((row) => row.id === "family_rest_area"), true);
assert.equal(figure.structuredData.locations.find((row) => row.id === "family_rest_area")?.level, "Level 1", "Family Rest Area must be on Level 1 (approved package + figure contract)");
assert.equal(figure.structuredData.annotations.some((row) => row.value === "11:00 · 1:00 · 3:00"), true);
assert.deepEqual(figure.structuredData.routes[0], { id: "accessible_route_dinosaur_dig", label: "Accessible route", from: "entrance", via: ["level1_elevator", "level2_elevator"], to: "dinosaur_dig" });
assert.equal(figure.structuredData.routes[0].via.includes("level1_stairs"), false, "stairs are excluded from accessible route");
assert.equal(dto.longDescription.includes("Relationships:"), true, "accessible description includes relationships");
assert.equal(dto.longDescription.includes("Family Rest Area"), true, "accessible description includes Family Rest Area");

function oldPassageHashInput(passage: any) {
  return { id: passage.id, title: passage.title, text: passage.text, gradeLevel: passage.gradeLevel, subject: passage.subject, passageType: passage.passageType };
}
function sha(value: unknown) {
  return `sha256:${crypto.createHash("sha256").update(stableStringify(value)).digest("hex")}`;
}
const syrup = JSON.parse(fs.readFileSync("exemplars/pssa_grade3_stamina_pilot/syrup_released_length.json", "utf8")).passages[0];
assert.equal(computePssaPassageContentHash(syrup), sha(oldPassageHashInput(syrup)), "legacy heading/sidebar passage hash input remains byte-identical");
const baseHash = computePssaPassageContentHash(passageWithFigure());
for (const [field, changed] of [
  ["figureKind", { ...figure, figureKind: "map" }],
  ["featureId", { ...figure, featureId: "changed" }],
  ["title", { ...figure, title: "Changed title" }],
  ["sectionId", { ...figure, sectionId: "changed" }],
  ["assetPath", { ...figure, assetPath: "/pssa/figures/changed.svg" }],
  ["assetSha256", { ...figure, assetSha256: `sha256:${"1".repeat(64)}` }],
  ["altText", { ...figure, altText: "Changed alt" }],
] as const) {
  if (field === "figureKind") continue;
  assert.notEqual(computePssaPassageContentHash(passageWithFigure(changed as PssaFigureMapFeature)), baseHash, `${field} changes figure-bearing passage hash`);
}
const changedData = museumStructuredData();
changedData.annotations[0] = { ...changedData.annotations[0], value: "12:00" };
assert.notEqual(computePssaPassageContentHash(passageWithFigure(museumFigure({ structuredData: changedData, longDescription: generatePssaFigureLongDescription(changedData) }))), baseHash, "structuredData changes hash");
const reorderedObjectData = JSON.parse(JSON.stringify(museumStructuredData()));
reorderedObjectData.locations[0] = { level: "Level 1", notes: "Star symbol", label: "Entrance", id: "entrance" };
assert.equal(computePssaPassageContentHash(passageWithFigure(museumFigure({ structuredData: reorderedObjectData, longDescription: generatePssaFigureLongDescription(reorderedObjectData) }))), baseHash, "object key order does not change hash");
const reorderedArrayData = museumStructuredData();
reorderedArrayData.routes = [...reorderedArrayData.routes].reverse();
reorderedArrayData.locations = [...reorderedArrayData.locations].reverse();
assert.notEqual(computePssaPassageContentHash(passageWithFigure(museumFigure({ structuredData: reorderedArrayData, longDescription: generatePssaFigureLongDescription(reorderedArrayData) }))), baseHash, "meaningful array order changes hash");

const playerSource = fs.readFileSync("components/pssa/PssaSectionedDiagnosticShell.tsx", "utf8");
assert.equal(playerSource.includes("PssaFigureFeatureView"), true, "existing PssaSectionedDiagnosticShell renders figure features");
assert.equal(playerSource.includes("Text description"), true, "existing player exposes visible text description control");
assert.equal(playerSource.includes("triggerRef.current?.focus()"), true, "existing player returns focus after closing enlarged map");

console.log("PSSA figure/map feature tests passed.");
console.log("Manual-review checks: visual route geometry and screenshot-based zoom inspection are not automated in this repo.");
