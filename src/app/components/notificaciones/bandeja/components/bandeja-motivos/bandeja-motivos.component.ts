import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { CatalogosAtencion } from '../../../../../shared/services/messaging/messaging.models';
import { MAX_CIERRE_AUTO_HORAS, MAX_MOTIVO, MAX_MOTIVOS, MIN_MOTIVO, clave } from '../../bandeja.catalogos';

/** Un motivo en edición; `k` mantiene el foco al escribir en la lista. */
export interface FilaMotivo {
  k: number;
  valor: string;
}

/**
 * Tarjeta «Motivos de cierre» de la pestaña Equipo (D-728, solo administrador): lista editable de motivos
 * y horas del cierre automático por inactividad. Copia lo recibido al abrir y mientras no esté «sucio»; el
 * refresco de la bandeja no pisa lo que se escribe. Quien la aloja llama al servidor.
 */
@Component({
  selector: 'app-bandeja-motivos',
  templateUrl: './bandeja-motivos.component.html',
  styleUrls: ['./bandeja-motivos.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BandejaMotivosComponent implements OnChanges {
  /** Campos estables de quien aloja. */
  @Input() motivos: string[] = [];
  @Input() horas = 0;
  @Input() guardando = false;
  /** Pasa a true cuando el servidor guardó esta tarjeta. */
  @Input() guardadoOk = false;
  /** Mensaje del servidor (422); vacío si no hay. */
  @Input() errorServidor = '';

  @Output() guardar = new EventEmitter<Pick<CatalogosAtencion, 'motivosCierre' | 'cierreAutoHoras'>>();

  readonly maxMotivos = MAX_MOTIVOS;
  readonly maxMotivo = MAX_MOTIVO;
  readonly maxHoras = MAX_CIERRE_AUTO_HORAS;

  filas: FilaMotivo[] = [];
  /** Horas tal como se escriben (puede estar vacío o a medias). */
  horasTexto: number | string | null = 0;
  sucio = false;
  intentado = false;
  private siguiente = 0;

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['guardadoOk'] && this.guardadoOk) this.sucio = false;
    if ((cambios['motivos'] || cambios['horas'] || cambios['guardadoOk']) && !this.sucio) {
      this.filas = (this.motivos || []).map((v) => ({ k: this.siguiente++, valor: v }));
      this.horasTexto = this.horas || 0;
      this.intentado = false;
    }
  }

  get puedeAgregar(): boolean {
    return this.filas.length < this.maxMotivos;
  }

  agregar(): void {
    if (!this.puedeAgregar) return;
    this.filas = [...this.filas, { k: this.siguiente++, valor: '' }];
    this.sucio = true;
  }

  quitar(f: FilaMotivo): void {
    this.filas = this.filas.filter((x) => x.k !== f.k);
    this.sucio = true;
  }

  cambiar(f: FilaMotivo, valor: string): void {
    this.filas = this.filas.map((x) => (x.k === f.k ? { ...x, valor: valor || '' } : x));
    this.sucio = true;
  }

  cambiarHoras(v: unknown): void {
    this.horasTexto = v === '' || v === null || v === undefined ? '' : (v as number | string);
    this.sucio = true;
  }

  /** Errores en palabras sencillas (claves de traducción); vacío = se puede guardar. */
  get errores(): string[] {
    const e: string[] = [];
    const valores = this.filas.map((f) => f.valor.trim());
    if (!valores.length) e.push('notificaciones.bandeja.catalogos.motivos.err.sinMotivos');
    if (valores.some((v) => v.length < MIN_MOTIVO || v.length > MAX_MOTIVO)) e.push('notificaciones.bandeja.catalogos.motivos.err.largo');
    const vistos = new Set<string>();
    if (valores.some((v) => v && (vistos.has(clave(v)) || !vistos.add(clave(v))))) e.push('notificaciones.bandeja.catalogos.motivos.err.repetido');
    const h = this.horasTexto === '' || this.horasTexto === null ? NaN : Number(this.horasTexto);
    if (!Number.isInteger(h) || h < 0 || h > this.maxHoras) e.push('notificaciones.bandeja.catalogos.motivos.err.horas');
    return e;
  }

  enviar(): void {
    this.intentado = true;
    if (this.errores.length || this.guardando) return;
    this.guardar.emit({
      motivosCierre: this.filas.map((f) => f.valor.trim()),
      cierreAutoHoras: Number(this.horasTexto),
    });
  }

  trackFila(_: number, f: FilaMotivo): number {
    return f.k;
  }
}
