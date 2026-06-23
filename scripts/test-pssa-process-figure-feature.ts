import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import {
  generatePssaFigureLongDescription,
  projectPssaFigureFeatureForStudent,
  pssaFigureHashInput,
  validatePssaFigureFeatureShared,
  type PssaFigureFeature,
  type PssaFigureProcessStructuredData,
} from "../lib/content/pssaFigureFeature";
import {
  computePssaFigureAssetSha256,
  validatePssaFigureAssetNode,
} from "./content/lib/pssa-figure-feature-node";
import {
  PSSA_MOY_P1_FIGURE_ASSET_PATH,
  PSSA_MOY_P1_FIGURE_ASSET_SHA256,
  museumStructuredData,
} from "./content/lib/pssa-moy-p1-figure-data";

const MAP_LONG_DESCRIPTION = "Legend:\n- Entrance: Entrance (You are here)\n- Story Stage: Story Stage (show times)\n- Accessible route: Accessible route (no stairs)\nLocations:\n- Level 1: Entrance (Star symbol); Build Lab (Blocks and ramps); Story Stage (Book symbol); Quiet Corner (Rest and read); Elevator; Stairs; Family Rest Area\n- Level 2: Art Studio (Draw and paint); Dinosaur Dig (Fossil area); Elevator (Accessible route); Stairs\nRelationships:\n- Story Stage adjacent to Build Lab.\n- Art Studio adjacent to Dinosaur Dig.\n- Quiet Corner separated from Build Lab.\nRoutes:\n- Accessible route: Entrance via Elevator, Elevator to Dinosaur Dig.\nAnnotations:\n- Story Stage: 11:00 · 1:00 · 3:00";
const MAP_STUDENT_DTO_JSON = "{\"type\":\"figure\",\"figureKind\":\"map\",\"featureId\":\"g3_moy_p1_museum_map\",\"title\":\"Bright Ideas Children's Museum — Visitor Floor Map\",\"sectionId\":\"section_0_intro\",\"src\":\"/pssa/figures/g3_moy_p1_museum_map.svg\",\"altText\":\"Floor map of the Bright Ideas Children's Museum with an accessible route to the Dinosaur Dig.\",\"longDescription\":\"Legend:\\n- Entrance: Entrance (You are here)\\n- Story Stage: Story Stage (show times)\\n- Accessible route: Accessible route (no stairs)\\nLocations:\\n- Level 1: Entrance (Star symbol); Build Lab (Blocks and ramps); Story Stage (Book symbol); Quiet Corner (Rest and read); Elevator; Stairs; Family Rest Area\\n- Level 2: Art Studio (Draw and paint); Dinosaur Dig (Fossil area); Elevator (Accessible route); Stairs\\nRelationships:\\n- Story Stage adjacent to Build Lab.\\n- Art Studio adjacent to Dinosaur Dig.\\n- Quiet Corner separated from Build Lab.\\nRoutes:\\n- Accessible route: Entrance via Elevator, Elevator to Dinosaur Dig.\\nAnnotations:\\n- Story Stage: 11:00 · 1:00 · 3:00\",\"structuredData\":{\"legend\":[{\"symbol\":\"Entrance\",\"meaning\":\"Entrance (You are here)\"},{\"symbol\":\"Story Stage\",\"meaning\":\"Story Stage (show times)\"},{\"symbol\":\"Accessible route\",\"meaning\":\"Accessible route (no stairs)\"}],\"locations\":[{\"id\":\"entrance\",\"label\":\"Entrance\",\"level\":\"Level 1\",\"notes\":\"Star symbol\"},{\"id\":\"build_lab\",\"label\":\"Build Lab\",\"level\":\"Level 1\",\"notes\":\"Blocks and ramps\"},{\"id\":\"story_stage\",\"label\":\"Story Stage\",\"level\":\"Level 1\",\"notes\":\"Book symbol\"},{\"id\":\"quiet_corner\",\"label\":\"Quiet Corner\",\"level\":\"Level 1\",\"notes\":\"Rest and read\"},{\"id\":\"level1_elevator\",\"label\":\"Elevator\",\"level\":\"Level 1\"},{\"id\":\"level1_stairs\",\"label\":\"Stairs\",\"level\":\"Level 1\"},{\"id\":\"art_studio\",\"label\":\"Art Studio\",\"level\":\"Level 2\",\"notes\":\"Draw and paint\"},{\"id\":\"dinosaur_dig\",\"label\":\"Dinosaur Dig\",\"level\":\"Level 2\",\"notes\":\"Fossil area\"},{\"id\":\"level2_elevator\",\"label\":\"Elevator\",\"level\":\"Level 2\",\"notes\":\"Accessible route\"},{\"id\":\"level2_stairs\",\"label\":\"Stairs\",\"level\":\"Level 2\"},{\"id\":\"family_rest_area\",\"label\":\"Family Rest Area\",\"level\":\"Level 1\"}],\"relationships\":[{\"id\":\"story_stage_build_lab\",\"type\":\"adjacent_to\",\"from\":\"story_stage\",\"to\":\"build_lab\"},{\"id\":\"art_studio_dinosaur_dig\",\"type\":\"adjacent_to\",\"from\":\"art_studio\",\"to\":\"dinosaur_dig\"},{\"id\":\"quiet_corner_build_lab\",\"type\":\"separated_from\",\"from\":\"quiet_corner\",\"to\":\"build_lab\"}],\"routes\":[{\"id\":\"accessible_route_dinosaur_dig\",\"label\":\"Accessible route\",\"from\":\"entrance\",\"via\":[\"level1_elevator\",\"level2_elevator\"],\"to\":\"dinosaur_dig\"}],\"annotations\":[{\"label\":\"Story Stage\",\"value\":\"11:00 · 1:00 · 3:00\"}]}}";
const MAP_HASH_INPUT_JSON = "{\"type\":\"figure\",\"figureKind\":\"map\",\"featureId\":\"g3_moy_p1_museum_map\",\"title\":\"Bright Ideas Children's Museum — Visitor Floor Map\",\"sectionId\":\"section_0_intro\",\"assetPath\":\"/pssa/figures/g3_moy_p1_museum_map.svg\",\"assetSha256\":\"sha256:430318638b57236332e3c68a6f3620358a24cd912d35c2bef664c91d49811502\",\"altText\":\"Floor map of the Bright Ideas Children's Museum with an accessible route to the Dinosaur Dig.\",\"longDescription\":\"Legend:\\n- Entrance: Entrance (You are here)\\n- Story Stage: Story Stage (show times)\\n- Accessible route: Accessible route (no stairs)\\nLocations:\\n- Level 1: Entrance (Star symbol); Build Lab (Blocks and ramps); Story Stage (Book symbol); Quiet Corner (Rest and read); Elevator; Stairs; Family Rest Area\\n- Level 2: Art Studio (Draw and paint); Dinosaur Dig (Fossil area); Elevator (Accessible route); Stairs\\nRelationships:\\n- Story Stage adjacent to Build Lab.\\n- Art Studio adjacent to Dinosaur Dig.\\n- Quiet Corner separated from Build Lab.\\nRoutes:\\n- Accessible route: Entrance via Elevator, Elevator to Dinosaur Dig.\\nAnnotations:\\n- Story Stage: 11:00 · 1:00 · 3:00\",\"structuredData\":{\"legend\":[{\"symbol\":\"Entrance\",\"meaning\":\"Entrance (You are here)\"},{\"symbol\":\"Story Stage\",\"meaning\":\"Story Stage (show times)\"},{\"symbol\":\"Accessible route\",\"meaning\":\"Accessible route (no stairs)\"}],\"locations\":[{\"id\":\"entrance\",\"label\":\"Entrance\",\"level\":\"Level 1\",\"notes\":\"Star symbol\"},{\"id\":\"build_lab\",\"label\":\"Build Lab\",\"level\":\"Level 1\",\"notes\":\"Blocks and ramps\"},{\"id\":\"story_stage\",\"label\":\"Story Stage\",\"level\":\"Level 1\",\"notes\":\"Book symbol\"},{\"id\":\"quiet_corner\",\"label\":\"Quiet Corner\",\"level\":\"Level 1\",\"notes\":\"Rest and read\"},{\"id\":\"level1_elevator\",\"label\":\"Elevator\",\"level\":\"Level 1\"},{\"id\":\"level1_stairs\",\"label\":\"Stairs\",\"level\":\"Level 1\"},{\"id\":\"art_studio\",\"label\":\"Art Studio\",\"level\":\"Level 2\",\"notes\":\"Draw and paint\"},{\"id\":\"dinosaur_dig\",\"label\":\"Dinosaur Dig\",\"level\":\"Level 2\",\"notes\":\"Fossil area\"},{\"id\":\"level2_elevator\",\"label\":\"Elevator\",\"level\":\"Level 2\",\"notes\":\"Accessible route\"},{\"id\":\"level2_stairs\",\"label\":\"Stairs\",\"level\":\"Level 2\"},{\"id\":\"family_rest_area\",\"label\":\"Family Rest Area\",\"level\":\"Level 1\"}],\"relationships\":[{\"id\":\"story_stage_build_lab\",\"type\":\"adjacent_to\",\"from\":\"story_stage\",\"to\":\"build_lab\"},{\"id\":\"art_studio_dinosaur_dig\",\"type\":\"adjacent_to\",\"from\":\"art_studio\",\"to\":\"dinosaur_dig\"},{\"id\":\"quiet_corner_build_lab\",\"type\":\"separated_from\",\"from\":\"quiet_corner\",\"to\":\"build_lab\"}],\"routes\":[{\"id\":\"accessible_route_dinosaur_dig\",\"label\":\"Accessible route\",\"from\":\"entrance\",\"via\":[\"level1_elevator\",\"level2_elevator\"],\"to\":\"dinosaur_dig\"}],\"annotations\":[{\"label\":\"Story Stage\",\"value\":\"11:00 · 1:00 · 3:00\"}]}}";

