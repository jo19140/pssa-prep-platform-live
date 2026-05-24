"use client";

import type { TTSProvider } from "@/lib/voice/tts";

export class OpenAiTtsProvider implements TTSProvider {
  private browserFallback = new BrowserTtsFallback();
  private currentAudio: HTMLAudioElement | null = null;

  isAvailable() {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }

  async speak(text: string, options?: { rate?: number; voice?: string }) {
    if (!this.isAvailable()) return this.browserFallback.speak(text, options);
    try {
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text,
          voice: options?.voice || "shimmer",
          model: "tts-1",
        }),
      });
      if (!response.ok) throw new Error(`OpenAI TTS proxy failed: ${response.status}`);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      await this.playBlobUrl(url, options?.rate);
    } catch (error) {
      console.warn("OpenAI TTS failed; falling back to browser SpeechSynthesis.", { error });
      await this.browserFallback.speak(text, options);
    }
  }

  cancel() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio = null;
    }
    this.browserFallback.cancel();
  }

  private playBlobUrl(url: string, rate?: number) {
    return new Promise<void>((resolve, reject) => {
      const audio = new Audio(url);
      this.currentAudio = audio;
      audio.playbackRate = rate ?? 1;
      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) this.currentAudio = null;
        resolve();
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) this.currentAudio = null;
        reject(new Error("OpenAI TTS audio playback failed."));
      };
      audio.play().catch((error) => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === audio) this.currentAudio = null;
        reject(error);
      });
    });
  }
}

class BrowserTtsFallback implements TTSProvider {
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
