export type PssaSamplerPatternProfile = {
  gradeLevel: number;
  sourceName: string;
  sourceUrl: string;
  intendedUse: string;
  samplerStructure: string[];
  passageComplexitySignals: string[];
  questionLanguagePatterns: string[];
  gradeVocabularySignals: string[];
  dokPatterns: string[];
  distractorPatterns: string[];
  tdaPatterns: string[];
  conventionsPatterns: string[];
  technologyEnhancedPatterns?: string[];
};

const grade5Profile: PssaSamplerPatternProfile = {
  gradeLevel: 5,
  sourceName: "2023-2024 PSSA Grade 5 ELA Item and Scoring Sampler",
  sourceUrl: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2023%20pssa%20iss%20ela%20grade%205.pdf",
  intendedUse: "Style reference only: use for passage complexity, question wording, answer-choice patterns, vocabulary level, and TDA/conventions style. Do not use sampler item counts for test design.",
  samplerStructure: [
    "Two passages in the sampler: one informational passage with section headings and a diagram, one literary passage for TDA.",
    "Sampler structure is observed only to study how passages, item wording, and response formats are presented; it does not control generated test counts.",
    "Operational test design counts come only from the uploaded PCS PSSA Test Design PDF.",
  ],
  passageComplexitySignals: [
    "Informational text includes domain-specific vocabulary, headings, named sections, cause/effect, problem/solution, and a diagram.",
    "Literary text includes character interaction, conflict, dialogue, internal change, and theme.",
    "Students must connect prose with visual information when a chart or diagram appears.",
  ],
  questionLanguagePatterns: [
    "Based on the suffix/prefix/context, the word ___ means...",
    "Read the sentences from the passage. Which idea does the phrase ___ suggest?",
    "How are ___ related to each other?",
    "Which section of the passage has information most connected to the diagram/table?",
    "How does the diagram/table contribute to the reader's understanding?",
    "Which evidence from the passage best supports the generalization that ___?",
    "This question has two parts. Answer Part One and then answer Part Two.",
    "Part One: Which statement best expresses the main ideas of the passage?",
    "Part Two: Which evidence from the passage best supports the answer in Part One?",
  ],
  gradeVocabularySignals: [
    "suffix meaning",
    "figurative phrase in context",
    "domain-specific terms",
    "precise word choice",
    "frequently confused words",
  ],
  dokPatterns: [
    "DOK 1: affix or word-part meaning.",
    "DOK 2: phrase meaning, diagram contribution, and conventions in context.",
    "DOK 3: relationship among ideas, evidence supporting a generalization, EBSR main idea/evidence, and TDA analysis.",
  ],
  distractorPatterns: [
    "Distractors should be plausible but too narrow, too literal, unsupported, or based on a detail rather than the main idea.",
    "Vocabulary distractors should reflect literal misreadings or nearby-context confusion.",
    "Evidence distractors should be real passage details that do not support the stated conclusion.",
  ],
  tdaPatterns: [
    "Prompt names the passage and asks students to write an essay analyzing how interactions/events affect a character or idea.",
    "Prompt explicitly says to use evidence from the passage to support the response.",
    "Scoring emphasizes analytic understanding, organization, text evidence, explanation, precise language, and conventions.",
  ],
  conventionsPatterns: [
    "Which sentence correctly uses italics or quotation marks to indicate a title?",
    "Which conjunction should fill in the blank to correctly complete the sentence?",
    "Which sentence uses the underlined/frequently confused word correctly?",
  ],
  technologyEnhancedPatterns: [
    "Paired-passage checkbox table: students select boxes to show whether each statement is supported by passage 1, passage 2, or both passages.",
    "Selectable phrase evidence: students select two phrases in a paragraph that explain the meaning of a phrase in context.",
    "Relationship dropdowns: students choose phrases from drop-down lists to show sequence, cause/effect, or relationships between story events.",
    "Drag/drop correctly written source titles: students move the two correctly formatted source descriptions into a table.",
    "Comma placement drag/drop: students move commas onto blank lines to correctly punctuate a sentence.",
    "Selectable spelling-error word: students select the underlined word that is spelled incorrectly.",
    "Vocabulary/context drop-down completion: students choose words from drop-down lists to complete informational sentences.",
    "Directions should stay Grade 5 readable and action-focused: Select boxes in the table, Select the two phrases, Move the two sources, Move the commas, or Select the misspelled word.",
  ],
};