const sections = ["section_0_intro", "process_steps"];

function mapFeature(): PssaFigureFeature {
  const structuredData = museumStructuredData();
  return {
    type: "figure",
    figureKind: "map",
    featureId: "g3_moy_p1_museum_map",
    title: "Bright Ideas Children's Museum — Visitor Floor Map",
    sectionId: "section_0_intro",
    assetPath: PSSA_MOY_P1_FIGURE_ASSET_PATH,
    assetSha256: PSSA_MOY_P1_FIGURE_ASSET_SHA256,
    altText: "Floor map of the Bright Ideas Children's Museum with an accessible route to the Dinosaur Dig.",
    longDescription: generatePssaFigureLongDescription(structuredData),
    structuredData,
  };
}

function processData(count: number): PssaFigureProcessStructuredData {
  return {
    stages: Array.from({ length: count }, (_, index) => ({
      order: index + 1,
      targetId: `step_${index + 1}`,
      label: `Step ${index + 1}`,
      caption: `Caption ${index + 1}`,
    })),
  };
}

function processFeature(data = processData(3), overrides: Partial<PssaFigureFeature> = {}): PssaFigureFeature {
  return {
    type: "figure",
    figureKind: "process",
    featureId: "process_fixture",
    title: "How the Process Works",
    sectionId: "process_steps",
    assetPath: "/pssa/figures/process_fixture.svg",
    assetSha256: `sha256:${"0".repeat(64)}`,
    altText: "Diagram showing a process in order.",
    longDescription: generatePssaFigureLongDescription(data),
    structuredData: data,
    ...overrides,
  } as PssaFigureFeature;
}

