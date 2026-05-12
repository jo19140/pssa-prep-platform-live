export type LessonVisualScene =
  | "argument"
  | "compare"
  | "conventions"
  | "evidence"
  | "literature"
  | "sequence"
  | "summary"
  | "visual-text"
  | "vocabulary"
  | "word-parts"
  | "reading";

export type LessonVisualMetadata = {
  standardVersion: number;
  scene: LessonVisualScene;
  headline: string;
  caption: string;
  alt: string;
  imagePrompt: string;
  palette: "indigo-violet" | "amber-rose" | "emerald-cyan" | "sky-indigo";
};

export function buildLessonVisualMetadata({
  title,
  text,
  skill,
  gradeLevel,
}: {
  title: string;
  text: string;
  skill?: string | null;
  gradeLevel?: number | null;
}): LessonVisualMetadata {
  const source = `${title} ${text} ${skill || ""}`.toLowerCase();
  const skillScene = sceneForLessonSkill(skill);
  const scene = skillScene !== "reading" ? skillScene : sceneForSource(source);
  const headline = visualFocusForSource(source, skill || title || "Reading Skill");
  const palette = scene === "compare" || scene === "vocabulary" || scene === "literature"
    ? "indigo-violet"
    : scene === "sequence" || scene === "conventions"
      ? "amber-rose"
      : scene === "evidence" || scene === "word-parts" || scene === "summary" || scene === "argument" || scene === "visual-text"
        ? "emerald-cyan"
        : "sky-indigo";

  return {
    standardVersion: 1,
    scene,
    headline,
    caption: captionForVisual(scene, headline),
    alt: `Instructional visual for ${headline}`,
    imagePrompt: buildImagePrompt({ gradeLevel, headline, skill: skill || title, scene }),
    palette,
  };
}

function visualFocusForSource(source: string, fallback: string) {
  if (sceneForSource(source) !== "reading") return fallback;
  if (source.includes("garden")) return "School Garden";
  if (source.includes("library") || source.includes("book")) return "Classroom Library";
  if (source.includes("newspaper")) return "Student Newspaper";
  if (source.includes("park")) return "City Park";
  if (source.includes("science")) return "Science Project";
  if (source.includes("recycling")) return "Recycling Team";
  if (source.includes("museum")) return "Museum Visit";
  if (source.includes("aquarium")) return "Aquarium Field Trip";
  if (source.includes("weather")) return "Weather Report";
  if (source.includes("team")) return "Student Team";
  return fallback;
}

function captionForVisual(scene: LessonVisualScene, headline: string) {
  if (scene === "argument") return `${headline}: connect claim, reason, and evidence without drifting from the point.`;
  if (scene === "compare") return `${headline}: look for how two ideas are alike, different, or organized.`;
  if (scene === "conventions") return `${headline}: inspect the sentence, choose the correct form, and keep the style consistent.`;
  if (scene === "sequence") return `${headline}: track what happens first, next, and as a result.`;
  if (scene === "evidence") return `${headline}: connect the clue to the answer with text evidence.`;
  if (scene === "literature") return `${headline}: track characters, choices, conflict, and message across the text.`;
  if (scene === "summary") return `${headline}: keep the central idea and key details, and leave out opinions.`;
  if (scene === "visual-text") return `${headline}: use titles, labels, rows, columns, or images to support the text.`;
  if (scene === "vocabulary") return `${headline}: use context and word parts to determine the precise meaning.`;
  if (scene === "word-parts") return `${headline}: break the long word into meaningful parts, then blend the parts back together.`;
  return `${headline}: preview the topic, then read closely for the important idea.`;
}