const grade6Profile: PssaSamplerPatternProfile = {
  gradeLevel: 6,
  sourceName: "2024-2025 PSSA Grade 6 ELA Item and Scoring Sampler",
  sourceUrl: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-6-item-sampler.pdf",
  intendedUse: "Style reference only: use for passage complexity, question wording, answer-choice patterns, vocabulary level, and TDA/conventions style. Do not use sampler item counts for test design.",
  samplerStructure: [
    "Two literary passages in the sampler: one chapter excerpt followed by passage-based MC/EBSR items, and one chapter excerpt followed by a TDA prompt.",
    "Sampler structure is observed only to study how passages, item wording, and response formats are presented; it does not control generated test counts.",
    "Operational test design counts come only from the uploaded PCS PSSA Test Design PDF.",
  ],
  passageComplexitySignals: [
    "Literary text includes context before the passage, character history, dialogue, internal reactions, and shifting emotions.",
    "Students must track how sentences, incidents, and character interactions contribute to plot and theme.",
    "Grade 6 complexity includes idioms, connotative language, objective summary, and evidence across different moments in the passage.",
  ],
  questionLanguagePatterns: [
    "Read the sentences from the passage. What does the use of ___ suggest about ___?",
    "Based on the passage, what does the word ___ reveal about ___?",
    "What does the phrase ___ suggest in the sentence?",
    "How do the sentences contribute to the plot?",
    "This question has two parts. Answer Part One and then answer Part Two.",
    "Part One: How does the character's impression of ___ change as ___?",
    "Part Two: Which evidence from the passage supports the answer in Part One? Choose two answers.",
    "Which description provides the best objective summary of the passage?",
  ],
  gradeVocabularySignals: [
    "idiom meaning",
    "connotation and reputation words",
    "phrase meaning in context",
    "objective summary language",
    "precise evidence from character reactions",
  ],
  dokPatterns: [
    "DOK 2: idiom/phrase meaning and objective summary.",
    "DOK 3: connotation tied to evidence, plot contribution, EBSR character change, conventions revision, and TDA theme analysis.",
  ],
  distractorPatterns: [
    "Distractors should be plausible but not reflect the idiom/connotation in context.",
    "Plot distractors may mention real details but not the most important contribution to the plot.",
    "Objective-summary distractors should be missing major events or include personal opinions.",
    "EBSR evidence distractors may relate to another character rather than the character named in Part One.",
  ],
  tdaPatterns: [
    "Prompt states a theme and asks students to write an essay analyzing how the narrator/character demonstrates that theme.",
    "Prompt explicitly says to use evidence from the passage to support the response.",
    "Scoring emphasizes analytic understanding of theme, evidence, explanation, organization, precise language, and conventions.",
  ],
  conventionsPatterns: [
    "Read the paragraph. Which revision would most improve the paragraph?",
    "Read the sentence. Which revision provides the most specific information?",
    "Read the paragraph. Which sentence contains an inappropriate shift in pronoun person?",
    "Read the paragraph. Which sentence has a vague pronoun?",
  ],
  technologyEnhancedPatterns: [
    "Released Grade 6 reading Select-to-Respond: students select three evidence sentences into an answer box to support why an experience was educational or important.",
    "Released Grade 6 paired-passage matching: students connect each passage title to one or more details from the passages.",
    "Released Grade 6 summary hot text: students read a summary and select the one sentence that should be added to make the summary complete.",
    "Released Grade 6 conventions inline drop-downs: students choose words from embedded drop-downs inside a paragraph to complete sentences correctly.",
    "Released Grade 6 conventions check table: students mark each sentence as formal/informal or correct/needs revision with one check per row.",
    "Released Grade 6 conventions blank-line completion: students choose the sentence that best fits the style of an article or paragraph.",
    "Evidence drag/drop for an editorial claim: students move two pieces of evidence from the passage into an empty box to support a stated claim.",
    "Paragraph-structure MC with enlarge support: students answer how a sentence connects to other details in a paragraph, with longer options shown in an enlarged response window.",
    "Paired passage/poem checkbox table: students select boxes to show whether each statement describes the prose passage, the poem, or both.",
    "Best-summary sequencing drag/drop: students move event sentences into blank lines in a table to complete the best summary of a passage; not all sentences are used.",
    "Style/register drag/drop: students move the sentence that best fits the style of a newspaper article or informational paragraph onto a blank line.",
    "Style-maintenance hot text: students select the sentence in a paragraph that should be revised to maintain the style of the paragraph.",
    "Vocabulary/context drop-down completion: students choose words from drop-down lists to complete an informational paragraph accurately.",
    "Directions should use Grade 6 complexity: Move two pieces of evidence, Select a box in each row, Move sentences to provide the best summary, or Select the sentence that should be revised.",
  ],
};

