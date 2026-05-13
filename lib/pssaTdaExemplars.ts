export type PssaTdaExemplar = {
  passage: string;
  prompt: string;
  essay: string;
  expectedOutput: {
    score: number;
    scoring_rationale: string;
    performance_level: "Below Basic" | "Basic" | "Proficient" | "Advanced";
    strengths: { claim: string; evidence_quote: string }[];
    areas_for_growth: { claim: string; evidence_quote: string }[];
    feedback: string;
    next_steps: string[];
  };
};

const sharedPassage = `The community center's garden had been quiet for years. Weeds covered the beds, and the old sign near the gate leaned toward the sidewalk. When Mira's class visited, she noticed that the soil was dry but still dark underneath. Her teacher explained that neighbors once grew tomatoes, peppers, and herbs there for families who needed fresh food. Mira wondered why people had stopped caring for it.

The next Saturday, Mira returned with her grandfather and three classmates. At first, the work felt too large. They pulled weeds, carried cracked pots away, and wrote down which tools were missing. By noon, two neighbors had stopped to tell stories about summer meals made from the garden. One neighbor brought a box of seeds. Another promised to repair the sign. Mira realized the garden was not only a place for plants. It was a place where people remembered how to help each other.`;

const prompt = "Write an essay analyzing how Mira's understanding of the garden changes. Use evidence from the passage to support your response.";

export const pssaTdaExemplars: PssaTdaExemplar[] = [
  {
    passage: sharedPassage,
    prompt,
    essay: "The community center's garden had been quiet for years. Weeds covered the beds, and the old sign near the gate leaned toward the sidewalk. When Mira's class visited, she noticed that the soil was dry but still dark underneath. Her teacher explained that neighbors once grew tomatoes, peppers, and herbs there for families who needed fresh food.",
    expectedOutput: {
      score: 1,
      scoring_rationale: "The response mostly copies passage language and does not analyze how Mira's understanding changes. It provides little original explanation connected to the TDA prompt.",
      performance_level: "Below Basic",
      strengths: [],
      areas_for_growth: [{ claim: "The response needs an original claim about Mira's change in understanding.", evidence_quote: "" }],
      feedback: "Your response uses words from the passage, but it does not yet explain your own thinking about Mira. A stronger TDA essay makes a claim, uses evidence, and explains how that evidence proves the claim.",
      next_steps: ["Write one claim that answers how Mira changes.", "Use evidence in your own sentence instead of copying a long section.", "Explain why the evidence matters."],
    },
  },
  {
    passage: sharedPassage,
    prompt,
    essay: "Mira changes because she likes the garden more. At first the garden is messy and has weeds. The passage says, \"Weeds covered the beds,\" so it was not a very good place. Later people come to help. A neighbor brings seeds and another person says they will fix the sign. This shows the garden is important. Mira understands that people can work together. The garden is not only about plants because people used it before. This is why her idea changes by the end.",
    expectedOutput: {
      score: 2,
      scoring_rationale: "The response gives an emerging claim and some relevant evidence, but the explanation is general and only partly connected to Mira's deeper realization. Organization and analysis are developing.",
      performance_level: "Basic",
      strengths: [{ claim: "The response identifies a change in Mira's thinking.", evidence_quote: "Mira understands that people can work together." }],
      areas_for_growth: [{ claim: "Evidence needs more explanation about how it proves Mira's deeper understanding.", evidence_quote: "A neighbor brings seeds and another person says they will fix the sign." }],
      feedback: "You have a basic claim and you use details from the passage. To improve, explain how each detail proves that Mira learns the garden connects people, not just that people helped.",
      next_steps: ["Add a clearer claim about Mira's realization.", "After each quote or detail, explain what Mira learns.", "Use a closing sentence that connects back to the prompt."],
    },
  },
  {
    passage: sharedPassage,
    prompt,
    essay: "Mira's understanding changes from seeing the garden as an abandoned place to seeing it as a place that can bring the community together. At first, the garden looks forgotten because \"Weeds covered the beds\" and the sign is leaning by the sidewalk. These details show why Mira wonders why people stopped caring for it. When she returns to work, she sees neighbors respond. One neighbor \"brought a box of seeds,\" and another \"promised to repair the sign.\" These actions help Mira understand that the garden still matters to people. By the end, she realizes it is \"not only a place for plants\" because it helps neighbors remember how to support each other. This shows that Mira learns the garden's real value is community.",
    expectedOutput: {
      score: 3,
      scoring_rationale: "The response presents clear analysis of Mira's changed understanding and supports it with relevant evidence. Explanation connects the evidence to the claim, though the insight is more clear than thorough.",
      performance_level: "Proficient",
      strengths: [{ claim: "The response states a clear analytical claim.", evidence_quote: "Mira's understanding changes from seeing the garden as an abandoned place to seeing it as a place that can bring the community together." }],
      areas_for_growth: [{ claim: "The response could further explain why the neighbors' memories deepen Mira's understanding.", evidence_quote: "These actions help Mira understand that the garden still matters to people." }],
      feedback: "Your essay clearly answers the prompt and uses specific evidence. Your explanations show how Mira's view changes, and adding one more sentence about the neighbors' memories would make the analysis even stronger.",
      next_steps: ["Explain the importance of the neighbors' stories.", "Connect the final sentence directly to Mira's changed understanding.", "Check that each paragraph has claim, evidence, and explanation."],
    },
  },
  {
    passage: sharedPassage,
    prompt,
    essay: "Mira's understanding of the garden changes because she learns that a neglected place can still hold a community's shared responsibility. At the beginning, she sees only damage: \"Weeds covered the beds,\" and the sign \"leaned toward the sidewalk.\" Those images make the garden seem forgotten, so Mira wonders why people stopped caring. Her thinking changes when the cleanup brings neighbors back into the story of the garden. The detail that one neighbor \"brought a box of seeds\" shows that people are willing to invest in its future, while another neighbor's promise to repair the sign shows pride returning to the space. Most importantly, Mira realizes the garden was \"not only a place for plants.\" That line proves she now understands the garden as a symbol of people helping one another. Her change is not just from dislike to like; it is from seeing an empty lot to recognizing a community connection.",
    expectedOutput: {
      score: 4,
      scoring_rationale: "The response offers insightful analysis of Mira's changed understanding, uses multiple precise pieces of evidence, and thoroughly explains how each supports the claim. Organization and language are strong.",
      performance_level: "Advanced",
      strengths: [{ claim: "The response gives an insightful interpretation of Mira's change.", evidence_quote: "Her change is not just from dislike to like; it is from seeing an empty lot to recognizing a community connection." }],
      areas_for_growth: [],
      feedback: "Your response gives a thoughtful claim, uses strong evidence, and explains how the details build Mira's new understanding. The analysis goes beyond retelling by explaining the garden as a symbol of community responsibility.",
      next_steps: ["Keep using precise embedded quotes.", "Maintain this claim-evidence-explanation pattern.", "Proofread for small convention errors before submitting."],
    },
  },
];
