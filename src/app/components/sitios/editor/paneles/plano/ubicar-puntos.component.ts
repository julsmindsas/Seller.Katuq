import {
  AfterViewChecked,
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from "@angular/core";
import { LoaderService } from "../../../../../shared/services/loader.service";
import {
  AvisoPuntos,
  ComboVista,
  DatosPlano,
  EspacioPlano,
  LineaKit,
  PuntoPlano,
  TOPES_PLANO,
  agregarPunto,
  altoRelativo,
  avisosDePuntos,
  lineasDe,
  moverConTecla,
  moverPunto,
  posicionArrastrada,
  posicionDesdeClic,
  quitarPunto,
  relacionDe,
  tituloDeEspacio,
} from "./plano-datos";

/**
 * Ventana «Ubicar los puntos» del plano (PLAN-V2 T13). Sobre la foto del plano, con el mismo marco y el mismo recorte
 * que la página (`object-fit: cover` dentro de la proporción del espacio), el comercio:
 *  - agrega un punto con un clic (un decimal, entre 2 % y 98 %, la regla del servidor);
 *  - lo arrastra para moverlo (el patrón de arrastre de `sitio-render`: captura del puntero y posición en % del marco);
 *  - con el foco en un punto, lo mueve con las flechas (0,5 %; con Mayús, 5 %) y lo quita con Supr;
 *  - ordena la lista arrastrándola (o con las flechas en su asa): el número de cada punto es su lugar en la lista, y la
 *    señal y las entradas que lo nombran lo siguen;
 *  - elige la pieza, la zona, qué es y por qué va ahí, la cobertura, la unidad del paquete y de qué punto le llega la
 *    señal. Los halos y las líneas de señal se dibujan como en la página.
 * Avisa en vivo: pieza sin punto, puntos sin pieza o fuera del kit, puntos muy juntos o pegados al borde y más de 6.
 * Todo cambio se escribe EN SU LUGAR en `datos` y se avisa con `cambio` (el editor lo guarda solo).
 */
@Component({
  selector: "app-ubicar-puntos",
  templateUrl: "./ubicar-puntos.component.html",
  styleUrls: ["./ubicar-puntos.component.scss"],
})
export class UbicarPuntosComponent implements OnInit, OnChanges, AfterViewInit, AfterViewChecked, OnDestroy {
  @Input() datos: DatosPlano = {};
  /** El espacio que se edita (su posición en `datos.espacios`). */
  @Input() indice = 0;
  @Input() combos: ComboVista[] | null = null;
  /** El nombre con que la página lee una pieza (el corto o el del catálogo). */
  @Input() nombreDe: (id: string) => string = (id) => id;
  @Output() indiceChange = new EventEmitter<number>();
  @Output() cambio = new EventEmitter<void>();
  @Output() cerrar = new EventEmitter<void>();

  @ViewChild("caja") caja?: ElementRef<HTMLElement>;
  @ViewChild("marco") marco?: ElementRef<HTMLElement>;
  @ViewChild("selPieza") selPieza?: ElementRef<HTMLSelectElement>;
  @ViewChildren("pto") ptos?: QueryList<ElementRef<HTMLButtonElement>>;
  @ViewChildren("fila") filas?: QueryList<ElementRef<HTMLElement>>;

  readonly topes = TOPES_PLANO;
  readonly unidades = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  readonly uid = `ub-${Math.random().toString(36).slice(2, 8)}`;

  /** El punto elegido (posición desde 0), -1 si ninguno. */
  sel = -1;
  /** Lo que lee el lector de pantalla después de cada acción. */
  anuncio = "";
  /** El último punto quitado, para «Deshacer». */
  deshacer: { k: number; texto: string; puntos: string; entradas: string } | null = null;
  /** Arrastre de un punto sobre el plano. Guarda la posición en la lista, no el objeto: el editor puede cambiarlo. */
  private arrastre: { k: number; px: number; py: number; inicio: { x: number; y: number }; caja: DOMRect; movido: boolean } | null = null;
  /** Arrastre de una fila de la lista para ordenar. */
  orden: { desde: number; hasta: number } | null = null;
  /** Qué enfocar en cuanto la vista se dibuje. */
  private enfocar: { que: "pto" | "pieza" | "asa" | "marco"; k: number } | null = null;

  constructor(private cargando: LoaderService) {}

  /**
   * Mientras la ventana está abierta, la pantalla de carga global no sale: el editor guarda solo después de cada cambio
   * (PUT del borrador) y esa pantalla tapaba la ventana un instante, se comía el clic o el arrastre en curso y le quitaba
   * el foco al punto. Los pedidos se siguen contando; al cerrar, si hay uno en vuelo, la pantalla vuelve.
   */
  ngOnInit(): void {
    this.cargando.suppressGlobalLoader();
  }

  ngOnDestroy(): void {
    this.cargando.releaseGlobalLoader();
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios["indice"] || cambios["datos"]) {
      const n = this.puntos.length;
      // Al abrir, el primer punto queda elegido (el foco va a él en `ngAfterViewInit`).
      if (cambios["datos"] && cambios["datos"].firstChange) this.sel = n ? 0 : -1;
      if (this.sel >= n) this.sel = n - 1;
      if (cambios["indice"] && !cambios["indice"].firstChange) {
        this.sel = -1;
        this.deshacer = null;
      }
    }
  }

  ngAfterViewInit(): void {
    // Al abrir, el foco va al primer punto (o al plano), dentro de la ventana.
    this.enfocar = this.puntos.length ? { que: "pto", k: 0 } : { que: "marco", k: 0 };
    Promise.resolve().then(() => this.aplicarFoco());
  }

  ngAfterViewChecked(): void {
    if (this.enfocar) this.aplicarFoco();
  }

  private aplicarFoco(): void {
    const f = this.enfocar;
    if (!f) return;
    let el: HTMLElement | null = null;
    if (f.que === "pto") el = (this.ptos && this.ptos.toArray()[f.k] && this.ptos.toArray()[f.k].nativeElement) || null;
    else if (f.que === "pieza") el = (this.selPieza && this.selPieza.nativeElement) || null;
    else if (f.que === "asa") {
      const fila = this.filas && this.filas.toArray()[f.k];
      el = fila ? (fila.nativeElement.querySelector(".lista__asa") as HTMLElement) : null;
    } else el = (this.marco && this.marco.nativeElement) || null;
    if (!el) return;
    this.enfocar = null;
    el.focus();
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────────────────────────────────────────

  get espacios(): EspacioPlano[] {
    return Array.isArray(this.datos.espacios) ? this.datos.espacios : [];
  }

  get e(): EspacioPlano {
    return this.espacios[this.indice] || ({ id: "" } as EspacioPlano);
  }

  get puntos(): PuntoPlano[] {
    return Array.isArray(this.e.puntos) ? this.e.puntos : [];
  }

  get punto(): PuntoPlano | null {
    return this.puntos[this.sel] || null;
  }

  get lineas(): LineaKit[] {
    return lineasDe(this.e, this.combos).lineas;
  }

  get titulo(): string {
    return tituloDeEspacio(this.e) || `Espacio ${this.indice + 1}`;
  }

  get relacion(): string {
    const { rx, ry } = relacionDe(this.e.proporcion);
    return `${rx} / ${ry}`;
  }

  /** Clase del marco por proporción, para que quepa a lo alto de la ventana. */
  get claseRelacion(): string {
    const { rx, ry } = relacionDe(this.e.proporcion);
    return `${rx}-${ry}`;
  }

  get alto(): number {
    return altoRelativo(this.e.proporcion);
  }

  get avisos(): AvisoPuntos[] {
    return avisosDePuntos(this.e, this.lineas, this.nombreDe);
  }

  /** Halos de cobertura: círculos de radio `radio` % del ancho, en la caja de la capa (`0 0 100 alto`). */
  get halos(): { cx: number; cy: number; r: number }[] {
    const alto = this.alto;
    return this.puntos.filter((p) => p.radio && p.radio > 0).map((p) => ({ cx: p.x, cy: (p.y * alto) / 100, r: p.radio as number }));
  }

  /** Líneas de señal: del punto que la da al que la recibe. */
  get senales(): { x1: number; y1: number; x2: number; y2: number }[] {
    const alto = this.alto;
    const lista = this.puntos;
    const salida: { x1: number; y1: number; x2: number; y2: number }[] = [];
    lista.forEach((p, k) => {
      const o = p.senal ? lista[p.senal - 1] : null;
      if (!o || p.senal === k + 1) return;
      salida.push({ x1: o.x, y1: (o.y * alto) / 100, x2: p.x, y2: (p.y * alto) / 100 });
    });
    return salida;
  }

  enKit(p: PuntoPlano): boolean {
    return !!p.productoId && this.lineas.some((l) => l.productoId === p.productoId);
  }

  conAviso(n: number): boolean {
    return this.avisos.some((a) => a.puntos.includes(n));
  }

  nombreDePunto(p: PuntoPlano): string {
    return p.productoId ? this.nombreDe(p.productoId) : "Sin pieza";
  }

  etiquetaPunto(p: PuntoPlano, k: number): string {
    return `Punto ${k + 1}: ${this.nombreDePunto(p)}${p.zona ? `. ${p.zona}` : ""}. ${p.x} % del ancho, ${p.y} % del alto`;
  }

  /** La pieza del punto está fuera del kit: se muestra como opción aparte para no perderla. */
  get piezaFuera(): string {
    const p = this.punto;
    return p && p.productoId && !this.lineas.some((l) => l.productoId === p.productoId) ? p.productoId : "";
  }

  /** «Deco X50 · unidad 2 de 3»: cuántas unidades marcadas lleva la pieza del punto elegido. */
  get deUnidades(): number {
    const p = this.punto;
    if (!p || !p.productoId) return 0;
    return this.puntos.filter((x) => x.productoId === p.productoId && x.unidad).length;
  }

  // ── Agregar, mover y quitar ─────────────────────────────────────────────────────────────────────────────────────

  /** Un clic sobre el plano (fuera de un punto) agrega un punto ahí, con la primera pieza del kit que no tiene punto. */
  alClicMarco(ev: MouseEvent): void {
    const destino = ev.target as HTMLElement;
    if (destino && destino.closest(".escena__pto")) return;
    if (!this.marco) return;
    if (this.puntos.length >= this.topes.puntos) {
      this.anunciar(`Ya hay ${this.topes.puntos} puntos, el máximo. Quita uno para agregar otro.`);
      return;
    }
    const pos = posicionDesdeClic(ev.clientX, ev.clientY, this.marco.nativeElement.getBoundingClientRect());
    this.agregarEn(pos.x, pos.y);
  }

  /** Sin mouse: un punto en el centro, que luego se mueve con las flechas. */
  agregarAlCentro(): void {
    if (this.puntos.length >= this.topes.puntos) return;
    this.agregarEn(50, 50);
    this.enfocar = { que: "pto", k: this.puntos.length - 1 };
  }

  private agregarEn(x: number, y: number): void {
    const p = agregarPunto(this.e, x, y);
    if (!p) return;
    const usadas = new Set(this.puntos.map((q) => q.productoId).filter(Boolean));
    const libre = this.lineas.find((l) => !usadas.has(l.productoId));
    if (libre) p.productoId = libre.productoId;
    this.sel = this.puntos.length - 1;
    if (!this.enfocar) this.enfocar = { que: "pieza", k: this.sel };
    this.deshacer = null;
    this.anunciar(`Punto ${this.sel + 1} agregado${libre ? ` con ${this.nombreDe(libre.productoId)}` : ""}.`);
    this.cambio.emit();
  }

  seleccionar(k: number): void {
    this.sel = k;
  }

  /** La fila de la lista abre o cierra los campos de su punto. */
  alternarFila(k: number): void {
    this.sel = this.sel === k ? -1 : k;
  }

  empezarArrastre(ev: PointerEvent, k: number): void {
    if (ev.button !== 0 || !this.marco) return;
    ev.stopPropagation();
    ev.preventDefault();
    const p = this.puntos[k];
    if (!p) return;
    this.sel = k;
    this.arrastre = { k, px: ev.clientX, py: ev.clientY, inicio: { x: p.x, y: p.y }, caja: this.marco.nativeElement.getBoundingClientRect(), movido: false };
    const boton = ev.currentTarget as HTMLElement;
    boton.focus();
    if (boton.setPointerCapture) boton.setPointerCapture(ev.pointerId);
  }

  moverArrastre(ev: PointerEvent): void {
    const a = this.arrastre;
    if (!a) return;
    const dx = ev.clientX - a.px;
    const dy = ev.clientY - a.py;
    // Un temblor del mouse al hacer clic no es un arrastre.
    if (!a.movido && Math.abs(dx) < 3 && Math.abs(dy) < 3) return;
    a.movido = true;
    const p = this.puntos[a.k];
    if (!p) return;
    const pos = posicionArrastrada(a.inicio, dx, dy, a.caja);
    p.x = pos.x;
    p.y = pos.y;
  }

  soltarArrastre(): void {
    const a = this.arrastre;
    this.arrastre = null;
    if (!a || !a.movido) return;
    const p = this.puntos[a.k];
    if (p) this.anunciar(`Punto ${a.k + 1}: ${p.x} % del ancho, ${p.y} % del alto.`);
    this.cambio.emit();
  }

  alTeclaPunto(ev: KeyboardEvent, k: number): void {
    const p = this.puntos[k];
    if (!p) return;
    const nueva = moverConTecla(p, ev.key, ev.shiftKey);
    if (nueva) {
      ev.preventDefault();
      p.x = nueva.x;
      p.y = nueva.y;
      this.sel = k;
      this.anunciar(`${p.x} %, ${p.y} %`);
      this.cambio.emit();
      return;
    }
    if (ev.key === "Delete" || ev.key === "Backspace") {
      ev.preventDefault();
      this.quitar(k);
    }
  }

  quitar(k: number): void {
    if (!this.puntos[k]) return;
    this.deshacer = {
      k,
      texto: `Quitaste el punto ${k + 1}.`,
      puntos: JSON.stringify(this.puntos),
      entradas: JSON.stringify(this.datos.entradas || []),
    };
    quitarPunto(this.datos, this.e, k);
    const n = this.puntos.length;
    this.sel = n ? Math.min(k, n - 1) : -1;
    this.enfocar = n ? { que: "pto", k: this.sel } : { que: "marco", k: 0 };
    this.anunciar(`Punto ${k + 1} quitado.${n ? " Los demás se numeraron de nuevo." : ""}`);
    this.cambio.emit();
  }

  rehacerPunto(): void {
    const d = this.deshacer;
    if (!d) return;
    this.e.puntos = JSON.parse(d.puntos);
    this.datos.entradas = JSON.parse(d.entradas);
    this.deshacer = null;
    this.sel = d.k;
    this.enfocar = { que: "pto", k: d.k };
    this.anunciar(`Volvió el punto ${d.k + 1}.`);
    this.cambio.emit();
  }

  // ── Ordenar la lista ────────────────────────────────────────────────────────────────────────────────────────────

  empezarOrden(ev: PointerEvent, k: number): void {
    if (ev.button !== 0) return;
    ev.preventDefault();
    this.orden = { desde: k, hasta: k };
    const asa = ev.currentTarget as HTMLElement;
    if (asa.setPointerCapture) asa.setPointerCapture(ev.pointerId);
  }

  /** El lugar donde caería la fila: cuántas OTRAS filas tienen su mitad por encima del puntero. */
  moverOrden(ev: PointerEvent): void {
    const o = this.orden;
    if (!o || !this.filas) return;
    let hasta = 0;
    this.filas.toArray().forEach((f, i) => {
      if (i === o.desde) return;
      const r = f.nativeElement.getBoundingClientRect();
      if (ev.clientY > r.top + r.height / 2) hasta++;
    });
    o.hasta = hasta;
  }

  soltarOrden(): void {
    const o = this.orden;
    this.orden = null;
    if (!o || o.desde === o.hasta) return;
    this.mover(o.desde, o.hasta);
  }

  alTeclaAsa(ev: KeyboardEvent, k: number): void {
    const paso = ev.key === "ArrowUp" ? -1 : ev.key === "ArrowDown" ? 1 : 0;
    if (!paso) return;
    ev.preventDefault();
    const j = k + paso;
    if (j < 0 || j >= this.puntos.length) return;
    this.mover(k, j);
    this.enfocar = { que: "asa", k: j };
  }

  private mover(desde: number, hasta: number): void {
    moverPunto(this.datos, this.e, desde, hasta);
    this.sel = hasta;
    this.deshacer = null;
    this.anunciar(`El punto ${desde + 1} ahora es el ${hasta + 1}. La señal y las entradas lo siguen.`);
    this.cambio.emit();
  }

  /** ¿Dónde se dibuja la marca de «cae aquí» mientras se ordena? Antes de la fila `i` (o al final). */
  marcaAntes(i: number): boolean {
    const o = this.orden;
    if (!o || o.hasta === o.desde) return false;
    // `hasta` cuenta sin la fila que se mueve: se traduce a la posición en la lista completa.
    const real = o.hasta >= o.desde ? o.hasta + 1 : o.hasta;
    return i === real;
  }

  get marcaAlFinal(): boolean {
    const o = this.orden;
    return !!o && o.hasta !== o.desde && o.hasta >= this.puntos.length - 1 && o.hasta > o.desde;
  }

  // ── Campos del punto elegido ────────────────────────────────────────────────────────────────────────────────────

  ponerPieza(p: PuntoPlano, id: string): void {
    p.productoId = id || undefined;
    this.cambio.emit();
  }

  ponerRadio(p: PuntoPlano, valor: any): void {
    const n = Math.round(Number(valor));
    p.radio = n > 0 ? Math.min(this.topes.radio, n) : undefined;
    this.cambio.emit();
  }

  ponerUnidad(p: PuntoPlano, valor: any): void {
    const n = Number(valor);
    p.unidad = n > 0 ? n : undefined;
    this.cambio.emit();
  }

  ponerSenal(p: PuntoPlano, valor: any): void {
    const n = Number(valor);
    p.senal = n > 0 ? n : undefined;
    this.cambio.emit();
  }

  cambiar(): void {
    this.cambio.emit();
  }

  elegirEspacio(k: number): void {
    if (k === this.indice) return;
    this.indiceChange.emit(k);
  }

  // ── Teclado de la ventana ───────────────────────────────────────────────────────────────────────────────────────

  /**
   * Las teclas de la ventana se quedan en la ventana: Esc la cierra (sin cerrar la sección del editor, que también
   * escucha Esc) y los atajos del editor (deshacer, guardar) no corren por detrás.
   */
  alTeclaVentana(ev: KeyboardEvent): void {
    if (ev.key === "Escape") {
      ev.preventDefault();
      this.cerrar.emit();
    }
    ev.stopPropagation();
  }

  private anunciar(texto: string): void {
    // Cambiar el texto aunque se repita, para que el lector de pantalla lo lea otra vez.
    this.anuncio = this.anuncio === texto ? `${texto} ` : texto;
  }

  porObjeto<T>(_: number, x: T): T {
    return x;
  }

  porId(_: number, l: LineaKit): string {
    return l.productoId;
  }
}
