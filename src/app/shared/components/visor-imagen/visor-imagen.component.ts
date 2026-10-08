import {
  AfterViewInit,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { DOCUMENT } from '@angular/common';

interface Punto {
  x: number;
  y: number;
}

interface Tamano {
  ancho: number;
  alto: number;
}

type Gesto = 'ninguno' | 'arrastre' | 'pellizco';

const ESCALA_MIN = 1;
const ESCALA_MAX = 5;
const ESCALA_DOBLE_TOQUE = 2.5;
const PASO_ZOOM = 0.5;
/** Aire entre la foto y los bordes del área visible a 1x. */
const MARGEN_ESCENARIO = 16;
/** Píxeles que debe moverse el puntero para que el gesto deje de ser un clic. */
const UMBRAL_ARRASTRE = 6;
/** Desplazamiento horizontal (a 1x) que cuenta como "deslizar" a la otra foto. */
const UMBRAL_DESLIZAR = 60;
const VENTANA_DOBLE_TOQUE_MS = 300;
const DISTANCIA_DOBLE_TOQUE = 30;

/**
 * Visor de imágenes a pantalla completa, al estilo de WhatsApp (ticket 1153).
 *
 * - Al abrir, la foto se ve completa: se ajusta al área visible sin recortarse,
 *   sin estirarse y sin pasar de su tamaño real.
 * - Zoom 1x–5x con botones, rueda, doble clic/doble toque y pellizco (Pointer
 *   Events); con zoom, arrastrar mueve la foto dentro de límites.
 * - Rotación de 90°, navegación entre varias fotos y enlace al original.
 *
 * El host se mueve al `<body>` mientras está abierto: así ningún ancestro con
 * `transform`/`overflow` (modales de ng-bootstrap, diálogos de PrimeNG, overlays
 * propios) lo recorta, y el Escape o el clic de fondo no le llegan al modal de
 * abajo. Los gestos corren fuera de la zona de Angular y solo refrescan esta
 * vista, para no disparar la detección de cambios de toda la pantalla en cada
 * `pointermove`.
 */
@Component({
  selector: 'app-visor-imagen',
  templateUrl: './visor-imagen.component.html',
  styleUrls: ['./visor-imagen.component.scss'],
})
export class VisorImagenComponent implements OnChanges, OnInit, AfterViewInit, OnDestroy {
  /** URLs a mostrar. Con más de una se habilita la navegación. */
  @Input() imagenes: string[] = [];
  /** Posición de la foto con la que abre el visor. */
  @Input() indiceInicial = 0;
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild('dialogo', { static: true }) dialogo!: ElementRef<HTMLElement>;
  @ViewChild('escenario', { static: true }) escenario!: ElementRef<HTMLElement>;
  @ViewChild('foto') foto?: ElementRef<HTMLImageElement>;

  indice = 0;
  escala = ESCALA_MIN;
  desplazamiento: Punto = { x: 0, y: 0 };
  /** Grados acumulados (no se reduce a 0–359 para que la animación no gire hacia atrás). */
  rotacion = 0;
  cargando = false;
  error = false;
  /** Tamaño de la foto a 1x, ya ajustado al área visible. `null` mientras no se ha medido. */
  tamano: Tamano | null = null;
  /** Transición suave solo para acciones discretas (botones, teclado, doble clic, girar). */
  animar = false;
  arrastrando = false;

  private urlMostrada: string | null = null;
  private punteros = new Map<number, Punto>();
  private gesto: Gesto = 'ninguno';
  private inicioGesto: Punto = { x: 0, y: 0 };
  private desplazamientoInicial: Punto = { x: 0, y: 0 };
  private escalaInicial = ESCALA_MIN;
  private distanciaInicial = 1;
  private centroInicial: Punto = { x: 0, y: 0 };
  private huboMovimiento = false;
  private huboPellizco = false;
  private inicioEnFondo = false;
  private ignorarClic = false;
  private tipoPuntero = 'mouse';
  private ultimoToque = { momento: 0, x: 0, y: 0 };
  private quitarEscuchas: Array<() => void> = [];
  private overflowPrevio = '';
  private focoPrevio: HTMLElement | null = null;

  constructor(
    private host: ElementRef<HTMLElement>,
    private zone: NgZone,
    private cdr: ChangeDetectorRef,
    @Inject(DOCUMENT) private documento: Document,
  ) {}

  // ---------------------------------------------------------------------------
  // Estado derivado (lo usa la plantilla)
  // ---------------------------------------------------------------------------

  get total(): number {
    return this.imagenes?.length ?? 0;
  }

  get fotoActual(): string | null {
    return this.imagenes?.[this.indice] || null;
  }

  get hayVarias(): boolean {
    return this.total > 1;
  }

  get tieneAnterior(): boolean {
    return this.indice > 0;
  }

  get tieneSiguiente(): boolean {
    return this.indice < this.total - 1;
  }

  get porcentaje(): number {
    return Math.round(this.escala * 100);
  }

  get puedeAcercar(): boolean {
    return this.escala < ESCALA_MAX - 0.001;
  }

  get puedeAlejar(): boolean {
    return this.escala > ESCALA_MIN + 0.001;
  }

  get estaAjustada(): boolean {
    return this.escala === ESCALA_MIN && this.desplazamiento.x === 0 && this.desplazamiento.y === 0;
  }

  /**
   * Las vistas previas locales (`data:`/`blob:`) no se pueden abrir en otra
   * pestaña (el navegador bloquea la navegación a `data:`), así que no se ofrece
   * "Abrir original" para ellas.
   */
  get esUrlLocal(): boolean {
    return /^(data|blob):/i.test(this.fotoActual || '');
  }

  get transformacion(): string {
    const { x, y } = this.desplazamiento;
    return `translate(-50%, -50%) translate(${x}px, ${y}px) rotate(${this.rotacion}deg) scale(${this.escala})`;
  }

  private get girada(): boolean {
    return Math.abs(this.rotacion) % 180 === 90;
  }

  // ---------------------------------------------------------------------------
  // Ciclo de vida
  // ---------------------------------------------------------------------------

  ngOnChanges(changes: SimpleChanges): void {
    if (!changes['imagenes'] && !changes['indiceInicial']) {
      return;
    }
    this.irA(changes['indiceInicial'] ? this.indiceInicial : this.indice);
  }

  ngOnInit(): void {
    const body = this.documento.body;
    this.focoPrevio = this.documento.activeElement instanceof HTMLElement ? this.documento.activeElement : null;
    body.appendChild(this.host.nativeElement);
    this.overflowPrevio = body.style.overflow;
    body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    this.zone.runOutsideAngular(() => {
      const escenario = this.escenario.nativeElement;
      this.escuchar(escenario, 'pointerdown', (e) => this.alPresionar(e as PointerEvent));
      this.escuchar(escenario, 'pointermove', (e) => this.alMover(e as PointerEvent));
      this.escuchar(escenario, 'pointerup', (e) => this.alSoltar(e as PointerEvent));
      this.escuchar(escenario, 'pointercancel', (e) => this.alSoltar(e as PointerEvent));
      this.escuchar(escenario, 'wheel', (e) => this.alRodar(e as WheelEvent), { passive: false });
      this.escuchar(escenario, 'dblclick', (e) => this.alDobleClic(e as MouseEvent));
      const ventana = this.documento.defaultView;
      if (ventana) {
        // Fase de captura en window: el visor atiende sus teclas antes que el
        // modal de abajo (ng-bootstrap/PrimeNG también cierran con Escape).
        this.escuchar(ventana, 'keydown', (e) => this.alTeclear(e as KeyboardEvent), true);
        this.escuchar(ventana, 'resize', () => this.alRedimensionar());
      }
    });
    this.dialogo.nativeElement.focus({ preventScroll: true });
  }

  ngOnDestroy(): void {
    this.quitarEscuchas.forEach((quitar) => quitar());
    this.quitarEscuchas = [];
    this.documento.body.style.overflow = this.overflowPrevio;
    // Si se destruye el componente padre (p. ej. se cierra el modal), Angular solo
    // retira sus nodos raíz; este host vive en <body> y hay que retirarlo a mano.
    this.host.nativeElement.remove();
    if (this.focoPrevio && this.documento.contains(this.focoPrevio)) {
      this.focoPrevio.focus({ preventScroll: true });
    }
  }

  // ---------------------------------------------------------------------------
  // Acciones (botones y teclado)
  // ---------------------------------------------------------------------------

  acercar(): void {
    this.animar = true;
    this.zoomEn(Math.floor(this.escala / PASO_ZOOM + 0.001) * PASO_ZOOM + PASO_ZOOM);
  }

  alejar(): void {
    this.animar = true;
    this.zoomEn(Math.ceil(this.escala / PASO_ZOOM - 0.001) * PASO_ZOOM - PASO_ZOOM);
  }

  /** "Ajustar a la pantalla": vuelve a 100 % y centra, conservando el giro. */
  ajustar(): void {
    this.animar = true;
    this.reiniciarVista();
  }

  girar(): void {
    this.animar = true;
    this.rotacion += 90;
    this.reiniciarVista();
    this.recalcularTamano();
  }

  anterior(): void {
    if (this.tieneAnterior) {
      this.irA(this.indice - 1, true);
    }
  }

  siguiente(): void {
    if (this.tieneSiguiente) {
      this.irA(this.indice + 1, true);
    }
  }

  cerrarVisor(): void {
    this.cerrar.emit();
  }

  /** Clic en el fondo oscuro: cierra, salvo que el clic sea el final de un arrastre. */
  alClicEnEscenario(): void {
    if (this.inicioEnFondo && !this.ignorarClic) {
      this.cerrarVisor();
    }
  }

  alCargar(): void {
    this.cargando = false;
    this.error = false;
    this.recalcularTamano();
    this.limitarDesplazamiento();
  }

  alFallar(): void {
    this.cargando = false;
    this.error = true;
    this.tamano = null;
  }

  // ---------------------------------------------------------------------------
  // Gestos: arrastre, pellizco, deslizar, doble toque
  // ---------------------------------------------------------------------------

  private alPresionar(e: PointerEvent): void {
    if (e.pointerType === 'mouse' && e.button !== 0) {
      return;
    }
    const escenario = this.escenario.nativeElement;
    this.tipoPuntero = e.pointerType;
    this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      escenario.setPointerCapture(e.pointerId);
    } catch {
      // El puntero ya no está activo; el gesto sigue sin captura.
    }

    if (this.punteros.size === 1) {
      this.inicioEnFondo = e.target === escenario;
      this.huboMovimiento = false;
      this.huboPellizco = false;
      this.ignorarClic = false;
      this.iniciarArrastre(e.clientX, e.clientY);
    } else if (this.punteros.size === 2) {
      this.iniciarPellizco();
    }

    if (this.animar) {
      this.animar = false;
      this.cdr.detectChanges();
    }
  }

  private alMover(e: PointerEvent): void {
    if (!this.punteros.has(e.pointerId)) {
      return;
    }
    this.punteros.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (this.gesto === 'pellizco' && this.punteros.size >= 2) {
      const [a, b] = Array.from(this.punteros.values());
      const escala = this.acotarEscala((this.escalaInicial * distancia(a, b)) / this.distanciaInicial);
      const centro = this.relativoAlCentro(puntoMedio(a, b));
      // El punto de la foto que estaba entre los dedos al empezar sigue entre los dedos.
      this.desplazamiento = {
        x: centro.x - (escala * (this.centroInicial.x - this.desplazamientoInicial.x)) / this.escalaInicial,
        y: centro.y - (escala * (this.centroInicial.y - this.desplazamientoInicial.y)) / this.escalaInicial,
      };
      this.escala = escala;
      this.limitarDesplazamiento();
      this.arrastrando = true;
      this.cdr.detectChanges();
      return;
    }

    if (this.gesto !== 'arrastre') {
      return;
    }
    const dx = e.clientX - this.inicioGesto.x;
    const dy = e.clientY - this.inicioGesto.y;
    if (!this.huboMovimiento && Math.hypot(dx, dy) < UMBRAL_ARRASTRE) {
      return;
    }
    this.huboMovimiento = true;
    if (this.escala > ESCALA_MIN) {
      this.desplazamiento = { x: this.desplazamientoInicial.x + dx, y: this.desplazamientoInicial.y + dy };
      this.limitarDesplazamiento();
      this.arrastrando = true;
      this.cdr.detectChanges();
    }
  }

  private alSoltar(e: PointerEvent): void {
    if (!this.punteros.has(e.pointerId)) {
      return;
    }
    const inicio = this.inicioGesto;
    this.punteros.delete(e.pointerId);

    if (this.punteros.size === 1) {
      // Se levantó un dedo del pellizco: el otro sigue moviendo la foto sin saltos.
      const [resto] = Array.from(this.punteros.values());
      this.iniciarArrastre(resto.x, resto.y);
      return;
    }
    if (this.punteros.size > 1) {
      return;
    }

    const gesto = this.gesto;
    this.gesto = 'ninguno';
    this.arrastrando = false;
    this.ignorarClic = this.huboMovimiento;
    if (this.escala < ESCALA_MIN + 0.02) {
      this.escala = ESCALA_MIN;
      this.desplazamiento = { x: 0, y: 0 };
    }

    if (e.type === 'pointerup' && gesto === 'arrastre') {
      const dx = e.clientX - inicio.x;
      const dy = e.clientY - inicio.y;
      const deslizo = this.escala === ESCALA_MIN && !this.huboPellizco
        && Math.abs(dx) > UMBRAL_DESLIZAR && Math.abs(dx) > Math.abs(dy) * 1.5;
      if (deslizo) {
        if (dx < 0) {
          this.siguiente();
        } else {
          this.anterior();
        }
      } else if (!this.huboMovimiento && e.pointerType !== 'mouse') {
        this.registrarToque(e);
      }
    }
    this.cdr.detectChanges();
  }

  /** Doble toque en pantallas táctiles (el `dblclick` no es fiable con `touch-action: none`). */
  private registrarToque(e: PointerEvent): void {
    const previo = this.ultimoToque;
    const esDoble = e.timeStamp - previo.momento < VENTANA_DOBLE_TOQUE_MS
      && Math.hypot(e.clientX - previo.x, e.clientY - previo.y) < DISTANCIA_DOBLE_TOQUE;
    if (esDoble && !this.inicioEnFondo) {
      this.ultimoToque = { momento: 0, x: 0, y: 0 };
      this.ignorarClic = true;
      this.alternarZoom(e.clientX, e.clientY);
    } else {
      this.ultimoToque = { momento: e.timeStamp, x: e.clientX, y: e.clientY };
    }
  }

  private alDobleClic(e: MouseEvent): void {
    if (this.tipoPuntero !== 'mouse' || this.inicioEnFondo) {
      return;
    }
    e.preventDefault();
    this.alternarZoom(e.clientX, e.clientY);
    this.cdr.detectChanges();
  }

  private alRodar(e: WheelEvent): void {
    e.preventDefault();
    if (this.error || !this.fotoActual) {
      return;
    }
    // deltaMode: 0 = píxeles, 1 = líneas, 2 = páginas.
    const delta = e.deltaMode === 1 ? e.deltaY * 16 : e.deltaMode === 2 ? e.deltaY * 400 : e.deltaY;
    this.animar = false;
    this.zoomEn(this.escala * Math.exp(-delta * 0.0015), this.relativoAlCentro({ x: e.clientX, y: e.clientY }));
    this.cdr.detectChanges();
  }

  private alTeclear(e: KeyboardEvent): void {
    if (e.key === 'Escape') {
      detener(e);
      this.zone.run(() => this.cerrarVisor());
      return;
    }
    if (e.key === 'Tab') {
      this.atraparFoco(e);
      return;
    }
    if (e.ctrlKey || e.metaKey || e.altKey) {
      return;
    }
    switch (e.key) {
      case 'ArrowLeft':
        detener(e);
        this.anterior();
        break;
      case 'ArrowRight':
        detener(e);
        this.siguiente();
        break;
      case '+':
      case '=':
        detener(e);
        this.acercar();
        break;
      case '-':
      case '_':
        detener(e);
        this.alejar();
        break;
      case '0':
        detener(e);
        this.ajustar();
        break;
      case 'r':
      case 'R':
        detener(e);
        this.girar();
        break;
      default:
        return;
    }
    this.cdr.detectChanges();
  }

  private alRedimensionar(): void {
    this.recalcularTamano();
    this.limitarDesplazamiento();
    this.cdr.detectChanges();
  }

  /** Mantiene el foco del teclado dentro del visor (es un diálogo modal). */
  private atraparFoco(e: KeyboardEvent): void {
    const dialogo = this.dialogo.nativeElement;
    const enfocables = Array.from(dialogo.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]'));
    e.stopPropagation();
    if (!enfocables.length) {
      e.preventDefault();
      return;
    }
    const primero = enfocables[0];
    const ultimo = enfocables[enfocables.length - 1];
    const activo = this.documento.activeElement;
    const dentro = !!activo && dialogo.contains(activo);
    if (e.shiftKey && (!dentro || activo === primero || activo === dialogo)) {
      e.preventDefault();
      ultimo.focus();
    } else if (!e.shiftKey && (!dentro || activo === ultimo)) {
      e.preventDefault();
      primero.focus();
    }
  }

  // ---------------------------------------------------------------------------
  // Geometría
  // ---------------------------------------------------------------------------

  private irA(indice: number, forzarReinicio = false): void {
    const total = this.total;
    this.indice = total ? Math.min(Math.max(Math.trunc(indice) || 0, 0), total - 1) : 0;
    const url = this.fotoActual;
    const cambioFoto = url !== this.urlMostrada;
    // Si el padre vuelve a pasar el mismo arreglo (p. ej. desde un getter), no se
    // pierde el zoom que el usuario ya tenía.
    if (!cambioFoto && !forzarReinicio) {
      return;
    }
    if (cambioFoto) {
      this.urlMostrada = url;
      this.cargando = !!url;
      this.error = false;
      this.tamano = null;
    }
    this.animar = false;
    this.rotacion = 0;
    this.reiniciarVista();
    if (!cambioFoto) {
      this.recalcularTamano();
    }
  }

  private reiniciarVista(): void {
    this.escala = ESCALA_MIN;
    this.desplazamiento = { x: 0, y: 0 };
  }

  private alternarZoom(clientX: number, clientY: number): void {
    this.animar = true;
    if (this.escala > ESCALA_MIN) {
      this.reiniciarVista();
      return;
    }
    this.zoomEn(ESCALA_DOBLE_TOQUE, this.relativoAlCentro({ x: clientX, y: clientY }));
  }

  /** Cambia la escala dejando fijo el `punto` (relativo al centro del escenario). */
  private zoomEn(escalaDeseada: number, punto: Punto = { x: 0, y: 0 }): void {
    const nueva = this.acotarEscala(escalaDeseada);
    if (nueva <= ESCALA_MIN) {
      this.reiniciarVista();
      return;
    }
    const razon = nueva / this.escala;
    this.desplazamiento = {
      x: punto.x - (punto.x - this.desplazamiento.x) * razon,
      y: punto.y - (punto.y - this.desplazamiento.y) * razon,
    };
    this.escala = nueva;
    this.limitarDesplazamiento();
  }

  /**
   * Ajusta la foto al área visible a 1x: nunca más ancha ni más alta que la
   * pantalla, sin deformarla y sin agrandarla por encima de su tamaño real.
   * Con la foto girada 90°/270° se ajusta con los lados intercambiados.
   */
  private recalcularTamano(): void {
    const img = this.foto?.nativeElement;
    const escenario = this.escenario?.nativeElement;
    if (!img || !escenario || !img.naturalWidth || !img.naturalHeight) {
      this.tamano = null;
      return;
    }
    const anchoDisponible = Math.max(escenario.clientWidth - MARGEN_ESCENARIO * 2, 1);
    const altoDisponible = Math.max(escenario.clientHeight - MARGEN_ESCENARIO * 2, 1);
    const anchoVisual = this.girada ? img.naturalHeight : img.naturalWidth;
    const altoVisual = this.girada ? img.naturalWidth : img.naturalHeight;
    const ajuste = Math.min(anchoDisponible / anchoVisual, altoDisponible / altoVisual, 1);
    this.tamano = {
      ancho: Math.max(Math.floor(img.naturalWidth * ajuste), 1),
      alto: Math.max(Math.floor(img.naturalHeight * ajuste), 1),
    };
  }

  /** Con zoom, la foto se puede mover solo hasta que su borde toque el borde del área visible. */
  private limitarDesplazamiento(): void {
    if (this.escala <= ESCALA_MIN) {
      this.desplazamiento = { x: 0, y: 0 };
      return;
    }
    const base = this.tamanoVisualBase();
    const escenario = this.escenario?.nativeElement;
    if (!base || !escenario) {
      return;
    }
    const maxX = Math.max(0, (base.ancho * this.escala - escenario.clientWidth) / 2);
    const maxY = Math.max(0, (base.alto * this.escala - escenario.clientHeight) / 2);
    this.desplazamiento = {
      x: acotar(this.desplazamiento.x, -maxX, maxX),
      y: acotar(this.desplazamiento.y, -maxY, maxY),
    };
  }

  /** Tamaño en pantalla de la foto a 1x, teniendo en cuenta el giro. */
  private tamanoVisualBase(): Tamano | null {
    const img = this.foto?.nativeElement;
    const base = this.tamano ?? (img ? { ancho: img.offsetWidth, alto: img.offsetHeight } : null);
    if (!base || !base.ancho || !base.alto) {
      return null;
    }
    return this.girada ? { ancho: base.alto, alto: base.ancho } : base;
  }

  private relativoAlCentro(p: Punto): Punto {
    const rect = this.escenario.nativeElement.getBoundingClientRect();
    return { x: p.x - (rect.left + rect.width / 2), y: p.y - (rect.top + rect.height / 2) };
  }

  private iniciarArrastre(x: number, y: number): void {
    this.gesto = 'arrastre';
    this.inicioGesto = { x, y };
    this.desplazamientoInicial = { ...this.desplazamiento };
  }

  private iniciarPellizco(): void {
    const [a, b] = Array.from(this.punteros.values());
    this.gesto = 'pellizco';
    this.huboMovimiento = true;
    this.huboPellizco = true;
    this.distanciaInicial = Math.max(distancia(a, b), 1);
    this.escalaInicial = this.escala;
    this.centroInicial = this.relativoAlCentro(puntoMedio(a, b));
    this.desplazamientoInicial = { ...this.desplazamiento };
  }

  private acotarEscala(escala: number): number {
    return acotar(Number.isFinite(escala) ? escala : ESCALA_MIN, ESCALA_MIN, ESCALA_MAX);
  }

  private escuchar(
    objetivo: EventTarget,
    evento: string,
    manejador: (e: Event) => void,
    opciones?: AddEventListenerOptions | boolean,
  ): void {
    objetivo.addEventListener(evento, manejador, opciones);
    this.quitarEscuchas.push(() => objetivo.removeEventListener(evento, manejador, opciones));
  }
}

function acotar(valor: number, min: number, max: number): number {
  return Math.min(Math.max(valor, min), max);
}

function distancia(a: Punto, b: Punto): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function puntoMedio(a: Punto, b: Punto): Punto {
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function detener(e: Event): void {
  e.preventDefault();
  e.stopPropagation();
}