function buildImagePrompt({
  gradeLevel,
  headline,
  skill,
  scene,
}: {
  gradeLevel?: number | null;
  headline: string;
  skill?: string | null;
  scene: LessonVisualScene;
}) {
  const sceneDirection = scene === "compare"
    ? "two-panel comparison composition"
    : scene === "argument"
      ? "claim reason evidence organizer with student-safe visual evidence, no readable text"
    : scene === "conventions"
      ? "sentence editing workspace with highlighted punctuation and style choices, no readable text"
    : scene === "sequence"
      ? "clear sequence with beginning, middle, and result"
      : scene === "literature"
        ? "story map with character, setting, conflict, and theme symbols, no readable text"
      : scene === "word-parts"
        ? "large friendly word broken into base word, prefix, and suffix pieces with arrows, no readable text"
      : scene === "summary"
        ? "student note-taking scene showing a long passage becoming a shorter objective summary, no readable text"
      : scene === "visual-text"
        ? "chart, table, and diagram elements connected to a passage, no readable text"
      : scene === "vocabulary"
        ? "context clue magnifier around a highlighted word with meaning choices, no readable text"
      : scene === "evidence"
        ? "reading evidence scene with highlighted clue areas"
        : "engaging reading scene connected to the passage topic";

  return [
    `Original grade ${gradeLevel || "ELA"} lesson image about ${headline}`,
    `for ${skill || "ELA reading"}`,
    sceneDirection,
    "colorful instructional style",
    "student-safe",
    "no copyrighted characters",
    "no logos",
    "no text overlays",
  ].join(", ");
}

function isWordPartsSource(source: string) {
  return (
    source.includes("multisyllable") ||
    source.includes("syllable") ||
    source.includes("vowel") ||
    source.includes("prefix") ||
    source.includes("suffix") ||
    source.includes("affix") ||
    source.includes("root") ||
    source.includes("word part")
  );
}

function isSummarySource(source: string) {
  return source.includes("objective summary") || source.includes("summarize") || source.includes("summary");
}

export function sceneForLessonSkill(skill?: string | null): LessonVisualScene {
  return sceneForSource(String(skill || "").toLowerCase());
}

function sceneForSource(source: string): LessonVisualScene {
  if (isWordPartsSource(source)) return "word-parts";
  if (isSummarySource(source)) return "summary";
  if (/\b(claim|argument|arguments|counterclaim|reason|reasons|opinion|opinions|facts and opinions|opinion essay|argumentative|appeal|appeals|fallac|tda)\b/.test(source)) return "argument";
  if (/\b(pronoun|comma|commas|capitalization|complete sentence|complete sentences|sentence|verb|modifier|modifiers|clause|clauses|phrase|phrases|style|formal|informal|punctuation|dash|dashes|parentheses|ellipsis|parallel)\b/.test(source)) return "conventions";
  if (/\b(graphic|organizer|visual|quantitative|chart|table|diagram|data|text feature|text features|caption|heading|map)\b/.test(source)) return "visual-text";
  if (/\b(compare|contrast|multiple account|multiple accounts|same topic|across texts|genre|presentation|structure|structures)\b/.test(source)) return "compare";
  if (/\b(sequence|cause|effect|result|timeline|chronolog|plot|episode|flashback|paragraph organization|organization|transition|transitions|linking words|informative essay development|informative writing)\b/.test(source)) return "sequence";
  if (/\b(theme|themes|character|story|stories|literature|narrative|poetry|poem|stanza|narrator|dialogue|irony|suspense|speaker|conflict)\b/.test(source)) return "literature";
  if (/\b(vocab|vocabulary|connotation|figurative|context|affix|affixes|synonym|synonyms|antonym|antonyms|homophone|homophones|allusion|dictionary|thesaurus|tone|mood|sensory|metaphor|metaphors|simile|similes|multiple-meaning|multiple meaning)\b/.test(source)) return "vocabulary";
  if (/\b(evidence|support|detail|inference|central idea|central ideas|main idea|author purpose|point of view|perspective|research|source|sources|integrating information|synthesis)\b/.test(source)) return "evidence";
  return "reading";
}
