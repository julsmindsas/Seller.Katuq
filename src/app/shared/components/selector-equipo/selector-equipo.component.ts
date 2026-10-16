import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
} from '@angular/core';

import { MiembroEquipo } from '../../services/messaging/messaging.models';

interface OpcionEquipo {
  label: string;
  value: string;
}

/**
 * Selector de personas del comercio (D-437). Recibe el equipo ya cargado y
 * devuelve emails: varios con `multiple` (p-multiSelect) o uno (p-dropdown).
 * En los dos modos la salida es un arreglo, para usarlo igual con `[(emails)]`.
 *
 * Los paneles se abren sobre `body` con z-index por encima de los modales de
 * ng-bootstrap, así funciona igual dentro de la tarjeta de integraciones.
 */
@Component({
  selector: 'app-selector-equipo',
  templateUrl: './selector-equipo.component.html',
  styleUrls: ['./selector-equipo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorEquipoComponent implements OnChanges {
  @Input() equipo: MiembroEquipo[] = [];
  @Input() emails: string[] = [];
  @Input() multiple = false;
  @Input() disabled = false;
  @Input() placeholder = 'Elige una persona';
  /** Emails que no se ofrecen (por ejemplo, el dueño actual al pasar un chat). */
  @Input() excluir: string[] = [];
  @Input() inputId?: string;

  @Output() emailsChange = new EventEmitter<string[]>();

  opciones: OpcionEquipo[] = [];
  valorMultiple: string[] = [];
  valorUnico: string | null = null;

  readonly overlay = { baseZIndex: 1100 };

  ngOnChanges(): void {
    const fuera = new Set((this.excluir || []).map((e) => (e || '').toLowerCase()));
    this.opciones = (this.equipo || [])
      .filter((m) => m && m.email && !fuera.has(m.email.toLowerCase()))
      .map((m) => ({ label: m.nombre ? `${m.nombre} (${m.email})` : m.email, value: m.email }));
    const actuales = Array.isArray(this.emails) ? this.emails.filter(Boolean) : [];
    this.valorMultiple = [...actuales];
    this.valorUnico = actuales[0] || null;
  }

  alCambiarVarios(valor: string[] | null): void {
    this.valorMultiple = valor || [];
    this.emailsChange.emit([...this.valorMultiple]);
  }

  alCambiarUno(valor: string | null): void {
    this.valorUnico = valor || null;
    this.emailsChange.emit(this.valorUnico ? [this.valorUnico] : []);
  }
}
