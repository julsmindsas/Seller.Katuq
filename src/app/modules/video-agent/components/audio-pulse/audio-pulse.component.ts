import { Component, Input } from '@angular/core';

/**
 * Componente de indicador visual de audio (VU Meter)
 * Muestra el volumen de audio en tiempo real con animación
 *
 * Basado en el AudioPulse del demo oficial de Google
 */
@Component({
  selector: 'app-audio-pulse',
  templateUrl: './audio-pulse.component.html',
  styleUrls: ['./audio-pulse.component.scss']
})
export class AudioPulseComponent {
  @Input() volume: number = 0; // Rango [0, 1]
  @Input() active: boolean = false;
  @Input() hover: boolean = false;

  /**
   * Calcula el scale del anillo de pulso basado en volumen
   */
  get pulseScale(): number {
    return 1 + (this.volume * 0.5); // Escala de 1.0 a 1.5
  }

  /**
   * Calcula el color del indicador basado en volumen
   */
  get pulseColor(): string {
    if (!this.active) {
      return '#94a3b8'; // Gris cuando inactivo
    }

    // Gradiente de verde a amarillo a rojo según volumen
    if (this.volume < 0.3) {
      return '#48bb78'; // Verde suave
    } else if (this.volume < 0.7) {
      return '#f6ad55'; // Naranja/amarillo
    } else {
      return '#fc8181'; // Rojo (volumen alto)
    }
  }
}
