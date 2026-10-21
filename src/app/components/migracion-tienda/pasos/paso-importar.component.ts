import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorImportador } from '../tipos';

export interface AvanceVista {
  etapa: 'productos' | 'redirecciones' | 'fotos';
  hecho: number;
  total: number;
  /** Texto de espera cuando el servidor pidió esperar (otra importación en curso, tope de envíos). */
  espera: string | null;
}

const ETAPAS = { productos: 'Trayendo tus productos', redirecciones: 'Cuidando tus direcciones de siempre', fotos: 'Copiando tus fotos a Katuq' };

/** Paso 3: avance por lotes, con reintento del lote que no se pudo enviar. */
@Component({
  selector: 'app-mt-paso-importar',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card mt-bloque">
      <h2 class="mt-subtitulo">{{ titulo }}</h2>
      <div class="mt-barra" role="progressbar" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="porcentaje">
        <div class="mt-barra__relleno" [style.width.%]="porcentaje"></div>
      </div>
      <p class="mt-ayuda" *ngIf="avance">Lote {{ avance.hecho }} de {{ avance.total }}</p>
      <p class="cfg-aviso mt-sep" *ngIf="avance && avance.espera"><span class="mt-fuerte">{{ avance.espera }}</span></p>
      <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngIf="error">
        <span class="mt-fuerte">{{ error.message }}</span>
      </p>
      <p class="mt-ayuda" *ngIf="error && !error.blocking">Lo que ya se trajo queda guardado. Al reintentar seguimos desde donde se detuvo.</p>
      <p class="mt-ayuda" *ngIf="!error">No cierres esta ventana hasta que termine.</p>
    </section>
    <div class="cfg-form__pie" *ngIf="error">
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="verReporte.emit()">Ver lo que se alcanzó</button>
      <button type="button" class="cfg-btn" *ngIf="!error.blocking" (click)="reintentar.emit()">Reintentar</button>
    </div>
  `,
})
export class PasoImportarComponent {
  @Input() avance: AvanceVista | null = null;
  @Input() error: ErrorImportador | null = null;
  @Output() reintentar = new EventEmitter<void>();
  @Output() verReporte = new EventEmitter<void>();

  get titulo(): string {
    return this.avance ? ETAPAS[this.avance.etapa] : 'Preparando…';
  }
  get porcentaje(): number {
    if (!this.avance || !this.avance.total) return 0;
    return Math.min(100, Math.round((this.avance.hecho / this.avance.total) * 100));
  }
}
