import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ErrorImportador } from '../tipos';
import { Sobrante } from '../logica/lotes';
import { TotalesSimulacion } from '../logica/sumas';
import { guardasBloqueantes } from '../logica/flujo';
import { MENSAJES_SIMULACION, contadoresDeSimulacion, mensajePlan } from '../logica/textos';

/** Paso 2: lo que pasaría, sin escribir nada. Avisos de guardas, sobrantes y conteos. */
@Component({
  selector: 'app-mt-paso-simular',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card mt-bloque">
      <h2 class="mt-subtitulo">Así quedaría tu tienda</h2>
      <p class="mt-ayuda">Esto es una revisión: todavía no se creó nada en Katuq.</p>

      <div class="cfg-vacio" *ngIf="simulando">
        <p class="cfg-vacio__titulo">Revisando tu archivo…</p>
        <p class="cfg-vacio__texto">Puede tardar un momento si tienes muchos productos.</p>
      </div>

      <p class="cfg-aviso cfg-aviso--error" role="alert" *ngIf="error">
        <span class="mt-fuerte">{{ error.message }}</span>
      </p>

      <ng-container *ngIf="totales">
        <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngFor="let g of bloqueantes">
          <span class="mt-fuerte">{{ g.message }}</span>
        </p>
        <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngFor="let g of otrasGuardas">
          <span class="mt-fuerte">{{ g.message }}</span>
        </p>
        <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="sobrantes.length">
          <span class="mt-fuerte">{{ sobrantes.length }} producto(s) tienen demasiadas filas para un solo envío y no se traerán.</span>
        </p>
        <p class="cfg-aviso mt-sep" *ngIf="plan">
          <span class="mt-fuerte">{{ plan }}</span>
        </p>

        <div class="cfg-stats mt-sep">
          <div class="cfg-stat" *ngFor="let c of contadores">
            <span class="cfg-stat__label">{{ c.etiqueta }}</span>
            <span class="cfg-stat__valor">{{ c.valor }}</span>
          </div>
        </div>

        <h3 class="mt-sub2" *ngIf="totales.avisos.length">Avisos ({{ totales.avisosTotal }})</h3>
        <ul class="mt-lista" *ngIf="totales.avisos.length">
          <li *ngFor="let a of avisosVisibles">
            <span class="mt-texto">{{ a.message || textoAviso(a.code) }}</span>
            <span class="mt-meta" *ngIf="a.row"> · fila {{ a.row }}</span>
          </li>
        </ul>
        <p class="mt-ayuda" *ngIf="totales.avisosTotal > avisosVisibles.length">Mostramos los primeros {{ avisosVisibles.length }} de {{ totales.avisosTotal }}. El reporte final los trae todos.</p>
      </ng-container>
    </section>

    <div class="cfg-form__pie">
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="volver.emit()">Volver</button>
      <button type="button" class="cfg-btn cfg-btn--sec" *ngIf="error" (click)="reintentar.emit()">Reintentar la revisión</button>
      <button type="button" class="cfg-btn" [disabled]="!puedeImportar" (click)="importar.emit()">Traer mi tienda</button>
    </div>
  `,
})
export class PasoSimularComponent {
  @Input() simulando = false;
  @Input() totales: TotalesSimulacion | null = null;
  @Input() sobrantes: Sobrante[] = [];
  @Input() error: ErrorImportador | null = null;
  @Output() volver = new EventEmitter<void>();
  @Output() reintentar = new EventEmitter<void>();
  @Output() importar = new EventEmitter<void>();

  get bloqueantes() {
    return this.totales ? guardasBloqueantes(this.totales.guardas) : [];
  }
  get otrasGuardas() {
    const b = new Set(this.bloqueantes.map((g) => g.code));
    return this.totales ? this.totales.guardas.filter((g) => !b.has(g.code)) : [];
  }
  get puedeImportar(): boolean {
    return !!this.totales && !this.simulando && !this.error && this.bloqueantes.length === 0;
  }
  get contadores() {
    return this.totales ? contadoresDeSimulacion(this.totales) : [];
  }
  get plan(): string | null {
    return this.totales ? mensajePlan(this.totales.plan) : null;
  }
  get avisosVisibles() {
    return this.totales ? this.totales.avisos.slice(0, 50) : [];
  }
  textoAviso(code: string): string {
    return MENSAJES_SIMULACION[code] || 'Revisa este producto en el reporte.';
  }
}
