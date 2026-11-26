import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';

import { RespuestaRapida } from '../../../../shared/services/messaging/messaging.models';

/** Una opción de la lista: el comando y un resumen del texto. */
export interface OpcionRapida {
  comando: string;
  texto: string;
}

/** Cuántas opciones se ven a la vez. */
const MAX_VISIBLES = 8;

/**
 * Respuestas rápidas con comando (D-728). Se coloca dentro del formulario del cuadro de escribir, justo
 * encima del campo. Cuando lo escrito empieza con «/» y es solo un comando a medias (sin espacios), abre
 * la lista filtrada; flechas, Enter, Tab o clic insertan el texto (reemplaza el comando) con `{cliente}` y
 * `{asesor}` ya resueltos. Nunca envía: solo emite el texto nuevo del cuadro. Quien lo aloja pasa las teclas
 * del campo a `alTecla` y respeta lo que devuelve.
 */
@Component({
  selector: 'app-chat-rapidos',
  templateUrl: './chat-rapidos.component.html',
  styleUrls: ['./chat-rapidos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChatRapidosComponent implements OnChanges {
  /** Catálogo del comercio: campo estable de quien aloja. */
  @Input() rapidos: RespuestaRapida[] = [];
  /** Lo que hay escrito en el cuadro. */
  @Input() texto = '';
  /** Nombre del contacto si se conoce; vacío = se quita la variable. */
  @Input() cliente = '';
  /** Nombre de quien escribe. */
  @Input() asesor = '';
  /** El cuadro no se puede usar (enviando o solo lectura). */
  @Input() deshabilitado = false;

  /** El texto nuevo completo del cuadro. */
  @Output() elegir = new EventEmitter<string>();

  /** Lista ya filtrada; se recalcula solo cuando cambian el texto o el catálogo. */
  opciones: OpcionRapida[] = [];
  abierta = false;
  indice = 0;
  /** Texto con el que se cerró la lista a mano (Esc): no se reabre hasta que cambie. */
  private cerradaPara: string | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.recalcular();
  }

  /** `true` si la tecla era de la lista y ya se atendió: quien aloja no debe hacer nada más con ella. */
  alTecla(ev: KeyboardEvent): boolean {
    if (!this.abierta || !this.opciones.length || ev.isComposing) return false;
    switch (ev.key) {
      case 'ArrowDown':
        this.indice = (this.indice + 1) % this.opciones.length;
        break;
      case 'ArrowUp':
        this.indice = (this.indice - 1 + this.opciones.length) % this.opciones.length;
        break;
      case 'Enter':
      case 'Tab':
        if (ev.shiftKey) return false;
        this.insertar(this.opciones[this.indice]);
        break;
      case 'Escape':
        this.cerradaPara = this.texto;
        this.abierta = false;
        break;
      default:
        return false;
    }
    ev.preventDefault();
    // OnPush: la tecla la atiende el padre, así que se repinta a mano (D-728).
    this.cdr.markForCheck();
    return true;
  }

  /** El clic no le quita el foco al cuadro (mousedown). */
  alPulsar(ev: MouseEvent, o: OpcionRapida): void {
    ev.preventDefault();
    this.insertar(o);
  }

  trackOpcion(_: number, o: OpcionRapida): string {
    return o.comando;
  }

  private insertar(o: OpcionRapida | undefined): void {
    if (!o) return;
    this.abierta = false;
    this.cdr.markForCheck();
    this.elegir.emit(this.resolver(o.texto));
  }

  /** `{cliente}` y `{asesor}`; sin nombre se quita la variable y se acomodan los espacios. */
  private resolver(texto: string): string {
    const poner = (t: string, variable: RegExp, valor: string): string => {
      const v = (valor || '').trim();
      if (v) return t.replace(variable, () => v);
      return t.replace(variable, '').replace(/[ \t]{2,}/g, ' ').replace(/ ([,.;:!?])/g, '$1');
    };
    let r = poner(texto || '', /\{cliente\}/gi, this.cliente);
    r = poner(r, /\{asesor\}/gi, this.asesor);
    return r;
  }

  private recalcular(): void {
    const t = this.texto || '';
    const comando = /^\/[a-z0-9_]*$/i.test(t);
    if (this.deshabilitado || !comando || !(this.rapidos || []).length || this.cerradaPara === t) {
      if (this.cerradaPara !== null && this.cerradaPara !== t) this.cerradaPara = null;
      this.abierta = false;
      this.opciones = [];
      this.indice = 0;
      return;
    }
    this.cerradaPara = null;
    const q = t.slice(1).toLowerCase();
    const previa = this.opciones[this.indice]?.comando;
    this.opciones = this.rapidos
      .filter((r) => r.comando.toLowerCase().slice(1).includes(q))
      .slice(0, MAX_VISIBLES)
      .map((r) => ({ comando: r.comando, texto: r.texto }));
    const i = previa ? this.opciones.findIndex((o) => o.comando === previa) : -1;
    this.indice = i >= 0 ? i : 0;
    this.abierta = this.opciones.length > 0;
  }
}