const grade7Profile: PssaSamplerPatternProfile = {
  gradeLevel: 7,
  sourceName: "2024-2025 PSSA Grade 7 ELA Item and Scoring Sampler",
  sourceUrl: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-7-item-sampler.pdf",
  intendedUse: "Style reference only: use for passage complexity, question wording, answer-choice patterns, vocabulary level, and TDA/conventions style. Do not use sampler item counts for test design.",
  samplerStructure: [
    "Two passages in the sampler: one informational passage with headings followed by MC/EBSR items, and one literary passage followed by a TDA prompt.",
    "Sampler structure is observed only to study how passages, item wording, and response formats are presented; it does not control generated test counts.",
    "Operational test design counts come only from the uploaded PCS PSSA Test Design PDF.",
  ],
  passageComplexitySignals: [
    "Informational text includes a real-world science/technology topic, section headings, technical vocabulary, historical context, and problem/solution development.",
    "Students must analyze how headings, examples, and cause/effect details develop central ideas across a longer informational passage.",
    "Literary text includes character disagreement, dialogue, theme development, and a key question or line that carries thematic meaning.",
  ],
  questionLanguagePatterns: [
    "Based on information in the passage, what does ___ mean?",
    "Which sentence from the passage best supports the inference that ___?",
    "How does the author develop the idea that ___?",
    "Which statement best describes how the section ___ contributes to the passage?",
    "This question has two parts. Answer Part One and then answer Part Two.",
    "Part One: Which statement best describes a central idea or conclusion from the passage?",
    "Part Two: Which evidence from the passage supports the answer in Part One? Choose two answers when directed.",
    "Read the sentence from the passage. Write an essay analyzing how the sentence relates to a theme in the passage.",
  ],
  gradeVocabularySignals: [
    "technical vocabulary in context",
    "Greek or Latin word-part meaning",
    "precise informational verbs",
    "frequently confused words",
    "theme and central-idea language",
  ],
  dokPatterns: [
    "DOK 2: vocabulary in context, punctuation, frequently confused words, and verb tense shifts.",
    "DOK 3: central idea development, section contribution, EBSR evidence, and TDA theme analysis.",
  ],
  distractorPatterns: [
    "Informational distractors may be true details but not the best support for the stated inference or central idea.",
    "Section-contribution distractors should be too broad, too narrow, or disconnected from the passage structure.",
    "EBSR evidence distractors may support a related idea but not the answer selected in Part One.",
    "TDA weaknesses often include summary without analysis or vague evidence that does not explain the theme connection.",
  ],
  tdaPatterns: [
    "Prompt begins with a sentence or question from the literary passage and asks students to analyze how it relates to a theme.",
    "Prompt explicitly says to use evidence from the passage to support the response.",
    "Scoring emphasizes analysis of theme, relevant evidence, explanation, organization, transitions, precise language, and conventions.",
  ],
  conventionsPatterns: [
    "Which sentence is punctuated correctly?",
    "Which underlined/frequently confused word is used correctly?",
    "Read the paragraph. Which sentence contains an inappropriate shift in verb tense?",
  ],
  technologyEnhancedPatterns: [
    "Revision drag/drop into a table: students choose the best updated version of a sentence after a phrase is added, checking modifier placement and sentence clarity.",
    "Formal-style hot text: students select the sentence in a paragraph that has or maintains a formal style.",
    "Grammar drop-down completion: students choose words from multiple drop-down lists to complete sentences with correct agreement and correlative conjunctions.",
    "Em dash placement drag/drop: students move each em dash onto blank lines to correctly set off a nonrestrictive element.",
    "Evidence selection drag/drop: students choose three sentences from a passage that best support a stated conclusion about the narrator or central idea.",
    "Summary-completion hot text: students read a summary and select the one sentence that needs to be added to make the summary complete.",
    "Informational characteristics checkbox table: students use details from a reliable source to match categories with characteristics in a multi-row table.",
    "Directions should use Grade 7 revision language: Move the best updated version, Select the sentence that has a formal style, Select the word from each drop-down list, or Move each em dash onto the lines.",
    "Directions should also model informational evidence tasks: Choose three answers, complete the table with check marks, or select the one sentence that makes the summary complete.",
    "Distractors should include informal wording, misplaced modifiers, agreement errors, incomplete summary details, and evidence statements that are true but do not support the required conclusion.",
  ],
};

