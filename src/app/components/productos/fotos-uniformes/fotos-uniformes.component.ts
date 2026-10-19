import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subject, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

import { ProductPhotosService } from '../../../shared/services/productos/product-photos.service';
import {
  AjustesFotos,
  ConfigFotos,
  ETIQUETAS_FONDO,
  ETIQUETAS_PROPORCION,
  EstadoLote,
  Exclusion,
  FONDOS,
  Fondo,
  INTERVALO_CONSULTA_MS,
  LLAVE_AJUSTES,
  LLAVE_ULTIMO_LOTE,
  Muestra,
  Omitida,
  PROPORCIONES,
  Proporcion,
  ResumenLote,
  Seleccion,
  ajustesIniciales,
  alternarExclusion,
  cuerpoLote,
  cuerpoVistaPrevia,
  debeRetomarse,
  esFinal,
  estaExcluida,
  mensajeDeError,
  motivoDeOmision,
  nuevaLlave,
  progresoDeLote,
  puedeAplicar,
  resumenDeLote,
  seleccionValida,
  soloRevertir,
  textoDeAjustes,
  textoDeAviso,
  textoDeSeleccion,
} from '../../../shared/services/productos/product-photos.mapper';

type Paso = 'cargando' | 'pausa' | 'ajustes' | 'vista' | 'aplicando' | 'resumen' | 'error';

/**
 * «Uniformar fotos» (D-501, ticket 1252, fase 1 sin IA). Diálogo standalone y OnPush.
 *
 * Pasos: ajustes → vista previa de hasta 3 fotos (con «No uniformar esta») → aplicar → progreso
 * (consulta cada 2 s con `timer` + `switchMap` + `takeUntil`) → resumen con «Revertir lote».
 * Con el interruptor del servidor en pausa (`off`) solo ofrece revertir.
 *
 * Lo abren la barra masiva de Productos (selección), el botón junto al filtro de categoría y la
 * pestaña Imágenes de un producto guardado; las tres solo con la bandera `productPhotoUniform`.
 * Este componente no decide permisos: el servidor responde 403/503 si no corresponde.
 */
