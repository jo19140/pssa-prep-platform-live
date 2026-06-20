import type { PssaFigureStructuredData } from "../../../lib/content/pssaFigureFeature";

export const PSSA_MOY_P1_FIGURE_ASSET_PATH = "/pssa/figures/g3_moy_p1_museum_map.svg";
export const PSSA_MOY_P1_FIGURE_ASSET_SHA256 = "sha256:430318638b57236332e3c68a6f3620358a24cd912d35c2bef664c91d49811502";
export const PSSA_MOY_P1_FIGURE_ID = "g3_moy_p1_museum_map";
export const PSSA_MOY_P1_FIGURE_TITLE = "Bright Ideas Children's Museum — Visitor Floor Map";

export function museumStructuredData(): PssaFigureStructuredData {
  return {
    legend: [
      { symbol: "Entrance", meaning: "Entrance (You are here)" },
      { symbol: "Story Stage", meaning: "Story Stage (show times)" },
      { symbol: "Accessible route", meaning: "Accessible route (no stairs)" },
    ],
    locations: [
      { id: "entrance", label: "Entrance", level: "Level 1", notes: "Star symbol" },
      { id: "build_lab", label: "Build Lab", level: "Level 1", notes: "Blocks and ramps" },
      { id: "story_stage", label: "Story Stage", level: "Level 1", notes: "Book symbol" },
      { id: "quiet_corner", label: "Quiet Corner", level: "Level 1", notes: "Rest and read" },
      { id: "level1_elevator", label: "Elevator", level: "Level 1" },
      { id: "level1_stairs", label: "Stairs", level: "Level 1" },
      { id: "art_studio", label: "Art Studio", level: "Level 2", notes: "Draw and paint" },
      { id: "dinosaur_dig", label: "Dinosaur Dig", level: "Level 2", notes: "Fossil area" },
      { id: "level2_elevator", label: "Elevator", level: "Level 2", notes: "Accessible route" },
      { id: "level2_stairs", label: "Stairs", level: "Level 2" },
      { id: "family_rest_area", label: "Family Rest Area", level: "Level 1" },
    ],
    relationships: [
      { id: "story_stage_build_lab", type: "adjacent_to", from: "story_stage", to: "build_lab" },
      { id: "art_studio_dinosaur_dig", type: "adjacent_to", from: "art_studio", to: "dinosaur_dig" },
      { id: "quiet_corner_build_lab", type: "separated_from", from: "quiet_corner", to: "build_lab" },
    ],
    routes: [
      { id: "accessible_route_dinosaur_dig", label: "Accessible route", from: "entrance", via: ["level1_elevator", "level2_elevator"], to: "dinosaur_dig" },
    ],
    annotations: [
      { label: "Story Stage", value: "11:00 · 1:00 · 3:00" },
    ],
  };
}