const grade8Profile: PssaSamplerPatternProfile = {
  gradeLevel: 8,
  sourceName: "2024-2025 PSSA Grade 8 ELA Item and Scoring Sampler",
  sourceUrl: "https://www.pa.gov/content/dam/copapwp-pagov/en/education/documents/instruction/assessment-and-accountability/pssa/item-and-scoring-samples/2024-pssa-ela-grade-8-item-sampler.pdf",
  intendedUse: "Style reference only: use for passage complexity, question wording, answer-choice patterns, vocabulary level, and TDA/conventions style. Do not use sampler item counts for test design.",
  samplerStructure: [
    "Two passages in the sampler: one science-fiction literary passage followed by MC/EBSR items, and one passage followed by a TDA prompt.",
    "Sampler structure is observed only to study how passages, item wording, and response formats are presented; it does not control generated test counts.",
    "Operational test design counts come only from the uploaded PCS PSSA Test Design PDF.",
  ],
  passageComplexitySignals: [
    "Literary text can include speculative or science-fiction settings, technical terms, dialogue, problem-solving, and a sequence of discoveries.",
    "Students must track how incidents, dialogue, and character decisions propel action and change understanding across the passage.",
    "Grade 8 complexity includes precise word choice, conditional reasoning, point of view, EBSR evidence selection, and theme analysis tied to a key sentence or incident.",
  ],
  questionLanguagePatterns: [
    "Based on the passage, what does the word or phrase most likely mean?",
    "Which sentence from the passage best supports the inference that ___?",
    "How does a specific incident or line of dialogue affect the outcome of the passage?",
    "Which statement best describes how the character's point of view changes or is revealed?",
    "This question has two parts. Answer Part One and then answer Part Two.",
    "Part One: What can be concluded about the character, conflict, or central idea?",
    "Part Two: Which evidence from the passage supports the answer in Part One? Choose two answers when directed.",
    "Write an essay analyzing how a key sentence, question, or incident relates to a theme in the passage.",
  ],
  gradeVocabularySignals: [
    "science-fiction or technical vocabulary in context",
    "precise verbs and adjectives that reveal tone or character attitude",
    "conditional mood language",
    "partial quotation punctuation",
    "formal style and meaning-improving revisions",
  ],
  dokPatterns: [
    "DOK 2: vocabulary in context, conditional verb mood, quote punctuation, and conventions in formal writing.",
    "DOK 3: incident impact, point of view, EBSR evidence, theme connection, and TDA analysis.",
  ],
  distractorPatterns: [
    "Vocabulary distractors should be plausible literal meanings that miss the grade-level context.",
    "Plot/incident distractors may identify real events but not the event's effect on later action or outcome.",
    "Point-of-view distractors may describe what happens but not how the character understands or evaluates it.",
    "TDA distractors or weak responses often summarize the plot without analyzing how a key moment connects to theme.",
  ],
  tdaPatterns: [
    "Prompt asks students to analyze how a key sentence, question, or incident relates to a theme in the passage.",
    "Prompt explicitly says to use evidence from the passage to support the response.",
    "Scoring emphasizes theme analysis, relevant evidence, explanation, organization, precise language, and command of conventions.",
  ],
  conventionsPatterns: [
    "Maintaining the style of the paragraph, which revision most improves the meaning?",
    "Which words best complete the sentence using the correct conditional mood?",
    "Which sentence correctly punctuates the partial quote?",
  ],
};

const genericPssaPatternProfile: PssaSamplerPatternProfile = {
  gradeLevel: 0,
  sourceName: "General PCS PSSA ELA pattern. Add a grade-specific sampler to specialize this grade.",
  sourceUrl: "",
  intendedUse: "General style reference only. Test counts and reporting-category targets come from the uploaded PCS PSSA Test Design PDF.",
  samplerStructure: [
    "Uses the uploaded PCS PSSA ELA test design PDF for item counts and reporting categories.",
    "Uses grade-level PA Core standards for skill coverage.",
    "Does not borrow a different grade's sampler as the source pattern.",
  ],
  passageComplexitySignals: [
    "Passage length should match the grade-level target range.",
    "Informational texts should include text structure, domain vocabulary, and evidence-rich details.",
    "Literary texts should include character, setting, conflict, plot development, and theme.",
  ],
  questionLanguagePatterns: [
    "Which answer best...",
    "Which detail from the passage supports...",
    "What can be inferred...",
    "How does the author...",
    "What does the word or phrase mean as used in the passage?",
    "Which evidence best supports...",
  ],
  gradeVocabularySignals: [
    "context clues",
    "word meaning",
    "figurative/connotative meaning where grade appropriate",
    "domain-specific vocabulary where grade appropriate",
  ],
  dokPatterns: [
    "DOK 1: recall, word meaning, or basic conventions.",
    "DOK 2: explain meaning, relationship, or text feature contribution.",
    "DOK 3: analyze evidence, author choices, structure, and TDA where grade appropriate.",
  ],
  distractorPatterns: [
    "Distractors should be plausible and connected to common misunderstandings.",
    "Avoid answer choices that are obviously silly or unrelated.",
    "Evidence distractors may be real text details that do not support the target inference.",
  ],
  tdaPatterns: [
    "Grades 4-8 use TDA prompts that require analysis and text evidence.",
    "Grade 3 uses short-answer responses instead of TDA.",
  ],
  conventionsPatterns: [
    "Conventions items should be standalone and grade appropriate.",
    "Items should test usage, punctuation, capitalization, spelling, sentence formation, or word choice.",
  ],
  technologyEnhancedPatterns: [
    "Use TE formats to make students select, classify, move, or choose text-based evidence rather than only selecting A-D.",
    "Include clear practice-hint style directions that name the interaction: select, move, drag, choose from a list, select boxes, or clear the response.",
    "Keep the academic demand tied to the same PA Core standard; the technology interaction should not become the skill being tested.",
  ],
};

