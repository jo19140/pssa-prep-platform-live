export type PssaFigureStructuredData = {
  legend: Array<{ symbol: string; meaning: string }>;
  locations: Array<{ id: string; label: string; level: string; notes?: string }>;
  relationships: Array<{ id: string; type: "adjacent_to" | "separated_from"; from: string; to: string }>;
  routes: Array<{ id: string; label: string; from: string; via: string[]; to: string }>;
  annotations: Array<{ label: string; value: string }>;
};

export type PssaFigureFeature = {
  type: "figure";
  figureKind: "map";
  featureId: string;
  title: string;
  sectionId: string;
  assetPath: string;
  assetSha256: string;
  altText: string;
  longDescription: string;
  structuredData: PssaFigureStructuredData;
  label?: string;
  bodyText?: string;
  featureText?: string;
  charBounds?: { startChar: number; endChar: number };
  term?: string;
  marker?: string;
  decorative?: boolean;
  context_only?: boolean;
  mustUseInItem?: boolean;
  linkedByItemIds?: string[];
};

export type PssaStudentFigureFeature = {
  type: "figure";
  figureKind: "map";
  featureId: string;
  title: string;
  sectionId: string;
  src: string;
  altText: string;
  longDescription: string;
  structuredData: PssaFigureStructuredData;
};

export function isPssaFigureFeature(value: unknown): value is PssaFigureFeature {
  return Boolean(value && typeof value === "object" && !Array.isArray(value) && (value as Record<string, unknown>).type === "figure");
}

export function generatePssaFigureLongDescription(data: PssaFigureStructuredData) {
  const lines: string[] = [];
  lines.push("Legend:");
  for (const row of data.legend) lines.push(`- ${row.symbol}: ${row.meaning}`);
  lines.push("Locations:");
  const byLevel = new Map<string, typeof data.locations>();
  for (const location of data.locations) {
    const rows = byLevel.get(location.level) ?? [];
    rows.push(location);
    byLevel.set(location.level, rows);
  }
  for (const [level, rows] of byLevel) {
    lines.push(`- ${level}: ${rows.map((row) => `${row.label}${row.notes ? ` (${row.notes})` : ""}`).join("; ")}`);
  }
  lines.push("Relationships:");
  for (const row of data.relationships) lines.push(`- ${labelFor(data, row.from)} ${row.type.replace(/_/g, " ")} ${labelFor(data, row.to)}.`);
  lines.push("Routes:");
  for (const row of data.routes) {
    const via = row.via.length ? ` via ${row.via.map((id) => labelFor(data, id)).join(", ")}` : "";
    lines.push(`- ${row.label}: ${labelFor(data, row.from)}${via} to ${labelFor(data, row.to)}.`);
  }
  lines.push("Annotations:");
  for (const row of data.annotations) lines.push(`- ${row.label}: ${row.value}`);
  return lines.join("\n");
}

export function validatePssaFigureFeatureShared(feature: unknown, sectionIds: Iterable<string>) {
  const sections = new Set(sectionIds);
  if (!isPssaFigureFeature(feature)) throw new Error("figure_feature_invalid_type");
  requireNonEmpty(feature.featureId, "figure_feature_id_missing");
  requireNonEmpty(feature.title, "figure_title_missing");
  requireNonEmpty(feature.sectionId, "figure_section_id_missing");
  if (!sections.has(feature.sectionId)) throw new Error(`figure_section_unknown:${feature.sectionId}`);
  if (feature.figureKind !== "map") throw new Error("figure_kind_unsupported");
  requireSafePublicFigurePath(feature.assetPath);
  if (!/^sha256:[0-9a-f]{64}$/.test(feature.assetSha256)) throw new Error("figure_asset_sha256_invalid");
  requireNonEmpty(feature.altText, "figure_alt_text_missing");
  requireStructuredData(feature.structuredData);
  const generated = generatePssaFigureLongDescription(feature.structuredData);
  if (feature.longDescription !== generated) throw new Error("figure_long_description_mismatch");
  return true;
}

export function validateUniquePssaFigureFeatureIds(features: unknown[]) {
  const ids = new Set<string>();
  for (const feature of features) {
    if (!isPssaFigureFeature(feature)) continue;
    if (ids.has(feature.featureId)) throw new Error(`figure_feature_id_duplicate:${feature.featureId}`);
    ids.add(feature.featureId);
  }
  return true;
}

