import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ClaseImpuesto,
  LecturaDirecciones,
  TARIFAS_CLASE,
  TarifaIva,
  textoBaseRedireccion,
  textoClasesSinAsignar,
} from '../logica/ampliacion';

export interface CambioBase {
  baseProductos?: string;
  baseCategorias?: string;
  baseConfirmada?: boolean;
  direccionesTexto?: string;
}

/**
 * Ajustes que el archivo de WooCommerce necesita antes de importar: IVA de cada clase de impuesto
 * y cómo empiezan las direcciones de sus productos. Solo presenta: la lógica vive en
 * `logica/ampliacion.ts`. Aparece si la simulación pidió clases o si el perfil necesita bases.
 */
@Component({
  selector: 'app-mt-ajustes-woo',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="cfg-card mt-bloque" *ngIf="clases.length">
      <h2 class="mt-subtitulo">IVA de tus clases de impuesto</h2>
      <p class="mt-ayuda">Tu tienda usa clases de impuesto propias. Dinos qué IVA lleva cada una; los productos de una clase sin IVA no se traerán.</p>
      <div class="mt-fila mt-sep" *ngFor="let c of clases">
        <label class="mt-fila__texto" [attr.for]="'mt-clase-' + c.clase">{{ c.clase }} <span class="mt-meta">({{ c.productos }} productos)</span></label>
        <select class="form-select mt-fila__campo" [id]="'mt-clase-' + c.clase" (change)="claseCambia.emit({ clase: c.clase, tarifa: tarifaDe($event) })">
          <option value="" [selected]="c.tarifa === null">Elige el IVA</option>
          <option *ngFor="let t of tarifas" [value]="t" [selected]="c.tarifa === t">{{ t }} %</option>
        </select>
      </div>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="avisoClases"><span class="mt-fuerte">{{ avisoClases }}</span></p>
      <div class="cfg-form__pie">
        <button type="button" class="cfg-btn cfg-btn--sec" (click)="revisar.emit()">Revisar de nuevo con este IVA</button>
      </div>
    </section>

    <section class="cfg-card mt-bloque" *ngIf="conBases">
      <h2 class="mt-subtitulo">Tus direcciones de siempre</h2>
      <p class="mt-ayuda">Para que los enlaces antiguos sigan llevando a tus productos, necesitamos saber cómo empiezan.</p>
      <div class="cfg-form__grupo mt-sep">
        <div>
          <label for="mt-base-productos">Las direcciones de tus productos empiezan por</label>
          <input id="mt-base-productos" class="form-control" type="text" [value]="baseProductos" (input)="base.emit({ baseProductos: texto($event), baseConfirmada: false })" placeholder="/producto/" />
        </div>
        <div>
          <label for="mt-base-categorias">Las de tus categorías empiezan por</label>
          <input id="mt-base-categorias" class="form-control" type="text" [value]="baseCategorias" (input)="base.emit({ baseCategorias: texto($event) })" placeholder="/categoria-producto/" />
        </div>
      </div>
      <label for="mt-direcciones" class="mt-sep mt-bloque">Direcciones reales de algunos productos (opcional, una por línea)</label>
      <textarea id="mt-direcciones" class="form-control" rows="4" [value]="direccionesTexto" (input)="base.emit({ direccionesTexto: texto($event) })" placeholder="https://mitienda.com/producto/camisa-azul/"></textarea>
      <p class="mt-ayuda" *ngIf="lecturaDirecciones.validas.length || lecturaDirecciones.invalidas">
        {{ lecturaDirecciones.validas.length }} direcciones válidas<ng-container *ngIf="lecturaDirecciones.invalidas">; {{ lecturaDirecciones.invalidas }} no se pudieron leer</ng-container>.
      </p>
      <p class="cfg-aviso mt-sep"><span class="mt-fuerte">{{ textoBase }}</span></p>
      <label class="mt-check">
        <input type="checkbox" class="form-check-input" [checked]="baseConfirmada" [disabled]="!baseProductos" (change)="base.emit({ baseConfirmada: marcado($event) })" />
        <span class="mt-texto-check">Confirmo que esa es la base de mis direcciones</span>
      </label>
      <p class="mt-ayuda" *ngIf="!baseConfirmada">Sin confirmar, no se crearán redirecciones.</p>
    </section>
  `,
})
export class AjustesWooComponent {
  @Input() clases: ClaseImpuesto[] = [];
  @Input() conBases = false;
  @Input() baseProductos = '';
  @Input() baseCategorias = '';
  @Input() baseConfirmada = false;
  @Input() baseNormalizada: string | null = null;
  @Input() direccionesTexto = '';
  @Input() lecturaDirecciones: LecturaDirecciones = { validas: [], invalidas: 0, sobrantes: 0 };
  @Output() claseCambia = new EventEmitter<{ clase: string; tarifa: TarifaIva | null }>();
  @Output() base = new EventEmitter<CambioBase>();
  @Output() revisar = new EventEmitter<void>();

  readonly tarifas = TARIFAS_CLASE;

  get avisoClases(): string | null {
    return textoClasesSinAsignar(this.clases);
  }
  get textoBase(): string {
    return textoBaseRedireccion(this.baseNormalizada, this.lecturaDirecciones.validas.length > 0);
  }
  tarifaDe(e: Event): TarifaIva | null {
    const v = Number((e.target as HTMLSelectElement).value);
    return (e.target as HTMLSelectElement).value !== '' && (v === 0 || v === 5 || v === 19) ? v : null;
  }
  texto(e: Event): string {
    return (e.target as HTMLInputElement).value;
  }
  marcado(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }
}
