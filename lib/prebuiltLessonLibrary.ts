import type { Prisma, PrismaClient } from "@prisma/client";
import { getSkillProgression } from "./gradeSkillProgression";

type PracticeQuestion = {
  question: string;
  choices: string[];
  correctAnswer: string;
  explanation: string;
  passage?: string;
  coachHint?: string;
};

type LessonSeed = {
  gradeLevel: number;
  standardCode: string;
  standardLabel: string;
  skill: string;
  title: string;
  domain: string;
  lessonExplanation: string;
  workedExample: string;
  guidedPractice: PracticeQuestion[];
  independentPractice: PracticeQuestion[];
  exitTicket: PracticeQuestion[];
  masteryCheck: PracticeQuestion[];
  retestRecommendation: string;
};

const LIBRARY_USER_EMAIL = "lesson-library-agent@pssa.local";
const LIBRARY_ASSESSMENT_TITLE = "AI Prebuilt Lesson Library";

const gradeStandards: Record<number, Record<string, string>> = {
  3: {
    literature: "CC.1.3.3.A",
    informational: "CC.1.2.3.A",
    vocabulary: "CC.1.2.3.F",
    conventions: "CC.1.4.3.F",
    tda: "CC.1.4.3.S",
  },
  4: {
    literature: "CC.1.3.4.A",
    informational: "CC.1.2.4.A",
    vocabulary: "CC.1.2.4.F",
    conventions: "CC.1.4.4.F",
    tda: "CC.1.4.4.S",
  },
  5: {
    literature: "CC.1.3.5.A",
    informational: "CC.1.2.5.A",
    vocabulary: "CC.1.2.5.F",
    conventions: "CC.1.4.5.F",
    tda: "CC.1.4.5.S",
  },
  6: {
    literature: "CC.1.3.6.A",
    informational: "CC.1.2.6.A",
    vocabulary: "CC.1.2.6.F",
    conventions: "CC.1.4.6.F",
    tda: "CC.1.4.6.S",
  },
  7: {
    literature: "CC.1.3.7.A",
    informational: "CC.1.2.7.A",
    vocabulary: "CC.1.2.7.F",
    conventions: "CC.1.4.7.F",
    tda: "CC.1.4.7.S",
  },
  8: {
    literature: "CC.1.3.8.A",
    informational: "CC.1.2.8.A",
    vocabulary: "CC.1.2.8.F",
    conventions: "CC.1.4.8.F",
    tda: "CC.1.4.8.S",
  },
};

const skillStandardOverrides: Record<number, Record<string, { code: string; label: string }>> = {
  3: {
    "Main Idea": { code: "CC.1.2.3.A", label: "Determine main idea and recount key details" },
    "Text Evidence": { code: "CC.1.2.3.B", label: "Ask and answer questions using text evidence" },
    "Inference": { code: "CC.1.2.3.B", label: "Make inferences using text evidence" },
    "Text Features": { code: "CC.1.2.3.E", label: "Use text features to locate and interpret information" },
    "Author's Purpose": { code: "CC.1.2.3.E", label: "Identify author's purpose and point of view clues" },
    "Compare and Contrast": { code: "CC.1.2.3.I", label: "Compare and contrast important points and details" },
    "Cause and Effect": { code: "CC.1.2.3.C", label: "Describe relationships between events, ideas, and concepts" },
    "Theme": { code: "CC.1.3.3.A", label: "Determine theme, message, or lesson" },
    "Story Elements": { code: "CC.1.3.3.C", label: "Describe characters, setting, and events" },
    "Character Traits and Actions": { code: "CC.1.3.3.C", label: "Describe characters and explain how actions affect events" },
    "Sequence of Events": { code: "CC.1.3.3.C", label: "Describe how story events build in sequence" },
    "Point of View": { code: "CC.1.3.3.D", label: "Explain point of view and narrator perspective" },
    "Poetry Lines and Stanzas": { code: "CC.1.3.3.E", label: "Refer to parts of stories, poems, and dramas" },
    "Connotation and Figurative Language": { code: "CC.1.3.3.F", label: "Determine literal and nonliteral meanings" },
    "Context Clues": { code: "CC.1.2.3.F", label: "Determine word meaning using context" },
    "Prefixes and Suffixes": { code: "CC.1.2.3.F", label: "Use word parts to determine meaning" },
    "Synonyms and Antonyms": { code: "CC.1.2.3.F", label: "Use word relationships to determine meaning" },
    "Short and Long Vowel Patterns": { code: "CC.1.1.3.D", label: "Read grade-level words with common vowel patterns" },
    "Multisyllable Word Parts": { code: "CC.1.1.3.D", label: "Decode multisyllable words using word parts" },
    "Complete Sentences": { code: "CC.1.4.3.F", label: "Demonstrate command of sentence conventions" },
    "Commas in a Series": { code: "CC.1.4.3.F", label: "Use commas and punctuation correctly" },
    "Capitalization and Titles": { code: "CC.1.4.3.F", label: "Use capitalization and title conventions" },
    "Paragraph Organization": { code: "CC.1.4.3.C", label: "Develop writing with organization and details" },
    "Opinion Reasons": { code: "CC.1.4.3.G", label: "Support opinion writing with reasons" },
    "TDA Evidence and Explanation": { code: "CC.1.4.3.S", label: "Use evidence and explanation in text-dependent writing" },
  },
  4: {
    "Main Idea": { code: "CC.1.2.4.A", label: "Determine main idea and explain key details" },
    "Combine Main Ideas Across Texts": { code: "CC.1.2.4.A", label: "Combine main ideas and details across texts" },
    "Text Evidence": { code: "CC.1.2.4.B", label: "Cite relevant details and examples from text" },
    "Inference": { code: "CC.1.2.4.B", label: "Make inferences using text evidence" },
    "Inference with Supporting Details": { code: "CC.1.2.4.B", label: "Make inferences and support them with details" },
    "Problem and Solution Text Structure": { code: "CC.1.2.4.E", label: "Describe text structure and organization" },
    "Graphic Organizers": { code: "CC.1.2.4.E", label: "Interpret information from visual text features" },
    "Author's Purpose and Message": { code: "CC.1.2.4.D", label: "Compare accounts and explain author's purpose" },
    "Argumentative Text Clues": { code: "CC.1.2.4.G", label: "Explain reasons and evidence supporting points" },
    "Theme": { code: "CC.1.3.4.A", label: "Determine theme and summarize key details" },
    "Compare Characters": { code: "CC.1.3.4.C", label: "Describe characters in depth using text evidence" },
    "Point of View": { code: "CC.1.3.4.D", label: "Compare points of view and perspectives" },
    "Plot Elements": { code: "CC.1.3.4.C", label: "Describe plot events and character responses" },
    "Sensory Details": { code: "CC.1.3.4.F", label: "Determine meaning and effect of words and phrases" },
    "Rhyme Scheme and Poetry Elements": { code: "CC.1.3.4.E", label: "Explain structural elements of poems" },
    "Connotation and Figurative Language": { code: "CC.1.3.4.F", label: "Interpret figurative language in context" },
    "Similes and Metaphors": { code: "CC.1.3.4.F", label: "Interpret similes, metaphors, and figurative language" },
    "Allusion Meaning": { code: "CC.1.3.4.F", label: "Determine meaning of words, phrases, and references" },
    "Greek and Latin Roots": { code: "CC.1.2.4.F", label: "Use roots and affixes to determine word meaning" },
    "Homophones and Multiple-Meaning Words": { code: "CC.1.2.4.F", label: "Use context to determine word meaning" },
    "Dictionary and Thesaurus Skills": { code: "CC.1.2.4.F", label: "Use reference materials to clarify meaning" },
    "Summarizing Stories": { code: "CC.1.4.4.A", label: "Write clear summaries with relevant details" },
    "Transitions and Linking Words": { code: "CC.1.4.4.C", label: "Organize writing with linking words and transitions" },
    "Facts and Opinions": { code: "CC.1.4.4.I", label: "Use facts and details to develop writing" },
    "Supporting Reasons": { code: "CC.1.4.4.G", label: "Support opinion writing with reasons and evidence" },
    "Spelling with Affixes": { code: "CC.1.4.4.F", label: "Demonstrate command of spelling and conventions" },
    "TDA Evidence and Explanation": { code: "CC.1.4.4.S", label: "Use evidence and explanation in text-dependent writing" },
  },
  5: {
    "Main Idea": { code: "CC.1.2.5.A", label: "Determine main ideas and summarize key details" },
    "Text Evidence": { code: "CC.1.2.5.B", label: "Cite textual evidence to support analysis" },
    "Inference": { code: "CC.1.2.5.B", label: "Make inferences supported by text evidence" },
    "Theme": { code: "CC.1.3.5.A", label: "Determine theme and summarize literary text" },
    "Point of View": { code: "CC.1.3.5.D", label: "Analyze narrator or speaker point of view" },
    "Connotation and Figurative Language": { code: "CC.1.3.5.F", label: "Interpret figurative language and word meaning" },
    "Compare Themes Across Stories": { code: "CC.1.3.5.H", label: "Compare stories in the same genre on themes and topics" },
    "Character Response and Plot": { code: "CC.1.3.5.C", label: "Compare characters, settings, and events using details" },
    "Story Structure and Chapters": { code: "CC.1.3.5.E", label: "Explain how chapters, scenes, or stanzas fit together" },
    "Poetry Speaker and Tone": { code: "CC.1.3.5.F", label: "Analyze word choice, tone, and speaker meaning" },
    "Multiple Accounts of the Same Event": { code: "CC.1.2.5.D", label: "Analyze multiple accounts of the same event or topic" },
    "Chronology and Sequence Text Structure": { code: "CC.1.2.5.E", label: "Use text structure to interpret information" },
    "Reasons and Evidence in Arguments": { code: "CC.1.2.5.G", label: "Explain how reasons and evidence support points" },
    "Integrating Information from Sources": { code: "CC.1.2.5.I", label: "Integrate information from several texts on the same topic" },
    "Academic and Domain-Specific Vocabulary": { code: "CC.1.2.5.F", label: "Determine academic and domain-specific word meaning" },
    "Greek and Latin Affixes and Roots": { code: "CC.1.2.5.F", label: "Use roots and affixes to determine word meaning" },
    "Analogies and Word Relationships": { code: "CC.1.2.5.F", label: "Use word relationships to deepen understanding" },
    "Combining Sentences": { code: "CC.1.4.5.F", label: "Use conventions to produce clear sentences" },
    "Commas and Introductory Elements": { code: "CC.1.4.5.F", label: "Use commas and punctuation correctly" },
    "Verb Tense Consistency": { code: "CC.1.4.5.F", label: "Maintain consistent verb tense in writing" },
    "Opinion Essay Organization": { code: "CC.1.4.5.G", label: "Write opinion pieces with reasons and evidence" },
    "Informative Essay Development": { code: "CC.1.4.5.A", label: "Write informative texts with facts and details" },
    "Narrative Techniques": { code: "CC.1.4.5.M", label: "Use narrative techniques to develop experiences" },
    "TDA Evidence and Explanation": { code: "CC.1.4.5.S", label: "Use evidence and explanation in text-dependent writing" },
  },
  6: {
    "Main Idea": { code: "CC.1.2.6.A", label: "Analyze central idea development and summary" },
    "Text Evidence": { code: "CC.1.2.6.B", label: "Cite textual evidence to support analysis" },
    "Inference": { code: "CC.1.2.6.B", label: "Make inferences supported by textual evidence" },
    "Theme": { code: "CC.1.3.6.A", label: "Determine theme or central idea and summarize" },
    "Point of View": { code: "CC.1.3.6.D", label: "Explain how point of view is developed" },
    "Connotation and Figurative Language": { code: "CC.1.3.6.F", label: "Analyze figurative, connotative, and technical meanings" },
    "Central Idea Development": { code: "CC.1.2.6.A", label: "Analyze how a central idea is developed" },
    "Objective Summary": { code: "CC.1.2.6.A", label: "Summarize without opinion using key details" },
    "Text Structure and Author Organization": { code: "CC.1.2.6.E", label: "Analyze how structure organizes ideas" },
    "Claims, Reasons, and Evidence": { code: "CC.1.2.6.G", label: "Trace and evaluate claims, reasons, and evidence" },
    "Author's Purpose and Point of View": { code: "CC.1.2.6.D", label: "Determine author's purpose or point of view" },
    "Compare Text Presentations": { code: "CC.1.2.6.I", label: "Compare how texts present similar information" },
    "Technical Vocabulary in Context": { code: "CC.1.2.6.F", label: "Determine technical and academic word meanings" },
    "Tone and Connotation": { code: "CC.1.2.6.F", label: "Analyze connotation and tone in word choice" },
    "Plot Development in Episodes": { code: "CC.1.3.6.C", label: "Analyze how plot unfolds through episodes" },
    "Character Change and Conflict": { code: "CC.1.3.6.C", label: "Analyze character response and conflict" },
    "Story Structure and Flashback": { code: "CC.1.3.6.E", label: "Analyze how structure contributes to meaning" },
    "Theme Development": { code: "CC.1.3.6.A", label: "Analyze theme development with evidence" },
    "Pronoun Case and Agreement": { code: "CC.1.4.6.F", label: "Demonstrate command of pronoun conventions" },
    "Shifts in Pronoun Person and Number": { code: "CC.1.4.6.F", label: "Maintain pronoun consistency in writing" },
    "Commas, Parentheses, and Dashes": { code: "CC.1.4.6.F", label: "Use punctuation to set off elements" },
    "Varying Sentence Patterns": { code: "CC.1.4.6.F", label: "Use sentence variety for meaning and style" },
    "Argument Essay Evidence": { code: "CC.1.4.6.G", label: "Write arguments with clear reasons and evidence" },
    "Informative Essay Organization": { code: "CC.1.4.6.A", label: "Write informative texts with organized ideas" },
    "Research Source Integration": { code: "CC.1.4.6.V", label: "Conduct short research and integrate sources" },
    "TDA Evidence and Explanation": { code: "CC.1.4.6.S", label: "Use evidence and analysis in text-dependent writing" },
  },
  7: {
    "Main Idea": { code: "CC.1.2.7.A", label: "Analyze central idea development and objective summary" },
    "Text Evidence": { code: "CC.1.2.7.B", label: "Cite several pieces of textual evidence to support analysis" },
    "Inference": { code: "CC.1.2.7.B", label: "Draw inferences supported by multiple text details" },
    "Theme": { code: "CC.1.3.7.A", label: "Analyze theme development and provide summary" },
    "Point of View": { code: "CC.1.3.7.D", label: "Analyze how point of view shapes a text" },
    "Connotation and Figurative Language": { code: "CC.1.3.7.F", label: "Analyze figurative, connotative, and technical meanings" },
    "Central Idea Across Sections": { code: "CC.1.2.7.A", label: "Analyze central idea development across sections" },
    "Text Structure Effects": { code: "CC.1.2.7.E", label: "Analyze how text structure develops ideas" },
    "Argument Claim Strength": { code: "CC.1.2.7.G", label: "Evaluate claims, reasons, and evidence" },
    "Compare Authors on the Same Topic": { code: "CC.1.2.7.I", label: "Compare how authors present similar topics" },
    "Author Purpose and Rhetorical Choices": { code: "CC.1.2.7.D", label: "Analyze author's purpose and point of view" },
    "Data and Visual Information": { code: "CC.1.2.7.E", label: "Analyze text features and visual information" },
    "Precise Academic Vocabulary": { code: "CC.1.2.7.F", label: "Determine academic and domain-specific meanings" },
    "Mood, Tone, and Word Choice": { code: "CC.1.3.7.F", label: "Analyze how word choice affects meaning and tone" },
    "Plot Lines and Conflict Development": { code: "CC.1.3.7.C", label: "Analyze interaction of story elements" },
    "Character Motivation and Theme": { code: "CC.1.3.7.C", label: "Analyze character interaction and theme development" },
    "Narrator Reliability and Perspective": { code: "CC.1.3.7.D", label: "Analyze narrator point of view and perspective" },
    "Poetry Structure and Meaning": { code: "CC.1.3.7.E", label: "Analyze how structure contributes to meaning" },
    "Misplaced and Dangling Modifiers": { code: "CC.1.4.7.F", label: "Use modifiers clearly and correctly" },
    "Phrases and Clauses": { code: "CC.1.4.7.F", label: "Use phrases and clauses for clear writing" },
    "Comma Use with Coordinate Adjectives": { code: "CC.1.4.7.F", label: "Apply grade-level punctuation conventions" },
    "Formal Style and Precise Language": { code: "CC.1.4.7.F", label: "Maintain formal style and precise language" },
    "Argument Counterclaim Response": { code: "CC.1.4.7.G", label: "Write arguments with claims, reasons, and counterclaims" },
    "Informative Writing with Transitions": { code: "CC.1.4.7.A", label: "Write informative texts with clear organization" },
    "Research Questions and Source Notes": { code: "CC.1.4.7.V", label: "Conduct short research and gather relevant information" },
    "TDA Evidence and Explanation": { code: "CC.1.4.7.S", label: "Use evidence and analysis in text-dependent writing" },
  },
  8: {
    "Main Idea": { code: "CC.1.2.8.A", label: "Analyze central idea development and objective summary" },
    "Text Evidence": { code: "CC.1.2.8.B", label: "Cite the strongest textual evidence to support analysis" },
    "Inference": { code: "CC.1.2.8.B", label: "Draw inferences supported by strong textual evidence" },
    "Theme": { code: "CC.1.3.8.A", label: "Analyze theme development and relationships" },
    "Point of View": { code: "CC.1.3.8.D", label: "Analyze how point of view creates effects" },
    "Connotation and Figurative Language": { code: "CC.1.3.8.F", label: "Analyze figurative, connotative, and technical meanings" },
    "Multiple Central Ideas": { code: "CC.1.2.8.A", label: "Analyze multiple central ideas and their development" },
    "Compare Text Structures": { code: "CC.1.2.8.E", label: "Analyze and compare text structures" },
    "Trace and Evaluate Arguments": { code: "CC.1.2.8.G", label: "Trace and evaluate argument and evidence" },
    "Logical Fallacies and Appeals": { code: "CC.1.2.8.G", label: "Evaluate reasoning, appeals, and fallacies" },
    "Conflicting Information Across Texts": { code: "CC.1.2.8.I", label: "Analyze conflicting information across texts" },
    "Author Perspective and Bias": { code: "CC.1.2.8.D", label: "Analyze author's point of view and bias" },
    "Visual and Quantitative Evidence": { code: "CC.1.2.8.E", label: "Analyze visual and quantitative information" },
    "Figurative Language Effect": { code: "CC.1.3.8.F", label: "Analyze the effect of figurative language" },
    "Multiple Themes in Literature": { code: "CC.1.3.8.A", label: "Analyze multiple themes and their development" },
    "Dialogue and Characterization": { code: "CC.1.3.8.C", label: "Analyze dialogue and incidents that reveal character" },
    "Dramatic Irony and Suspense": { code: "CC.1.3.8.C", label: "Analyze literary elements and plot effects" },
    "Compare Genres on Similar Themes": { code: "CC.1.3.8.H", label: "Compare texts across genres on themes and patterns" },
    "Verb Moods and Voice": { code: "CC.1.4.8.F", label: "Use verbs in active/passive voice and mood" },
    "Parallel Structure": { code: "CC.1.4.8.F", label: "Use parallel structure for clarity and style" },
    "Ellipses, Dashes, and Punctuation Effects": { code: "CC.1.4.8.F", label: "Apply punctuation for clarity and effect" },
    "Formal Academic Style": { code: "CC.1.4.8.F", label: "Maintain formal academic style and precise language" },
    "Argument with Counterclaims and Evidence": { code: "CC.1.4.8.G", label: "Write arguments with claims, counterclaims, and evidence" },
    "Informative Synthesis Writing": { code: "CC.1.4.8.A", label: "Write informative texts that synthesize ideas" },
    "Research Source Credibility": { code: "CC.1.4.8.V", label: "Assess source credibility and integrate research" },
    "TDA Evidence and Explanation": { code: "CC.1.4.8.S", label: "Use strong evidence and analysis in text-dependent writing" },
  },
};