const genericProfiles: Record<number, PssaSamplerPatternProfile> = {
  3: {
    ...genericPssaPatternProfile,
    gradeLevel: 3,
    sourceName: "2024-2025 PSSA Grade 3 ELA Item and Scoring Sampler pattern",
    intendedUse:
      "Grade 3 style reference only. Use these sampler observations for passage complexity, item language, TE format patterns, and grade-level conventions style. Test counts come from the uploaded PCS PSSA Test Design PDF.",
    samplerStructure: [
      "Grade 3 uses passage-based MC, EBSR, short answer, conventions, and scaffolded technology-enhanced items. TDA begins in grade 4.",
      "Sampler items often place a readable passage pane beside a question pane, with short practice-hint directions that name the tool action.",
      "Grade 3 questions use simple labels such as Part One and Part Two for EBSR and use direct action language: select, choose, put a check mark, move, or use the drop-down menu.",
      "Technology-enhanced items are highly scaffolded and usually ask students to select evidence, complete a table, choose from a drop-down, or move short answer choices into a box or chart.",
    ],
    passageComplexitySignals: [
      "Literary passages should be short, concrete narratives with school, family, outdoor, animal, or friendship situations; include dialogue, inner thoughts, a clear problem, and a simple resolution.",
      "Grade 3 literary complexity should focus on character feelings, motivation, problem solving, sequence of events, and a central message that can be supported with details.",
      "Paired texts should be brief and related by a shared theme, event pattern, or topic so students can compare whether a detail appears in text 1, text 2, or both.",
      "Informational or procedural texts should use familiar topics, clear sequence, simple cause/effect, notes, lists, charts, or visuals students can inspect.",
      "Use mostly familiar vocabulary with occasional context-supported academic words; avoid dense abstraction, long clauses, or mature topics.",
    ],
    questionLanguagePatterns: [
      "She was able to wake up ___ than the rest of the children. Which word or words correctly complete the sentence?",
      "In the sentence, which word describes the building?",
      "Which underlined word should be changed to correct a mistake?",
      "Which sentence has a mistake in capitalization?",
      "Which detail from the passage best shows that ___?",
      "Why do ___ and the rest of the group most likely ___?",
      "Which words best describe ___? Choose two answers.",
      "What is the central message or theme of the passage?",
      "Which two details from the passage support the answer in Part One?",
      "Which word describes ___ in the sentence?",
      "In the phrase ___, what does ___ mean?",
      "Complete the table by putting check marks in the correct boxes to show if each event or detail is in passage 1, passage 2, or both.",
      "Put a check mark next to the three notes that best support the topic.",
      "Which change needs to be made to correct the error?",
      "Which word or words correctly complete the sentence?",
    ],
    gradeVocabularySignals: [
      "concrete school, family, animal, outdoor, food, notes, and simple project vocabulary",
      "basic character trait words such as kind, greedy, tough, talented, careful, curious, or boastful",
      "simple phrase-in-context meanings and common idioms used in child-friendly narrative situations",
      "comparative and superlative adjective/adverb forms",
      "spelling, homophones, title capitalization, and everyday descriptive words",
    ],
    dokPatterns: [
      "DOK 1: identify a spelling, capitalization, grammar, comparative form, descriptive word, or phrase meaning in a sentence.",
      "DOK 2: choose the detail that best supports a character trait, problem-solving idea, central message, or topic.",
      "DOK 2: compare paired texts by matching events, details, or statements to text 1, text 2, or both.",
      "DOK 3: answer a two-part theme or central-message item by selecting a claim and then selecting two supporting details.",
    ],
    distractorPatterns: [
      "Distractors should be concrete and familiar, but not the best proof for the question being asked.",
      "Evidence distractors can be true passage details that do not support the character trait, theme, or answer in Part One.",
      "Paired-text distractors should include details that appear in only one text when the correct answer requires both texts, or both texts when the item asks for one text.",
      "Conventions distractors should reflect common Grade 3 errors: wrong comparative form, wrong homophone, incorrect title capitalization, misspelling, or a word that is not actually descriptive.",
    ],
    tdaPatterns: ["Use short-answer reading responses for grade 3 instead of TDA prompts."],
    conventionsPatterns: [
      "Standalone sentence items should ask students to identify or correct one focused error.",
      "Comparative/superlative completion should use one blank in a familiar sentence and distractors that show common Grade 3 overcorrections, such as more earlier or most earliest.",
      "Descriptor-word questions should ask which word in a short sentence describes a noun, with choices pulled directly from the sentence.",
      "Underlined-word correction should underline several words in one sentence and ask which underlined word should be changed to correct a mistake.",
      "Title capitalization should present several sentences with underlined titles and ask which sentence has a mistake in capitalization.",
      "Use drop-down completion for spelling, verb tense, comparative/superlative forms, and basic grammar.",
      "Use underlined-word selection for capitalization, title capitalization, spelling, and homophone errors.",
      "Use short, familiar contexts and avoid multi-rule convention items that require advanced editing knowledge.",
    ],
    technologyEnhancedPatterns: [
      "DRC-style tool-hint presentation: practice hints may name the pointer, line guide, highlighter, cross-off, magnifier, or notepad; generated items should mimic the student action, not the browser chrome.",
      "Note-selection checklist: students put check marks next to three notes that best support a topic for a paragraph.",
      "Checklist notes should mix topic-supporting details with process details or off-topic details; the student must choose exactly three that best support the paragraph topic.",
      "Underlined-word MC: students select from underlined words in a sentence to identify the word that needs correction.",
      "Title-capitalization MC: students inspect underlined titles in four sentences and choose the sentence with a capitalization mistake.",
      "Inline dropdown completion: students choose the correct verb, verb phrase, or word ending to complete a sentence.",
      "Paired-text comparison matrix: students select boxes to show whether each event or statement is supported by passage 1, passage 2, or both.",
      "Select-to-respond enlarged table: students open a larger response panel for checkmark tables or drag/drop charts when the small preview is difficult to read.",
      "Drag/drop chart completion: students move two short sentences or details into a chart to show what happens in both passages.",
      "Hot-text evidence selection: students choose two sentences from a paragraph or passage section that show a central message or support a claim.",
      "Two-part EBSR: Part One asks for a central message, trait, or inference; Part Two asks for two details that support the Part One answer.",
      "Grouped narrative passage items: a short literary passage such as a school mystery should support several consecutive questions about character evidence, phrase meaning, most-likely reason, and EBSR evidence.",
      "Multi-select character trait item: students choose two words that best describe a character using passage evidence.",
      "Phrase-in-context MC: students identify what a simple phrase or idiom means in the passage.",
      "Selectable underlined word pairs: students select the correctly spelled word from each pair inside a short paragraph.",
      "Drag/drop phrase completion: students move the most descriptive phrase onto a blank line to complete a numbered sentence.",
      "Plural-ending dropdown table: students choose endings such as -s, -es, or no change for a list of words.",
      "Passage plus relationship dropdowns: students select phrases that show sequence or cause/effect relationships between events.",
      "Keep directions Grade 3 readable and action-focused: Read the sentence, Select the word, Move the phrase, Choose two answers, Put a check mark, or Select a box in each row.",
    ],
  },
  4: {
    ...genericPssaPatternProfile,
    gradeLevel: 4,
    sourceName: "PSSA Grade 4 ELA Item and Scoring Sampler pattern",
    intendedUse: "Grade 4 style reference only. Test counts come from the uploaded PCS PSSA Test Design PDF.",
    samplerStructure: [
      "Grade 4 begins TDA and uses passage-based MC, EBSR, TDA, technology-enhanced, and standalone conventions items.",
      "Literary passages often use realistic school or friendship conflicts, dialogue, inner thinking, clues, and a resolution that supports theme.",
      "Informational passages may be procedural and include diagrams, labels, numbered steps, safety details, and questions about how visuals support text.",
      "The online sampler presentation may include Page 1/Page 2, More overlays, Select to Enlarge, and tool hints; those are presentation patterns, not item-count rules.",
      "Whole-online Grade 4 forms can continue a passage across pages while the right pane shifts from Part One to Part Two; generated EBSR items should preserve that evidence chain without copying sampler text.",
    ],
    passageComplexitySignals: [
      "Literary text complexity should include character motivation, changing relationships, dialogue, internal thoughts, and enough plot development for theme and inference questions.",
      "Informational text complexity should include a clear sequence, labeled visuals or diagrams, cause/effect or purpose details, and domain vocabulary students can use with context clues.",
      "Grade 4 questions often ask for central theme, most likely reasons, meaning of words or phrases in context, supporting details, sequence, and text/visual relationships.",
    ],
    questionLanguagePatterns: [
      "This question has two parts. Answer Part One and then answer Part Two.",
      "Part One: What is the central theme of the passage?",
      "Part Two: Which two details from the passage support the answer in Part One? Choose two answers.",
      "Why do the characters most likely ___?",
      "In the phrase ___, what does ___ mean?",
      "The meaning of the root ___ helps the reader know that the word ___ means...",
      "How does the picture of ___ help to support the text in the passage?",
      "Why is it important to ___?",
    ],
    technologyEnhancedPatterns: [
      "Two-page EBSR: Part One asks theme, main idea, or inference; Part Two asks students to choose two supporting details from the passage.",
      "Checkbox evidence table: students mark which passage, source, or both support each statement.",
      "Select to Enlarge: long answer choices open in an enlarged pop-up for readability.",
      "Selectable phrase or sentence: students select the phrase, sentence, or underlined word that answers a vocabulary, evidence, or conventions question.",
      "Formal/informal style table: students classify sentences by style using check marks.",
      "Sequence drag/drop: students arrange events from a draft story in the order that makes the most sense.",
      "Drag/drop revision: students move the best revision or sentence into a table, blank line, or response area.",
      "Inline dropdowns: students complete sentences with the correct word, conjunction, relationship phrase, or verb form.",
      "Visual support item: students answer how a diagram or picture helps support a procedural text.",
      "Procedural visual item: students read numbered directions with a simple diagram, then answer how the picture supports a step, object, or purpose in the text.",
      "Conventions dropdown item: students choose conjunctions, relationship words, verb forms, or word choice inside a sentence.",
      "Conventions error-correction item: students choose the underlined word or change that corrects a spelling, capitalization, homophone, or usage error.",
      "Directions use Grade 4 action language: Select a box, Choose two answers, Move the sentence, Select the underlined word, or Select to Enlarge.",
    ],
    tdaPatterns: [
      "Grade 4 TDA prompts should ask students to explain how a character's actions, thoughts, or decisions support a theme or message.",
      "Prompts should require text evidence but use student-friendly wording and a manageable literary passage.",
    ],
    conventionsPatterns: [
      "Capitalization: identify a proper noun, place name, or title word that should begin with a capital letter.",
      "Homophones: choose the correction for words such as know/no or there/their.",
      "Informal language: identify a sentence that needs revision to maintain formal style.",
      "Style and tone: classify short sentences as formal or informal in a table.",
      "Conjunctions and dropdowns: choose words that correctly connect ideas in a sentence.",
      "Sentence revision: choose or move the best revision that adds detail, fixes clarity, or keeps the style consistent.",
      "Sequence: arrange events from a student draft in the order that makes the most sense.",
    ],
    distractorPatterns: [
      "Theme distractors may be true details from the story but not the central message.",
      "Evidence distractors should be real or realistic text details that do not support the selected answer.",
      "Vocabulary distractors should reflect literal meanings, nearby context words, or common confusion with similar words.",
      "Conventions distractors should each be plausible errors so students must apply the grammar or style rule.",
    ],
    gradeVocabularySignals: [
      "Use accessible Grade 4 academic words such as central theme, detail, support, phrase, root, picture, diagram, sequence, revise, formal, and informal.",
      "Avoid Grade 6-8 wording such as evaluate the author's technique unless the prompt scaffolds it in simpler Grade 4 language.",
    ],
    dokPatterns: [
      "DOK 1: identify a capitalization, spelling, homophone, or meaning-in-context answer.",
      "DOK 2: explain sequence, use context clues, classify style, or connect a picture to a detail.",
      "DOK 3: connect theme or inference to two supporting details in EBSR format.",
    ],
  },
  6: {
    ...grade6Profile,
  },
  7: {
    ...grade7Profile,
  },
  8: {
    ...grade8Profile,
  },
};

