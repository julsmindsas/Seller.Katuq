import { Directive, EventEmitter, Input, Output } from "@angular/core";
import { BloqueSitio } from "../../../sitio-render/sitio-render.component";
import { ContenidoSitio } from "../../sitios.service";

/**
 * Base de todo panel del diseño nuevo (PLAN-V2 §3). Es la misma de `registro.ts`, en un archivo propio para cortar el
 * ciclo de importación: `registro.ts` importa los componentes de los paneles para su lista `PANELES_SITIO`, y cada
 * componente extiende esta clase. Si la clase viviera en `registro.ts`, al cargar el editor uno de los dos módulos
 * llegaría a medio armar y el navegador fallaría con «Cannot access 'PanelSitioBase' before initialization».
 * `registro.ts` la re-exporta (ver PLAN-V2 T06, «Cambios para integrar»), así que quien la importaba de allí no cambia.
 */
@Directive()
export abstract class PanelSitioBase {
  /** El bloque elegido en el editor. null en los paneles de la pestaña Tienda. */
  @Input() bloque: BloqueSitio | null = null;
  /** El sitio entero (tema, tienda, páginas). */
  @Input() contenido: ContenidoSitio | null = null;
  /** Avisa al editor que algo cambió (marca sucio, refresca la previa y programa el guardado). */
  @Output() cambio = new EventEmitter<void>();

  protected avisar(): void {
    this.cambio.emit();
  }
}