export async function seedPrebuiltLessonLibrary(db: PrismaClient) {
  const libraryPath = await getOrCreateLibraryPath(db);
  const seeds = buildPrebuiltLessonSeeds();
  let created = 0;
  let existing = 0;

  for (const [index, seed] of seeds.entries()) {
    const duplicate = await db.learningLesson.findFirst({
      where: {
        learningPathId: libraryPath.id,
        gradeLevel: seed.gradeLevel,
        skill: seed.skill,
        title: seed.title,
        generatedBy: "PREBUILT_AI_LIBRARY",
      },
      select: { id: true },
    });
    if (duplicate) {
      existing += 1;
      continue;
    }

    await db.learningLesson.create({
      data: {
        learningPathId: libraryPath.id,
        gradeLevel: seed.gradeLevel,
        standardCode: seed.standardCode,
        standardLabel: seed.standardLabel,
        skill: seed.skill,
        priority: index + 1,
        title: seed.title,
        whyAssigned: `This prebuilt lesson targets ${seed.skill} for Grade ${seed.gradeLevel} and can be assigned before or after a diagnostic.`,
        lessonExplanation: seed.lessonExplanation,
        workedExample: seed.workedExample,
        resourceTitle: "Teacher-created support recommended",
        resourceProvider: "Lesson Creator Agent",
        resourceDescription: "Reusable AI lesson library item with guided practice, independent practice, and mastery check.",
        guidedPractice: seed.guidedPractice as Prisma.InputJsonValue,
        independentPractice: seed.independentPractice as Prisma.InputJsonValue,
        exitTicket: seed.exitTicket as Prisma.InputJsonValue,
        masteryCheck: seed.masteryCheck as Prisma.InputJsonValue,
        retestRecommendation: seed.retestRecommendation,
        generatedBy: "PREBUILT_AI_LIBRARY",
        aiStatus: "COMPLETED",
        sourcePayload: {
          source: "prebuilt_lesson_creator_agent",
          progressionTarget: getSkillProgression(seed.skill, seed.gradeLevel),
          domain: seed.domain,
          gradeLevel: seed.gradeLevel,
          standardCode: seed.standardCode,
          skill: seed.skill,
        },
        items: {
          create: buildLessonItems(seed).map((item) => ({
            ...item,
            content: item.content as Prisma.InputJsonValue,
          })),
        },
      },
    });
    created += 1;
  }

  return { created, existing, total: seeds.length };
}

export async function repairPrebuiltLessonStandards(db: PrismaClient) {
  const seeds = buildPrebuiltLessonSeeds();
  let updated = 0;
  for (const seed of seeds) {
    const result = await db.learningLesson.updateMany({
      where: {
        generatedBy: "PREBUILT_AI_LIBRARY",
        gradeLevel: seed.gradeLevel,
        skill: seed.skill,
        title: seed.title,
      },
      data: {
        standardCode: seed.standardCode,
        standardLabel: seed.standardLabel,
      },
    });
    updated += result.count;
  }
  return { updated };
}

export async function repairPrebuiltLessonContent(db: PrismaClient) {
  const seeds = buildPrebuiltLessonSeeds();
  let updated = 0;
  for (const seed of seeds) {
    const lessons = await db.learningLesson.findMany({
      where: {
        generatedBy: "PREBUILT_AI_LIBRARY",
        gradeLevel: seed.gradeLevel,
        skill: seed.skill,
        title: seed.title,
      },
      select: { id: true },
    });
    for (const lesson of lessons) {
      await db.learningLesson.update({
        where: { id: lesson.id },
        data: {
          standardCode: seed.standardCode,
          standardLabel: seed.standardLabel,
          lessonExplanation: seed.lessonExplanation,
          workedExample: seed.workedExample,
          guidedPractice: seed.guidedPractice as Prisma.InputJsonValue,
          independentPractice: seed.independentPractice as Prisma.InputJsonValue,
          exitTicket: seed.exitTicket as Prisma.InputJsonValue,
          masteryCheck: seed.masteryCheck as Prisma.InputJsonValue,
          retestRecommendation: seed.retestRecommendation,
          sourcePayload: {
            source: "prebuilt_lesson_creator_agent",
            progressionTarget: getSkillProgression(seed.skill, seed.gradeLevel),
            domain: seed.domain,
            gradeLevel: seed.gradeLevel,
            standardCode: seed.standardCode,
            skill: seed.skill,
          },
        },
      });
      await db.learningLessonItem.deleteMany({ where: { lessonId: lesson.id } });
      await db.learningLessonItem.createMany({
        data: buildLessonItems(seed).map((item) => ({
          lessonId: lesson.id,
          itemType: item.itemType,
          title: item.title,
          content: item.content as Prisma.InputJsonValue,
          order: item.order,
        })),
      });
      updated += 1;
    }
  }
  return { updated };
}

async function getOrCreateLibraryPath(db: PrismaClient) {
  const user = await db.user.upsert({
    where: { email: LIBRARY_USER_EMAIL },
    update: { name: "Lesson Creator Agent", role: "ADMIN" },
    create: {
      email: LIBRARY_USER_EMAIL,
      name: "Lesson Creator Agent",
      role: "ADMIN",
    },
  });

  let assessment = await db.assessment.findFirst({
    where: { title: LIBRARY_ASSESSMENT_TITLE, subject: "ELA" },
  });
  if (!assessment) {
    assessment = await db.assessment.create({
      data: {
        title: LIBRARY_ASSESSMENT_TITLE,
        subject: "ELA",
        state: "PA",
        grade: 6,
        isAdaptive: false,
      },
    });
  }

  let testSession = await db.testSession.findFirst({
    where: { userId: user.id, assessmentId: assessment.id },
    include: { learningPath: true },
  });
  if (!testSession) {
    testSession = await db.testSession.create({
      data: {
        userId: user.id,
        assessmentId: assessment.id,
        submittedAt: new Date(),
        scorePercent: 0,
        totalPoints: 0,
        earnedPoints: 0,
        proficiencyBand: "LIBRARY",
      },
      include: { learningPath: true },
    });
  }

  if (testSession.learningPath) return testSession.learningPath;
  return db.learningPath.create({
    data: {
      sessionId: testSession.id,
      generatedBy: "PREBUILT_AI_LIBRARY",
      aiStatus: "COMPLETED",
      aiSummary: "Reusable lessons generated for the teacher lesson library.",
    },
  });
}

function buildPrebuiltLessonSeeds(): LessonSeed[] {
  const grades = [3, 4, 5, 6, 7, 8];
  const coreLessons = grades.flatMap((gradeLevel) => [
    readingLesson(gradeLevel, "Main Idea", "informational"),
    readingLesson(gradeLevel, "Inference", "informational"),
    readingLesson(gradeLevel, "Text Evidence", "informational"),
    readingLesson(gradeLevel, "Theme", "literature"),
    readingLesson(gradeLevel, "Point of View", "literature"),
    readingLesson(gradeLevel, "Connotation and Figurative Language", "vocabulary"),
    conventionsLesson(gradeLevel, "Pronoun Agreement and Shifts"),
    conventionsLesson(gradeLevel, "Formal and Informal Style"),
    tdaLesson(gradeLevel),
  ]);
  return [
    ...coreLessons,
    ...gradeThreeScopeSequenceLessons(),
    ...gradeFourScopeSequenceLessons(),
    ...gradeFiveScopeSequenceLessons(),
    ...gradeSixScopeSequenceLessons(),
    ...gradeSevenScopeSequenceLessons(),
    ...gradeEightScopeSequenceLessons(),
  ];
}

function gradeThreeScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 3,
      skill: "Short and Long Vowel Patterns",
      domain: "Reading Foundations",
      standardDomain: "vocabulary",
      explanation: "Strong Grade 3 readers use vowel patterns to read unfamiliar words. Look for spelling clues like silent e, vowel teams, and closed syllables before choosing how a word should sound.",
      workedExample: "In the word made, the silent e helps the a say its long sound. In the word match, the vowel sound is short because the vowel is closed in by consonants.",
      task: "Which word has a long vowel sound?",
      choices: ["stone", "not", "drum", "went"],
      correctAnswer: "stone",
      explanationDetail: "Stone has a silent e, so the o makes a long vowel sound.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Multisyllable Word Parts",
      domain: "Reading Foundations",
      standardDomain: "vocabulary",
      explanation: "When a word has more than one syllable, break it into smaller parts. Read each part, then blend the parts back together.",
      workedExample: "The word helpful can be read as help + ful. The ending -ful means full of, so helpful means full of help or useful.",
      task: "Which division helps read the word carefully?",
      choices: ["care/ful/ly", "ca/ref/ully", "caref/ul/ly", "carefu/lly"],
      correctAnswer: "care/ful/ly",
      explanationDetail: "Care/ful/ly shows meaningful word parts that help with reading and meaning.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Story Elements",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Story elements include characters, setting, problem, important events, and solution. Track these parts to understand how a story works.",
      workedExample: "If Maya forgets her lunch, asks for help, and solves the problem by sharing with a friend, the problem is forgetting lunch and the solution is sharing.",
      task: "Which detail best names the problem in a story?",
      choices: ["The character loses the class pet.", "The story happens in spring.", "The character likes blue.", "The story has four paragraphs."],
      correctAnswer: "The character loses the class pet.",
      explanationDetail: "A problem is something the character must solve or respond to.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Character Traits and Actions",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "A character trait describes what a character is like on the inside. Use actions, words, thoughts, and choices as evidence.",
      workedExample: "If a character keeps practicing after making mistakes, the character may be determined. The repeated practice is the evidence.",
      task: "Which evidence best supports the trait generous?",
      choices: ["Lena gives half her markers to a new student.", "Lena sharpens her pencil.", "Lena sits near the window.", "Lena reads the title."],
      correctAnswer: "Lena gives half her markers to a new student.",
      explanationDetail: "Sharing supplies with someone else supports the trait generous.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Sequence of Events",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Sequence means the order in which events happen. Look for time words and cause-and-effect clues to follow the story.",
      workedExample: "First the class plants seeds, next they water them, and later sprouts appear. The order helps readers understand what caused the change.",
      task: "Which word often signals sequence?",
      choices: ["after", "because", "unlike", "however"],
      correctAnswer: "after",
      explanationDetail: "After tells when one event happens compared with another event.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Text Features",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Text features help readers find and understand information. Headings, captions, maps, diagrams, labels, and bold words all give clues.",
      workedExample: "A diagram of a plant with labels can show the parts of the plant faster than a paragraph alone.",
      task: "Which text feature would best help a reader find the topic of each section?",
      choices: ["headings", "quotation marks", "periods", "dialogue"],
      correctAnswer: "headings",
      explanationDetail: "Headings tell what a section is mostly about.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Author's Purpose",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Author's purpose is why the author wrote the text. Common purposes are to inform, explain, persuade, or entertain.",
      workedExample: "A text that gives facts about how bees help flowers is written mostly to inform or explain.",
      task: "A passage gives steps for making a bird feeder. What is the author's main purpose?",
      choices: ["to explain how to do something", "to tell a fantasy story", "to convince readers to move", "to describe a character's feelings"],
      correctAnswer: "to explain how to do something",
      explanationDetail: "Steps and directions usually show that the author is explaining a process.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Compare and Contrast",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Compare means tell how things are alike. Contrast means tell how things are different. Signal words like both, same, however, and unlike can help.",
      workedExample: "Frogs and toads both hatch from eggs, but frogs usually have smoother skin. That sentence compares and contrasts.",
      task: "Which phrase signals a contrast?",
      choices: ["unlike the first animal", "both animals", "in the same way", "also has"],
      correctAnswer: "unlike the first animal",
      explanationDetail: "Unlike signals a difference between two things.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Cause and Effect",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "A cause tells why something happened. An effect tells what happened. Ask, What happened? and Why did it happen?",
      workedExample: "Because the rain filled the barrel, the class had water for the garden. The rain is the cause, and having water is the effect.",
      task: "Which word often signals a cause?",
      choices: ["because", "finally", "both", "near"],
      correctAnswer: "because",
      explanationDetail: "Because often explains why something happened.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Poetry Lines and Stanzas",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Poems are often written in lines and stanzas. A stanza is a group of lines, like a paragraph in a poem.",
      workedExample: "If a poem has four lines, a space, and four more lines, it has two stanzas.",
      task: "What is a stanza?",
      choices: ["a group of lines in a poem", "the title of a story", "a fact in an article", "a punctuation mark"],
      correctAnswer: "a group of lines in a poem",
      explanationDetail: "A stanza groups poem lines together.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Context Clues",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Context clues are words and sentences around an unfamiliar word that help you figure out its meaning.",
      workedExample: "The sentence 'The trail was narrow, so only one hiker could walk through at a time' shows that narrow means not wide.",
      task: "In 'The puppy was timid and hid behind the chair,' what does timid most likely mean?",
      choices: ["shy", "loud", "huge", "quick"],
      correctAnswer: "shy",
      explanationDetail: "Hiding behind the chair is a clue that timid means shy.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Prefixes and Suffixes",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Prefixes come at the beginning of words. Suffixes come at the end. These word parts can change the meaning of a base word.",
      workedExample: "The prefix re- means again. Reread means read again.",
      task: "What does unhappy mean?",
      choices: ["not happy", "happy again", "very happy", "full of happy"],
      correctAnswer: "not happy",
      explanationDetail: "The prefix un- often means not.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Synonyms and Antonyms",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Synonyms have similar meanings. Antonyms have opposite meanings. Use the sentence to choose the word relationship that fits.",
      workedExample: "Tiny and small are synonyms. Tiny and huge are antonyms.",
      task: "Which word is an antonym for ancient?",
      choices: ["new", "old", "past", "early"],
      correctAnswer: "new",
      explanationDetail: "Ancient means very old, so new is an opposite.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Complete Sentences",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "A complete sentence has a subject and a predicate and expresses a complete thought.",
      workedExample: "The class built a model is complete. Built a model is incomplete because it does not tell who did the action.",
      task: "Which choice is a complete sentence?",
      choices: ["The students measured the plant.", "Measured the plant.", "After the bell.", "In the bright room."],
      correctAnswer: "The students measured the plant.",
      explanationDetail: "This sentence tells who did something and what they did.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Commas in a Series",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Use commas to separate three or more words or phrases in a series.",
      workedExample: "The class collected leaves, seeds, and twigs. The commas separate the items in the list.",
      task: "Which sentence uses commas correctly?",
      choices: ["We packed paper, pencils, and glue.", "We packed paper pencils and, glue.", "We packed, paper pencils and glue.", "We packed paper pencils, and, glue."],
      correctAnswer: "We packed paper, pencils, and glue.",
      explanationDetail: "The commas separate the three items in the list.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Capitalization and Titles",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Capitalize names, places, the first word in a sentence, and important words in titles.",
      workedExample: "The title The Garden Journal capitalizes the important words in the title.",
      task: "Which title is capitalized correctly?",
      choices: ["The Secret Map", "the secret map", "The secret map", "the Secret map"],
      correctAnswer: "The Secret Map",
      explanationDetail: "The important words in the title begin with capital letters.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Paragraph Organization",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "A clear paragraph has one main idea, details that stay on topic, and an ending sentence that closes the thought.",
      workedExample: "A paragraph about saving water should include details about water use, not a random detail about lunch.",
      task: "Which sentence best stays on topic in a paragraph about recycling?",
      choices: ["Recycling paper can help save trees.", "My favorite lunch is pizza.", "The playground is near the gym.", "I bought new shoes."],
      correctAnswer: "Recycling paper can help save trees.",
      explanationDetail: "The sentence stays focused on recycling.",
    }),
    scopeLesson({
      gradeLevel: 3,
      skill: "Opinion Reasons",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Opinion writing states what the writer thinks and gives reasons that support the opinion.",
      workedExample: "Opinion: The class should visit the nature center. Reason: Students can observe animals and plants they are studying.",
      task: "Which sentence gives a reason for an opinion?",
      choices: ["The park is the best place for the trip because students can learn outside.", "The park has trees.", "Yesterday was sunny.", "The bus is yellow."],
      correctAnswer: "The park is the best place for the trip because students can learn outside.",
      explanationDetail: "The word because introduces a reason that supports the opinion.",
    }),
  ];
}

function gradeFourScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 4,
      skill: "Combine Main Ideas Across Texts",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "When two texts are about related topics, compare the main idea of each text. Then decide what bigger idea both texts help explain.",
      workedExample: "One text may explain how wetlands protect animals, while another explains how wetlands reduce flooding. Together, the texts show that wetlands help both wildlife and communities.",
      task: "Which answer best combines the main ideas of two texts about school gardens and composting?",
      choices: ["Both texts explain ways students can help the environment.", "Both texts are mostly about lunch menus.", "One text is fiction and one has no facts.", "The texts disagree about planting seeds."],
      correctAnswer: "Both texts explain ways students can help the environment.",
      explanationDetail: "The answer combines the shared environmental idea from both topics.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Inference with Supporting Details",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "A strong inference is supported by more than one detail. Use clues from the text, then choose evidence that proves the idea.",
      workedExample: "If a student checks measurements twice and fixes a chart before sharing it, you can infer the student wants the work to be accurate.",
      task: "Which inference is best supported by details about a class checking data twice?",
      choices: ["The class cares about accuracy.", "The class wants to avoid science.", "The class finished without working.", "The class copied another project."],
      correctAnswer: "The class cares about accuracy.",
      explanationDetail: "Checking data twice supports the idea that accuracy matters to the class.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Compare Characters",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "To compare characters, look at their actions, words, thoughts, and choices. Strong comparisons use evidence for both characters.",
      workedExample: "If one character rushes into a plan and another asks questions first, they differ in how carefully they make decisions.",
      task: "Which detail best compares two characters?",
      choices: ["Ari acts quickly, but Mina studies the problem first.", "Ari wears a blue jacket.", "Mina stands near the door.", "The story has four scenes."],
      correctAnswer: "Ari acts quickly, but Mina studies the problem first.",
      explanationDetail: "This choice compares how both characters respond to a problem.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Author's Purpose and Message",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Author's purpose is why the text was written. The author's message is the idea the author wants readers to understand or believe.",
      workedExample: "A text about saving local streams may inform readers about pollution and also send the message that small actions can protect water.",
      task: "A passage explains how students reduced cafeteria waste. What is the author's likely message?",
      choices: ["Students can make a positive difference at school.", "Lunch should always be shorter.", "Recycling is impossible.", "Only adults solve school problems."],
      correctAnswer: "Students can make a positive difference at school.",
      explanationDetail: "The message connects the students' actions to a positive result.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Argumentative Text Clues",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Argumentative texts make a claim and support it with reasons and evidence. Look for opinion words, reasons, facts, and calls to action.",
      workedExample: "The sentence 'Our school should add a recycling team because it would reduce waste' includes a claim and a reason.",
      task: "Which sentence is a claim?",
      choices: ["Our town should build more bike paths.", "The path is two miles long.", "Many students own bikes.", "The meeting begins at six."],
      correctAnswer: "Our town should build more bike paths.",
      explanationDetail: "A claim states a position that reasons can support.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Problem and Solution Text Structure",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "In problem and solution structure, the author explains an issue and one or more ways to fix it. Signal words include problem, solve, challenge, and solution.",
      workedExample: "If a garden dries out quickly and students install mulch to keep moisture in the soil, the dry soil is the problem and mulch is part of the solution.",
      task: "Which pair shows problem and solution?",
      choices: ["The path flooded, so workers added a drain.", "The path is beside a field.", "The path opened in June.", "The path has signs and benches."],
      correctAnswer: "The path flooded, so workers added a drain.",
      explanationDetail: "Flooding is the problem, and adding a drain is the solution.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Sensory Details",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Sensory details help readers see, hear, smell, taste, or feel what is happening. They make writing more vivid and specific.",
      workedExample: "The sentence 'The dry leaves crackled under my shoes' uses sound to help the reader imagine the scene.",
      task: "Which sentence uses a sensory detail?",
      choices: ["The cinnamon smell drifted from the kitchen.", "The recipe had four steps.", "The kitchen was in the house.", "The plate was round."],
      correctAnswer: "The cinnamon smell drifted from the kitchen.",
      explanationDetail: "The sentence uses smell to create a clear image.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Similes and Metaphors",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Similes compare using like or as. Metaphors compare by saying one thing is another. Both help readers understand an idea in a fresh way.",
      workedExample: "The classroom was a beehive means the classroom was busy, not that it was really full of bees.",
      task: "What does the metaphor 'the hallway was a river of students' suggest?",
      choices: ["Many students were moving through the hallway.", "Water filled the hallway.", "Students were swimming.", "The hallway was empty."],
      correctAnswer: "Many students were moving through the hallway.",
      explanationDetail: "The metaphor compares moving students to flowing water.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Allusion Meaning",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "An allusion is a reference to a known story, person, event, or idea. Use context and background clues to understand what the reference adds.",
      workedExample: "Calling a difficult task 'a mountain to climb' alludes to a hard journey and suggests the task will take effort.",
      task: "If a narrator says a helper was 'a real lifesaver,' what does the phrase suggest?",
      choices: ["The helper was very useful in a difficult moment.", "The helper worked at a pool.", "The helper carried a boat.", "The helper told a joke."],
      correctAnswer: "The helper was very useful in a difficult moment.",
      explanationDetail: "The phrase suggests the helper made a difficult situation much better.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Plot Elements",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Plot includes the problem, rising events, climax, resolution, and how characters respond. Analyze how events connect instead of listing them separately.",
      workedExample: "When a lost map causes characters to work together, that event pushes the plot forward and changes how the characters behave.",
      task: "Which detail most likely moves the plot forward?",
      choices: ["The team discovers the missing key inside the toolbox.", "The room has a window.", "The clock is round.", "The character likes green."],
      correctAnswer: "The team discovers the missing key inside the toolbox.",
      explanationDetail: "Finding the key can cause new events and help solve the problem.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Graphic Organizers",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Graphic organizers show information visually. Use titles, labels, arrows, rows, and columns to understand how ideas connect.",
      workedExample: "A Venn diagram can show how two animals are alike and different.",
      task: "Which organizer best compares two topics?",
      choices: ["Venn diagram", "timeline only", "single caption", "title page"],
      correctAnswer: "Venn diagram",
      explanationDetail: "A Venn diagram is designed to show similarities and differences.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Rhyme Scheme and Poetry Elements",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Poetry elements include lines, stanzas, rhythm, rhyme, and repeated sounds. Rhyme scheme is the pattern of end rhymes in a poem.",
      workedExample: "If line 1 rhymes with line 3 and line 2 rhymes with line 4, the pattern can be labeled ABAB.",
      task: "What does rhyme scheme describe?",
      choices: ["the pattern of end rhymes", "the main character", "the setting of an article", "the number of facts in a paragraph"],
      correctAnswer: "the pattern of end rhymes",
      explanationDetail: "Rhyme scheme names how the ending sounds of poem lines match.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Summarizing Stories",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "A strong summary includes the most important events and leaves out tiny details or personal opinions.",
      workedExample: "Instead of listing every line of dialogue, summarize the character's problem, key actions, and solution.",
      task: "Which sentence belongs in a summary?",
      choices: ["A girl solves the problem by asking her neighbors for help.", "The girl's shoes are blue.", "I liked the story a lot.", "The second paragraph has six sentences."],
      correctAnswer: "A girl solves the problem by asking her neighbors for help.",
      explanationDetail: "This sentence includes an important event and solution.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Transitions and Linking Words",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Transitions connect ideas and help readers follow the order, cause, contrast, or addition of information.",
      workedExample: "Words like first, next, because, however, and as a result show how ideas are related.",
      task: "Which transition best shows a result?",
      choices: ["as a result", "nearby", "for example", "before"],
      correctAnswer: "as a result",
      explanationDetail: "As a result signals that one event or idea caused another.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Facts and Opinions",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "A fact can be proven true or false. An opinion tells what someone thinks, feels, or believes.",
      workedExample: "The library opens at 9:00 is a fact. The library is the best place in town is an opinion.",
      task: "Which sentence is an opinion?",
      choices: ["The new mural is the most beautiful part of the school.", "The mural is six feet tall.", "The mural has blue paint.", "The mural was finished on Friday."],
      correctAnswer: "The new mural is the most beautiful part of the school.",
      explanationDetail: "Most beautiful is a judgment that people could disagree about.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Supporting Reasons",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "A reason explains why a claim or opinion makes sense. Strong reasons are specific and connected to the claim.",
      workedExample: "Claim: Students should have more outdoor reading time. Reason: Reading outside can make quiet independent reading feel fresh and focused.",
      task: "Which reason best supports the claim that a class should visit a science museum?",
      choices: ["Students could observe exhibits that connect to their science unit.", "The bus has windows.", "The museum has a front door.", "The trip is on Tuesday."],
      correctAnswer: "Students could observe exhibits that connect to their science unit.",
      explanationDetail: "The reason explains an educational benefit connected to the claim.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Greek and Latin Roots",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Greek and Latin roots are word parts that carry meaning. Knowing roots helps you figure out unfamiliar words.",
      workedExample: "The root aqua means water. An aquarium is a place for water animals or plants.",
      task: "If port means carry, what does transport most likely mean?",
      choices: ["to carry across or move", "to write again", "to look closely", "to make smaller"],
      correctAnswer: "to carry across or move",
      explanationDetail: "The root port gives a clue about carrying or moving something.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Homophones and Multiple-Meaning Words",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Homophones sound alike but have different meanings. Multiple-meaning words have more than one meaning. Use context to choose the correct meaning.",
      workedExample: "In 'The team will present the report,' present means show or share. In 'I opened the present,' it means a gift.",
      task: "Which word correctly completes the sentence: The class read _____ reports aloud.",
      choices: ["their", "there", "they're", "thare"],
      correctAnswer: "their",
      explanationDetail: "Their shows ownership: the reports belong to the class.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Dictionary and Thesaurus Skills",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "A dictionary gives meanings, pronunciation, and parts of speech. A thesaurus gives synonyms and sometimes antonyms.",
      workedExample: "If you need a stronger word than good, a thesaurus may suggest helpful words like excellent or useful, depending on the sentence.",
      task: "Which resource is best for finding a synonym for quick?",
      choices: ["thesaurus", "calendar", "map key", "table of contents"],
      correctAnswer: "thesaurus",
      explanationDetail: "A thesaurus helps writers find synonyms.",
    }),
    scopeLesson({
      gradeLevel: 4,
      skill: "Spelling with Affixes",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Affixes are prefixes and suffixes. When adding suffixes, check whether the base word changes before the ending is added.",
      workedExample: "Hope becomes hopeful when -ful is added. Care becomes careless when -less is added.",
      task: "Which word is spelled correctly?",
      choices: ["careless", "careles", "carlesss", "careluss"],
      correctAnswer: "careless",
      explanationDetail: "Careless correctly combines care and -less.",
    }),
  ];
}

function gradeFiveScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 5,
      skill: "Compare Themes Across Stories",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "When stories share a topic, compare the lessons or messages each story develops. Use character choices, conflict, and endings as evidence.",
      workedExample: "Two stories about teamwork may have different themes: one may show that teamwork solves problems, while another shows that teamwork requires listening.",
      task: "Which answer best compares themes across two stories?",
      choices: ["Both stories show that trust grows when people listen to one another.", "Both stories have titles.", "One story is longer than the other.", "Both stories mention a school."],
      correctAnswer: "Both stories show that trust grows when people listen to one another.",
      explanationDetail: "This choice compares a message developed by both stories.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Character Response and Plot",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "In Grade 5, plot analysis includes explaining how characters respond to challenges and how those responses move events forward.",
      workedExample: "If a character admits a mistake, that choice may rebuild trust and lead to the story's resolution.",
      task: "Which detail best shows a character response that affects the plot?",
      choices: ["Jalen apologizes and helps repair the damaged project.", "Jalen's backpack is red.", "The room has four windows.", "The story begins on Monday."],
      correctAnswer: "Jalen apologizes and helps repair the damaged project.",
      explanationDetail: "The apology and repair are actions that can change what happens next.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Story Structure and Chapters",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Chapters, scenes, and stanzas organize a text. Ask how each part adds to the conflict, reveals a character, or prepares for the resolution.",
      workedExample: "A chapter that flashes back to an earlier promise may explain why the character makes a difficult choice later.",
      task: "Why might an author include a chapter about an earlier event?",
      choices: ["To explain a character's later decision", "To remove the story problem", "To list random facts", "To avoid describing characters"],
      correctAnswer: "To explain a character's later decision",
      explanationDetail: "Earlier events can help readers understand later choices.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Poetry Speaker and Tone",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "The speaker is the voice in a poem. Tone is the speaker's attitude. Use word choice and details to identify both.",
      workedExample: "Words like whisper, silver, and still may create a calm or peaceful tone.",
      task: "Which words would most likely create a worried tone?",
      choices: ["trembled, hurried, uncertain", "bright, cheerful, simple", "smooth, gentle, quiet", "steady, proud, clear"],
      correctAnswer: "trembled, hurried, uncertain",
      explanationDetail: "Those words suggest nervousness or worry.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Multiple Accounts of the Same Event",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Different texts can describe the same event in different ways. Compare which details each author emphasizes and how the point of view changes the account.",
      workedExample: "A newspaper article may focus on facts about a storm, while a diary entry may focus on one person's feelings during the storm.",
      task: "Which comparison best analyzes two accounts of a school event?",
      choices: ["One account focuses on facts, while the other focuses on a student's experience.", "Both accounts use periods.", "One account has more pages.", "Both accounts have the same first word."],
      correctAnswer: "One account focuses on facts, while the other focuses on a student's experience.",
      explanationDetail: "This choice compares how the accounts present information differently.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Chronology and Sequence Text Structure",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Chronological structure presents events in time order. Look for dates, time words, and steps that show how events unfold.",
      workedExample: "A text about building a bridge might explain planning first, construction next, and opening day last.",
      task: "Which clue best signals chronological order?",
      choices: ["By 2018, later, finally", "however, unlike, but", "problem, solution, challenge", "for example, such as, including"],
      correctAnswer: "By 2018, later, finally",
      explanationDetail: "These words show when events happened.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Reasons and Evidence in Arguments",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "An argument makes a claim and supports it with reasons and evidence. Strong evidence is relevant, specific, and connected to the claim.",
      workedExample: "Claim: The school should add water bottle stations. Evidence: Students used 400 fewer plastic bottles at a nearby school after stations were installed.",
      task: "Which evidence best supports the claim that students should plant trees near the playground?",
      choices: ["Trees can provide shade and lower the temperature on hot days.", "The playground has swings.", "Trees have leaves.", "Students arrive at 8:00."],
      correctAnswer: "Trees can provide shade and lower the temperature on hot days.",
      explanationDetail: "This evidence explains a direct benefit of planting trees.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Integrating Information from Sources",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "To integrate information, combine details from more than one source to answer a question or explain a topic more completely.",
      workedExample: "One source may explain how solar panels work; another may show cost savings. Together, they help explain benefits and challenges.",
      task: "Which sentence best integrates two sources about pollinators?",
      choices: ["Both sources show that pollinators help plants grow, and one source explains how gardens can protect them.", "One source has a title.", "The sources are printed in black ink.", "Both sources use the word plant once."],
      correctAnswer: "Both sources show that pollinators help plants grow, and one source explains how gardens can protect them.",
      explanationDetail: "This choice combines important information from both sources.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Academic and Domain-Specific Vocabulary",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Academic words appear across school subjects. Domain-specific words belong to one topic or field. Use context and word parts to determine meaning.",
      workedExample: "In a science article, evaporation is domain-specific because it belongs to the study of water and matter.",
      task: "In an article about ecosystems, which word is domain-specific?",
      choices: ["habitat", "quickly", "however", "important"],
      correctAnswer: "habitat",
      explanationDetail: "Habitat is a science word connected to ecosystems.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Greek and Latin Affixes and Roots",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Roots and affixes carry meaning. Use them with context clues to figure out unfamiliar words.",
      workedExample: "The root scrib means write. A manuscript is something written by hand or prepared as writing.",
      task: "If tele means far, what does telescope most likely relate to?",
      choices: ["seeing something far away", "writing a note", "cutting paper", "measuring heat"],
      correctAnswer: "seeing something far away",
      explanationDetail: "The root tele gives a clue about distance.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Analogies and Word Relationships",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Analogies show relationships between words. Identify the relationship in the first pair, then apply it to the second pair.",
      workedExample: "Seed is to plant as egg is to bird. The relationship is beginning stage to grown living thing.",
      task: "Choose the word that completes the analogy: author is to book as painter is to ____.",
      choices: ["portrait", "library", "chapter", "sentence"],
      correctAnswer: "portrait",
      explanationDetail: "An author creates a book; a painter creates a portrait.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Combining Sentences",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Combining sentences can make writing smoother. Keep the meaning clear and avoid repeating the same words too often.",
      workedExample: "Instead of 'The class planted seeds. The class watered seeds,' write 'The class planted and watered seeds.'",
      task: "Which sentence best combines the ideas? The trail was steep. The trail was rocky.",
      choices: ["The trail was steep and rocky.", "The trail was steep the trail was rocky.", "Steep and the trail rocky.", "The trail was and rocky steep."],
      correctAnswer: "The trail was steep and rocky.",
      explanationDetail: "This sentence combines both descriptions clearly.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Commas and Introductory Elements",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Use a comma after an introductory word, phrase, or clause when it helps separate the opening from the main sentence.",
      workedExample: "After the rain stopped, the team returned to the field.",
      task: "Which sentence uses a comma correctly?",
      choices: ["After the bell rang, the students lined up.", "After, the bell rang the students lined up.", "After the bell, rang the students lined up.", "After the bell rang the students, lined up."],
      correctAnswer: "After the bell rang, the students lined up.",
      explanationDetail: "The comma separates the introductory clause from the main sentence.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Verb Tense Consistency",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Verb tense should stay consistent unless the time changes. Check whether actions happen in the past, present, or future.",
      workedExample: "The team measured the garden and recorded the results keeps both verbs in past tense.",
      task: "Which sentence keeps verb tense consistent?",
      choices: ["Mia opened the notebook and wrote the results.", "Mia opened the notebook and writes the results.", "Mia opens the notebook and wrote the results.", "Mia will open the notebook and wrote the results."],
      correctAnswer: "Mia opened the notebook and wrote the results.",
      explanationDetail: "Opened and wrote are both past-tense verbs.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Opinion Essay Organization",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "An opinion essay states a claim, gives reasons, supports those reasons with evidence, and uses transitions to connect ideas.",
      workedExample: "Claim: Students should read outside once a week. Reason: Outdoor reading can increase focus. Evidence: The class stayed quiet and read longer during the outdoor trial.",
      task: "Which sentence would work best as an opinion essay claim?",
      choices: ["Our class should create a student garden.", "The garden has soil.", "Seeds are small.", "Yesterday was warm."],
      correctAnswer: "Our class should create a student garden.",
      explanationDetail: "The sentence states a position that can be supported with reasons.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Informative Essay Development",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Informative writing explains a topic with facts, definitions, examples, and clear organization.",
      workedExample: "A paragraph about erosion should explain what erosion is, give an example, and show why it matters.",
      task: "Which detail best develops an informative paragraph about recycling?",
      choices: ["Paper can be recycled into new products such as notebooks and boxes.", "Recycling is my favorite word.", "The bin is blue and near the wall.", "I once saw a truck."],
      correctAnswer: "Paper can be recycled into new products such as notebooks and boxes.",
      explanationDetail: "This fact explains the topic with useful information.",
    }),
    scopeLesson({
      gradeLevel: 5,
      skill: "Narrative Techniques",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Narrative writing uses dialogue, description, pacing, and sequence to develop events and characters.",
      workedExample: "Dialogue like 'We can fix it if we work together,' said Ana, can reveal character and move the story forward.",
      task: "Which sentence uses dialogue to develop the story?",
      choices: ["'I found the missing map,' Luis whispered.", "The map was paper.", "The room was square.", "The story has a beginning."],
      correctAnswer: "'I found the missing map,' Luis whispered.",
      explanationDetail: "The dialogue gives information and creates a story moment.",
    }),
  ];
}

function gradeSixScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 6,
      skill: "Central Idea Development",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "In Grade 6, central idea work moves beyond naming the topic. Students track how an idea is introduced, refined, and supported across multiple paragraphs.",
      workedExample: "If an article begins with a problem, adds data from a study, and ends with a community solution, the central idea is developed through problem, evidence, and response.",
      task: "Which answer best explains how the author develops the central idea?",
      choices: ["By introducing a problem, giving evidence, and explaining a response", "By listing unrelated facts about the topic", "By repeating the title in each paragraph", "By ending with a personal opinion only"],
      correctAnswer: "By introducing a problem, giving evidence, and explaining a response",
      explanationDetail: "Grade 6 students should explain the movement of the idea across the text, not just identify the topic.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Objective Summary",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "An objective summary includes the central idea and the most important supporting details without personal reactions or minor examples.",
      workedExample: "A strong summary of an article about school gardens would explain the main purpose, the key evidence, and the result, while leaving out whether the reader likes gardens.",
      task: "Which sentence belongs in an objective summary?",
      choices: ["The article explains how student volunteers reduced waste by collecting lunch scraps for compost.", "The article is boring because compost is not exciting.", "The best part is the photograph of the garden.", "Everyone should start composting immediately."],
      correctAnswer: "The article explains how student volunteers reduced waste by collecting lunch scraps for compost.",
      explanationDetail: "This sentence reports an important idea from the text without opinion.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Text Structure and Author Organization",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Grade 6 readers analyze how structure helps the author explain ideas. Look for comparison, cause and effect, problem and solution, chronology, and description.",
      workedExample: "If a passage explains a shortage, lists causes, and describes possible fixes, the structure helps readers understand why the problem happened and what could be done.",
      task: "Why would an author use a cause-and-effect structure?",
      choices: ["To show why an event happened and what resulted from it", "To hide the main idea from readers", "To make every paragraph sound the same", "To avoid using evidence"],
      correctAnswer: "To show why an event happened and what resulted from it",
      explanationDetail: "Cause-and-effect structure connects reasons with outcomes.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Claims, Reasons, and Evidence",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Arguments include a claim, reasons, and evidence. At Grade 6, students trace whether the evidence actually supports the reason and whether the reason supports the claim.",
      workedExample: "Claim: Schools should add refill stations. Reason: They reduce plastic waste. Evidence: A nearby school used 2,000 fewer disposable bottles after installing stations.",
      task: "Which evidence best supports the claim that school gardens can improve science learning?",
      choices: ["Students recorded plant growth each week and used the data in science notebooks.", "The garden gate is painted blue.", "Some students like carrots more than peas.", "The garden is behind the cafeteria."],
      correctAnswer: "Students recorded plant growth each week and used the data in science notebooks.",
      explanationDetail: "The evidence directly connects the garden to science learning.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Author's Purpose and Point of View",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Author's purpose is why the author writes. Point of view is the author's position or attitude. Use word choice, selected details, and omitted details as clues.",
      workedExample: "An author who calls a plan practical and carefully tested likely wants readers to view the plan as reasonable.",
      task: "Which clue best reveals the author's point of view?",
      choices: ["The author describes the proposal as a careful solution supported by data.", "The article has six paragraphs.", "The title uses four words.", "The passage includes a comma in sentence two."],
      correctAnswer: "The author describes the proposal as a careful solution supported by data.",
      explanationDetail: "Evaluative words and selected evidence reveal the author's attitude.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Compare Text Presentations",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "When two texts cover a similar topic, compare what each one emphasizes, what evidence each includes, and how their purposes differ.",
      workedExample: "A timeline may emphasize sequence, while an article may explain causes and effects. Both can teach the same topic in different ways.",
      task: "Which comparison best analyzes two texts about the same invention?",
      choices: ["One text explains the inventor's problem, while the other shows a timeline of testing and revisions.", "Both texts are printed on a page.", "One text has a longer title.", "Both texts include the word invention."],
      correctAnswer: "One text explains the inventor's problem, while the other shows a timeline of testing and revisions.",
      explanationDetail: "This comparison explains how the texts present information differently.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Technical Vocabulary in Context",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Technical words belong to a subject area. Use context, examples, and nearby explanations to determine precise meanings.",
      workedExample: "In an article about water systems, filtration means removing particles from water; the surrounding details about screens and layers help confirm the meaning.",
      task: "In a passage about bridges, what does load most likely mean?",
      choices: ["The weight or force a structure must support", "A set of clothes in a washing machine", "A page on a website", "A quick movement"],
      correctAnswer: "The weight or force a structure must support",
      explanationDetail: "The subject-area context changes the meaning of load.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Tone and Connotation",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Connotation is the feeling a word suggests. Tone is the author's attitude. In Grade 6, connect word choice to how the reader understands the topic.",
      workedExample: "Calling a solution bold suggests admiration, while calling it risky suggests caution or concern.",
      task: "Which word choice creates a cautious tone?",
      choices: ["The committee proposed an untested plan.", "The committee proposed a helpful plan.", "The committee proposed a popular plan.", "The committee proposed a clear plan."],
      correctAnswer: "The committee proposed an untested plan.",
      explanationDetail: "Untested suggests concern about whether the plan will work.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Plot Development in Episodes",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Grade 6 readers analyze how episodes or scenes build conflict, reveal character, and move the plot toward a turning point or resolution.",
      workedExample: "A scene where a character refuses help may increase conflict and set up a later moment when the character must change.",
      task: "Which detail best shows an episode that develops the plot?",
      choices: ["The captain hides the map, causing the crew to question whom they can trust.", "The ship has three sails.", "The sky is gray.", "The chapter title is short."],
      correctAnswer: "The captain hides the map, causing the crew to question whom they can trust.",
      explanationDetail: "This action creates conflict and changes what happens next.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Character Change and Conflict",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Analyze how characters respond to conflict and how those responses reveal traits, motivations, or growth.",
      workedExample: "A character who begins by avoiding responsibility but later admits a mistake has changed because of the conflict.",
      task: "Which evidence best supports that a character has changed?",
      choices: ["At first Lena blames others, but later she apologizes and repairs the project.", "Lena owns a blue notebook.", "Lena's classroom has a clock.", "Lena walks down the hallway."],
      correctAnswer: "At first Lena blames others, but later she apologizes and repairs the project.",
      explanationDetail: "The contrast between earlier and later actions shows change.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Story Structure and Flashback",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Authors may use flashback, pacing, or scene order to reveal information. Ask how the structure affects your understanding of character, conflict, or theme.",
      workedExample: "A flashback to a broken promise can explain why a character is afraid to trust someone in the present.",
      task: "Why might an author include a flashback?",
      choices: ["To reveal earlier events that explain a character's current choice", "To remove all conflict from the story", "To define every vocabulary word", "To change the genre from fiction to nonfiction"],
      correctAnswer: "To reveal earlier events that explain a character's current choice",
      explanationDetail: "Flashbacks often add background that deepens the present conflict.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Theme Development",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "At Grade 6, theme is not a one-word topic. Students identify a message and explain how it develops through conflict, character decisions, and the ending.",
      workedExample: "A story about honesty may develop the theme that telling the truth can be difficult but repairs trust.",
      task: "Which statement is a theme rather than a topic?",
      choices: ["Courage grows when people act even though they are afraid.", "Courage", "A student climbs a hill.", "The story happens in autumn."],
      correctAnswer: "Courage grows when people act even though they are afraid.",
      explanationDetail: "A theme states a message about a topic.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Pronoun Case and Agreement",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Pronouns must fit their role in a sentence and agree with the noun they replace. Check whether the pronoun is used as a subject, object, or possessive.",
      workedExample: "In 'Maya and I presented the model,' I is correct because it is part of the subject.",
      task: "Which underlined pronoun is used correctly?",
      choices: ["Maya and I explained the design.", "Him and Maya explained the design.", "The teacher gave Maya and I notes.", "Us finished the model."],
      correctAnswer: "Maya and I explained the design.",
      explanationDetail: "I is correct as part of the subject of the sentence.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Shifts in Pronoun Person and Number",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Avoid confusing shifts in pronoun person or number. Keep the point of view consistent unless there is a clear reason to change.",
      workedExample: "A writer should revise, 'When students revise, you should check evidence' because it shifts from students to you.",
      task: "Which sentence contains an inappropriate shift in pronoun person?",
      choices: ["When students revise an essay, you should check every claim.", "Students should revise an essay before submitting it.", "Writers can improve clarity by rereading drafts.", "A student should check whether each detail supports the claim."],
      correctAnswer: "When students revise an essay, you should check every claim.",
      explanationDetail: "The sentence shifts from students to you.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Commas, Parentheses, and Dashes",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Use punctuation to set off extra or interrupting information. The punctuation should make the sentence easier to read without changing the main idea.",
      workedExample: "The model, which used recycled cardboard, held the most weight.",
      task: "Which sentence correctly sets off extra information?",
      choices: ["The rain barrel, an inexpensive tool, collected runoff from the roof.", "The rain barrel an inexpensive tool collected, runoff from the roof.", "The rain, barrel an inexpensive tool collected runoff from the roof.", "The rain barrel an inexpensive tool collected runoff, from the roof."],
      correctAnswer: "The rain barrel, an inexpensive tool, collected runoff from the roof.",
      explanationDetail: "The commas set off extra information about the rain barrel.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Varying Sentence Patterns",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Sentence variety helps writing sound clear and natural. Combine short related ideas and vary beginnings while keeping meaning precise.",
      workedExample: "Instead of 'The team tested the bridge. The team recorded data,' write 'After testing the bridge, the team recorded data.'",
      task: "Which revision improves sentence variety without changing the meaning?",
      choices: ["After the committee reviewed the data, it changed the schedule.", "The committee reviewed data. The committee changed schedule.", "Reviewed the committee data schedule changed.", "The data was schedule committee reviewed."],
      correctAnswer: "After the committee reviewed the data, it changed the schedule.",
      explanationDetail: "The revision combines ideas clearly and varies the sentence opening.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Argument Essay Evidence",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "A Grade 6 argument states a clear claim, supports it with reasons, and uses evidence that is relevant and explained.",
      workedExample: "Claim: The school should keep the library open after school. Evidence should show a benefit, such as increased access to research materials.",
      task: "Which evidence best supports the claim that students need more independent reading time?",
      choices: ["Students who read independently each day completed more books and wrote stronger reading responses.", "The classroom bookshelf is brown.", "Some books have pictures.", "The schedule is printed near the door."],
      correctAnswer: "Students who read independently each day completed more books and wrote stronger reading responses.",
      explanationDetail: "This evidence directly supports the claim and can be explained.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Informative Essay Organization",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Informative writing explains a topic with an introduction, grouped ideas, facts, examples, transitions, and a conclusion.",
      workedExample: "A report about wetlands could group details by habitat, flood protection, and threats, rather than listing facts randomly.",
      task: "Which plan best organizes an informative essay about renewable energy?",
      choices: ["Define renewable energy, explain two types, compare benefits and challenges, and conclude with why it matters.", "List random facts about wind, sunlight, and batteries.", "Begin with an opinion and avoid examples.", "Describe only the color of solar panels."],
      correctAnswer: "Define renewable energy, explain two types, compare benefits and challenges, and conclude with why it matters.",
      explanationDetail: "The plan groups related information in a logical order.",
    }),
    scopeLesson({
      gradeLevel: 6,
      skill: "Research Source Integration",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "When using research, combine information from sources in your own words and make clear how the evidence supports the point.",
      workedExample: "A student might combine a chart about rainfall with an article about drought-resistant plants to explain why one garden design is practical.",
      task: "Which sentence best integrates information from two sources?",
      choices: ["The chart shows rainfall is decreasing, and the article explains that native plants need less watering, so native plants would fit the school's dry garden site.", "Both sources have titles.", "The chart is on the first page and the article is on the second.", "I liked the article better than the chart."],
      correctAnswer: "The chart shows rainfall is decreasing, and the article explains that native plants need less watering, so native plants would fit the school's dry garden site.",
      explanationDetail: "This sentence combines source information and explains why it matters.",
    }),
  ];
}

function gradeSevenScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 7,
      skill: "Central Idea Across Sections",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "In Grade 7, students analyze how a central idea grows across sections of a text. Track how the author introduces the idea, complicates it, and uses evidence to refine it.",
      workedExample: "An article may begin by defining a problem, then use statistics, expert explanation, and an example to show why the problem is more complex than it first appears.",
      task: "Which answer best analyzes how a central idea develops across the text?",
      choices: ["The author introduces a concern, adds data that complicates it, and ends by explaining a possible response.", "The author mentions the topic once and then changes subjects.", "The author repeats the title without adding evidence.", "The author gives only a personal opinion."],
      correctAnswer: "The author introduces a concern, adds data that complicates it, and ends by explaining a possible response.",
      explanationDetail: "Grade 7 central idea analysis should explain how sections work together to develop the idea.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Text Structure Effects",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Text structure affects how readers understand information. Analyze how comparison, cause and effect, chronology, or problem and solution supports the author's purpose.",
      workedExample: "A text that alternates between a problem and several attempted solutions helps readers evaluate which response is most effective.",
      task: "How does a problem-and-solution structure help the reader?",
      choices: ["It shows what challenge exists and how different responses address it.", "It makes every paragraph unrelated.", "It removes the need for evidence.", "It turns an informational text into a story."],
      correctAnswer: "It shows what challenge exists and how different responses address it.",
      explanationDetail: "This structure connects the issue to possible responses.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Argument Claim Strength",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Grade 7 students evaluate whether a claim is supported by logical reasons and relevant evidence. A strong argument connects claim, reason, evidence, and explanation.",
      workedExample: "A claim about later school start times is stronger when supported by research about sleep and student attention, not just a statement that students prefer it.",
      task: "Which evidence most strengthens the claim that the library should offer evening hours?",
      choices: ["A student survey shows many students need internet access after school, and checkout records show high demand before closing.", "The library sign is near the front door.", "Some books are arranged alphabetically.", "Evening is a word with seven letters."],
      correctAnswer: "A student survey shows many students need internet access after school, and checkout records show high demand before closing.",
      explanationDetail: "This evidence is relevant, specific, and connected to the claim.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Compare Authors on the Same Topic",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "When authors write about the same topic, compare their purpose, evidence, emphasis, and tone. Strong comparisons explain meaningful differences in presentation.",
      workedExample: "One author may emphasize economic costs while another emphasizes environmental benefits. That difference changes how readers understand the issue.",
      task: "Which comparison best analyzes two authors' presentations?",
      choices: ["One author emphasizes community benefits, while the other focuses on the cost and possible drawbacks.", "Both texts have paragraphs.", "One text is printed above the other.", "Both authors use periods."],
      correctAnswer: "One author emphasizes community benefits, while the other focuses on the cost and possible drawbacks.",
      explanationDetail: "This answer compares emphasis and perspective, not surface features.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Author Purpose and Rhetorical Choices",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Authors make choices to inform, persuade, or explain. Analyze how word choice, examples, and evidence reveal purpose and point of view.",
      workedExample: "If an author uses phrases such as wasteful habit and practical alternative, the wording suggests a critical view of the habit and support for change.",
      task: "Which detail best reveals the author's purpose?",
      choices: ["The author includes statistics and urgent word choice to persuade readers that action is needed.", "The passage has a short title.", "The article uses black text.", "The final sentence has eight words."],
      correctAnswer: "The author includes statistics and urgent word choice to persuade readers that action is needed.",
      explanationDetail: "Purpose is revealed by evidence choices and tone.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Data and Visual Information",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Charts, tables, maps, and diagrams can add evidence or clarify relationships. Grade 7 students connect visual information to the author's claims and ideas.",
      workedExample: "A line graph showing rising temperatures can support a paragraph explaining changes over time.",
      task: "How should a reader use a table that appears with an article?",
      choices: ["Compare the table data with the article's claim to see how the evidence supports it.", "Ignore the table because it is not a paragraph.", "Read only the table title and skip the data.", "Assume the table repeats every sentence exactly."],
      correctAnswer: "Compare the table data with the article's claim to see how the evidence supports it.",
      explanationDetail: "Visual information should be integrated with the written text.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Precise Academic Vocabulary",
      domain: "Vocabulary",
      standardDomain: "vocabulary",
      explanation: "Academic and technical words often have precise meanings. Use context, examples, contrast clues, and word parts to determine the best meaning.",
      workedExample: "In an article about debate, position means a viewpoint or claim, not where someone is standing.",
      task: "In a passage about scientific testing, what does variable most likely mean?",
      choices: ["A factor that can change during an investigation", "A sentence with an unknown word", "A person who refuses to decide", "A type of punctuation"],
      correctAnswer: "A factor that can change during an investigation",
      explanationDetail: "The science context gives variable a precise technical meaning.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Mood, Tone, and Word Choice",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Mood is the feeling created for the reader. Tone is the author's or speaker's attitude. Analyze how specific words, images, and figurative language create both.",
      workedExample: "Words like dim, hollow, and motionless can create an uneasy mood even before a character says anything.",
      task: "Which words most strongly create a tense mood?",
      choices: ["uneasy, flickered, silent", "bright, cheerful, simple", "smooth, balanced, useful", "ordinary, clear, expected"],
      correctAnswer: "uneasy, flickered, silent",
      explanationDetail: "These words suggest uncertainty and suspense.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Plot Lines and Conflict Development",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Grade 7 readers analyze how plot lines interact. Track conflicts, turning points, and how one event changes later choices.",
      workedExample: "A competition plot may interact with a friendship conflict when a character must choose between winning and helping a teammate.",
      task: "Which detail best shows conflict development?",
      choices: ["After hiding the mistake, Nolan must decide whether to protect his score or tell the team what happened.", "Nolan's pencil is blue.", "The contest takes place on Tuesday.", "The room has twenty chairs."],
      correctAnswer: "After hiding the mistake, Nolan must decide whether to protect his score or tell the team what happened.",
      explanationDetail: "This detail creates a meaningful choice that develops conflict.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Character Motivation and Theme",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Characters' motives and choices often reveal theme. Explain how a character's reason for acting connects to the message of the story.",
      workedExample: "A character who risks embarrassment to defend a classmate may develop a theme about courage and responsibility.",
      task: "Which answer best connects motivation to theme?",
      choices: ["Because Amira wants to repair the harm she caused, her choice supports the theme that accountability can rebuild trust.", "Amira wears a green jacket.", "The story is written in paragraphs.", "Amira walks quickly at the beginning."],
      correctAnswer: "Because Amira wants to repair the harm she caused, her choice supports the theme that accountability can rebuild trust.",
      explanationDetail: "This answer connects motive, action, and theme.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Narrator Reliability and Perspective",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "A narrator's perspective shapes what readers know. Consider whether the narrator is limited, biased, mistaken, or leaving out information.",
      workedExample: "If a narrator insists everyone is unfair but the dialogue shows others trying to help, readers may question the narrator's reliability.",
      task: "Which detail suggests the narrator may be unreliable?",
      choices: ["The narrator claims no one helped, but the dialogue shows two classmates offering support.", "The narrator uses first-person pronouns.", "The narrator describes the weather.", "The narrator mentions a notebook."],
      correctAnswer: "The narrator claims no one helped, but the dialogue shows two classmates offering support.",
      explanationDetail: "A contradiction between narration and evidence can signal unreliability.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Poetry Structure and Meaning",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Poets use line breaks, stanzas, repetition, and sound patterns to shape meaning. Analyze how the structure emphasizes ideas or creates an effect.",
      workedExample: "A repeated line can show that a speaker keeps returning to the same worry or hope.",
      task: "How can repetition affect a poem's meaning?",
      choices: ["It can emphasize an important feeling or idea the speaker returns to.", "It always proves the poem has no theme.", "It makes every word literal.", "It changes a poem into an essay."],
      correctAnswer: "It can emphasize an important feeling or idea the speaker returns to.",
      explanationDetail: "Repetition often draws attention to central feelings or ideas.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Misplaced and Dangling Modifiers",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Modifiers should be placed near the words they describe. Misplaced or dangling modifiers can make a sentence unclear or unintentionally funny.",
      workedExample: "Revise 'Running down the hallway, the backpack fell open' to 'Running down the hallway, Talia noticed her backpack had fallen open.'",
      task: "Which sentence places the modifier clearly?",
      choices: ["Carrying the display board, Malik entered the science fair.", "Carrying the display board, the science fair opened.", "The science fair, carrying the display board, opened.", "Entered the display board Malik carrying."],
      correctAnswer: "Carrying the display board, Malik entered the science fair.",
      explanationDetail: "The modifier clearly describes Malik.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Phrases and Clauses",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Phrases and clauses add detail and variety. Use them to combine ideas while keeping relationships clear.",
      workedExample: "Because the data changed, the team revised its conclusion shows a clear cause-and-effect relationship.",
      task: "Which sentence uses a dependent clause correctly?",
      choices: ["Although the evidence was limited, the team explained its conclusion carefully.", "Although the evidence was limited.", "The team although explained evidence.", "Limited although evidence the team."],
      correctAnswer: "Although the evidence was limited, the team explained its conclusion carefully.",
      explanationDetail: "The dependent clause is connected to a complete sentence.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Comma Use with Coordinate Adjectives",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Use commas between coordinate adjectives when both adjectives equally describe the noun and can be joined by and.",
      workedExample: "A clear, detailed explanation uses a comma because clear and detailed both describe explanation.",
      task: "Which sentence uses a comma correctly between coordinate adjectives?",
      choices: ["The students wrote a careful, thoughtful response.", "The students wrote a science, response.", "The students wrote a careful response, yesterday.", "The students, wrote a careful thoughtful response."],
      correctAnswer: "The students wrote a careful, thoughtful response.",
      explanationDetail: "Careful and thoughtful both describe response.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Formal Style and Precise Language",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Academic writing should maintain a formal style and use precise language. Replace vague or casual wording with specific, appropriate language.",
      workedExample: "Revise 'The plan was super good' to 'The plan was effective because it reduced waste and saved time.'",
      task: "Which revision best maintains formal style?",
      choices: ["The results suggest that the new schedule increased participation.", "The new schedule was awesome and everyone liked it a ton.", "The thing worked pretty good.", "It was kind of a big deal."],
      correctAnswer: "The results suggest that the new schedule increased participation.",
      explanationDetail: "This sentence uses precise, formal language.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Argument Counterclaim Response",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Grade 7 argument writing should acknowledge an opposing claim and respond with evidence or reasoning.",
      workedExample: "Although some students worry later due dates reduce urgency, a planning checkpoint can keep work on schedule while allowing more time for revision.",
      task: "Which sentence best responds to a counterclaim?",
      choices: ["Some argue that outdoor lunch is distracting, but a supervised schedule can limit noise while giving students a needed break.", "Outdoor lunch is good.", "Some people disagree.", "The cafeteria has tables."],
      correctAnswer: "Some argue that outdoor lunch is distracting, but a supervised schedule can limit noise while giving students a needed break.",
      explanationDetail: "This sentence acknowledges a concern and responds with reasoning.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Informative Writing with Transitions",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Informative writing uses transitions to connect categories, examples, causes, effects, and comparisons so readers can follow complex information.",
      workedExample: "Transitions such as however, as a result, and for example show how ideas relate.",
      task: "Which transition best shows contrast?",
      choices: ["however", "for example", "as a result", "first"],
      correctAnswer: "however",
      explanationDetail: "However signals a contrast between ideas.",
    }),
    scopeLesson({
      gradeLevel: 7,
      skill: "Research Questions and Source Notes",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Strong research begins with a focused question and notes that capture relevant facts in the student's own words.",
      workedExample: "Instead of asking 'What about recycling?' ask 'How does cafeteria composting affect school waste over one semester?'",
      task: "Which research question is most focused?",
      choices: ["How did one middle school's composting program change cafeteria waste during the spring semester?", "What is trash?", "Do people like food?", "Why are schools places?"],
      correctAnswer: "How did one middle school's composting program change cafeteria waste during the spring semester?",
      explanationDetail: "This question has a specific topic, setting, and measurable focus.",
    }),
  ];
}

function gradeEightScopeSequenceLessons(): LessonSeed[] {
  return [
    scopeLesson({
      gradeLevel: 8,
      skill: "Multiple Central Ideas",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Grade 8 readers often track more than one central idea. Analyze how the ideas interact, which evidence develops each idea, and how the author brings them together.",
      workedExample: "An article about urban gardens may develop one idea about food access and another about community leadership, then show how both ideas support the author's conclusion.",
      task: "Which answer best analyzes two central ideas in a text?",
      choices: ["The author develops one idea about limited resources and another about student leadership, then connects them through the school garden project.", "The text has two long paragraphs.", "The title tells readers the topic.", "The author mentions students twice."],
      correctAnswer: "The author develops one idea about limited resources and another about student leadership, then connects them through the school garden project.",
      explanationDetail: "This answer explains two ideas and how they connect.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Compare Text Structures",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Compare how different structures shape meaning. Ask how chronology, comparison, cause and effect, or problem and solution changes what readers notice.",
      workedExample: "A chronological article emphasizes how an issue changed over time, while a cause-and-effect article emphasizes why the issue happened.",
      task: "Which comparison best analyzes two text structures?",
      choices: ["The first text uses chronology to show change over time, while the second uses cause and effect to explain why the change occurred.", "Both texts use commas.", "One text has more words.", "Both texts are informational."],
      correctAnswer: "The first text uses chronology to show change over time, while the second uses cause and effect to explain why the change occurred.",
      explanationDetail: "This compares how structure affects the presentation of ideas.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Trace and Evaluate Arguments",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Grade 8 argument analysis asks students to trace a claim, evaluate whether reasons are logical, and decide whether evidence is relevant and sufficient.",
      workedExample: "A claim about reducing food waste is stronger when it includes data from the cafeteria, explains the cause of waste, and addresses practical limits.",
      task: "Which answer best evaluates an argument?",
      choices: ["The claim is mostly supported because the author uses relevant survey data, but the argument would be stronger with evidence from more than one school.", "The claim is true because it sounds confident.", "The evidence is strong because it appears near the end.", "The argument is weak because the title is short."],
      correctAnswer: "The claim is mostly supported because the author uses relevant survey data, but the argument would be stronger with evidence from more than one school.",
      explanationDetail: "This answer evaluates relevance and sufficiency of evidence.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Logical Fallacies and Appeals",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Writers may use emotional appeals, weak reasoning, or fallacies. Identify whether the evidence actually proves the claim or merely tries to influence the reader.",
      workedExample: "The statement 'Everyone supports this plan, so it must be best' uses popularity as evidence instead of showing why the plan works.",
      task: "Which statement relies on weak reasoning?",
      choices: ["This policy must be effective because many people shared the post online.", "The policy reduced waste by 18 percent during a six-week pilot.", "The survey included students from all three grade levels.", "The report compares results before and after the change."],
      correctAnswer: "This policy must be effective because many people shared the post online.",
      explanationDetail: "Popularity does not prove effectiveness.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Conflicting Information Across Texts",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Texts on the same topic may present conflicting information. Compare the authors' evidence, dates, sources, and purpose before deciding how to interpret the disagreement.",
      workedExample: "One article may claim a plan saved money, while another says costs increased. A reader should compare what each author measured and when.",
      task: "What should a reader do when two texts give conflicting information?",
      choices: ["Compare the evidence, source, date, and purpose of each text.", "Believe the shorter text automatically.", "Ignore both texts.", "Choose the text with the more interesting title."],
      correctAnswer: "Compare the evidence, source, date, and purpose of each text.",
      explanationDetail: "Conflicting information should be evaluated through evidence and source context.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Author Perspective and Bias",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Perspective and bias influence which details an author includes, emphasizes, or leaves out. Analyze language, evidence choices, and missing viewpoints.",
      workedExample: "An author who only quotes supporters of a proposal may be presenting a limited perspective.",
      task: "Which detail most clearly suggests author bias?",
      choices: ["The author quotes three supporters of the policy but no critics and calls the opposing view foolish.", "The article includes a date.", "The text has a chart.", "The passage explains a vocabulary word."],
      correctAnswer: "The author quotes three supporters of the policy but no critics and calls the opposing view foolish.",
      explanationDetail: "One-sided sources and loaded language can reveal bias.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Visual and Quantitative Evidence",
      domain: "Informational Text",
      standardDomain: "informational",
      explanation: "Visual and quantitative information can strengthen, complicate, or challenge a written claim. Connect data to the author's reasoning.",
      workedExample: "If a graph shows participation decreased after a schedule change, it may challenge an author's claim that the change helped students.",
      task: "How can a graph complicate an author's claim?",
      choices: ["It can show data that partly supports the claim but also reveals an exception or limitation.", "It always repeats the author's exact words.", "It replaces the need to read the passage.", "It proves every claim is false."],
      correctAnswer: "It can show data that partly supports the claim but also reveals an exception or limitation.",
      explanationDetail: "Data can add nuance to a claim.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Figurative Language Effect",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Grade 8 analysis should explain the effect of figurative language, not just identify it. Ask what image, tone, or idea the language creates.",
      workedExample: "If a writer says a rumor spread like smoke, the simile suggests something hard to contain and difficult to see clearly.",
      task: "What is the effect of describing a memory as a locked room?",
      choices: ["It suggests the memory is hidden, difficult to enter, or emotionally protected.", "It proves the character owns a key.", "It means the setting is a house.", "It shows the sentence is nonfiction."],
      correctAnswer: "It suggests the memory is hidden, difficult to enter, or emotionally protected.",
      explanationDetail: "The figurative image creates a deeper idea about memory.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Multiple Themes in Literature",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Literary texts can develop more than one theme. Analyze how conflicts, symbols, character choices, and endings develop related messages.",
      workedExample: "A story may develop themes about ambition and loyalty when a character must choose between personal success and helping a friend.",
      task: "Which answer best analyzes multiple themes?",
      choices: ["The story develops a theme about ambition through the contest and a theme about loyalty through the character's final choice.", "The story has two characters.", "The setting changes once.", "The author uses quotation marks."],
      correctAnswer: "The story develops a theme about ambition through the contest and a theme about loyalty through the character's final choice.",
      explanationDetail: "This answer identifies two themes and the evidence that develops each.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Dialogue and Characterization",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Dialogue can reveal motive, conflict, relationships, and character change. Analyze what a character says, what is implied, and how others respond.",
      workedExample: "A character who says 'I do not need anyone' while accepting help may reveal pride and internal conflict.",
      task: "Which detail best shows dialogue revealing character?",
      choices: ["'I can fix this myself,' Mara snapped, even as she studied the directions her friend had written.", "Mara walked into the room.", "The directions were on paper.", "The story begins after school."],
      correctAnswer: "'I can fix this myself,' Mara snapped, even as she studied the directions her friend had written.",
      explanationDetail: "The dialogue and action reveal pride and conflict.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Dramatic Irony and Suspense",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Dramatic irony occurs when readers know something a character does not. Authors use it to create suspense, humor, or tension.",
      workedExample: "If readers know the missing letter is in the character's backpack, every failed search can become more suspenseful.",
      task: "How does dramatic irony create suspense?",
      choices: ["Readers know important information that a character does not, so they anticipate what may happen next.", "Readers and characters know exactly the same information.", "The author avoids conflict.", "The setting becomes less important."],
      correctAnswer: "Readers know important information that a character does not, so they anticipate what may happen next.",
      explanationDetail: "The gap between reader knowledge and character knowledge builds tension.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Compare Genres on Similar Themes",
      domain: "Literary Text",
      standardDomain: "literature",
      explanation: "Different genres can develop similar themes in different ways. Compare how a poem, story, drama, or myth uses structure, speaker, character, and conflict.",
      workedExample: "A poem may develop perseverance through repeated images, while a story may develop it through a character's choices.",
      task: "Which comparison best analyzes two genres?",
      choices: ["The poem develops resilience through repeated images, while the story develops resilience through a character's decision during conflict.", "Both texts are written in English.", "One text is shorter.", "Both texts have titles."],
      correctAnswer: "The poem develops resilience through repeated images, while the story develops resilience through a character's decision during conflict.",
      explanationDetail: "This comparison explains how genre affects theme development.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Verb Moods and Voice",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Verb voice and mood affect clarity and meaning. Active voice often makes the actor clear; passive voice may emphasize the action or result. Verb mood shows purpose or attitude.",
      workedExample: "Active: The committee approved the plan. Passive: The plan was approved by the committee.",
      task: "Which sentence uses active voice?",
      choices: ["The team revised the proposal after reviewing the data.", "The proposal was revised by the team.", "The data was reviewed by the committee.", "The schedule was changed yesterday."],
      correctAnswer: "The team revised the proposal after reviewing the data.",
      explanationDetail: "The subject, team, performs the action.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Parallel Structure",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Parallel structure uses matching grammatical patterns to make lists and comparisons clear.",
      workedExample: "The plan requires collecting data, interviewing students, and revising the schedule uses parallel -ing phrases.",
      task: "Which sentence uses parallel structure?",
      choices: ["The project requires planning carefully, testing often, and revising honestly.", "The project requires planning carefully, frequent tests, and to revise honestly.", "The project requires careful planning, testing often, and honest.", "Planning carefully, tests, and revision are required."],
      correctAnswer: "The project requires planning carefully, testing often, and revising honestly.",
      explanationDetail: "The three items use the same grammatical pattern.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Ellipses, Dashes, and Punctuation Effects",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Punctuation can clarify relationships and create emphasis. Use dashes, ellipses, and commas intentionally rather than randomly.",
      workedExample: "The final design--lighter, cheaper, and stronger--surprised the judges uses dashes to emphasize extra information.",
      task: "Which sentence uses dashes effectively?",
      choices: ["The solution--simple but unexpected--changed the team's results.", "The solution simple--but unexpected changed--the team's results.", "The--solution simple but unexpected changed the team's results.", "The solution simple but unexpected--changed--the team's results."],
      correctAnswer: "The solution--simple but unexpected--changed the team's results.",
      explanationDetail: "The dashes clearly set off extra information.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Formal Academic Style",
      domain: "Conventions of Standard English",
      standardDomain: "conventions",
      explanation: "Formal academic style uses precise nouns, strong verbs, and objective language. Avoid vague, casual, or exaggerated wording.",
      workedExample: "Revise 'The article totally proves the plan is great' to 'The article provides evidence that the plan reduced waste during the trial period.'",
      task: "Which sentence best maintains formal academic style?",
      choices: ["The evidence indicates that the pilot program reduced waste during lunch periods.", "The program was super amazing and everyone loved it.", "The thing worked a bunch.", "It was basically awesome."],
      correctAnswer: "The evidence indicates that the pilot program reduced waste during lunch periods.",
      explanationDetail: "This sentence is precise, formal, and evidence-focused.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Argument with Counterclaims and Evidence",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Grade 8 argument writing should develop a clear claim, acknowledge counterclaims fairly, and use strong evidence with explanation.",
      workedExample: "A strong paragraph might admit that a plan costs money, then explain how long-term savings and student benefits outweigh the initial cost.",
      task: "Which sentence best integrates a counterclaim into an argument?",
      choices: ["Although the program requires training time, the evidence shows that trained peer tutors improved completion rates over the semester.", "Some people disagree.", "The program is good because it is good.", "Training is a word in the article."],
      correctAnswer: "Although the program requires training time, the evidence shows that trained peer tutors improved completion rates over the semester.",
      explanationDetail: "This sentence fairly acknowledges a concern and responds with evidence.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Informative Synthesis Writing",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Synthesis writing combines ideas from multiple sources into a clear explanation. Organize by idea, not by simply listing one source after another.",
      workedExample: "A synthesis about water conservation might group evidence by household use, school use, and community planning while citing multiple sources in each section.",
      task: "Which plan best supports informative synthesis?",
      choices: ["Group source information by shared ideas, explain patterns, and use evidence from more than one source in each section.", "Summarize source one, then source two, with no connection.", "Copy the longest sentence from each source.", "Use only the source with the easiest vocabulary."],
      correctAnswer: "Group source information by shared ideas, explain patterns, and use evidence from more than one source in each section.",
      explanationDetail: "Synthesis combines sources around ideas and relationships.",
    }),
    scopeLesson({
      gradeLevel: 8,
      skill: "Research Source Credibility",
      domain: "Writing Strategies",
      standardDomain: "tda",
      explanation: "Credible sources are relevant, accurate, current, and supported by evidence. Evaluate who created the source, why it was created, and what evidence it uses.",
      workedExample: "A recent report from a local water authority is usually stronger evidence for water-use data than an anonymous opinion post.",
      task: "Which source would likely be most credible for data about local rainfall?",
      choices: ["A recent report from the local weather service with monthly rainfall totals", "An anonymous comment saying it feels rainy", "A story about a rainy vacation", "A poster with no date or source"],
      correctAnswer: "A recent report from the local weather service with monthly rainfall totals",
      explanationDetail: "The source is current, relevant, and evidence-based.",
    }),
  ];
}

