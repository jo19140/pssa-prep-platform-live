export function letter(index: number) {
  return String.fromCharCode(65 + index);
}
export function formatTime(sec: number) {
  return `${Math.max(1, Math.round(sec / 60))} minutes`;
}
