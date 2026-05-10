export type SkillProgressionTarget = {
  skill: string;
  gradeLevel: number;
  cognitiveDemand: string;
  passageComplexity: string;
  evidenceDemand: string;
  reasoningDepth: string;
  masteryExpectation: string;
};

const progression: Record<string, Record<number, SkillProgressionTarget>> = {
  "Main Idea": {
    3: target("Main Idea", 3, "Identify the main idea in a short paragraph or brief passage.", "One short paragraph with clear repeated details.", "Use one or two stated key details.", "Tell what the text is mostly about without adding opinions.", "Choose the main idea and match it to a directly stated detail."),
    4: target("Main Idea", 4, "Determine the main idea of a longer section or passage.", "Several related paragraphs with headings or connected details.", "Explain how multiple details support the main idea.", "Separate important details from smaller examples.", "State the main idea and explain how two details support it."),
    5: target("Main Idea", 5, "Summarize main ideas across sections or related texts.", "Longer passage or paired short texts with more than one important section.", "Use multiple details from different parts of the text.", "Synthesize important ideas and leave out minor details.", "Write or select a summary that combines the central idea with the most relevant details."),
    6: target("Main Idea", 6, "Analyze how a central idea develops across a full passage.", "Grade-level informational text with sections, examples, and shifts in focus.", "Trace details across the beginning, middle, and end.", "Explain how details build, refine, or clarify the central idea.", "Analyze how a central idea develops through specific evidence."),
    7: target("Main Idea", 7, "Analyze how two or more central ideas develop and interact.", "Multi-section informational text with related central ideas.", "Use evidence for more than one central idea.", "Explain relationships among central ideas, not just list them.", "Explain how central ideas interact and how details shape them."),
    8: target("Main Idea", 8, "Evaluate how central ideas are refined by evidence, structure, and purpose.", "Complex informational text with layered claims, counterpoints, or author emphasis.", "Use precise evidence tied to structure and purpose.", "Evaluate how the author refines or complicates the central idea.", "Explain how evidence, structure, and purpose work together to refine central ideas."),
  },
  Inference: {
    3: target("Inference", 3, "Use clear clues to figure out an unstated idea.", "Short passage with obvious clues.", "Use one stated clue.", "Connect clue plus common sense.", "Choose an inference that is directly supported by a clue."),
    4: target("Inference", 4, "Make an inference and support it with details.", "Longer passage with two clues leading to one idea.", "Use at least two details.", "Explain why the clues support the inference.", "Select an inference and the best supporting detail."),
    5: target("Inference", 5, "Make inferences from multiple details across a text.", "Longer text with clues in different sections.", "Use multiple details from different parts of the text.", "Avoid guesses by tying reasoning to evidence.", "Explain how several clues support an inference."),
    6: target("Inference", 6, "Infer implied meaning and support it with textual evidence.", "Grade-level passage with subtle implications.", "Cite evidence and explain the connection.", "Explain what the text implies but does not state.", "Make a defensible inference with evidence and explanation."),
    7: target("Inference", 7, "Infer motives, claims, bias, or deeper meaning.", "Text with layered character, author, or argument clues.", "Use precise evidence from across the text.", "Analyze why evidence matters and what it reveals.", "Explain an inference about meaning, motive, or viewpoint."),
    8: target("Inference", 8, "Evaluate complex inferences across structure, tone, and evidence.", "Complex text with competing clues or nuanced viewpoint.", "Weigh the strongest evidence.", "Distinguish supported inference from plausible but weak claims.", "Defend a complex inference using the most relevant evidence."),
  },
  "Text Evidence": {
    3: target("Text Evidence", 3, "Find a sentence or detail that answers a question.", "Short passage with explicit evidence.", "Use one directly stated detail.", "Match evidence to an answer.", "Choose the detail that proves the answer."),
    4: target("Text Evidence", 4, "Use details and examples to support an answer.", "Longer passage with related details.", "Use relevant details, not just nearby sentences.", "Explain how the detail supports the answer.", "Select evidence and explain its connection."),
    5: target("Text Evidence", 5, "Quote or paraphrase accurate evidence from the text.", "Longer text with multiple possible details.", "Choose the strongest evidence among related details.", "Explain why one detail is stronger than another.", "Use evidence accurately to support analysis."),
    6: target("Text Evidence", 6, "Cite textual evidence to support analysis and inference.", "Grade-level passage with explicit and implied ideas.", "Use precise evidence tied to a claim.", "Connect evidence to analysis.", "Explain how evidence proves a claim or inference."),
    7: target("Text Evidence", 7, "Use several pieces of evidence to support analysis.", "Complex text with multiple relevant details.", "Use evidence from different parts of a text.", "Analyze patterns across evidence.", "Use the strongest evidence to support a developed analysis."),
    8: target("Text Evidence", 8, "Evaluate which evidence most strongly supports analysis.", "Complex text with competing or nuanced evidence.", "Compare evidence quality and relevance.", "Explain why selected evidence is strongest.", "Defend analysis with precise and relevant evidence."),
  },
  Theme: {
    3: target("Theme", 3, "Identify the lesson or message in a story.", "Short story with a clear problem and solution.", "Use character actions and ending.", "State a complete lesson, not one word.", "Choose the theme and one supporting event."),
    4: target("Theme", 4, "Determine theme using key story details.", "Story with character change or repeated lesson clues.", "Use events and character response.", "Explain how events reveal the theme.", "Support the theme with details from the story."),
    5: target("Theme", 5, "Compare themes or explain how a theme develops.", "Story with layered conflict or related stories.", "Use events from different parts of the text.", "Explain how character choices develop the theme.", "Explain or compare theme using evidence."),
    6: target("Theme", 6, "Analyze how theme develops through plot and character.", "Literary text with conflict, change, and tension.", "Use evidence from conflict and resolution.", "Explain how events build the theme over time.", "Analyze theme development across the text."),
    7: target("Theme", 7, "Analyze theme interaction with story elements.", "Literary text with interacting setting, plot, and character choices.", "Use evidence from multiple story elements.", "Explain how story elements shape theme.", "Analyze how theme emerges and is shaped by the story."),
    8: target("Theme", 8, "Evaluate theme development and relationship to structure.", "Complex literary text with symbolism, shifts, or layered conflict.", "Use evidence from structure, dialogue, and events.", "Explain nuanced or multiple themes.", "Evaluate how the author develops theme through craft choices."),
  },
  "Point of View": {
    3: target("Point of View", 3, "Identify who is telling the story.", "Short story with clear first- or third-person pronouns.", "Use pronoun clues.", "Explain who knows or tells the events.", "Identify narrator point of view."),
    4: target("Point of View", 4, "Compare first- and third-person narration.", "Story excerpts with different narrators.", "Use pronouns and narrator knowledge.", "Explain how narration changes what readers know.", "Compare narrator perspective using evidence."),
    5: target("Point of View", 5, "Analyze how narrator or speaker point of view affects events.", "Story or poem with a clear speaker attitude.", "Use words, thoughts, and emphasized details.", "Explain how perspective shapes meaning.", "Analyze how point of view influences the reader's understanding."),
    6: target("Point of View", 6, "Explain how an author develops point of view.", "Text with clear narrator or author perspective.", "Use word choice and selected details.", "Explain how details reveal viewpoint.", "Analyze development of point of view."),
    7: target("Point of View", 7, "Analyze viewpoint, bias, and reliability.", "Text with limited or biased perspective.", "Use omitted and emphasized details.", "Evaluate how perspective shapes claims or events.", "Analyze viewpoint and possible bias."),
    8: target("Point of View", 8, "Evaluate conflicting viewpoints or narrator reliability.", "Complex text with multiple perspectives or unreliable narration.", "Compare evidence across viewpoints.", "Evaluate how viewpoint affects meaning and trust.", "Explain how conflicting perspectives shape interpretation."),
  },
  "Connotation and Figurative Language": {
    3: target("Connotation and Figurative Language", 3, "Recognize literal and nonliteral language.", "Short sentences with common idioms or simple comparisons.", "Use context clues.", "Explain what the phrase really means.", "Choose the meaning of a nonliteral phrase."),
    4: target("Connotation and Figurative Language", 4, "Interpret similes, metaphors, and word meaning.", "Short passage with figurative phrases in context.", "Use surrounding details.", "Explain the image or comparison.", "Explain what figurative language means in context."),
    5: target("Connotation and Figurative Language", 5, "Analyze figurative language, tone, and word relationships.", "Literary or informational passage with purposeful word choice.", "Use context and word relationships.", "Explain how words affect meaning or tone.", "Explain the effect of figurative language or word choice."),
    6: target("Connotation and Figurative Language", 6, "Determine figurative and connotative meanings.", "Grade-level passage with tone and imagery.", "Use context and phrase-level evidence.", "Explain effect on tone, mood, or meaning.", "Analyze how word choice affects meaning."),
    7: target("Connotation and Figurative Language", 7, "Analyze tone, mood, and deeper meaning.", "Text with nuanced language and implied tone.", "Use clusters of words and images.", "Explain how language shapes interpretation.", "Analyze tone and meaning created by language."),
    8: target("Connotation and Figurative Language", 8, "Evaluate symbolism, tone, and author purpose in word choice.", "Complex text with symbolic or layered language.", "Use precise word-choice evidence.", "Evaluate why the author chose specific language.", "Explain how language choices shape theme, tone, or purpose."),
  },
};

function target(
  skill: string,
  gradeLevel: number,
  cognitiveDemand: string,
  passageComplexity: string,
  evidenceDemand: string,
  reasoningDepth: string,
  masteryExpectation: string,
): SkillProgressionTarget {
  return { skill, gradeLevel, cognitiveDemand, passageComplexity, evidenceDemand, reasoningDepth, masteryExpectation };
}

export function getSkillProgression(skill: string, gradeLevel: number): SkillProgressionTarget {
  return progression[skill]?.[gradeLevel] || {
    skill,
    gradeLevel,
    cognitiveDemand: `Apply ${skill} at a Grade ${gradeLevel} level.`,
    passageComplexity: `Use Grade ${gradeLevel} text complexity and vocabulary.`,
    evidenceDemand: "Use relevant text evidence.",
    reasoningDepth: "Explain how the evidence supports the answer.",
    masteryExpectation: `Demonstrate Grade ${gradeLevel} mastery of ${skill}.`,
  };
}
