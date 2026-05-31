export function normalizePassageToken(token: string): string {
  return token
    .toLowerCase()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/^[^a-z0-9']+|[^a-z0-9']+$/g, "")
    .replace(/'s$/i, "");
}

export function tokenizePassage(text: string): string[] {
  return text
    .replace(/[—–]/g, " ")
    .split(/\s+/)
    .flatMap((part) => part.split(/-+/))
    .map(normalizePassageToken)
    .filter((token) => /[a-z0-9]/i.test(token));
}

export function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}
