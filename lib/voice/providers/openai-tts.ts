"use client";

import type { TTSProvider } from "@/lib/voice/tts";

const DEFAULT_VOICE = "shimmer";
const DEFAULT_MODEL = "tts-1";

export class OpenAiTtsProvider implements TTSProvider {
  private currentAudio: HTMLAudioElement | null = null;

  constructor(private readonly fallback: TTSProvider) {}

  isAvailable() {
    return typeof window !== "undefined" && typeof fetch === "function" && typeof Audio !== "undefined";
  }

  async speak(text: string, options?: { rate?: number; voice?: string }) {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!this.isAvailable()) return this.fallback.speak(trimmed, options);

    try {
      this.cancel();
      const response = await fetch("/api/voice/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          voice: options?.voice || DEFAULT_VOICE,
          model: DEFAULT_MODEL,
        }),
      });
      if (!response.ok) throw new Error(`TTS proxy failed with ${response.status}`);
      const audio = await response.arrayBuffer();
      await this.playAudio(audio);
    } catch {
      await this.fallback.speak(trimmed, options);
    }
  }

  cancel() {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.src = "";
      this.currentAudio = null;
    }
    this.fallback.cancel();
  }

  private playAudio(audio: ArrayBuffer) {
    return new Promise<void>((resolve, reject) => {
      const blob = new Blob([audio], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const player = new Audio(url);
      this.currentAudio = player;
      const cleanup = () => {
        URL.revokeObjectURL(url);
        if (this.currentAudio === player) this.currentAudio = null;
      };
      player.onended = () => {
        cleanup();
        resolve();
      };
      player.onerror = () => {
        cleanup();
        reject(new Error("OpenAI TTS audio playback failed."));
      };
      void player.play().catch((error) => {
        cleanup();
        reject(error);
      });
    });
  }
}