export function projectPssaFigureFeatureForStudent(feature: PssaFigureFeature): PssaStudentFigureFeature {
  return {
    type: "figure",
    figureKind: "map",
    featureId: feature.featureId,
    title: feature.title,
    sectionId: feature.sectionId,
    src: feature.assetPath,
    altText: feature.altText,
    longDescription: feature.longDescription,
    structuredData: cloneStructuredData(feature.structuredData),
  };
}

export function pssaFigureHashInput(feature: PssaFigureFeature) {
  return {
    type: feature.type,
    figureKind: feature.figureKind,
    featureId: feature.featureId,
    title: feature.title,
    sectionId: feature.sectionId,
    assetPath: feature.assetPath,
    assetSha256: feature.assetSha256,
    altText: feature.altText,
    longDescription: feature.longDescription,
    structuredData: feature.structuredData,
  };
}

export function canonicalizePssaFigureHashFields(features: unknown[] | null | undefined) {
  const figures = Array.isArray(features) ? features.filter(isPssaFigureFeature).map(pssaFigureHashInput) : [];
  return figures.length ? figures : undefined;
}

export function requireSafePublicFigurePath(assetPath: string) {
  if (typeof assetPath !== "string" || !assetPath) throw new Error("figure_asset_path_missing");
  if (!/^\/pssa\/figures\/[A-Za-z0-9._-]+\.svg$/.test(assetPath)) throw new Error(`figure_asset_path_unsafe:${assetPath}`);
  if (assetPath.includes("..") || assetPath.includes("://") || assetPath.startsWith("//")) throw new Error(`figure_asset_path_unsafe:${assetPath}`);
  return true;
}

function requireStructuredData(data: PssaFigureStructuredData) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("figure_structured_data_missing");
  for (const key of ["legend", "locations", "relationships", "routes", "annotations"] as const) {
    if (!Array.isArray(data[key]) || !data[key].length) throw new Error(`figure_structured_data_${key}_missing`);
  }
  const locationIds = uniqueIds(data.locations, "locations");
  for (const row of data.legend) {
    requireNonEmpty(row.symbol, "figure_legend_symbol_missing");
    requireNonEmpty(row.meaning, "figure_legend_meaning_missing");
  }
  for (const row of data.locations) {
    requireNonEmpty(row.label, `figure_location_label_missing:${row.id}`);
    requireNonEmpty(row.level, `figure_location_level_missing:${row.id}`);
  }
  uniqueIds(data.relationships, "relationships");
  for (const row of data.relationships) {
    if (!["adjacent_to", "separated_from"].includes(row.type)) throw new Error(`figure_relationship_type_invalid:${row.id}`);
    if (!locationIds.has(row.from) || !locationIds.has(row.to)) throw new Error(`figure_relationship_ref_unknown:${row.id}`);
  }
  uniqueIds(data.routes, "routes");
  for (const row of data.routes) {
    requireNonEmpty(row.label, `figure_route_label_missing:${row.id}`);
    const refs = [row.from, ...(Array.isArray(row.via) ? row.via : []), row.to];
    if (!refs.every((id) => locationIds.has(id))) throw new Error(`figure_route_ref_unknown:${row.id}`);
  }
  for (const row of data.annotations) {
    requireNonEmpty(row.label, "figure_annotation_label_missing");
    requireNonEmpty(row.value, `figure_annotation_value_missing:${row.label}`);
  }
}

function uniqueIds(rows: Array<{ id: string }>, label: string) {
  const ids = new Set<string>();
  for (const row of rows) {
    requireNonEmpty(row.id, `figure_${label}_id_missing`);
    if (ids.has(row.id)) throw new Error(`figure_${label}_id_duplicate:${row.id}`);
    ids.add(row.id);
  }
  return ids;
}

function requireNonEmpty(value: unknown, error: string) {
  if (typeof value !== "string" || !value.trim()) throw new Error(error);
}

function labelFor(data: PssaFigureStructuredData, id: string) {
  return data.locations.find((row) => row.id === id)?.label ?? id;
}

function cloneStructuredData(data: PssaFigureStructuredData): PssaFigureStructuredData {
  return {
    legend: data.legend.map((row) => ({ ...row })),
    locations: data.locations.map((row) => ({ ...row })),
    relationships: data.relationships.map((row) => ({ ...row })),
    routes: data.routes.map((row) => ({ ...row, via: [...row.via] })),
    annotations: data.annotations.map((row) => ({ ...row })),
  };
}
