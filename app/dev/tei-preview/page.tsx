"use client";

import { useState } from "react";
import { TEIItemRenderer } from "@/components/tei/TEIItemRenderer";
import type { StudentResponse } from "@/lib/teiScoring";

const passage = "Mara reread the article about school gardens. The author explains that gardens help students observe plant growth, collect data, and work together. One paragraph describes students measuring seedlings every Friday. Another paragraph explains how the class used the vegetables in a community dinner.";

const sampleItems = [
  {
    type: "mc",
    question: "Which detail best supports the idea that the garden helps students learn science?",
    passage,
    choices: ["Students measured seedlings every Friday.", "The dinner happened in the evening.", "Mara reread the article.", "The garden was near the school."],
    correctAnswer: "Students measured seedlings every Friday.",
    rightAnswerRationale: "Measuring seedlings is a specific science activity, so it supports the learning claim.",
    coachHint: "Choose the detail that proves the claim directly.",
    distractorRationale: [
      { choice: "The dinner happened in the evening.", whyWrong: "That tells when something happened, not how students learned science." },
      { choice: "Mara reread the article.", whyWrong: "That describes Mara's action, not evidence about the garden." },
      { choice: "The garden was near the school.", whyWrong: "Location does not prove science learning." },
    ],
  },
  {
    type: "inline-dropdown",
    question: "Choose the word that best completes the rule.",
    sentence: "A central idea covers [BLANK] of the important details in a passage.",
    dropdownOptions: ["most", "one", "none"],
    correctOption: "most",
    rightAnswerRationale: "A central idea must cover most of the important details, not just one fact.",
    coachHint: "Think about the whole passage.",
    distractorRationale: [
      { option: "one", whyWrong: "One detail is usually too narrow to be the central idea." },
      { option: "none", whyWrong: "A central idea must connect to the passage's details." },
    ],
  },
  {
    type: "hot-text-word",
    question: "Choose the correctly written word in each pair.",
    sentence: "The students [measures / measure] the plants and [records / record] the data.",
    bracketPairs: [
      { options: ["measures", "measure"], correct: "measure" },
      { options: ["records", "record"], correct: "record" },
    ],
    rightAnswerRationale: "The plural subject students needs plural verbs: measure and record.",
    coachHint: "Match each verb to the subject students.",
  },
  {
    type: "hot-text-phrase",
    question: "Select two phrases that are context clues for the word observe.",
    passage,
    selectablePhrases: ["reread the article", "measuring seedlings", "collect data", "community dinner"],
    correctPhrases: ["measuring seedlings", "collect data"],
    minSelect: 2,
    maxSelect: 2,
    rightAnswerRationale: "Measuring seedlings and collecting data both show what observe means in this context.",
    coachHint: "Find phrases that explain looking carefully and recording information.",
  },
  {
    type: "hot-text-sentence",
    question: "Which sentence best supports the central idea?",
    paragraph: "(1) Mara reread the article about school gardens. (2) The author explains that gardens help students observe plant growth, collect data, and work together. (3) The dinner happened on Friday. (4) The school is near a park.",
    sentenceCount: 4,
    correctSentenceNumber: 2,
    rightAnswerRationale: "Sentence 2 states the broad idea that the other details support.",
    coachHint: "Pick the sentence that covers the whole paragraph.",
  },
  {
    type: "hot-text-phrase",
    question: "Select phrases that border punctuation.",
    passage: "During review, students collect data, compare notes, and share findings. The strongest detail is the community dinner.",
    selectablePhrases: ["collect data", "community dinner"],
    correctPhrases: ["collect data", "community dinner"],
    minSelect: 2,
    maxSelect: 2,
    rightAnswerRationale: "Both phrases should be selectable even though one ends before a comma and one ends before a period.",
    coachHint: "Punctuation should not block a phrase from being selected.",
  },
  {
    type: "hot-text-phrase",
    question: "Select the phrase with internal punctuation.",
    passage: "The report praised students, who reread the article, because their revisions were more accurate.",
    selectablePhrases: ["students, who reread"],
    correctPhrases: ["students, who reread"],
    minSelect: 1,
    maxSelect: 1,
    rightAnswerRationale: "The phrase includes internal punctuation and still matches as one selectable phrase.",
    coachHint: "Look for the full phrase, including the comma inside it.",
  },
  {
    type: "drag-drop-table",
    question: "Sort each detail by what it supports.",
    draggableItems: ["measured seedlings", "used vegetables at dinner", "worked in teams", "collected data"],
    columns: ["Science learning", "Community connection"],
    correctMapping: [
      { item: "measured seedlings", column: "Science learning" },
      { item: "collected data", column: "Science learning" },
      { item: "used vegetables at dinner", column: "Community connection" },
      { item: "worked in teams", column: "Community connection" },
    ],
    rightAnswerRationale: "The details either show science work or how the garden connected students to others.",
    coachHint: "Ask what each detail proves.",
  },
  {
    type: "drag-drop-order",
    question: "Put the events in the order they happen.",
    draggableItems: ["Students plant seeds.", "Students measure seedlings.", "Students harvest vegetables.", "Students share food at dinner."],
    correctOrder: ["Students plant seeds.", "Students measure seedlings.", "Students harvest vegetables.", "Students share food at dinner."],
    rightAnswerRationale: "The order follows the garden from planting to sharing the harvest.",
    coachHint: "Look for what must happen first.",
  },
  {
    type: "evidence-mapping",
    question: "Match each claim to the evidence that supports it.",
    passage,
    claims: ["The garden supports science learning.", "The garden builds community."],
    evidenceItems: ["students measuring seedlings every Friday", "used the vegetables in a community dinner", "Mara reread the article"],
    correctMapping: [
      { claim: "The garden supports science learning.", evidenceItems: ["students measuring seedlings every Friday"] },
      { claim: "The garden builds community.", evidenceItems: ["used the vegetables in a community dinner"] },
    ],
    rightAnswerRationale: "Each claim needs evidence that proves that exact idea.",
    coachHint: "Match evidence to the claim it proves most directly.",
  },
  {
    type: "multi-select",
    question: "Select two details that support the central idea.",
    choices: ["students measuring seedlings", "students collecting data", "the article was reread", "the dinner was on Friday"],
    correctAnswers: ["students measuring seedlings", "students collecting data"],
    minSelect: 2,
    maxSelect: 2,
    partialCreditRule: "per-correct",
    rightAnswerRationale: "Both selected details show learning work connected to the garden.",
    coachHint: "Choose details that prove the main learning idea.",
  },
  {
    type: "two-part-ebsr",
    question: "Answer Part A, then choose evidence in Part B.",
    partA: {
      question: "What is the central idea of the passage?",
      choices: ["School gardens can support learning and community.", "Mara dislikes gardens.", "Community dinners happen every week.", "Seedlings grow only on Fridays."],
      correctAnswer: "School gardens can support learning and community.",
    },
    partB: {
      question: "Which two details best support Part A?",
      choices: ["students measuring seedlings every Friday", "used the vegetables in a community dinner", "Mara reread the article", "The author explains"],
      correctAnswers: ["students measuring seedlings every Friday", "used the vegetables in a community dinner"],
    },
    scoringRule: "B-counts-only-if-A-correct",
    rightAnswerRationale: "Part A states the central idea, and Part B gives one learning detail and one community detail.",
    coachHint: "Part B must prove the answer you chose in Part A.",
  },
];

export default function TeiPreviewPage() {
  const [responses, setResponses] = useState<StudentResponse[]>([]);
  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-5xl">
        <h1 className="text-3xl font-black text-slate-950">TEI Preview</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600">One sample of each V2 practice item type. Responses are local only.</p>
        <div className="mt-6 grid gap-5">
          {sampleItems.map((item, index) => (
            <TEIItemRenderer key={`${item.type}-${index}`} item={item} index={index} disabled={responses.some((response) => response.itemId.includes(`${item.type}-${index}`))} onSubmit={(response) => setResponses((previous) => [...previous, response])} />
          ))}
        </div>
      </div>
    </main>
  );
}
