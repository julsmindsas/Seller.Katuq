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
import { Subject, forkJoin, of, timer } from 'rxjs';
import { catchError, switchMap, takeUntil } from 'rxjs/operators';

import { ProductPhotosService } from '../../../shared/services/productos/product-photos.service';
import {
  ALCANCES_FONDO,
  AjusteQuitarFondo,
  AjustesFotos,
  AlcanceFondo,
  ConfigFotos,
  ConteoSeleccion,
  ETIQUETAS_ALCANCE,
  ETIQUETAS_FONDO,
  ETIQUETAS_PROPORCION,
  EstadoLote,
  EstadoSerie,
  Exclusion,
  FONDOS,
  Fondo,
  INTERVALO_CONSULTA_MS,
  LLAVE_AJUSTES,
  LLAVE_ULTIMO_LOTE,
  Muestra,
  Omitida,
  PROPORCIONES,
  QUITAR_FONDO_POR_DEFECTO,
  ParteDeSerie,
  ProgresoSerie,
  Proporcion,
  RespuestaVistaPrevia,
  ResumenLote,
  RutaParaElegir,
  Seleccion,
  ajustesDeFondo,
  ajustesIniciales,
  alcanceValido,
  alternarExclusion,
  avisoCostoVistaPrevia,
  usosQueQuedan,
  codigoDeError,
  conteoDeSeleccion,
  cuerpoLote,
  cuerpoVistaPrevia,
  debeRetomarse,
  detieneLaConsulta,
  esFinal,
  estaExcluida,
  filtrarRutas,
  leerUltimoTrabajo,
  mensajeDeConsultaCortada,
  mensajeDeError,
  motivoDeOmision,
  nuevaLlave,
  partesConResultados,
  progresoDeLote,
  progresoDeSerie,
  proporcionSugeridaValida,
  puedeAplicar,
  quitarFondoDisponible,
  resumenDeLote,
  resumenDeSerie,
  rutasParaElegir,
  seleccionDeEntradas,
  seleccionValida,
  soloRevertir,
  subrutasDe,
  textoDeAjustes,
  textoDeAviso,
  textoDeConteo,
  textoDeOrigen,
  textoDeParada,
  textoDeParte,
  textoDeProgresoSerie,
  textoDeRuta,
  textoDeSeleccion,
  textoExcede,
  textoSinUbicar,
  textoUsosNecesarios,
  textoUsosQueQuedan,
  textoUsosSimulados,
  topeDeSerie,
  valorUltimoTrabajo,
  vistaPreviaConFondoDisponible,
} from '../../../shared/services/productos/product-photos.mapper';

type Paso = 'cargando' | 'pausa' | 'categoria' | 'ajustes' | 'vista' | 'aplicando' | 'resumen' | 'error';

