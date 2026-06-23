import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { isPssaFigureFeature, requireSafePublicFigurePath, type PssaFigureFeature, type PssaFigureMapStructuredData, type PssaFigureProcessStructuredData } from "../../../lib/content/pssaFigureFeature";

const ALLOWED_ELEMENTS = new Set(["svg", "g", "rect", "line", "path", "polyline", "polygon", "circle", "text", "tspan", "title", "desc"]);
const ALLOWED_ATTRIBUTES = new Set([
  "xmlns",
  "viewBox",
  "x",
  "y",
  "x1",
  "y1",
  "x2",
  "y2",
  "cx",
  "cy",
  "r",
  "width",
  "height",
  "points",
  "d",
  "fill",
  "stroke",
  "stroke-width",
  "stroke-dasharray",
  "transform",
  "text-anchor",
  "font-size",
  "font-weight",
  "font-family",
  "dy",
  "dx",
  "id",
  "class",
]);

export function computePssaFigureAssetSha256(assetPath: string, repoRoot = process.cwd()) {
  const filePath = resolvePssaFigureAssetPath(assetPath, repoRoot);
  const bytes = fs.readFileSync(filePath);
  return `sha256:${crypto.createHash("sha256").update(bytes).digest("hex")}`;
}

export function validatePssaFigureAssetNode(feature: unknown, repoRoot = process.cwd()) {
  if (!isPssaFigureFeature(feature)) throw new Error("figure_feature_invalid_type");
  const filePath = resolvePssaFigureAssetPath(feature.assetPath, repoRoot);
  const raw = fs.readFileSync(filePath, "utf8");
  const digest = `sha256:${crypto.createHash("sha256").update(Buffer.from(raw, "utf8")).digest("hex")}`;
  if (digest !== feature.assetSha256) throw new Error(`figure_asset_sha256_mismatch:${feature.featureId}`);
  validateSvgAllowlist(raw);
  assertSvgLabelsMatchStructuredData(raw, feature);
  return { assetSha256: digest, filePath };
}

export function resolvePssaFigureAssetPath(assetPath: string, repoRoot = process.cwd()) {
  requireSafePublicFigurePath(assetPath);
  const root = fs.realpathSync(path.join(repoRoot, "public", "pssa", "figures"));
  const candidate = path.join(root, assetPath.replace(/^\/pssa\/figures\//, ""));
  const real = fs.realpathSync(candidate);
  if (real !== root && !real.startsWith(`${root}${path.sep}`)) throw new Error(`figure_asset_path_escape:${assetPath}`);
  return real;
}

export function validateSvgAllowlist(raw: string) {
  if (/<!DOCTYPE/i.test(raw) || /<!ENTITY/i.test(raw) || /<\?/i.test(raw)) throw new Error("figure_svg_active_markup");
  if (/<\s*(script|style|foreignObject|image|use|a)\b/i.test(raw)) throw new Error("figure_svg_disallowed_element");
  if (/@import|url\s*\(/i.test(raw)) throw new Error("figure_svg_external_style");
  const tagPattern = /<\/?\s*([A-Za-z][\w:-]*)([^>]*)>/g;
  for (const match of raw.matchAll(tagPattern)) {
    const tag = match[1];
    if (!ALLOWED_ELEMENTS.has(tag)) throw new Error(`figure_svg_disallowed_element:${tag}`);
    if (match[0].startsWith("</")) continue;
    const attrs = match[2] ?? "";
    for (const attr of attrs.matchAll(/\s+([A-Za-z_:][\w:.-]*)\s*=/g)) {
      const name = attr[1];
      if (name.toLowerCase().startsWith("on") || name === "href" || name === "xlink:href") throw new Error(`figure_svg_disallowed_attribute:${name}`);
      if (!ALLOWED_ATTRIBUTES.has(name)) throw new Error(`figure_svg_disallowed_attribute:${name}`);
    }
  }
  return true;
}

export function svgTextLabels(raw: string) {
  return [...raw.matchAll(/<text\b[^>]*>([\s\S]*?)<\/text>/gi)]
    .map((match) => match[1].replace(/<tspan\b[^>]*>/gi, "").replace(/<\/tspan>/gi, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function assertSvgLabelsMatchStructuredData(raw: string, feature: PssaFigureFeature) {
  const labels = svgTextLabels(raw);
  const haystack = labels.join(" | ");
  const required = feature.figureKind === "process"
    ? [feature.title, ...(feature.structuredData as PssaFigureProcessStructuredData).stages.flatMap((stage) => [stage.label, stage.caption])]
    : [
        feature.title,
        ...(feature.structuredData as PssaFigureMapStructuredData).legend.flatMap((row) => [row.symbol, row.meaning]),
        ...(feature.structuredData as PssaFigureMapStructuredData).locations.map((row) => row.label),
        ...(feature.structuredData as PssaFigureMapStructuredData).annotations.flatMap((row) => [row.label, row.value]),
      ];
  for (const label of required) {
    if (label && !haystack.includes(label)) throw new Error(`figure_svg_label_missing:${label}`);
  }
}