@Component({
  selector: 'app-fotos-uniformes',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fotos-uniformes.component.html',
  styleUrls: ['./fotos-uniformes.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FotosUniformesComponent implements OnInit, AfterViewInit, OnDestroy {
  /** El diálogo recibe el foco al abrir (teclado y lectores de pantalla). */
  @ViewChild('dialogo') dialogo?: ElementRef<HTMLElement>;
  /** Productos elegidos (barra masiva o el producto del editor). */
  @Input() productIds: string[] = [];
  /** Categoría real filtrada (botón junto al filtro). */
  @Input() categoryLabel = '';
  /** Se cierra el diálogo; `cambio` = alguna foto cambió (la lista o el editor recargan). */
  @Output() cerrado = new EventEmitter<{ cambio: boolean }>();

  paso: Paso = 'cargando';
  config: ConfigFotos | null = null;
  ajustes: AjustesFotos = { aspect: '1:1', background: 'white', marginPct: 8 };
  muestras: Muestra[] = [];
  omitidas: Omitida[] = [];
  excluidas: Exclusion[] = [];
  lote: EstadoLote | null = null;
  resumen: ResumenLote | null = null;
  ultimoLoteId: string | null = null;
  ocupado = false;
  error = '';
  aviso = '';
  /** Cada cuánto se consulta el lote. Las pruebas lo acortan. */
  intervaloConsultaMs = INTERVALO_CONSULTA_MS;

  readonly proporciones: Proporcion[] = PROPORCIONES;
  readonly fondos: Fondo[] = FONDOS;
  readonly etiquetasProporcion = ETIQUETAS_PROPORCION;
  readonly etiquetasFondo = ETIQUETAS_FONDO;

  private cambio = false;
  private cerradoYa = false;
  private readonly destruir$ = new Subject<void>();
  private readonly pararConsulta$ = new Subject<void>();

  constructor(private readonly servicio: ProductPhotosService, private readonly cdr: ChangeDetectorRef) {}

  get seleccion(): Seleccion {
    return this.categoryLabel
      ? { tipo: 'categoria', categoryLabel: this.categoryLabel }
      : { tipo: 'productos', productIds: this.productIds || [] };
  }

  get textoSeleccion(): string {
    return textoDeSeleccion(this.seleccion);
  }

  get textoAjustes(): string {
    return textoDeAjustes(this.ajustes);
  }

  get puedeAplicar(): boolean {
    return puedeAplicar(this.config);
  }

  get progreso(): { hechos: number; total: number; porcentaje: number } {
    return progresoDeLote(this.lote);
  }

  /** Revertir por producto solo tiene sentido con productos concretos (no por categoría). */
  get puedeRevertirSeleccion(): boolean {
    return !this.categoryLabel && (this.productIds || []).length > 0 && !!this.config && this.config.canApply;
  }

  get colorMarca(): string | null {
    return this.config ? this.config.brandColor : null;
  }

  ngOnInit(): void {
    this.ultimoLoteId = this.leerLocal(LLAVE_ULTIMO_LOTE);
    if (!seleccionValida(this.seleccion)) {
      this.mostrarError('Elige los productos o la categoría que quieres uniformar.');
      return;
    }
    this.servicio.ajustes().pipe(takeUntil(this.destruir$)).subscribe({
      next: (config) => {
        this.config = config;
        this.ajustes = ajustesIniciales(this.leerLocal(LLAVE_AJUSTES), config);
        this.paso = soloRevertir(config) ? 'pausa' : 'ajustes';
        this.cdr.markForCheck();
        this.retomarUltimoLote(config);
      },
      error: (err) => this.mostrarError(mensajeDeError(err)),
    });
  }

  /**
   * D-501: al volver a abrir, si el último lote de este navegador sigue activo, se muestra su
   * progreso (y al terminar avisa el cambio, para que la lista o el editor recarguen las fotos).
   * Si no se puede leer, se abre normal.
   */
  private retomarUltimoLote(config: ConfigFotos): void {
    const id = this.ultimoLoteId;
    if (!id) return;
    this.servicio.verLote(id).pipe(catchError(() => of(null)), takeUntil(this.destruir$)).subscribe((lote) => {
      if (!debeRetomarse(lote, config) || this.cerradoYa || (this.paso !== 'ajustes' && this.paso !== 'pausa')) return;
      this.lote = lote;
      this.paso = 'aplicando';
      this.consultar(id);
      this.cdr.markForCheck();
    });
  }

  ngAfterViewInit(): void {
    const el = this.dialogo && this.dialogo.nativeElement;
    if (el && typeof el.focus === 'function') el.focus();
  }

  /** Escape cierra, esté donde esté el foco. */
  @HostListener('document:keydown.escape')
  alPresionarEscape(): void {
    this.cerrar();
  }

  ngOnDestroy(): void {
    this.pararConsulta$.next();
    this.destruir$.next();
    this.destruir$.complete();
  }

  elegirProporcion(a: Proporcion): void {
    this.ajustes = { ...this.ajustes, aspect: a };
  }

  elegirFondo(f: Fondo): void {
    if (f === 'brand' && !this.colorMarca) {
      return;
    }
    this.ajustes = { ...this.ajustes, background: f };
  }

  cambiarMargen(valor: number | string): void {
    const n = Math.round(Number(valor));
    this.ajustes = { ...this.ajustes, marginPct: Number.isFinite(n) ? Math.min(20, Math.max(0, n)) : this.ajustes.marginPct };
  }

  colorDeFondo(f: Fondo): string {
    if (f === 'white') return '#FFFFFF';
    if (f === 'light_gray') return '#F2F2F2';
    return this.colorMarca || '#F2F2F2';
  }

  /** Paso 2: vista previa de hasta 3 fotos, sin escribir nada. */
  pedirVistaPrevia(): void {
    if (this.ocupado) return;
    this.ocupado = true;
    this.error = '';
    this.guardarLocal(LLAVE_AJUSTES, JSON.stringify(this.ajustes));
    this.servicio.vistaPrevia(cuerpoVistaPrevia(this.seleccion, this.ajustes)).pipe(takeUntil(this.destruir$)).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.muestras = (r && r.samples) || [];
        this.omitidas = (r && r.skipped) || [];
        this.excluidas = [];
        this.paso = 'vista';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.ocupado = false;
        this.error = mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
  }

  alternar(m: Muestra): void {
    this.excluidas = alternarExclusion(this.excluidas, m.productId, m.index);
  }

  excluida(m: Muestra): boolean {
    return estaExcluida(this.excluidas, m.productId, m.index);
  }

  motivo(code: string): string {
    return motivoDeOmision(code);
  }

  textoAviso(code: string): string {
    return textoDeAviso(code);
  }

  volverAAjustes(): void {
    this.paso = 'ajustes';
    this.error = '';
  }

  /** Paso 3: aplicar. El lote corre en el servidor; aquí solo se consulta. */
  aplicar(): void {
    if (this.ocupado || !this.puedeAplicar) return;
    this.ocupado = true;
    this.error = '';
    this.servicio.crearLote(cuerpoLote(this.seleccion, this.ajustes, this.excluidas, nuevaLlave()))
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: (r) => {
          this.ocupado = false;
          this.ultimoLoteId = r.batchId;
          this.guardarLocal(LLAVE_ULTIMO_LOTE, r.batchId);
          this.paso = 'aplicando';
          this.consultar(r.batchId);
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.ocupado = false;
          this.error = mensajeDeError(err);
          this.cdr.markForCheck();
        },
      });
  }

  /** Consulta el lote cada 2 s hasta que termine (o hasta cerrar el diálogo). */
  consultar(batchId: string): void {
    this.pararConsulta$.next();
    timer(0, this.intervaloConsultaMs)
      .pipe(
        switchMap(() => this.servicio.verLote(batchId).pipe(catchError(() => of(null)))),
        takeUntil(this.pararConsulta$),
        takeUntil(this.destruir$),
      )
      .subscribe((lote) => {
        if (!lote) return;
        this.lote = lote;
        this.resumen = resumenDeLote(lote);
        if (esFinal(lote.status)) {
          this.pararConsulta$.next();
          const c = lote.counters || {};
          if ((Number(c['photosUniformed']) || 0) > 0 || (Number(c['photosReverted']) || 0) > 0) {
            this.cambio = true;
          }
          this.paso = 'resumen';
        }
        this.cdr.markForCheck();
      });
  }

  cancelarLote(): void {
    if (!this.lote || this.ocupado) return;
    this.ocupado = true;
    this.servicio.cancelarLote(this.lote.batchId).pipe(takeUntil(this.destruir$)).subscribe({
      next: () => {
        this.ocupado = false;
        this.aviso = 'Pediste cancelar: el lote se detiene al terminar el producto en curso.';
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.ocupado = false;
        this.error = mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** «Revertir lote»: vuelve cada foto de ese lote a su original (siempre real, en cualquier modo). */
  revertirLote(batchId: string | null = this.lote ? this.lote.batchId : this.ultimoLoteId): void {
    if (!batchId || this.ocupado) return;
    this.ocupado = true;
    this.error = '';
    this.servicio.revertirLote(batchId, nuevaLlave()).pipe(takeUntil(this.destruir$)).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.paso = 'aplicando';
        this.consultar(r.batchId);
        this.cdr.markForCheck();
      },
      error: (err) => {
        this.ocupado = false;
        this.error = mensajeDeError(err);
        this.cdr.markForCheck();
      },
    });
  }

  /** Con el interruptor en pausa: revertir las fotos de los productos elegidos, uno por uno. */
  async revertirSeleccion(): Promise<void> {
    if (this.ocupado || !this.puedeRevertirSeleccion) return;
    this.ocupado = true;
    this.error = '';
    this.aviso = '';
    let revertidas = 0;
    try {
      for (const id of this.productIds) {
        if (this.cerradoYa) return;
        const r = await new Promise<{ reverted: number }>((ok, falla) => {
          this.servicio.revertirProducto(id).pipe(takeUntil(this.destruir$)).subscribe({ next: ok, error: falla });
        });
        revertidas += Number(r && r.reverted) || 0;
      }
      if (revertidas > 0) this.cambio = true;
      this.aviso = revertidas === 1 ? 'Volvió 1 foto original.' : `Volvieron ${revertidas} fotos originales.`;
    } catch (err) {
      this.error = mensajeDeError(err);
    } finally {
      this.ocupado = false;
      this.cdr.markForCheck();
    }
  }

  cerrarDesdeFondo(evento: MouseEvent): void {
    if (evento && evento.target === evento.currentTarget) this.cerrar();
  }

  /** Cerrar cancela la consulta (el lote sigue en el servidor) y avisa si algo cambió. */
  cerrar(): void {
    if (this.cerradoYa) return;
    this.cerradoYa = true;
    this.pararConsulta$.next();
    this.cerrado.emit({ cambio: this.cambio });
  }

  trackMuestra(_i: number, m: Muestra): string {
    return `${m.productId}:${m.index}`;
  }

  private mostrarError(texto: string): void {
    this.error = texto;
    this.paso = 'error';
    this.cdr.markForCheck();
  }

  private leerLocal(llave: string): string | null {
    try {
      return localStorage.getItem(llave);
    } catch {
      return null;
    }
  }

  private guardarLocal(llave: string, valor: string): void {
    try {
      localStorage.setItem(llave, valor);
    } catch {
      // Almacenamiento bloqueado: el diálogo funciona igual, solo no recuerda.
    }
  }
}