function sha256(text: string) {
  return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;
}

function writeProcessSvg(feature: PssaFigureFeature, filename: string, omitted = "") {
  assert.equal(feature.figureKind, "process");
  const data = feature.structuredData as PssaFigureProcessStructuredData;
  const labels = [feature.title, ...data.stages.flatMap((stage) => [stage.label, stage.caption])]
    .filter((label) => label !== omitted);
  const raw = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 500 200">${labels.map((label, index) => `<text x="10" y="${20 + index * 16}">${label}</text>`).join("")}</svg>`;
  const figuresDir = path.join(process.cwd(), "public", "pssa", "figures");
  fs.mkdirSync(figuresDir, { recursive: true });
  const filePath = path.join(figuresDir, filename);
  fs.writeFileSync(filePath, raw);
  return { filePath, raw, assetSha256: sha256(raw), assetPath: `/pssa/figures/${filename}` };
}

const map = mapFeature();
assert.equal(validatePssaFigureFeatureShared(map, sections), true, "MOY P1 map still validates");
assert.equal(generatePssaFigureLongDescription(map.structuredData), MAP_LONG_DESCRIPTION, "MOY P1 map longDescription is byte-identical");
assert.equal(JSON.stringify(projectPssaFigureFeatureForStudent(map)), MAP_STUDENT_DTO_JSON, "MOY P1 map student projection is byte-identical");
assert.equal(JSON.stringify(pssaFigureHashInput(map)), MAP_HASH_INPUT_JSON, "MOY P1 map hash input is byte-identical");

