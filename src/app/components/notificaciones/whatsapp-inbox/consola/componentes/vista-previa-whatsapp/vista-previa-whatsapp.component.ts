import { ChangeDetectionStrategy, Component, Input, OnChanges } from '@angular/core';

import { BotonPlantilla, TipoEncabezado } from '../../../../../../shared/services/messaging/whatsapp-consola.models';

/** Trozo de texto con el formato de WhatsApp (`*negrilla*`, `_cursiva_`). */
export interface TrozoTexto {
  texto: string;
  negrilla: boolean;
  cursiva: boolean;
}

/**
 * Convierte el formato de WhatsApp en trozos para pintar sin `innerHTML`. Solo entiende lo que
 * WhatsApp muestra en una plantilla: `*negrilla*` y `_cursiva_`, sin anidar.
 */
export function trozosWhatsapp(texto: string): TrozoTexto[] {
  const trozos: TrozoTexto[] = [];
  const patron = /(\*[^*\n]+\*)|(_[^_\n]+_)/g;
  let desde = 0;
  let m: RegExpExecArray | null;
  while ((m = patron.exec(texto))) {
    if (m.index > desde) trozos.push({ texto: texto.slice(desde, m.index), negrilla: false, cursiva: false });
    const negrilla = !!m[1];
    trozos.push({ texto: m[0].slice(1, -1), negrilla, cursiva: !negrilla });
    desde = m.index + m[0].length;
  }
  if (desde < texto.length) trozos.push({ texto: texto.slice(desde), negrilla: false, cursiva: false });
  return trozos;
}

/**
 * Cómo se verá la plantilla en WhatsApp (D-707): encabezado de texto o imagen, cuerpo, pie y botones.
 * `{nombre}` se reemplaza por un nombre de ejemplo. Solo presenta: no llama al servidor.
 */
@Component({
  selector: 'app-vista-previa-whatsapp',
  templateUrl: './vista-previa-whatsapp.component.html',
  styleUrls: ['./vista-previa-whatsapp.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VistaPreviaWhatsappComponent implements OnChanges {
  @Input() encabezadoTipo: TipoEncabezado | '' | null = null;
  @Input() encabezadoTexto = '';
  /** Dirección de la imagen (URL o `data:`); la imagen de muestra no se sube hasta enviar la plantilla. */
  @Input() imagenUrl: string | null = null;
  @Input() cuerpo = '';
  @Input() pie = '';
  @Input() botones: BotonPlantilla[] = [];
  @Input() nombreEjemplo = 'María';

  readonly hora = new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false });

  /** Se calculan al cambiar las entradas: con `*ngFor` sobre un getter se recrearía el DOM en cada revisión. */
  trozosCuerpo: TrozoTexto[] = [];
  hayCuerpo = false;
  textoEncabezado = '';
  textoPie = '';
  botonesConTexto: BotonPlantilla[] = [];

  ngOnChanges(): void {
    const cuerpo = this.conNombre(this.cuerpo);
    this.hayCuerpo = cuerpo.trim().length > 0;
    this.trozosCuerpo = trozosWhatsapp(cuerpo);
    this.textoEncabezado = this.conNombre(this.encabezadoTexto).trim();
    this.textoPie = String(this.pie || '').trim();
    this.botonesConTexto = (this.botones || []).filter((b) => (b.texto || '').trim());
  }

  iconoBoton(tipo: string): string {
    return tipo === 'URL' ? 'fa-external-link' : tipo === 'PHONE_NUMBER' ? 'fa-phone' : 'fa-reply';
  }

  private conNombre(texto: string): string {
    return String(texto || '').replace(/\{\s*nombre\s*\}/gi, this.nombreEjemplo);
  }
}
