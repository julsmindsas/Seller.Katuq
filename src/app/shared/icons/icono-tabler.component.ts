import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { NgFor } from '@angular/common';
import { TABLER_ICONOS } from './tabler-iconos';

/**
 * D-546 (D6): ícono de contorno de la familia Tabler, pintado como SVG con `stroke="currentColor"`:
 * toma el color del texto que lo rodea. Solo existen los íconos de `tabler-usados.json`.
 *
 * Standalone y OnPush (Artículo IX: lo nuevo y aislado). No usa `innerHTML`: cada trazo es un
 * `<path [attr.d]>`. Un nombre desconocido pinta un cuadro vacío del mismo tamaño y lo detecta
 * la prueba de `tests/navigation/menu-iconos.test.js`. D-547 reutiliza este mismo componente.
 */
@Component({
  selector: 'app-icono-tabler',
  standalone: true,
  imports: [NgFor],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<svg class="icono-tabler"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  aria-hidden="true"
                  focusable="false"
                  [attr.width]="tamano"
                  [attr.height]="tamano"
                  [attr.fill]="relleno ? 'currentColor' : 'none'"
                  [attr.stroke-width]="trazo"><path *ngFor="let d of trazos" [attr.d]="d"/></svg>`,
  styles: [`:host { display: inline-flex; flex: none; line-height: 0; } svg { display: block; }`],
})
export class IconoTablerComponent {
  /** Nombre del ícono en `tabler-usados.json`, por ejemplo `building-warehouse`. */
  @Input() nombre = '';
  /** Lado en px. */
  @Input() tamano = 20;
  /** Grosor del trazo. */
  @Input() trazo = 1.75;
  /** Relleno con el color actual (la estrella de un favorito). */
  @Input() relleno = false;

  get trazos(): string[] {
    return TABLER_ICONOS[this.nombre] || [];
  }
}
