import { readFile } from "fs/promises";
import path from "path";

export const PRIVACY_VERSION = "Version 1.0 -- Effective May 15, 2026";

export async function readLegalMarkdown(kind: "privacy" | "terms") {
  const filePath = path.join(process.cwd(), "content", "legal", `${kind}.md`);
  return readFile(filePath, "utf8");
}

export function renderMarkdownLite(markdown: string) {
  return markdown
    .split(/\n{2,}/)
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return null;
      if (trimmed.startsWith("# ")) return { type: "h1", text: trimmed.slice(2) };
      if (trimmed.startsWith("## ")) return { type: "h2", text: trimmed.slice(3) };
      return { type: "p", text: trimmed.replace(/\n/g, " ") };
    })
    .filter(Boolean) as Array<{ type: "h1" | "h2" | "p"; text: string }>;
}

export function parentalConsentText() {
  return `${PRIVACY_VERSION}

I consent to creation of my child's account and to collection and use of account information, learning data, assessment responses, lesson progress, tutor messages, and reading-coach transcripts as described in the Privacy Policy. I understand that AI subprocessors may process limited data to provide scoring, tutoring, lesson generation, and reading feedback. I understand that I may request review, export, correction, deletion, or consent withdrawal by contacting privacy@sylearning.com.`;
}
