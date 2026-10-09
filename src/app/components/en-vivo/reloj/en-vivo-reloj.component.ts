import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, NgZone, OnDestroy, OnInit } from '@angular/core';
import { fechaLarga, horaDeReloj } from '../utilidades/formato';
import { cadaFueraDeZona } from '../utilidades/movimiento';

/**
 * Reloj de Colombia (hora y fecha). Se actualiza cada segundo fuera de la zona de Angular y
 * repinta solo este componente. Con `instante` (ms) muestra esa hora fija: es la que usa
 * "Repetir el día" para mostrar el reloj simulado.
 */
@Component({
  selector: 'app-en-vivo-reloj',
  templateUrl: './en-vivo-reloj.component.html',
  styleUrls: ['./en-vivo-reloj.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoRelojComponent implements OnInit, OnDestroy {
  /** Hora fija (ms) en lugar de la real; null = la real. */
  @Input() instante: number | null = null;

  private pararTemporizador: (() => void) | null = null;
  private ahoraMs = Date.now();

  constructor(private readonly zona: NgZone, private readonly cambios: ChangeDetectorRef) {}

  get hora(): string {
    return horaDeReloj(this.instante ?? this.ahoraMs);
  }

  get fecha(): string {
    return fechaLarga(this.instante ?? this.ahoraMs);
  }

  ngOnInit(): void {
    this.pararTemporizador = cadaFueraDeZona(this.zona, 1000, () => {
      this.ahoraMs = Date.now();
      this.cambios.detectChanges();
    });
  }

  ngOnDestroy(): void {
    this.pararTemporizador?.();
  }
}
