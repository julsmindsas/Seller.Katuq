import { Component, Input } from '@angular/core';
import { GrupoRecogida } from '../domicilios.formularios';

/**
 * El bloque «Recoger en»: dónde recoge el mensajero. Lo comparten «Nuevo domicilio» y «Cargar archivo»,
 * que le pasan el mismo formulario, así que lo que se escribe en una pestaña aparece en la otra.
 */
@Component({
  selector: 'app-domicilios-recogida',
  templateUrl: './recogida.component.html',
  styleUrls: ['./recogida.component.scss']
})
export class RecogidaComponent {
  @Input() grupo!: GrupoRecogida;
  /** Errores por campo de la API (`recogida.ciudad`…). */
  @Input() errores: Record<string, string> = {};
  /** Para que los `id` no se repitan entre pestañas. */
  @Input() idBase = 'recogida';

  error(campo: string): string | null {
    return this.errores['recogida.' + campo] || null;
  }

  id(campo: string): string {
    return `${this.idBase}-${campo}`;
  }
}
