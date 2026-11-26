import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { CatalogosAtencion, RespuestaRapida } from '../../../../../shared/services/messaging/messaging.models';
import { MAX_RAPIDOS, MAX_TEXTO_RAPIDO, REGEX_COMANDO } from '../../bandeja.catalogos';

/** Una respuesta rápida en edición. `id` solo existe si ya estaba guardada. */
export interface FilaRapida {
  k: number;
  id?: string;
  comando: string;
  texto: string;
}

/** `Pagos` y `/Pagos` quedan como `/pagos`: el comando siempre empieza con «/» y va en minúsculas. */
export function normalizarComando(valor: string): string {
  const v = (valor || '').trim().toLowerCase();
  return v && !v.startsWith('/') ? `/${v}` : v;
}

/**
 * Tarjeta «Respuestas rápidas» de la pestaña Equipo (D-728, solo administrador): comando y texto de cada una,
 * con ayuda de las variables {cliente} y {asesor}. Mismo patrón que las demás tarjetas de catálogo.
 */
@Component({
  selector: 'app-bandeja-rapidos',
  templateUrl: './bandeja-rapidos.component.html',
  styleUrls: ['./bandeja-rapidos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaRapidosComponent implements OnChanges {
  /** Catálogo: campo estable de quien aloja. */
  @Input() rapidos: RespuestaRapida[] = [];
  @Input() guardando = false;
  @Input() guardadoOk = false;
  @Input() errorServidor = '';

  @Output() guardar = new EventEmitter<Pick<CatalogosAtencion, 'rapidos'>>();

  readonly maxRapidos = MAX_RAPIDOS;
  readonly maxTexto = MAX_TEXTO_RAPIDO;

  filas: FilaRapida[] = [];
  sucio = false;
  intentado = false;
  private siguiente = 0;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['guardadoOk'] && this.guardadoOk) this.sucio = false;
    if ((cambios['rapidos'] || cambios['guardadoOk']) && !this.sucio) {
      this.filas = (this.rapidos || []).map((r) => ({ k: this.siguiente++, id: r.id, comando: r.comando, texto: r.texto }));
      this.intentado = false;
    }
  }

  get puedeAgregar(): boolean {
    return this.filas.length < this.maxRapidos;
  }

  agregar(): void {
    if (!this.puedeAgregar) return;
    this.filas = [...this.filas, { k: this.siguiente++, comando: '/', texto: '' }];
    this.sucio = true;
  }

  quitar(f: FilaRapida): void {
    this.filas = this.filas.filter((x) => x.k !== f.k);
    this.sucio = true;
  }

  cambiarComando(f: FilaRapida, valor: string): void {
    this.filas = this.filas.map((x) => (x.k === f.k ? { ...x, comando: valor || '' } : x));
    this.sucio = true;
  }

  cambiarTexto(f: FilaRapida, valor: string): void {
    this.filas = this.filas.map((x) => (x.k === f.k ? { ...x, texto: (valor || '').slice(0, this.maxTexto) } : x));
    this.sucio = true;
  }

  get errores(): string[] {
    const e: string[] = [];
    const comandos = this.filas.map((f) => normalizarComando(f.comando));
    if (comandos.some((c) => !REGEX_COMANDO.test(c))) e.push('notificaciones.bandeja.catalogos.rapidos.err.comando');
    const vistos = new Set<string>();
    if (comandos.some((c) => c && (vistos.has(c) || !vistos.add(c)))) e.push('notificaciones.bandeja.catalogos.rapidos.err.repetido');
    if (this.filas.some((f) => !f.texto.trim() || f.texto.length > this.maxTexto)) e.push('notificaciones.bandeja.catalogos.rapidos.err.texto');
    return e;
  }

  enviar(): void {
    this.intentado = true;
    if (this.errores.length || this.guardando) return;
    this.guardar.emit({
      rapidos: this.filas.map((f) => ({ ...(f.id ? { id: f.id } : {}), comando: normalizarComando(f.comando), texto: f.texto.trim() })),
    });
  }

  trackFila(_: number, f: FilaRapida): number {
    return f.k;
  }
}