export function getSamplerPatternProfile(gradeLevel: number) {
  if (gradeLevel === 5) return grade5Profile;
  if (gradeLevel === 6) return grade6Profile;
  if (gradeLevel === 7) return grade7Profile;
  if (gradeLevel === 8) return grade8Profile;
  return genericProfiles[gradeLevel] || genericPssaPatternProfile;
}

export function samplerStemForGrade({
  gradeLevel,
  type,
  skill,
  passageTitle,
  passageType,
  itemIndex,
}: {
  gradeLevel: number;
  type: string;
  skill: string;
  passageTitle: string;
  passageType?: string;
  itemIndex: number;
}) {
  if (gradeLevel === 5) return gradeFiveSamplerStem({ type, skill, passageTitle, passageType, itemIndex });
  if (gradeLevel === 6) return gradeSixSamplerStem({ type, skill, passageTitle, passageType, itemIndex });
  if (gradeLevel === 7) return gradeSevenSamplerStem({ type, skill, passageTitle, passageType, itemIndex });
  if (gradeLevel === 8) return gradeEightSamplerStem({ type, skill, passageTitle, passageType, itemIndex });
  return null;
}

function gradeFiveSamplerStem({
  type,
  skill,
  passageTitle,
  passageType,
  itemIndex,
}: {
  type: string;
  skill: string;
  passageTitle: string;
  passageType?: string;
  itemIndex: number;
}) {
  if (type === "EBSR") {
    return {
      partAQuestion: `Which statement best expresses the main ideas of ${passageTitle}?`,
      partBQuestion: "Which evidence from the passage best supports the answer in Part One?",
    };
  }
  if (type === "TDA") {
    return `In the passage, the author shows how important interactions or events affect a character or central idea. Write an essay analyzing how those interactions or events affect the character or idea in ${passageTitle}. Use evidence from the passage to support your response.`;
  }
  if (skill === "Vocabulary") return `Based on the context of ${passageTitle}, what does the word or phrase most likely mean?`;
  if (skill === "Figurative Language") return `Read the sentences from the passage. Which idea does the figurative phrase suggest?`;
  if (passageType === "INFORMATIONAL_TABLE" && itemIndex % 2 === 0) return `How does the table or chart contribute to the reader's understanding of ${passageTitle}?`;
  if (passageType === "INFORMATIONAL_TABLE") return `Which section of the passage has information that is most connected to the table or chart?`;
  if (skill.includes("Inference")) return `Which evidence from the passage best supports the inference or generalization about ${passageTitle}?`;
  if (skill === "Main Idea") return `Which statement best expresses main ideas of ${passageTitle}?`;
  if (skill.includes("Text Structure")) return `How are the ideas or events in ${passageTitle} related to each other?`;
  return null;
}

