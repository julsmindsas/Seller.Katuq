import { Injectable } from '@angular/core';

/**
 * POS Feedback Service - Audio & Visual feedback for POS operations.
 * Uses Web Audio API for instant beep sounds (no file loading delay).
 */
@Injectable({
  providedIn: 'root'
})
export class PosFeedbackService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext(): void {
    try {
      this.audioContext = new (window['AudioContext'] || window['webkitAudioContext'])();
    } catch (e) {
      console.warn('[PosFeedback] Web Audio API not supported');
    }
  }

  /** Ensure AudioContext is resumed (required after user gesture) */
  private async ensureContext(): Promise<AudioContext | null> {
    if (!this.audioContext) return null;
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
    return this.audioContext;
  }

  /** Play a tone at given frequency and duration */
  private async playTone(frequency: number, durationMs: number, type: OscillatorType = 'sine'): Promise<void> {
    if (!this.enabled) return;
    const ctx = await this.ensureContext();
    if (!ctx) return;

    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);

    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + durationMs / 1000);

    oscillator.connect(gain);
    gain.connect(ctx.destination);

    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + durationMs / 1000);
  }

  /** Short success beep - product added (880Hz, 100ms) */
  async playBeepSuccess(): Promise<void> {
    await this.playTone(880, 100);
  }

  /** Error beep - product not found (220Hz, 250ms sawtooth) */
  async playBeepError(): Promise<void> {
    await this.playTone(220, 250, 'sawtooth');
  }

  /** Warning beep - stock limit (440Hz, 150ms) */
  async playBeepWarning(): Promise<void> {
    await this.playTone(440, 150, 'triangle');
  }

  /** Double beep - cart cleared or special action */
  async playDoubleBeep(): Promise<void> {
    await this.playTone(660, 80);
    setTimeout(() => this.playTone(880, 80), 120);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.enabled;
  }
}
