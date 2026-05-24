"use client";

export interface TTSProvider {
  speak(text: string, options?: { rate?: number; voice?: string }): Promise<void>;
  cancel(): void;
  isAvailable(): boolean;
}

export class BrowserSpeechSynthesisProvider implements TTSProvider {
  isAvailable() {
    return typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
  }

  speak(text: string, options?: { rate?: number; voice?: string }) {
    return new Promise<void>((resolve, reject) => {
      if (!this.isAvailable()) {
        reject(new Error("Browser SpeechSynthesis is not available."));
        return;
      }
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = options?.rate ?? 0.95;
      const voiceName = options?.voice;
      if (voiceName) {
        const voice = window.speechSynthesis.getVoices().find((candidate) => candidate.name === voiceName);
        if (voice) utterance.voice = voice;
      }
      utterance.onend = () => resolve();
      utterance.onerror = () => reject(new Error("Speech synthesis failed."));
      window.speechSynthesis.speak(utterance);
    });
  }

  cancel() {
    if (this.isAvailable()) window.speechSynthesis.cancel();
  }
}

export const browserTts = new BrowserSpeechSynthesisProvider();
