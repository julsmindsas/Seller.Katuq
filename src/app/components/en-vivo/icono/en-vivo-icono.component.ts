import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { IconoId, trazosDe } from '../utilidades/iconos';

/**
 * Icono de línea del tablero "En vivo". Pinta los trazos de `utilidades/iconos.ts` con
 * `[attr.d]` (sin `innerHTML`). Decorativo: va `aria-hidden`; el texto lo pone quien lo usa.
 * El tamaño sale de `--ev-icono` (18 px por defecto) y el color, de `currentColor`.
 */
@Component({
  selector: 'app-en-vivo-icono',
  templateUrl: './en-vivo-icono.component.html',
  styleUrls: ['./en-vivo-icono.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoIconoComponent {
  trazos: ReadonlyArray<string> = [];

  @Input() set nombre(valor: IconoId | null | undefined) {
    this.trazos = trazosDe(valor);
  }

  porPosicion(indice: number): number {
    return indice;
  }
}
