import { ChangeDetectionStrategy, Component } from '@angular/core';

import { MessagingLine } from '../../../../../../shared/services/messaging/messaging.models';
import { ConsolaContextoService } from '../../servicios/consola-contexto.service';

/**
 * Número sobre el que trabajan Plantillas, Envíos y Registro (D-707). Escoge entre los números del
 * comercio y lo deja en `ConsolaContextoService`, que lo comparte con las demás secciones.
 */
@Component({
  selector: 'app-selector-numero',
  templateUrl: './selector-numero.component.html',
  styleUrls: ['./selector-numero.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorNumeroComponent {
  readonly estado$ = this.contexto.estado$;

  constructor(private readonly contexto: ConsolaContextoService) {}

  elegir(id: string | null): void {
    this.contexto.seleccionar(id || null);
  }

  esMeta(linea: MessagingLine): boolean {
    return linea.provider === 'meta';
  }

  trackLinea(_: number, linea: MessagingLine): string {
    return linea.id;
  }
}
