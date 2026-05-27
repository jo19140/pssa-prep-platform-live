type StudentVisibleDiagnosticItem = {
  id: string;
  strand: string;
  itemType: string;
  studentPromptJson: unknown;
  stimulusJson: unknown;
};

export function toStudentDiagnosticItemView(item: StudentVisibleDiagnosticItem) {
  return {
    id: item.id,
    strand: item.strand,
    itemType: item.itemType,
    studentPromptJson: item.studentPromptJson,
    stimulusJson: item.stimulusJson,
  };
}