/**
 * «Uniformar fotos» (D-501, ticket 1252, fase 1 sin IA). Diálogo standalone y OnPush.
 *
 * Pasos: [categoría] → ajustes → vista previa de hasta 3 fotos (con «No uniformar esta») → aplicar →
 * progreso (consulta cada 2 s con `timer` + `switchMap` + `takeUntil`) → resumen con «Revertir».
 * Con el interruptor del servidor en pausa (`off`) solo ofrece revertir.
 *
 * TX-37 · 7.11 (D-518):
 *  - la categoría viaja como ruta del árbol (`categoryPath`) e incluye sus subcategorías; el
 *    diálogo muestra el conteo del servidor y cuántos productos no se pudieron ubicar;
 *  - con `elegirCategoria` y sin categoría, primero se elige la categoría del árbol (pregunta 4);
 *  - más de 100 productos es una serie de lotes seguidos: se ve la parte en curso y el total, y se
 *    cancela o revierte entera; más del tope del servidor (2.000) pide elegir una subcategoría
 *    (SERIES_TOO_LARGE). Al terminar, lee cada lote de la serie para listar motivos y avisos;
 *  - si la consulta recibe 403 o 404 (la bandera se apagó, o el lote o la serie no existen), se
 *    detiene y lo dice, en vez de seguir consultando sin fin;
 *  - `proporcionSugerida` (la del estilo del sitio, pregunta 13) es la proporción inicial, salvo
 *    «Del estilo»; sin ella, la de siempre (P1).
 *
 * TX-37 · 8.6 y 9.10 (D-518):
 *  - «Quitar fondo» (fase 2) solo se ofrece si `GET /settings` dice que está disponible (bandera,
 *    proveedor y uso en regla, administrador, modo encendido). Empieza apagado y en «Solo la portada»;
 *    no se recuerda entre aperturas porque cada foto gasta un uso del plan;
 *  - la vista previa con IA solo si además el modo es `on`: antes de pedirla avisa «La vista previa
 *    usa hasta 3 de tus N usos del mes». En sombra la vista previa va sin IA y el lote solo cuenta
 *    lo que costaría (nunca se gasta);
 *  - muestra los usos que necesita lo que se ve y los que quedan; sin cupo (AI_QUOTA_INSUFFICIENT)
 *    el mensaje sugiere elegir menos productos o solo la portada;
 *  - el resumen dice de dónde salieron las fotos copiadas o adoptadas (fase 1b) y cuenta
 *    `download_failed`, `not_image`, `not_adoptable`, `would_copy` y `would_remove_background`;
 *  - nunca el nombre del proveedor ni del modelo (Artículo VI).
 *
 * Lo abren la barra masiva de Productos (selección), el botón junto al filtro de categoría y la
 * pestaña Imágenes de un producto guardado (y, con TX-37 · 7.12, el editor del sitio y Catálogos por
 * link); todas solo con la bandera `productPhotoUniform`. Este componente no decide permisos: el
 * servidor responde 403/503 si no corresponde.
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
  /** Productos elegidos (barra masiva, el producto del editor, la sección del sitio o el catálogo). */
  @Input() productIds: string[] = [];
  /** Ruta de la categoría en el árbol (1 a 3 nombres); incluye sus subcategorías. */
  @Input() categoryPath: string[] | null = null;
  /** Compatibilidad (D-501): una categoría de primer nivel; vale `[categoryLabel]`. */
  @Input() categoryLabel = '';
  /** Sin categoría ni productos, abre en el paso «Elige la categoría» (catálogo completo del sitio). */
  @Input() elegirCategoria = false;
  /** Proporción con la que empieza (la del estilo del sitio); `''` («Del estilo») no sugiere nada. */
  @Input() proporcionSugerida: string | null = null;
  /** Se cierra el diálogo; `cambio` = alguna foto cambió (la lista o el editor recargan). */
  @Output() cerrado = new EventEmitter<{ cambio: boolean }>();

  paso: Paso = 'cargando';
  config: ConfigFotos | null = null;
  ajustes: AjustesFotos = { aspect: '1:1', background: 'white', marginPct: 8 };
  muestras: Muestra[] = [];
  omitidas: Omitida[] = [];
  excluidas: Exclusion[] = [];
  /** Última respuesta de la vista previa (conteo del servidor). */
  vistaPrevia: RespuestaVistaPrevia | null = null;
  lote: EstadoLote | null = null;
  serie: EstadoSerie | null = null;
  serieId: string | null = null;
  resumen: ResumenLote | null = null;
  ultimoLoteId: string | null = null;
  ultimaSerieId: string | null = null;
  /** La última reversión de este navegador: se retoma al volver a abrir (no se ofrece repetirla). */
  ultimaReversionId: string | null = null;
  ocupado = false;
  error = '';
  aviso = '';
  /** Título del paso «error»: al abrir, o cuando la consulta del avance se corta. */
  tituloError = 'No pudimos abrir Uniformar fotos';
  /** La última respuesta fue SERIES_TOO_LARGE: ofrece elegir una subcategoría. */
  excedeEnServidor = false;
  /** Paso de categoría. */
  rutaElegida: string[] | null = null;
  rutas: RutaParaElegir[] = [];
  rutasCargadas = false;
  cargandoRutas = false;
  errorRutas = '';
  buscarCategoria = '';
  /** Al elegir una subcategoría (SERIES_TOO_LARGE), solo se listan las de esta ruta. */
  soloSubrutasDe: string[] | null = null;
  /** TX-37 · 9.10: «Quitar fondo» (fase 2). Nace apagado y en la portada, siempre. */
  quitarFondo = false;
  alcanceFondo: AlcanceFondo = QUITAR_FONDO_POR_DEFECTO.alcance;
  /** Usos que el servidor estimó al crear el lote (en sombra, lo que costaría). */
  usosDelLote: number | null = null;
  /** Cada cuánto se consulta el lote. Las pruebas lo acortan. */
  intervaloConsultaMs = INTERVALO_CONSULTA_MS;

  readonly proporciones: Proporcion[] = PROPORCIONES;
  readonly fondos: Fondo[] = FONDOS;
  readonly etiquetasProporcion = ETIQUETAS_PROPORCION;
  readonly etiquetasFondo = ETIQUETAS_FONDO;
  readonly alcances: AlcanceFondo[] = ALCANCES_FONDO;
  readonly etiquetasAlcance = ETIQUETAS_ALCANCE;

  private cambio = false;
  private cerradoYa = false;
  /** Al elegir la subcategoría desde la vista previa, se vuelve a pedir la vista previa. */
  private volverAVista = false;
  private readonly destruir$ = new Subject<void>();
  private readonly pararConsulta$ = new Subject<void>();

  constructor(private readonly servicio: ProductPhotosService, private readonly cdr: ChangeDetectorRef) {}

  get seleccion(): Seleccion {
    return seleccionDeEntradas({
      productIds: this.productIds,
      categoryPath: this.rutaElegida || this.categoryPath,
      categoryLabel: this.categoryLabel,
    });
  }

  /** Se abrió para elegir la categoría (y no llegaron productos ni categoría). */
  get conPasoCategoria(): boolean {
    return this.elegirCategoria
      && !seleccionValida(seleccionDeEntradas({ productIds: this.productIds, categoryPath: this.categoryPath, categoryLabel: this.categoryLabel }));
  }

  get textoSeleccion(): string {
    if (this.conPasoCategoria && !this.rutaElegida) return 'Elige la categoría';
    return textoDeSeleccion(this.seleccion);
  }

  get textoAjustes(): string {
    return textoDeAjustes(this.ajustes);
  }

  get puedeAplicar(): boolean {
    return puedeAplicar(this.config);
  }

  get conteo(): ConteoSeleccion {
    return conteoDeSeleccion(this.seleccion, this.vistaPrevia, this.config);
  }

  get textoConteo(): string {
    return textoDeConteo(this.conteo);
  }

  get textoSinUbicar(): string {
    return textoSinUbicar(this.conteo.sinUbicar);
  }

  /** No se puede aplicar: pasa del tope de una serie o la categoría no tiene productos. */
  get bloqueaAplicar(): boolean {
    const c = this.conteo;
    return c.excede || c.total === 0 || this.excedeEnServidor;
  }

  /** Ofrecer «Elegir una subcategoría»: es una categoría y pasa del tope de la serie. */
  get ofreceSubcategoria(): boolean {
    return this.seleccion.tipo === 'categoria' && (this.conteo.excede || this.excedeEnServidor);
  }

  /** SERIES_TOO_LARGE con el tope del servidor (el mismo con el que se bloquea). */
  get mensajeExcede(): string {
    return textoExcede(topeDeSerie(this.config));
  }

  get progreso(): { hechos: number; total: number; porcentaje: number } {
    return progresoDeLote(this.lote);
  }

  get progresoSerie(): ProgresoSerie {
    return progresoDeSerie(this.serie);
  }

  get textoProgresoSerie(): string {
    return textoDeProgresoSerie(this.progresoSerie);
  }

  get rutasVisibles(): RutaParaElegir[] {
    const base = this.soloSubrutasDe ? subrutasDe(this.rutas, this.soloSubrutasDe) : this.rutas;
    return filtrarRutas(base, this.buscarCategoria);
  }

  get textoSoloSubrutas(): string {
    return this.soloSubrutasDe ? textoDeRuta(this.soloSubrutasDe) : '';
  }

  /** Revertir por producto solo tiene sentido con productos concretos (no por categoría). */
  get puedeRevertirSeleccion(): boolean {
    const sel = this.seleccion;
    return sel.tipo === 'productos' && sel.productIds.length > 0 && !!this.config && this.config.canApply;
  }

  /** La proporción que sugirió quien abrió el diálogo (la del sitio), si es válida. */
  get proporcionDelSitio(): Proporcion | null {
    return proporcionSugeridaValida(this.proporcionSugerida);
  }

  /** «Quitar fondo» se ofrece (el servidor lo dice: bandera, proveedor, rol y modo). */
  get fondoDisponible(): boolean {
    return !this.fondoRetirado && quitarFondoDisponible(this.config);
  }

  /** Se eligió «Quitar fondo» y se puede: lo que se manda al aplicar. */
  get fondoElegido(): boolean {
    return this.quitarFondo && this.fondoDisponible;
  }

  /** La vista previa puede usar IA (modo `on`): gasta hasta 3 usos. */
  get vistaPreviaConIA(): boolean {
    return this.fondoElegido && vistaPreviaConFondoDisponible(this.config) && this.usosRestantes !== 0;
  }

  /** Modo `on` con vista previa de IA posible: se avisa su costo (o que no hay usos) antes de pedirla. */
  get avisoVistaVisible(): boolean {
    return this.fondoElegido && vistaPreviaConFondoDisponible(this.config);
  }

  private get usosRestantes(): number | null {
    return usosQueQuedan(this.config && this.config.aiUsesLeft);
  }

  /** En sombra «Quitar fondo» solo se cuenta; la vista previa va sin IA. */
  get fondoEnSombra(): boolean {
    return this.fondoElegido && !!this.config && this.config.mode === 'shadow';
  }

  /** El servidor dijo que ya no se puede: la opción se oculta hasta reabrir el diálogo. */
  private fondoRetirado = false;

  get ajusteFondo(): AjusteQuitarFondo {
    return { quitar: this.quitarFondo, alcance: this.alcanceFondo };
  }

  get textoUsosQuedan(): string {
    return textoUsosQueQuedan(this.config && this.config.aiUsesLeft);
  }

  /** Antes de pedir la vista previa con IA: cuánto gasta. */
  get avisoCostoVista(): string {
    return avisoCostoVistaPrevia(this.vistaPrevia && this.vistaPrevia.aiUsesPreviewMax, this.config && this.config.aiUsesLeft);
  }

  /** Después de la vista previa con IA: los usos que necesita lo que se ve y los que quedan. */
  get textoUsosVista(): string {
    const v = this.vistaPrevia;
    if (!v || !this.fondoElegido) return '';
    return textoUsosNecesarios(v.aiUsesNeeded, v.aiUsesLeft !== undefined ? v.aiUsesLeft : this.config && this.config.aiUsesLeft, this.conteo.total);
  }

  /** En sombra: lo que costaría aplicar (dato del servidor al simular, o de la vista previa). */
  get textoUsosSombra(): string {
    if (!this.config || this.config.mode !== 'shadow') return '';
    return textoUsosSimulados(this.usosDelLote);
  }

  /** La vista previa con IA se detuvo (`ai_quota`, `ai_unavailable`): lo dice sin gastar más. */
  get paradaDeVista(): string {
    const v = this.vistaPrevia;
    return v && v.stopCode ? textoDeParada(v.stopCode) : '';
  }

  textoOrigen(m: Muestra): string {
    return textoDeOrigen(m.copiedFrom, true);
  }

  /** Número de cada marca de pasos: con el paso de categoría, todo corre un lugar. */
  numeroPaso(n: number): number {
    return this.conPasoCategoria ? n + 1 : n;
  }

  get colorMarca(): string | null {
    return this.config ? this.config.brandColor : null;
  }

  ngOnInit(): void {
    const ultimo = leerUltimoTrabajo(this.leerLocal(LLAVE_ULTIMO_LOTE));
    this.ultimoLoteId = ultimo && ultimo.tipo === 'lote' ? ultimo.id : null;
    this.ultimaSerieId = ultimo && ultimo.tipo === 'serie' ? ultimo.id : null;
    this.ultimaReversionId = ultimo && ultimo.tipo === 'reversion' ? ultimo.id : null;
    if (!seleccionValida(this.seleccion) && !this.conPasoCategoria) {
      this.mostrarError('Elige los productos o la categoría que quieres uniformar.');
      return;
    }
    this.servicio.ajustes().pipe(takeUntil(this.destruir$)).subscribe({
      next: (config) => {
        this.config = config;
        this.ajustes = ajustesIniciales(this.leerLocal(LLAVE_AJUSTES), config, this.proporcionSugerida);
        if (soloRevertir(config)) {
          this.paso = 'pausa';
        } else if (this.conPasoCategoria) {
          this.paso = 'categoria';
          this.cargarRutas();
        } else {
          this.paso = 'ajustes';
        }
        this.cdr.markForCheck();
        this.retomarUltimo(config);
      },
      error: (err) => this.mostrarError(mensajeDeError(err)),
    });
  }

  /**
   * D-501: al volver a abrir, si lo último de este navegador (un lote o una serie) sigue activo, se
   * muestra su progreso (y al terminar avisa el cambio, para que la lista o el editor recarguen las
   * fotos). Si no se puede leer, se abre normal.
   */
  private retomarUltimo(config: ConfigFotos): void {
    const puedeRetomar = () => !this.cerradoYa && (this.paso === 'ajustes' || this.paso === 'pausa' || this.paso === 'categoria');
    if (this.ultimaSerieId) {
      const id = this.ultimaSerieId;
      this.servicio.verSerie(id).pipe(catchError(() => of(null)), takeUntil(this.destruir$)).subscribe((serie) => {
        if (!debeRetomarse(serie, config) || !puedeRetomar()) return;
        this.serie = serie;
        this.serieId = id;
        this.paso = 'aplicando';
        this.consultarSerie(id);
        this.cdr.markForCheck();
      });
      return;
    }
    // Un lote suelto, o la reversión de un lote o de una serie (también es un lote).
    const id = this.ultimoLoteId || this.ultimaReversionId;
    if (!id) return;
    this.servicio.verLote(id).pipe(catchError(() => of(null)), takeUntil(this.destruir$)).subscribe((lote) => {
      if (!debeRetomarse(lote, config) || !puedeRetomar()) return;
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

  // ───────────── Paso de categoría (pregunta 4) ─────────────

  /** Trae el árbol de la empresa una sola vez (mismo documento y nombres que el servidor, D-495). */
  cargarRutas(): void {
    if (this.cargandoRutas || this.rutasCargadas) return;
    this.cargandoRutas = true;
    this.errorRutas = '';
    this.servicio.arbolDeCategorias().pipe(takeUntil(this.destruir$)).subscribe({
      next: (docs) => {
        this.cargandoRutas = false;
        this.rutasCargadas = true;
        this.rutas = rutasParaElegir(docs);
        this.cdr.markForCheck();
      },
      error: () => {
        this.cargandoRutas = false;
        this.errorRutas = 'No pudimos cargar tus categorías. Inténtalo de nuevo.';
        this.cdr.markForCheck();
      },
    });
  }

  /** Elegir una categoría del árbol. Desde «Elegir una subcategoría» vuelve directo a la vista previa. */
  elegirRuta(r: RutaParaElegir): void {
    if (r.repetida) return;
    this.rutaElegida = [...r.nombres];
    this.vistaPrevia = null;
    this.muestras = [];
    this.omitidas = [];
    this.excluidas = [];
    this.error = '';
    this.excedeEnServidor = false;
    this.soloSubrutasDe = null;
    this.buscarCategoria = '';
    this.paso = 'ajustes';
    if (this.volverAVista) {
      this.volverAVista = false;
      this.pedirVistaPrevia();
    }
  }

  /** Volver a elegir la categoría (solo cuando se abrió para elegirla). */
  cambiarCategoria(): void {
    this.soloSubrutasDe = null;
    this.buscarCategoria = '';
    this.volverAVista = false;
    this.error = '';
    this.paso = 'categoria';
    this.cargarRutas();
  }

  /** SERIES_TOO_LARGE: elegir una subcategoría de la categoría actual. */
  elegirSubcategoria(): void {
    const sel = this.seleccion;
    if (sel.tipo !== 'categoria') return;
    this.soloSubrutasDe = [...sel.categoryPath];
    this.buscarCategoria = '';
    this.volverAVista = true;
    this.error = '';
    this.paso = 'categoria';
    this.cargarRutas();
  }

  /** Desde el paso de categoría: volver a donde estaba, o cerrar si todavía no había categoría. */
  salirDeCategoria(): void {
    if (this.volverAVista) {
      this.volverAVista = false;
      this.soloSubrutasDe = null;
      this.paso = 'vista';
      return;
    }
    if (this.rutaElegida) {
      this.paso = 'ajustes';
      return;
    }
    this.cerrar();
  }

  trackRuta(_i: number, r: RutaParaElegir): string {
    return r.clave;
  }

  // ───────────── Ajustes, vista previa y lote ─────────────

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
    this.excedeEnServidor = false;
    this.guardarLocal(LLAVE_AJUSTES, JSON.stringify(this.ajustes));
    // La vista previa lleva «Quitar fondo» solo si el servidor la deja usar IA (modo `on`, administrador).
    const fondoVista = ajustesDeFondo(this.ajusteFondo, this.vistaPreviaConIA);
    this.servicio.vistaPrevia(cuerpoVistaPrevia(this.seleccion, this.ajustes, fondoVista)).pipe(takeUntil(this.destruir$)).subscribe({
      next: (r) => {
        this.ocupado = false;
        this.vistaPrevia = r || null;
        this.muestras = (r && r.samples) || [];
        this.omitidas = (r && r.skipped) || [];
        this.excluidas = [];
        this.paso = 'vista';
        this.cdr.markForCheck();
      },
      error: (err) => this.fallo(err),
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

  textoParte(p: ParteDeSerie): string {
    return textoDeParte(p);
  }

  trackParte(_i: number, p: ParteDeSerie): string {
    return p.batchId;
  }

  /** «Quitar fondo»: elegirlo o volver a conservar el fondo. Solo si el servidor lo ofrece. */
  elegirQuitarFondo(quitar: boolean): void {
    if (quitar && !this.fondoDisponible) return;
    this.quitarFondo = quitar;
  }

  /** «Solo la portada» o «Todas las fotos». */
  elegirAlcance(a: AlcanceFondo): void {
    this.alcanceFondo = alcanceValido(a);
  }

  volverAAjustes(): void {
    this.paso = 'ajustes';
    this.error = '';
  }

  /** Paso 3: aplicar. El lote (o la serie) corre en el servidor; aquí solo se consulta. */
  aplicar(): void {
    if (this.ocupado || !this.puedeAplicar) return;
    if (this.conteo.excede) {
      this.error = this.mensajeExcede;
      return;
    }
    if (this.bloqueaAplicar) return;
    this.ocupado = true;
    this.error = '';
    this.usosDelLote = null;
    this.servicio.crearLote(cuerpoLote(this.seleccion, this.ajustes, this.excluidas, nuevaLlave(), ajustesDeFondo(this.ajusteFondo, this.fondoElegido)))
      .pipe(takeUntil(this.destruir$))
      .subscribe({
        next: (r) => {
          this.ocupado = false;
          this.paso = 'aplicando';
          this.usosDelLote = typeof r.aiUsesNeeded === 'number' ? r.aiUsesNeeded : null;
          if (r.seriesId) {
            this.ultimaSerieId = r.seriesId;
            this.ultimoLoteId = null;
            this.guardarLocal(LLAVE_ULTIMO_LOTE, valorUltimoTrabajo({ tipo: 'serie', id: r.seriesId }));
            this.serieId = r.seriesId;
            this.consultarSerie(r.seriesId);
          } else {
            this.ultimoLoteId = r.batchId;
            this.ultimaSerieId = null;
            this.guardarLocal(LLAVE_ULTIMO_LOTE, valorUltimoTrabajo({ tipo: 'lote', id: r.batchId }));
            this.consultar(r.batchId);
          }
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.excedeEnServidor = codigoDeError(err) === 'SERIES_TOO_LARGE';
          this.fallo(err);
          if (this.excedeEnServidor) this.error = this.mensajeExcede;
        },
      });
  }

  /** Consulta el lote cada 2 s hasta que termine (o hasta cerrar el diálogo). */
  consultar(batchId: string): void {
    this.pararConsulta$.next();
    this.serie = null;
    timer(0, this.intervaloConsultaMs)
      .pipe(
        switchMap(() => this.servicio.verLote(batchId).pipe(catchError((err) => this.alFallarConsulta(err)))),
        takeUntil(this.pararConsulta$),
        takeUntil(this.destruir$),
      )
      .subscribe((lote) => {
        if (!lote) return;
        this.lote = lote;
        this.resumen = resumenDeLote(lote);
        if (esFinal(lote.status)) {
          this.pararConsulta$.next();
          this.marcarCambio(lote.counters);
          this.paso = 'resumen';
        }
        this.cdr.markForCheck();
      });
  }

  /** TX-37 · 7.11: consulta la serie (partes y total) cada 2 s hasta su estado final. */
  consultarSerie(seriesId: string): void {
    this.pararConsulta$.next();
    this.lote = null;
    timer(0, this.intervaloConsultaMs)
      .pipe(
        switchMap(() => this.servicio.verSerie(seriesId).pipe(catchError((err) => this.alFallarConsulta(err)))),
        takeUntil(this.pararConsulta$),
        takeUntil(this.destruir$),
      )
      .subscribe((serie) => {
        if (!serie) return;
        this.serie = serie;
        this.resumen = resumenDeSerie(serie);
        if (esFinal(serie.status)) {
          this.pararConsulta$.next();
          this.marcarCambio(serie.counters);
          this.paso = 'resumen';
          this.leerLotesDeLaSerie(seriesId, serie);
        }
        this.cdr.markForCheck();
      });
  }

  /**
   * Al terminar una serie: lee cada lote que corrió (`GET /batches/:id`, hasta 100 resultados cada
   * uno) para listar motivos y avisos por foto en el resumen, como en un lote (D-518 TX-37·2). Una
   * sola vez y sin reintentos: si alguno falla, el resumen lo dice y quedan las cifras del total.
   */
  private leerLotesDeLaSerie(seriesId: string, serie: EstadoSerie): void {
    const partes = partesConResultados(serie);
    if (!partes.length) return;
    forkJoin(partes.map((p) => this.servicio.verLote(p.batchId).pipe(catchError(() => of(null)))))
      .pipe(takeUntil(this.destruir$))
      .subscribe((lotes) => {
        if (this.serieId !== seriesId || this.paso !== 'resumen') return;
        this.resumen = resumenDeSerie(serie, lotes);
        this.cdr.markForCheck();
      });
  }

  /**
   * Un error de la consulta del avance. 403/404 no se arreglan reintentando: se deja de consultar y
   * se dice (con la bandera apagada, la parada `feature_off`). Sin conexión o un 5xx, se reintenta.
   */
  private alFallarConsulta(err: unknown) {
    if (detieneLaConsulta(err)) {
      this.pararConsulta$.next();
      this.marcarCambio((this.serie || this.lote || { counters: null }).counters);
      this.tituloError = 'No pudimos seguir el avance';
      this.mostrarError(mensajeDeConsultaCortada(err));
    }
    return of(null);
  }

  /** Cancela el lote o, en una serie, el lote en curso (los que faltan no empiezan). */
  cancelarLote(): void {
    if (this.ocupado) return;
    if (this.serieId) {
      this.ocupado = true;
      this.servicio.cancelarSerie(this.serieId).pipe(takeUntil(this.destruir$)).subscribe({
        next: () => {
          this.ocupado = false;
          this.aviso = 'Pediste cancelar: el lote en curso se detiene al terminar el producto en curso y los que faltan no empiezan.';
          this.cdr.markForCheck();
        },
        error: (err) => this.fallo(err),
      });
      return;
    }
    if (!this.lote) return;
    this.ocupado = true;
    this.servicio.cancelarLote(this.lote.batchId).pipe(takeUntil(this.destruir$)).subscribe({
      next: () => {
        this.ocupado = false;
        this.aviso = 'Pediste cancelar: el lote se detiene al terminar el producto en curso.';
        this.cdr.markForCheck();
      },
      error: (err) => this.fallo(err),
    });
  }

  /** «Revertir» del resumen: el lote o, si fue una serie, todos sus lotes. */
  revertirResumen(): void {
    if (this.serieId) {
      this.revertirSerie(this.serieId);
      return;
    }
    this.revertirLote();
  }

  /** «Revertir lote»: vuelve cada foto de ese lote a su original (siempre real, en cualquier modo). */
  revertirLote(batchId: string | null = this.lote ? this.lote.batchId : this.ultimoLoteId): void {
    if (!batchId || this.ocupado) return;
    this.ocupado = true;
    this.error = '';
    this.servicio.revertirLote(batchId, nuevaLlave()).pipe(takeUntil(this.destruir$)).subscribe({
      next: (r) => this.seguirReversion(r.batchId),
      error: (err) => this.fallo(err),
    });
  }

  /** Revertir una serie: un lote de reversión con las fotos de todas sus partes (en cualquier modo). */
  revertirSerie(seriesId: string | null = this.serieId || this.ultimaSerieId): void {
    if (!seriesId || this.ocupado) return;
    this.ocupado = true;
    this.error = '';
    this.servicio.revertirSerie(seriesId, nuevaLlave()).pipe(takeUntil(this.destruir$)).subscribe({
      next: (r) => this.seguirReversion(r.batchId),
      error: (err) => this.fallo(err),
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

  /** Cerrar cancela la consulta (el lote o la serie siguen en el servidor) y avisa si algo cambió. */
  cerrar(): void {
    if (this.cerradoYa) return;
    this.cerradoYa = true;
    this.pararConsulta$.next();
    this.cerrado.emit({ cambio: this.cambio });
  }

  trackMuestra(_i: number, m: Muestra): string {
    return `${m.productId}:${m.index}`;
  }

  /**
   * La reversión es un lote `revert` (también la de una serie): se consulta como un lote. Se guarda
   * como lo último de este navegador: al volver a abrir se retoma su avance y, en pausa, ya no se
   * ofrece revertir otra vez lo mismo (otro clic crearía otro lote de reversión).
   */
  private seguirReversion(batchId: string): void {
    this.guardarLocal(LLAVE_ULTIMO_LOTE, valorUltimoTrabajo({ tipo: 'reversion', id: batchId }));
    this.ultimaReversionId = batchId;
    this.ultimoLoteId = null;
    this.ultimaSerieId = null;
    this.ocupado = false;
    this.serie = null;
    this.serieId = null;
    this.lote = null;
    this.paso = 'aplicando';
    this.consultar(batchId);
    this.cdr.markForCheck();
  }

  private marcarCambio(counters: Record<string, number> | null | undefined): void {
    const c = counters || {};
    if ((Number(c['photosUniformed']) || 0) > 0 || (Number(c['photosReverted']) || 0) > 0) {
      this.cambio = true;
    }
  }

  private fallo(err: unknown): void {
    this.ocupado = false;
    // «Quitar fondo» ya no se puede (ni la vista previa con IA ni el lote): se vuelve a conservar el fondo.
    const codigo = codigoDeError(err);
    if (codigo === 'BACKGROUND_UNAVAILABLE' || codigo === 'ADMIN_ONLY') {
      this.quitarFondo = false;
      this.fondoRetirado = true;
    }
    this.error = mensajeDeError(err);
    this.cdr.markForCheck();
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
