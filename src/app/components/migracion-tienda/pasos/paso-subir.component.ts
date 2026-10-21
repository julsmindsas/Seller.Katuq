import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ConfigImportacion, ErroresConfig, IVA_PERMITIDOS } from '../logica/flujo';
import { ResultadoLectura } from '../logica/importacion';
import { textoFormato } from '../logica/ampliacion';

export interface OpcionSitio {
  id: string;
  nombre: string;
}
export interface OpcionBodega {
  idBodega: string;
  nombre: string;
}

/** Paso 1: de dónde viene la tienda, los archivos, el sitio de destino y la bodega. */
@Component({
  selector: 'app-mt-paso-subir',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="cfg-aviso cfg-aviso--warn mt-bloque" role="status" *ngIf="fotosPendientes">
      <span class="mt-fuerte">{{ fotosPendientes.texto }}</span>
      <div class="mt-sep">
        <button type="button" class="cfg-btn cfg-btn--sec" [disabled]="!lectura || !lectura.ok || leyendo" (click)="retomarFotos.emit()">Copiar fotos pendientes</button>
      </div>
    </div>

    <section class="cfg-card cfg-form mt-bloque">
      <h2 class="mt-subtitulo">1. Tus archivos</h2>
      <p class="mt-ayuda">Exporta tu tienda desde Shopify o WooCommerce y súbela tal como la descargas. Reconocemos de cuál es.</p>
      <div class="cfg-form__grupo">
        <div>
          <label for="mt-productos">Archivo de productos (CSV)</label>
          <input id="mt-productos" class="form-control" type="file" accept=".csv,text/csv" (change)="elegirProductos($event)" />
        </div>
        <div>
          <label for="mt-inventario">Archivo de existencias (opcional)</label>
          <input id="mt-inventario" class="form-control" type="file" accept=".csv,text/csv" [disabled]="!productosCargados" (change)="elegirInventario($event)" />
          <small class="mt-ayuda">En Shopify, el CSV de inventario por estados. Si no lo subes, los productos quedan sin existencias.</small>
        </div>
      </div>
      <p class="cfg-aviso cfg-aviso--error mt-sep" role="alert" *ngIf="lectura && !lectura.ok">{{ lectura.message }}</p>
      <p class="cfg-aviso cfg-aviso--ok mt-sep" role="status" *ngIf="lectura && lectura.ok">
        <span class="mt-fuerte">{{ lectura.perfil.nombre }}:</span>
        <span class="mt-fuerte">{{ lectura.grupos.length }} productos</span>
        <span class="mt-fuerte" *ngIf="lectura.inventario">y sus existencias</span>
        <span class="mt-meta" *ngIf="textoFormato">· {{ textoFormato }}</span>
      </p>
      <p class="cfg-aviso cfg-aviso--warn mt-sep" *ngIf="lectura && lectura.ok && lectura.filasSinClave.length">
        <span class="mt-fuerte">{{ lectura.filasSinClave.length }} filas no tienen identificador de producto y no se envían.</span>
      </p>
    </section>

    <section class="cfg-card cfg-form mt-bloque" *ngIf="lectura && lectura.ok">
      <h2 class="mt-subtitulo">2. A dónde llegan</h2>
      <div class="cfg-form__grupo">
        <div>
          <label for="mt-sitio">Sitio de destino</label>
          <select id="mt-sitio" class="form-select" [value]="config.sitioId" (change)="cambiar({ sitioId: valor($event) })">
            <option value="">Elige un sitio</option>
            <option *ngFor="let s of sitios" [value]="s.id" [selected]="s.id === config.sitioId">{{ s.nombre }}</option>
          </select>
          <small class="mt-error" *ngIf="errores.sitioId">{{ errores.sitioId }}</small>
        </div>
        <div *ngIf="lectura.inventario">
          <label for="mt-bodega">Bodega de las existencias</label>
          <select id="mt-bodega" class="form-select" [value]="config.bodega" (change)="cambiar({ bodega: valor($event) })">
            <option value="">Elige una bodega</option>
            <option *ngFor="let b of bodegas" [value]="b.idBodega" [selected]="b.idBodega === config.bodega">{{ b.nombre }} ({{ b.idBodega }})</option>
          </select>
          <small class="mt-error" *ngIf="errores.bodega">{{ errores.bodega }}</small>
        </div>
        <div>
          <label for="mt-iva">IVA de los productos con impuesto</label>
          <select id="mt-iva" class="form-select" (change)="cambiar({ ivaPercent: numero($event) })">
            <option *ngFor="let v of ivas" [value]="v" [selected]="v === config.ivaPercent">{{ v }} %</option>
          </select>
          <small class="mt-error" *ngIf="errores.ivaPercent">{{ errores.ivaPercent }}</small>
        </div>
        <div>
          <label for="mt-precios">¿Los precios de tu archivo ya incluyen el IVA?</label>
          <select id="mt-precios" class="form-select" (change)="cambiar({ preciosConIva: sino($event) })">
            <option value="" [selected]="config.preciosConIva === null">Elige una opción</option>
            <option value="si" [selected]="config.preciosConIva === true">Sí, ya lo incluyen</option>
            <option value="no" [selected]="config.preciosConIva === false">No, súmalo a mis precios</option>
          </select>
          <small class="mt-error" *ngIf="errores.preciosConIva">{{ errores.preciosConIva }}</small>
        </div>
        <div>
          <label for="mt-modo">Si un producto ya existe en Katuq</label>
          <select id="mt-modo" class="form-select" (change)="cambiar({ modo: modoDe($event) })">
            <option value="create" [selected]="config.modo === 'create'">No tocarlo</option>
            <option value="upsert" [selected]="config.modo === 'upsert'">Actualizarlo con el archivo</option>
          </select>
        </div>
      </div>
      <label class="mt-check" *ngIf="lectura.inventario">
        <input type="checkbox" class="form-check-input" [checked]="config.reemplazarExistencias" (change)="cambiar({ reemplazarExistencias: marcado($event) })" />
        <span class="mt-texto-check">Reemplazar las existencias de productos que ya existen</span>
      </label>
    </section>

    <div class="cfg-form__pie">
      <button type="button" class="cfg-btn cfg-btn--sec" (click)="soloClientes.emit()">Solo traer mis clientes</button>
      <button type="button" class="cfg-btn" [disabled]="!lectura || !lectura.ok || leyendo" (click)="continuar.emit()">Revisar antes de importar</button>
    </div>
  `,
})
export class PasoSubirComponent {
  @Input() lectura: ResultadoLectura | null = null;
  @Input() productosCargados = false;
  @Input() leyendo = false;
  @Input() sitios: OpcionSitio[] = [];
  @Input() bodegas: OpcionBodega[] = [];
  @Input() config!: ConfigImportacion;
  @Input() errores: ErroresConfig = {};
  @Output() productos = new EventEmitter<File | null>();
  @Output() inventario = new EventEmitter<File | null>();
  @Output() configCambia = new EventEmitter<Partial<ConfigImportacion>>();
  @Input() fotosPendientes: { migrationId: string; texto: string } | null = null;
  @Output() continuar = new EventEmitter<void>();
  @Output() retomarFotos = new EventEmitter<void>();
  @Output() soloClientes = new EventEmitter<void>();

  readonly ivas = IVA_PERMITIDOS;

  get textoFormato(): string | null {
    return this.lectura && this.lectura.ok ? textoFormato(this.lectura.formato) : null;
  }

  elegirProductos(e: Event): void {
    this.productos.emit(archivoDe(e));
  }
  elegirInventario(e: Event): void {
    this.inventario.emit(archivoDe(e));
  }
  cambiar(parte: Partial<ConfigImportacion>): void {
    this.configCambia.emit(parte);
  }
  valor(e: Event): string {
    return (e.target as HTMLSelectElement).value;
  }
  numero(e: Event): number {
    return Number((e.target as HTMLSelectElement).value);
  }
  sino(e: Event): boolean | null {
    const v = (e.target as HTMLSelectElement).value;
    return v === 'si' ? true : v === 'no' ? false : null;
  }
  modoDe(e: Event): 'create' | 'upsert' {
    return (e.target as HTMLSelectElement).value === 'upsert' ? 'upsert' : 'create';
  }
  marcado(e: Event): boolean {
    return (e.target as HTMLInputElement).checked;
  }
}

function archivoDe(e: Event): File | null {
  const f = (e.target as HTMLInputElement).files;
  return f && f.length ? f[0] : null;
}
