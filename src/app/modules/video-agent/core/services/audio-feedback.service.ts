import { Injectable } from '@angular/core';

/**
 * Servicio de feedback de audio para personas mayores
 * Proporciona beeps y sonidos de confirmación
 */
@Injectable({
  providedIn: 'root'
})
export class AudioFeedbackService {
  private audioContext: AudioContext | null = null;
  private enabled = true;

  constructor() {
    // Inicializar AudioContext
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext();
    }
  }

  /**
   * Habilitar/deshabilitar sonidos
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Beep de inicio de sesión (tono ascendente optimista)
   */
  playSessionStart(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(440, 150); // A4
    setTimeout(() => this.playTone(554, 150), 150); // C#5
    setTimeout(() => this.playTone(659, 200), 300); // E5
  }

  /**
   * Beep cuando detecta voz del usuario (tono corto de confirmación)
   */
  playVoiceDetected(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(800, 80); // Beep corto y agudo
  }

  /**
   * Beep cuando el asistente empieza a hablar (tono descendente suave)
   */
  playAssistantSpeaking(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(659, 120); // E5
    setTimeout(() => this.playTone(554, 120), 120); // C#5
  }

  /**
   * Beep de finalización de sesión (tono descendente tranquilizador)
   */
  playSessionEnd(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(659, 150); // E5
    setTimeout(() => this.playTone(554, 150), 150); // C#5
    setTimeout(() => this.playTone(440, 250), 300); // A4
  }

  /**
   * Beep de error (tono bajo y grave)
   */
  playError(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(200, 300, 'sawtooth'); // Tono bajo y áspero
    setTimeout(() => this.playTone(150, 300, 'sawtooth'), 300);
  }

  /**
   * Beep de confirmación/éxito (tono doble alegre)
   */
  playSuccess(): void {
    if (!this.enabled || !this.audioContext) return;

    this.playTone(523, 100); // C5
    setTimeout(() => this.playTone(659, 150), 120); // E5
  }

  /**
   * Reproduce un tono simple
   * @param frequency Frecuencia en Hz (220-880 recomendado)
   * @param duration Duración en ms
   * @param type Tipo de onda (sine, square, sawtooth, triangle)
   */
  private playTone(
    frequency: number,
    duration: number,
    type: OscillatorType = 'sine'
  ): void {
    if (!this.audioContext) return;

    try {
      // Reanudar AudioContext si está suspendido (required por navegadores)
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      // Crear oscilador
      const oscillator = this.audioContext.createOscillator();
      const gainNode = this.audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(this.audioContext.destination);

      oscillator.type = type;
      oscillator.frequency.value = frequency;

      // Envelope suave (fade in/out)
      const now = this.audioContext.currentTime;
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.01); // Fade in rápido
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + duration / 1000); // Fade out

      oscillator.start(now);
      oscillator.stop(now + duration / 1000);
    } catch (error) {
      console.warn('Error playing audio feedback:', error);
    }
  }

  /**
   * Limpieza al destruir el servicio
   */
  destroy(): void {
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}