function gradeSixSamplerStem({
  type,
  skill,
  passageTitle,
  itemIndex,
}: {
  type: string;
  skill: string;
  passageTitle: string;
  passageType?: string;
  itemIndex: number;
}) {
  if (type === "EBSR") {
    return {
      partAQuestion: `How does the character's impression or understanding change in ${passageTitle}?`,
      partBQuestion: "Which evidence from the passage supports the answer in Part One? Choose two answers.",
    };
  }
  if (type === "TDA") {
    return `A theme in ${passageTitle} is that self-discovery or understanding can be a difficult process. Write an essay analyzing how the narrator or character demonstrates this theme in the passage. Use evidence from the passage to support your response.`;
  }
  if (skill === "Vocabulary") return `Based on the passage, what does the word reveal about the character or idea in ${passageTitle}?`;
  if (skill === "Figurative Language") return itemIndex % 2 === 0
    ? `Read the sentences from the passage. What does the phrase suggest in the sentence?`
    : `Read the sentences from the passage. What does the use of the figurative phrase suggest about the character or situation?`;
  if (skill.includes("Plot")) return `How do the sentences or incidents contribute to the plot of ${passageTitle}?`;
  if (skill === "Main Idea" || skill.includes("Theme")) return `Which description provides the best objective summary of ${passageTitle}?`;
  if (skill.includes("Inference")) return `Which evidence from the passage best supports the inference about how the character changes in ${passageTitle}?`;
  if (skill === "Point of View") return `How does the narrator's point of view shape the reader's understanding of events in ${passageTitle}?`;
  if (skill.includes("Text Structure")) return `How does the structure of the passage contribute to the meaning of ${passageTitle}?`;
  return null;
}

