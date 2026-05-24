export const PROMPT_KEYS = {
  TDA_SCORING_V1: "tda-scoring-v1",
  LESSON_DISTRACTOR_GENERATION_V1: "lesson-distractor-generation-v1",
  LESSON_DISTRACTOR_CRITIC_V1: "lesson-distractor-critic-v1",
  GIST_GRADING_HEURISTIC_V1: "gist-grading-heuristic-v1",
  HERO_VIDEO_MATCH_HEURISTIC_V1: "hero-video-match-heuristic-v1",
  OPENAI_TTS_V1: "openai-tts-v1",
} as const;

const REGISTRY = {
  [PROMPT_KEYS.TDA_SCORING_V1]: "Grade a TDA response with a rubric and exemplar anchors. Filled student response and passage are never stored in ModelDecision input.",
  [PROMPT_KEYS.LESSON_DISTRACTOR_GENERATION_V1]: "Generate lesson steps and practice items with plausible distractors from deterministic lesson descriptors.",
  [PROMPT_KEYS.LESSON_DISTRACTOR_CRITIC_V1]: "Critique generated lesson/practice content for placeholder phrases, strand alignment, and student usability.",
  [PROMPT_KEYS.GIST_GRADING_HEURISTIC_V1]: "Heuristically score a short-response gist answer using server-side scoring metadata.",
  [PROMPT_KEYS.HERO_VIDEO_MATCH_HEURISTIC_V1]: "Select the best existing resource link by standard, grade, and skill token overlap.",
  [PROMPT_KEYS.OPENAI_TTS_V1]: "Generate service-operation speech audio from passage text. ModelDecision stores only text length and cache metadata.",
} as const;

export function getPromptTemplate(promptKey: keyof typeof REGISTRY | string) {
  return REGISTRY[promptKey as keyof typeof REGISTRY] || null;
}
