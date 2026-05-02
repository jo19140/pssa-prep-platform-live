export function letter(index: number) {
  return String.fromCharCode(65 + index);
}
export function formatTime(sec: number) {
  const totalSeconds = Math.max(0, Math.round(sec || 0));
  if (totalSeconds < 60) return `${totalSeconds} seconds`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (!seconds) return `${minutes} ${minutes === 1 ? "minute" : "minutes"}`;
  return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ${seconds} seconds`;
}