function scopeLesson({
  gradeLevel,
  skill,
  domain,
  standardDomain,
  explanation,
  workedExample,
  task,
  choices,
  correctAnswer,
  explanationDetail,
}: {
  gradeLevel: number;
  skill: string;
  domain: string;
  standardDomain: "literature" | "informational" | "vocabulary" | "conventions" | "tda";
  explanation: string;
  workedExample: string;
  task: string;
  choices: string[];
  correctAnswer: string;
  explanationDetail: string;
}): LessonSeed {
  const standard = standardForSkill(gradeLevel, skill, standardDomain, domain);
  const standardCode = standard.code;
  const baseQuestion = {
    question: task,
    choices,
    correctAnswer,
    explanation: explanationDetail,
    passage: gradeThreeOriginalPassage(domain),
    coachHint: "Read the whole sentence or short passage before choosing.",
  };
  const practice = (phase: string): PracticeQuestion => ({
    ...baseQuestion,
    question: `${phaseLabel(phase)}: ${task}`,
  });
  return {
    gradeLevel,
    standardCode,
    standardLabel: standard.label,
    skill,
    title: `Grade ${gradeLevel} ${skill} Lesson`,
    domain,
    lessonExplanation: explanation,
    workedExample,
    guidedPractice: [practice("guided"), practice("guided check")],
    independentPractice: [practice("independent"), practice("independent check"), practice("independent transfer")],
    exitTicket: [practice("exit ticket")],
    masteryCheck: [practice("mastery"), practice("mastery check")],
    retestRecommendation: `After this lesson, assign one short Grade ${gradeLevel} practice item for ${skill} with a fresh original passage.`,
  };
}

function readingLesson(gradeLevel: number, skill: string, standardDomain: "literature" | "informational" | "vocabulary"): LessonSeed {
  const domain = standardDomain === "literature" ? "Literary Text" : standardDomain === "vocabulary" ? "Vocabulary" : "Informational Text";
  const standard = standardForSkill(gradeLevel, skill, standardDomain, domain);
  const standardCode = standard.code;
  const standardLabel = standard.label;
  const progression = getSkillProgression(skill, gradeLevel);
  const passage = samplePassage(gradeLevel, skill);
  return {
    gradeLevel,
    standardCode,
    standardLabel,
    skill,
    title: `Grade ${gradeLevel} ${skill} Lesson`,
    domain,
    lessonExplanation: explanationForSkill(skill, gradeLevel),
    workedExample: workedExampleForSkill(skill, gradeLevel),
    guidedPractice: [
      questionForSkill(skill, passage, "guided", gradeLevel),
      questionForSkill(skill, passage, "guided evidence", gradeLevel),
    ],
    independentPractice: [
      questionForSkill(skill, passage, "independent", gradeLevel),
      questionForSkill(skill, passage, "independent evidence", gradeLevel),
      questionForSkill(skill, passage, "independent transfer", gradeLevel),
    ],
    exitTicket: [questionForSkill(skill, passage, "exit ticket", gradeLevel)],
    masteryCheck: [
      questionForSkill(skill, passage, "mastery", gradeLevel),
      questionForSkill(skill, passage, "mastery evidence", gradeLevel),
    ],
    retestRecommendation: `After this lesson, assign a short Grade ${gradeLevel} ${skill} practice set. Mastery target: ${progression.masteryExpectation}`,
  };
}

function conventionsLesson(gradeLevel: number, skill: string): LessonSeed {
  const standard = standardForSkill(gradeLevel, skill, "conventions", "Conventions of Standard English");
  const standardCode = standard.code;
  const paragraph = conventionsParagraph(gradeLevel);
  return {
    gradeLevel,
    standardCode,
    standardLabel: standard.label,
    skill,
    title: `Grade ${gradeLevel} ${skill} Lesson`,
    domain: "Conventions of Standard English",
    lessonExplanation: `Conventions questions ask you to make writing clear and correct. Read the whole paragraph first, then check pronouns, verb tense, punctuation, and style in context.`,
    workedExample: `If a sentence says, "A writer should reread the draft because you may notice missing evidence," the pronoun shifts from "a writer" to "you." A better revision keeps the same person: "A writer should reread the draft because the writer may notice missing evidence."`,
    guidedPractice: [
      conventionQuestion(paragraph, skill, "guided"),
      conventionQuestion(paragraph, skill, "guided style"),
    ],
    independentPractice: [
      conventionQuestion(paragraph, skill, "independent"),
      conventionQuestion(paragraph, skill, "independent style"),
      conventionQuestion(paragraph, skill, "independent revision"),
    ],
    exitTicket: [conventionQuestion(paragraph, skill, "exit ticket")],
    masteryCheck: [
      conventionQuestion(paragraph, skill, "mastery"),
      conventionQuestion(paragraph, skill, "mastery revision"),
    ],
    retestRecommendation: `After this lesson, assign one full-screen conventions item that asks students to select or revise a sentence in context.`,
  };
}

function tdaLesson(gradeLevel: number): LessonSeed {
  const standard = standardForSkill(gradeLevel, "TDA Evidence and Explanation", "tda", "Text-Dependent Analysis");
  const standardCode = standard.code;
  return {
    gradeLevel,
    standardCode,
    standardLabel: standard.label,
    skill: "TDA Evidence and Explanation",
    title: `Grade ${gradeLevel} TDA Evidence and Explanation Lesson`,
    domain: "Text-Dependent Analysis",
    lessonExplanation: `A strong TDA does not retell the passage. It answers the prompt with a clear claim, uses evidence from the text, and explains how the evidence proves the claim.`,
    workedExample: `Claim: The character learns to be more responsible. Evidence: The character returns to fix the mistake without being asked. Explanation: This detail matters because the character chooses responsibility even when no one is forcing the choice.`,
    guidedPractice: [
      tdaQuestion("guided", gradeLevel),
      tdaQuestion("guided evidence", gradeLevel),
    ],
    independentPractice: [
      tdaQuestion("independent claim", gradeLevel),
      tdaQuestion("independent evidence", gradeLevel),
      tdaQuestion("independent explanation", gradeLevel),
    ],
    exitTicket: [tdaQuestion("exit ticket", gradeLevel)],
    masteryCheck: [
      tdaQuestion("mastery evidence", gradeLevel),
      tdaQuestion("mastery explanation", gradeLevel),
    ],
    retestRecommendation: `After this lesson, have students revise one paragraph of a TDA and explain how one piece of evidence supports the claim.`,
  };
}

function standardForSkill(
  gradeLevel: number,
  skill: string,
  standardDomain: "literature" | "informational" | "vocabulary" | "conventions" | "tda",
  domain: string,
) {
  return skillStandardOverrides[gradeLevel]?.[skill] || {
    code: gradeStandards[gradeLevel][standardDomain],
    label: `${domain} - ${skill}`,
  };
}

function buildLessonItems(seed: LessonSeed) {
  return [
    { order: 1, itemType: "LESSON", title: "Lesson Explanation", content: { text: seed.lessonExplanation } },
    { order: 2, itemType: "WORKED_EXAMPLE", title: "Worked Example", content: { text: seed.workedExample } },
    { order: 3, itemType: "GUIDED_PRACTICE", title: "Guided Practice", content: { questions: seed.guidedPractice } },
    { order: 4, itemType: "INDEPENDENT_PRACTICE", title: "Independent Practice", content: { questions: seed.independentPractice } },
    { order: 5, itemType: "EXIT_TICKET", title: "Exit Ticket", content: { questions: seed.exitTicket } },
    { order: 6, itemType: "MASTERY_CHECK", title: "Mastery Check", content: { questions: seed.masteryCheck } },
    { order: 7, itemType: "RETEST", title: "Retest Recommendation", content: { text: seed.retestRecommendation } },
  ];
}

function explanationForSkill(skill: string, gradeLevel: number) {
  const progression = getSkillProgression(skill, gradeLevel);
  const progressionFrame = `Grade ${gradeLevel} target: ${progression.cognitiveDemand} Text complexity: ${progression.passageComplexity} Evidence demand: ${progression.evidenceDemand} Reasoning: ${progression.reasoningDepth}`;
  if (skill === "Main Idea") return `Main idea is what the paragraph, section, or whole passage is mostly about. ${progressionFrame}`;
  if (skill === "Inference") return `Inference means using text clues plus what makes sense to figure out an idea the author does not state directly. ${progressionFrame}`;
  if (skill === "Text Evidence") return `Text evidence is the detail, sentence, event, or quotation from the passage that proves an answer. ${progressionFrame}`;
  if (skill === "Theme") return `Theme is the message or lesson a story suggests about life. A theme is usually a complete idea, not one word. ${progressionFrame}`;
  if (skill === "Point of View") return `Point of view is who is telling the story or how an author sees a topic. ${progressionFrame}`;
  return `Connotation and figurative language shape meaning. Look for words or phrases that suggest feelings, images, or nonliteral ideas, then explain their effect. ${progressionFrame}`;
}

function workedExampleForSkill(skill: string, gradeLevel: number) {
  const progression = getSkillProgression(skill, gradeLevel);
  if (skill === "Main Idea") return mainIdeaExample(gradeLevel);
  if (skill === "Inference") return inferenceExample(gradeLevel);
  if (skill === "Text Evidence") return evidenceExample(gradeLevel);
  if (skill === "Theme") return themeExample(gradeLevel);
  if (skill === "Point of View") return pointOfViewExample(gradeLevel);
  return `If an author calls a hallway "a river of students," the phrase does not mean real water. It suggests many students moving quickly together. Grade ${gradeLevel} expectation: ${progression.masteryExpectation}`;
}

