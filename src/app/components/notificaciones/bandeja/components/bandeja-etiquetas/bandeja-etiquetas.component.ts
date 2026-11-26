import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { CatalogosAtencion, ColorEtiqueta, EtiquetaChat } from '../../../../../shared/services/messaging/messaging.models';
import {
  COLORES_ETIQUETA,
  MAX_ETIQUETA,
  MAX_ETIQUETAS_CATALOGO,
  MIN_ETIQUETA,
  clave,
} from '../../bandeja.catalogos';

/** Una etiqueta en edición. `id` solo existe si ya estaba guardada: así el servidor la conserva. */
export interface FilaEtiqueta {
  k: number;
  id?: string;
  nombre: string;
  color: ColorEtiqueta;
}

/**
 * Tarjeta «Etiquetas» de la pestaña Equipo (D-728, solo administrador): nombre y color de cada etiqueta
 * del comercio. Mismo patrón que los motivos: copia al recibir mientras no esté «sucia» y no pisa lo escrito.
 */
@Component({
  selector: 'app-bandeja-etiquetas',
  templateUrl: './bandeja-etiquetas.component.html',
  styleUrls: ['./bandeja-etiquetas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaEtiquetasComponent implements OnChanges {
  /** Catálogo: campo estable de quien aloja. */
  @Input() etiquetas: EtiquetaChat[] = [];
  @Input() guardando = false;
  @Input() guardadoOk = false;
  @Input() errorServidor = '';

  @Output() guardar = new EventEmitter<Pick<CatalogosAtencion, 'etiquetas'>>();

  readonly maxEtiquetas = MAX_ETIQUETAS_CATALOGO;
  readonly maxNombre = MAX_ETIQUETA;
  readonly colores = COLORES_ETIQUETA;

  filas: FilaEtiqueta[] = [];
  sucio = false;
  intentado = false;
  private siguiente = 0;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['guardadoOk'] && this.guardadoOk) this.sucio = false;
    if ((cambios['etiquetas'] || cambios['guardadoOk']) && !this.sucio) {
      this.filas = (this.etiquetas || []).map((e) => ({ k: this.siguiente++, id: e.id, nombre: e.nombre, color: e.color }));
      this.intentado = false;
    }
  }

  get puedeAgregar(): boolean {
    return this.filas.length < this.maxEtiquetas;
  }

  agregar(): void {
    if (!this.puedeAgregar) return;
    this.filas = [...this.filas, { k: this.siguiente++, nombre: '', color: 'morado' }];
    this.sucio = true;
  }

  quitar(f: FilaEtiqueta): void {
    this.filas = this.filas.filter((x) => x.k !== f.k);
    this.sucio = true;
  }

  cambiarNombre(f: FilaEtiqueta, nombre: string): void {
    this.filas = this.filas.map((x) => (x.k === f.k ? { ...x, nombre: nombre || '' } : x));
    this.sucio = true;
  }

  cambiarColor(f: FilaEtiqueta, color: string): void {
    this.filas = this.filas.map((x) => (x.k === f.k ? { ...x, color: color as ColorEtiqueta } : x));
    this.sucio = true;
  }

  get errores(): string[] {
    const e: string[] = [];
    const nombres = this.filas.map((f) => f.nombre.trim());
    if (nombres.some((n) => n.length < MIN_ETIQUETA || n.length > MAX_ETIQUETA)) e.push('notificaciones.bandeja.catalogos.etiquetas.err.largo');
    const vistos = new Set<string>();
    if (nombres.some((n) => n && (vistos.has(clave(n)) || !vistos.add(clave(n))))) e.push('notificaciones.bandeja.catalogos.etiquetas.err.repetido');
    return e;
  }

  enviar(): void {
    this.intentado = true;
    if (this.errores.length || this.guardando) return;
    this.guardar.emit({
      etiquetas: this.filas.map((f) => ({ ...(f.id ? { id: f.id } : {}), nombre: f.nombre.trim(), color: f.color })),
    });
  }

  trackFila(_: number, f: FilaEtiqueta): number {
    return f.k;
  }
}
