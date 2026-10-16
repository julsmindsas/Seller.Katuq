import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

import { LineaResumen } from '../../../../shared/services/messaging/messaging.models';

/**
 * Número del comercio por el que va un chat (D-437). No pinta nada si el chat
 * es del número compartido de Katuq (`linea` null). No depende del canal.
 */
@Component({
  selector: 'app-linea-chip',
  template: `
    <span class="linea-etiqueta" *ngIf="linea" [class.linea-etiqueta--compacta]="compacta"
          [attr.title]="linea.displayName + ' · ' + linea.displayPhone">
      <i class="fa fa-whatsapp" aria-hidden="true"></i>
      <span class="linea-etiqueta__nombre">{{ linea.displayName || linea.displayPhone }}</span>
      <span class="linea-etiqueta__tel" *ngIf="!compacta && linea.displayName">{{ linea.displayPhone }}</span>
    </span>
  `,
  styles: [`
    :host { display: inline-flex; min-width: 0; max-width: 100%; }
    .linea-etiqueta {
      display: inline-flex; align-items: center; gap: 5px; min-width: 0; max-width: 100%;
      padding: 2px 9px; border-radius: 20px;
      background: #efe9ff; border: 1px solid #ddd3fb; color: #5F3FE0;
      font-size: 11px !important; font-weight: 700; line-height: 1.5; white-space: nowrap;
    }
    .linea-etiqueta i { font-size: 12px; color: #5F3FE0; }
    .linea-etiqueta__nombre,
    .linea-etiqueta__tel {
      overflow: hidden; text-overflow: ellipsis;
      font-size: 11px !important; letter-spacing: normal; color: #5F3FE0 !important;
    }
    .linea-etiqueta__tel { font-weight: 600; color: #8f8bab !important; }
    .linea-etiqueta--compacta { padding: 1px 8px; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChipLineaComponent {
  @Input() linea: LineaResumen | null | undefined = null;
  /** Solo el nombre, para filas angostas de la lista. */
  @Input() compacta = false;
}
