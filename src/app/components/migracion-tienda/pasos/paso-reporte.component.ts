import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TotalesProductos } from '../logica/sumas';
import { LineaResumen } from '../logica/textos';
import { AVISO_NO_CERRAR_TIENDA } from '../logica/ampliacion';

export interface ExtrasReporte {
  redirecciones: { generated: number; conflictsWithManual: number; overCapacity: number; mensaje: string | null } | null;
  fotos: { copiadas: number; fallidas: number; pendientes: boolean; mensaje: string | null } | null;
  detenido: string | null;
}

/** Paso 4: resumen final, avisos de existencias fallidas y descarga del reporte CSV. */
@Component({
  selector: 'app-mt-paso-reporte',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card mt-bloque">
      <h2 class="mt-subtitulo">{{ extras.detenido ? 'La importación quedó a medias' : 'Listo, tu tienda ya está en Katuq' }}</h2>
      <p class="cfg-aviso cfg-aviso--warn" *ngIf="extras.detenido"><span class="mt-fuerte">{{ extras.detenido }}</span></p>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" role="alert" *ngIf="avisoExistencias"><span class="mt-fuerte">{{ avisoExistencias }}</span></p>

      <div class="cfg-stats mt-sep">
        <div class="cfg-stat" *ngFor="let l of resumen">
          <span class="cfg-stat__label">{{ l.etiqueta }}</span>
          <span class="cfg-stat__valor">{{ l.valor }}</span>
        </div>
      </div>

      <p class="mt-ayuda mt-sep" *ngIf="extras.redirecciones">
        Direcciones que seguirán funcionando: {{ extras.redirecciones.generated }}.
        <ng-container *ngIf="extras.redirecciones.conflictsWithManual"> {{ extras.redirecciones.conflictsWithManual }} ya tenían una redirección tuya y se respetó.</ng-container>
        <ng-container *ngIf="extras.redirecciones.overCapacity"> {{ extras.redirecciones.overCapacity }} no cupieron en el sitio.</ng-container>
      </p>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="extras.redirecciones && extras.redirecciones.mensaje"><span class="mt-fuerte">{{ extras.redirecciones.mensaje }}</span></p>
      <p class="mt-ayuda" *ngIf="extras.fotos">Fotos copiadas a Katuq: {{ extras.fotos.copiadas }}<ng-container *ngIf="extras.fotos.fallidas">; {{ extras.fotos.fallidas }} no se pudieron copiar</ng-container>.</p>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="extras.fotos && extras.fotos.mensaje"><span class="mt-fuerte">{{ extras.fotos.mensaje }}</span></p>
      <div class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="hayFotosPendientes">
        <span class="mt-fuerte">Quedaron fotos por copiar. {{ avisoTiendaAnterior }}</span>
        <div class="mt-sep">
          <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="copiando" (click)="copiarPendientes.emit()">{{ copiando ? 'Copiando…' : 'Copiar fotos pendientes' }}</button>
        </div>
      </div>
    </section>

    <div class="cfg-form__pie">
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="descargar.emit()">Descargar reporte (CSV)</button>
      <button type="button" class="cfg-btn" (click)="terminar.emit()">Ir a mis productos</button>
    </div>
  `,
})
export class PasoReporteComponent {
  @Input() totales!: TotalesProductos;
  @Input() resumen: LineaResumen[] = [];
  @Input() avisoExistencias: string | null = null;
  @Input() extras: ExtrasReporte = { redirecciones: null, fotos: null, detenido: null };
  @Output() descargar = new EventEmitter<void>();
  @Input() copiando = false;
  @Output() terminar = new EventEmitter<void>();
  @Output() copiarPendientes = new EventEmitter<void>();

  readonly avisoTiendaAnterior = AVISO_NO_CERRAR_TIENDA;

  get hayFotosPendientes(): boolean {
    const f = this.extras.fotos;
    return !!f && (f.pendientes || f.fallidas > 0);
  }
}