function gradeSevenSamplerStem({
  type,
  skill,
  passageTitle,
  passageType,
  itemIndex,
}: {
  type: string;
  skill: string;
  passageTitle: string;
  passageType?: string;
  itemIndex: number;
}) {
  if (type === "EBSR") {
    return itemIndex % 2 === 0
      ? {
          partAQuestion: `Which statement best describes a central idea or conclusion in ${passageTitle}?`,
          partBQuestion: "Which evidence from the passage supports the answer in Part One?",
        }
      : {
          partAQuestion: `Which conclusion about the topic or character is best supported by ${passageTitle}?`,
          partBQuestion: "Which TWO details from the passage best support the answer in Part One?",
        };
  }
  if (type === "TDA") {
    return `Read an important sentence or question from ${passageTitle}. Write an essay analyzing how that sentence or question relates to a theme in the passage. Use evidence from the passage to support your response.`;
  }
  if (skill === "Vocabulary") return `Based on information in ${passageTitle}, what does the word or phrase most likely mean?`;
  if (skill === "Figurative Language") return `How does the author's word choice or figurative language affect meaning in ${passageTitle}?`;
  if (skill.includes("Inference")) return `Which sentence from the passage best supports the inference about ${passageTitle}?`;
  if (skill === "Main Idea" || skill.includes("Theme")) return `How does the author develop a central idea or theme in ${passageTitle}?`;
  if (skill.includes("Text Structure")) {
    if (passageType === "INFORMATIONAL_TABLE") return `How does the table, chart, or section structure contribute to the reader's understanding of ${passageTitle}?`;
    return `Which statement best describes how a section or part of ${passageTitle} contributes to the passage?`;
  }
  if (skill.includes("Plot")) return `How do story elements interact to develop the plot or theme in ${passageTitle}?`;
  if (skill.includes("Setting")) return `How does the setting interact with plot and character in ${passageTitle}?`;
  if (skill === "Point of View") return `How does the author's or narrator's point of view shape the reader's understanding of ${passageTitle}?`;
  return null;
}

function gradeEightSamplerStem({
  type,
  skill,
  passageTitle,
  passageType,
  itemIndex,
}: {
  type: string;
  skill: string;
  passageTitle: string;
  passageType?: string;
  itemIndex: number;
}) {
  if (type === "EBSR") {
    return itemIndex % 2 === 0
      ? {
          partAQuestion: `What can be concluded about the character, conflict, or central idea in ${passageTitle}?`,
          partBQuestion: "Which evidence from the passage supports the answer in Part One?",
        }
      : {
          partAQuestion: `Which statement best describes how a character's point of view or understanding changes in ${passageTitle}?`,
          partBQuestion: "Which TWO details from the passage best support the answer in Part One?",
        };
  }
  if (type === "TDA") {
    return `Write an essay analyzing how a key sentence, question, or incident in ${passageTitle} relates to a theme in the passage. Use evidence from the passage to support your response.`;
  }
  if (skill === "Vocabulary") return `Based on ${passageTitle}, what does the word or phrase most likely mean in context?`;
  if (skill === "Figurative Language") return `How does the author's precise word choice or figurative language affect tone or meaning in ${passageTitle}?`;
  if (skill.includes("Inference")) return `Which sentence from the passage best supports the inference about ${passageTitle}?`;
  if (skill === "Main Idea" || skill.includes("Theme")) return `Which statement best analyzes how a theme or central idea is developed in ${passageTitle}?`;
  if (skill.includes("Text Structure")) {
    if (passageType === "INFORMATIONAL_TABLE") return `How does the table, chart, or section structure affect the reader's understanding of ${passageTitle}?`;
    return `How does the structure of ${passageTitle} affect meaning or build toward the outcome?`;
  }
  if (skill.includes("Plot")) return `How does a specific incident or line of dialogue propel the action or affect the outcome in ${passageTitle}?`;
  if (skill.includes("Setting")) return `How does the setting shape the conflict, character decisions, or meaning in ${passageTitle}?`;
  if (skill === "Point of View") return `Which statement best describes how point of view shapes the reader's understanding of ${passageTitle}?`;
  return null;
}