const processTwo = processFeature(processData(2));
const processSix = processFeature(processData(6));
assert.equal(validatePssaFigureFeatureShared(processTwo, sections), true, "N=2 process figure validates");
assert.equal(validatePssaFigureFeatureShared(processSix, sections), true, "N=6 process figure validates");
assert.equal(
  generatePssaFigureLongDescription(processTwo.structuredData),
  "This diagram shows 2 steps in order. Step 1: Step 1. Caption 1 Step 2: Step 2. Caption 2",
  "process longDescription is deterministic",
);
const projected = projectPssaFigureFeatureForStudent(processTwo);
assert.equal(projected.figureKind, "process", "student projection preserves process kind");
assert.deepEqual(projected.structuredData, processTwo.structuredData, "student projection preserves stages");
assert.equal(JSON.stringify(pssaFigureHashInput(processTwo)).includes("Caption 2"), true, "hash input includes process stage captions");

assert.throws(() => validatePssaFigureFeatureShared(processFeature({ stages: [
  { order: 2, targetId: "two", label: "Two", caption: "Second" },
  { order: 1, targetId: "one", label: "One", caption: "First" },
  { order: 3, targetId: "three", label: "Three", caption: "Third" },
] }), sections), /figure_process_stage_order_invalid/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature({ stages: [
  { order: 1, targetId: "same", label: "One", caption: "First" },
  { order: 2, targetId: "same", label: "Two", caption: "Second" },
] }), sections), /figure_process_stage_target_id_duplicate:same/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature({ stages: [
  { order: 1, targetId: "one", label: "One", caption: "First" },
  { order: 2, targetId: "two", label: "Two", caption: "Second" },
  { order: 3, targetId: "three", label: "Three", caption: "Third" },
  { order: 3, targetId: "four", label: "Four", caption: "Fourth" },
  { order: 5, targetId: "five", label: "Five", caption: "Fifth" },
] }), sections), /figure_process_stage_order_invalid/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature({ stages: [
  { order: 0, targetId: "zero", label: "Zero", caption: "Zero" },
  { order: 1, targetId: "one", label: "One", caption: "First" },
  { order: 2, targetId: "two", label: "Two", caption: "Second" },
  { order: 3, targetId: "three", label: "Three", caption: "Third" },
] }), sections), /figure_process_stage_order_invalid/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature(processData(1)), sections), /figure_structured_data_stages_missing/);
const blankLabel = processData(2);
blankLabel.stages[0].label = "";
assert.throws(() => validatePssaFigureFeatureShared(processFeature(blankLabel), sections), /figure_process_stage_label_missing:1/);
const blankCaption = processData(2);
blankCaption.stages[1].caption = "";
assert.throws(() => validatePssaFigureFeatureShared(processFeature(blankCaption), sections), /figure_process_stage_caption_missing:2/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature(processData(2), { longDescription: "hand edited" }), sections), /figure_long_description_mismatch/);
assert.throws(() => validatePssaFigureFeatureShared(processFeature(processData(2), { sectionId: "unknown_section" }), sections), /figure_section_unknown:unknown_section/);

const tempFiles: string[] = [];
try {
  const complete = processFeature(processData(3));
  const completeSvg = writeProcessSvg(complete, "process_fixture.svg");
  tempFiles.push(completeSvg.filePath);
  const completeWithDigest = { ...complete, assetPath: completeSvg.assetPath, assetSha256: completeSvg.assetSha256 } as PssaFigureFeature;
  assert.equal(computePssaFigureAssetSha256(completeSvg.assetPath), completeSvg.assetSha256, "process SVG digest matches raw bytes");
  assert.equal(validatePssaFigureAssetNode(completeWithDigest).assetSha256, completeSvg.assetSha256, "process SVG labels/captions validate");

  const missingCaptionSvg = writeProcessSvg(complete, "process_fixture_missing_caption.svg", "Caption 2");
  tempFiles.push(missingCaptionSvg.filePath);
  assert.throws(
    () => validatePssaFigureAssetNode({ ...complete, assetPath: missingCaptionSvg.assetPath, assetSha256: missingCaptionSvg.assetSha256 } as PssaFigureFeature),
    /figure_svg_label_missing:Caption 2/,
  );
  const missingLabelSvg = writeProcessSvg(complete, "process_fixture_missing_label.svg", "Step 3");
  tempFiles.push(missingLabelSvg.filePath);
  assert.throws(
    () => validatePssaFigureAssetNode({ ...complete, assetPath: missingLabelSvg.assetPath, assetSha256: missingLabelSvg.assetSha256 } as PssaFigureFeature),
    /figure_svg_label_missing:Step 3/,
  );
} finally {
  for (const file of tempFiles) fs.rmSync(file, { force: true });
}

console.log("PSSA process figure feature tests passed.");
