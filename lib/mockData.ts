import { Question, Student } from "@/types";

export const demoStudent: Student = {
  id: "demo-student",
  name: "Current Student",
  grade: 6,
  teacherName: "Ms. Carter",
  schoolName: "Liberty Middle School"
};

export const skillOrder = ["Inference", "Text Evidence", "Main Idea"];
export const totalSimQuestions = 5;

export const questionBank: Question[] = [
  {
    id: 1, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", difficulty: 2, type: "MCQ", passageTitle: "The Hummingbird's Journey", passage: "Each year, ruby-throated hummingbirds migrate long distances and rely on strong wings and a high-energy diet to survive the trip.", question: "Which detail best supports the idea that hummingbirds are well adapted for migration?", choices: ["They migrate hundreds of miles each year.", "They weigh less than a nickel.", "They rely on strong wings and a high-energy diet.", "They live in North America."], correctIndex: 2, explanation: "This detail directly explains the trait that helps the birds survive migration.", distractorRationale: ["Related but not best.", "Too narrow.", "Correct.", "Not relevant."], skillTip: "Choose the detail that best proves how the trait helps."
  },
  {
    id: 2, skill: "Inference", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence and make inferences", difficulty: 4, type: "EBSR", passageTitle: "The Hummingbird's Journey", passage: "Before migration, hummingbirds eat more often than usual. During the trip, they cannot stop for long, so stored energy is essential.", partAQuestion: "What can the reader infer about feeding before migration?", partAChoices: ["They stop eating during travel.", "They prepare in advance for a difficult trip.", "They only eat when food is easy to find.", "They prefer short trips."], partACorrectIndex: 1, partBQuestion: "Which TWO details support Part A?", partBChoices: ["Hummingbirds eat more often than usual before migration.", "They cannot stop for long during the trip.", "They live in the eastern United States.", "Stored energy is essential."], partBCorrectIndices: [0,3], explanation: "The text shows preparation and the need for stored energy.", skillTip: "Answer Part A first, then pick the evidence that directly proves it."
  },
  {
    id: 3, skill: "Text Evidence", standardCode: "CC.1.2.6.B", standardLabel: "Cite textual evidence to support analysis", difficulty: 2, type: "HOT_TEXT", passageTitle: "Community Garden", passage: "At first, only a few people volunteered. After the first harvest, more families joined, and local businesses donated tools and seeds. By summer, the garden became a source of pride.", hotTextPrompt: "Select the sentence that best supports the conclusion that the project became more popular over time.", selectableSpans: ["At first, only a few people volunteered.", "After the first harvest, more families joined, and local businesses donated tools and seeds.", "By summer, the garden became a source of pride."], correctSpanIndices: [1], explanation: "That sentence directly shows the project gained support over time.", distractorRationale: ["Beginning only.", "Correct.", "Positive outcome but weaker proof."], skillTip: "Choose the sentence that most directly proves the conclusion."
  },
  {
    id: 4, skill: "Main Idea", standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", difficulty: 3, type: "MULTI_SELECT", passageTitle: "Recycling at School", passage: "Students separated paper, plastic, and aluminum during lunch. Within a month, trash bins filled more slowly, and the school raised money by recycling cans.", question: "Which TWO details best support the idea that the recycling program was successful?", choices: ["Students separated paper, plastic, and aluminum.", "Trash bins filled more slowly.", "The school raised money by recycling cans.", "Lunch is important."], correctIndices: [1,2], explanation: "Reduced waste and raising money are the strongest evidence of success.", distractorRationale: ["Participation only.", "Correct.", "Correct.", "Not relevant."], skillTip: "Choose all correct answers, not just one."
  },
  {
    id: 5, skill: "Main Idea", standardCode: "CC.1.2.6.A", standardLabel: "Determine a central idea and summarize", difficulty: 4, type: "DRAG_DROP", passageTitle: "Recycling at School", passage: "Teachers noticed that students began reminding one another to sort their trash correctly. Soon, students suggested adding labeled bins in the hallways and library, spreading the program beyond the cafeteria.", dragDropPrompt: "Sort each detail into the correct category.", categories: ["Shows Student Leadership", "Shows Program Growth"], dragItems: [{id:"d1",text:"Students reminded one another to sort trash correctly."},{id:"d2",text:"Labeled bins were added in the hallways and library."},{id:"d3",text:"Students suggested expanding the program beyond the cafeteria."},{id:"d4",text:"The recycling effort spread to new parts of the school."}], correctMapping: {d1:"Shows Student Leadership",d2:"Shows Program Growth",d3:"Shows Student Leadership",d4:"Shows Program Growth"}, explanation: "Some details show leadership, others show growth.", distractorRationale: "Sort details into the category they best prove.", skillTip: "Ask whether each detail shows who led or how the effort grew."
  }
];