function mainIdeaExample(gradeLevel: number) {
  if (gradeLevel <= 3) return "If most details tell how mulch helped the garden hold water, the main idea is that students found a way to keep the garden damp. A small detail, like carrying buckets, supports the idea but is not the whole main idea.";
  if (gradeLevel === 4) return "If one section describes mulch and another describes morning watering, the main idea should include both tested solutions, not just one detail.";
  if (gradeLevel === 5) return "If two related texts describe mulch and rain barrels, a strong summary combines the shared idea: conservation improves when people use more than one water-saving method.";
  if (gradeLevel === 6) return "A Grade 6 central idea answer explains development: the text starts with a dry garden problem, adds test results, and ends with a combined solution.";
  if (gradeLevel === 7) return "A Grade 7 answer tracks interacting central ideas: reducing waste matters, and maintaining routines matters. The final recommendation connects both.";
  return "A Grade 8 answer evaluates refinement: the text begins with water conservation, then refines that idea into evidence-based community problem solving.";
}

function inferenceExample(gradeLevel: number) {
  if (gradeLevel <= 3) return "If students notice dry soil and add mulch, you can infer they are trying to solve the garden problem.";
  if (gradeLevel === 4) return "If students recorded soil data before choosing a solution, you can infer they wanted evidence before deciding.";
  if (gradeLevel === 5) return "If two groups tested different methods and both results were useful, you can infer the best plan may combine strategies.";
  if (gradeLevel === 6) return "If each tool solved a different part of the problem, you can infer students understood the issue had more than one cause.";
  if (gradeLevel === 7) return "If the team recommends routines for checking overflow and moisture, you can infer they care about whether the solution lasts.";
  return "If the committee connects systems, data, revision, and maintenance, you can infer they see the redesign as both practical and educational.";
}

function evidenceExample(gradeLevel: number) {
  if (gradeLevel <= 3) return "For the answer 'mulch helped,' the best evidence is 'the soil stayed damp longer.'";
  if (gradeLevel === 4) return "For the claim that students compared solutions, cite the note that mulch kept soil damp and morning watering helped on hot days.";
  if (gradeLevel === 5) return "For the claim that combined strategies work, cite evidence from both groups: covered soil lost less moisture and stored rainwater reduced hose use.";
  if (gradeLevel === 6) return "For the claim that the strongest plan solved multiple problems, cite the sentence explaining that rain collection and slower watering each solved a different part.";
  if (gradeLevel === 7) return "For the claim that maintenance matters, cite the recommendation about checking overflow and soil moisture.";
  return "For the claim that the central idea is refined, cite the shift from measurable systems to interpreting data, revising routines, and considering maintenance.";
}

function themeExample(gradeLevel: number) {
  if (gradeLevel <= 3) return "If students keep trying until the garden improves, a theme could be: paying attention to a problem helps people solve it.";
  if (gradeLevel === 4) return "If students test more than one solution, a theme could be: careful testing leads to better decisions.";
  if (gradeLevel === 5) return "If groups combine what they learned, a theme could be: people make stronger progress when they learn from one another.";
  return "A stronger upper-grade theme explains a larger idea: responsible problem solving requires evidence, revision, and cooperation.";
}

function pointOfViewExample(gradeLevel: number) {
  if (gradeLevel <= 3) return "If the text says 'students noticed' and 'they added mulch,' the narrator is outside the story and tells about the class.";
  if (gradeLevel === 4) return "The narrator emphasizes observations and notes, which presents the students as careful investigators.";
  if (gradeLevel === 5) return "The account focuses on evidence from two groups, shaping the reader to see the project as collaborative research.";
  return "The author emphasizes evidence, revision, and realistic maintenance, revealing a point of view that values practical problem solving.";
}

function samplePassage(gradeLevel: number, skill: string) {
  if (gradeLevel <= 3) {
    return "The class garden needed more water. Students carried small buckets each morning. Soon they noticed that the soil stayed dry by lunch. They added mulch around the plants, and the soil stayed damp longer. The plants grew stronger during the next week.";
  }
  if (gradeLevel === 4) {
    return "The fourth-grade science club wanted the school garden to use less water. First, students recorded how dry the soil felt each afternoon. Then they compared two solutions: adding mulch and watering earlier in the morning. After two weeks, the notes showed that mulch kept the soil damp longer, while morning watering helped on very hot days.";
  }
  if (gradeLevel === 5) {
    return "Two classes studied ways to protect the school garden during dry weather. One group tested mulch and found that covered soil lost less moisture. Another group studied rain barrels and learned that stored rainwater reduced the need for extra hose water. Taken together, the projects showed that conservation works best when students combine daily habits with tools that save resources.";
  }
  if (gradeLevel === 6) {
    return "During a dry spring, students redesigned part of the schoolyard to conserve water. Early observations showed that the garden needed more water than students could easily carry. Teams tested mulch, rain barrels, and drip irrigation, then compared weekly results. The strongest plan combined rain collection with slower watering because each tool solved a different part of the problem.";
  }
  if (gradeLevel === 7) {
    return "A community science team evaluated how a schoolyard could conserve water while supporting plant growth. Their first central finding was that conservation required reducing waste; their second was that long-term maintenance mattered as much as the first week of results. The final recommendation connected both ideas by pairing rain barrels with simple student routines for checking overflow and soil moisture.";
  }
  return "A student research committee studied whether a redesigned schoolyard could serve both environmental and instructional goals. The report first argues that water conservation depends on measurable systems, such as rain collection and drip irrigation. It then refines that claim by showing that systems alone are not enough: students must interpret data, revise routines, and consider maintenance over time. The central idea develops from a simple conservation goal into a broader argument about evidence-based community problem solving.";
}

function gradeThreeOriginalPassage(domain: string) {
  if (domain === "Literary Text") {
    return "Nora wanted to build the tallest block tower in the room. When it fell twice, she took a breath, sorted the blocks by size, and tried again. Her friend Eli held the base steady. This time, the tower stood until cleanup.";
  }
  if (domain === "Informational Text") {
    return "A school compost bin can turn fruit peels and leaves into rich soil. Students add plant scraps, mix the pile, and keep it slightly damp. Over time, tiny living things break down the scraps. The soil can help a garden grow.";
  }
  if (domain === "Vocabulary" || domain === "Reading Foundations") {
    return "The class found a smooth stone beside the stream. Later, they carefully wrote notes about the shape, color, and size of each object they collected.";
  }
  if (domain === "Writing Strategies" || domain === "Text-Dependent Analysis") {
    return "A good response stays focused on the prompt. It gives a clear idea, includes details from the text, and explains why those details matter.";
  }
  return "The students revised a paragraph about a class project. They checked each sentence for clear meaning, correct punctuation, and words that matched the formal style of the report.";
}

function questionForSkill(skill: string, passage: string, phase: string, gradeLevel: number): PracticeQuestion {
  const progression = getSkillProgression(skill, gradeLevel);
  const choicesBySkill: Record<string, string[]> = {
    "Main Idea": mainIdeaChoices(gradeLevel),
    Inference: inferenceChoices(gradeLevel),
    "Text Evidence": evidenceChoices(gradeLevel),
    Theme: themeChoices(gradeLevel),
    "Point of View": pointOfViewChoices(gradeLevel),
    "Connotation and Figurative Language": figurativeChoices(gradeLevel),
  };
  const correct = choicesBySkill[skill][0];
  return {
    passage,
    question: `${phaseLabel(phase)}: ${progression.cognitiveDemand}`,
    choices: choicesBySkill[skill],
    correctAnswer: correct,
    explanation: `The best answer is "${correct}" because it meets this Grade ${gradeLevel} expectation: ${progression.masteryExpectation}`,
    coachHint: progression.evidenceDemand,
  };
}

function mainIdeaChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["Students found a way to help the garden hold water.", "Students played in the garden.", "The garden had many colors.", "The class stopped caring for plants."];
  if (gradeLevel === 4) return ["Students compared two ways to help the garden use water wisely.", "The students only watered plants in the afternoon.", "The garden did not need observations.", "Mulch and morning watering are unrelated."];
  if (gradeLevel === 5) return ["Different conservation methods can work together to protect a garden.", "One class studied only rain barrels.", "Dry weather makes gardens impossible.", "The project was mostly about carrying buckets."];
  if (gradeLevel === 6) return ["A combined water-saving plan solved more than one part of the schoolyard problem.", "Students chose the first idea they tried.", "The report is mostly about spring weather.", "The tools worked exactly the same way."];
  if (gradeLevel === 7) return ["Successful conservation depends on reducing waste and maintaining routines over time.", "The report gives only one central idea.", "Rain barrels are mentioned but never evaluated.", "Student routines are unrelated to conservation."];
  return ["The central idea develops from saving water to using evidence for broader community problem solving.", "The text argues that tools alone solve every problem.", "The text mostly lists unrelated school supplies.", "The central idea stays simple and unchanged."];
}

function inferenceChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["The students noticed a problem and tried to fix it.", "The students wanted the garden to dry out.", "The students never checked the plants.", "The mulch made the soil disappear."];
  if (gradeLevel === 4) return ["The students used observations before deciding which solution worked best.", "The students guessed without collecting information.", "The students stopped the project after one day.", "The garden did not change."];
  if (gradeLevel === 5) return ["The best conservation plan may need more than one strategy.", "Only one class learned anything useful.", "Stored rainwater was not helpful.", "The project was unrelated to resources."];
  if (gradeLevel === 6) return ["The students understood that different tools could solve different parts of a problem.", "The students avoided comparing results.", "The project became less realistic over time.", "The dry spring was not important."];
  if (gradeLevel === 7) return ["The team valued solutions students could maintain after the first test period.", "The team cared only about the first week.", "The team ignored soil moisture.", "The report rejects student routines."];
  return ["The committee sees conservation as both a technical and instructional challenge.", "The committee believes data is unnecessary.", "The report dismisses maintenance.", "The redesign has no educational purpose."];
}

function evidenceChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["They added mulch, and the soil stayed damp longer.", "The class had a garden.", "Students carried buckets.", "The plants were in soil."];
  if (gradeLevel === 4) return ["The notes showed that mulch kept soil damp longer and morning watering helped on hot days.", "The students were in fourth grade.", "The garden was at school.", "The project lasted two weeks."];
  if (gradeLevel === 5) return ["One group found covered soil lost less moisture, and another found stored rainwater reduced hose use.", "Two classes studied the garden.", "The weather was dry.", "The project happened at school."];
  if (gradeLevel === 6) return ["The strongest plan combined rain collection with slower watering because each tool solved a different part of the problem.", "Students worked during spring.", "Teams compared weekly results.", "The schoolyard had a garden."];
  if (gradeLevel === 7) return ["The recommendation paired rain barrels with student routines for checking overflow and soil moisture.", "The team evaluated a schoolyard.", "The text mentions plant growth.", "The project had a final recommendation."];
  return ["The report refines the claim by showing students must interpret data, revise routines, and consider maintenance over time.", "The committee studied a schoolyard.", "The report mentions systems.", "The text includes the word goals."];
}

function themeChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["Paying attention to a problem can help people find a solution.", "Gardens are always easy to grow.", "Plants do not need care.", "Working slowly is never useful."];
  if (gradeLevel === 4) return ["Careful testing can lead to better choices.", "Only one idea should ever be tried.", "Notes do not help solve problems.", "Hot days are not important."];
  if (gradeLevel === 5) return ["People make stronger progress when they combine ideas and learn from evidence.", "Teamwork prevents all mistakes.", "Tools matter more than people.", "Dry weather always wins."];
  return ["Responsible problem solving grows from evidence, revision, and cooperation.", "Fast answers are always best.", "Community problems cannot be solved.", "Data makes decisions weaker."];
}

function pointOfViewChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["The narrator tells about the class as problem solvers.", "The narrator is one plant in the garden.", "The narrator says the class failed.", "The narrator dislikes all science."];
  if (gradeLevel === 4) return ["The narrator presents the students as careful investigators.", "The narrator makes fun of the students.", "The narrator hides the results.", "The narrator says observations are useless."];
  if (gradeLevel === 5) return ["The account emphasizes student research and cooperation.", "The account focuses only on one student's feelings.", "The narrator argues conservation is impossible.", "The narrator ignores the class results."];
  return ["The author presents evidence-based problem solving as valuable and realistic.", "The author treats the project as a joke.", "The author avoids explaining the recommendation.", "The author believes routines do not matter."];
}

function figurativeChoices(gradeLevel: number) {
  if (gradeLevel <= 3) return ["It suggests many students were moving together.", "It means water filled the hallway.", "It means students were fish.", "It means the hallway was empty."];
  if (gradeLevel === 4) return ["It creates an image of busy movement.", "It proves the hallway was outside.", "It gives a literal measurement.", "It changes the setting to a river."];
  if (gradeLevel === 5) return ["It emphasizes the crowded, flowing movement of students.", "It suggests students were silent.", "It removes the image from the sentence.", "It shows the speaker is underwater."];
  return ["It uses a comparison to shape tone and help readers picture the movement.", "It is a literal statement about water.", "It weakens the image.", "It proves the author dislikes students."];
}

function conventionsParagraph(gradeLevel: number) {
  return `(1) When students revise an essay, they should check whether each detail supports the claim. (2) A writer should reread the draft because you may notice missing evidence. (3) The class discussed its ideas before writing the final paragraph. (4) Clear organization helps readers follow the explanation.`;
}

function conventionQuestion(paragraph: string, skill: string, phase: string): PracticeQuestion {
  const correct = skill.includes("Formal") ? "Sentence 2 should be revised to maintain formal style." : "Sentence 2 contains an inappropriate pronoun shift.";
  return {
    passage: paragraph,
    question: `${phaseLabel(phase)}: Read the paragraph. Which sentence should be revised?`,
    choices: [
      correct,
      "Sentence 1 should remove the word students.",
      "Sentence 3 should change class to classes.",
      "Sentence 4 should use informal language.",
    ],
    correctAnswer: correct,
    explanation: "Sentence 2 shifts from a general noun to you. Keeping pronouns consistent makes the writing clearer and more formal.",
    coachHint: "Check whether the sentence keeps the same person and style from beginning to end.",
  };
}

function tdaQuestion(phase: string, gradeLevel: number): PracticeQuestion {
  return {
    question: `${phaseLabel(phase)}: Which revision best teaches a Grade ${gradeLevel} writer to explain evidence instead of just listing it?`,
    choices: [
      "Add a sentence that explains how the evidence proves the claim.",
      "Copy a longer sentence from the passage.",
      "Start a new paragraph with no evidence.",
      "Replace the claim with a summary of the story.",
    ],
    correctAnswer: "Add a sentence that explains how the evidence proves the claim.",
    explanation: "A TDA needs evidence and analysis. The explanation shows why the evidence matters.",
    coachHint: "Use because to connect the evidence back to the claim.",
  };
}

function phaseLabel(phase: string) {
  return phase.replace(/\b\w/g, (char) => char.toUpperCase());
}
