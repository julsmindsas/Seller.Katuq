import {
  AfterViewInit, ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, EventEmitter, Input,
  OnChanges, OnDestroy, Output, ViewChild,
} from '@angular/core';
import { AccionPedidoId } from './acciones-pedido.catalogo';
import { EstadoAcciones } from './acciones-pedido.estado';
import { EstadoPin, estadosPin, etiquetaPin } from './acciones-pedido.pines';
import {
  ColumnaVista, ContextoVista, TarjetaVista, VistaModal, construirVista, resolverClic, resolverEnter,
} from './order-options-modal.vista';

/**
 * D-547 (F1, D4): modal «Opciones del pedido». Una grilla de 16 tarjetas fijas (4 columnas por tema), la fila
 * «Para este pedido» con las acciones de contexto, el buscador y el pie con Eliminar y Cerrar.
 *
 * Solo PINTA y AVISA: el padre (`ListOrdersComponent`) le pasa los estados ya calculados con sus reglas de hoy
 * y ejecuta la acción con `ejecutarAccionPedido`. No llama a ningún servicio ni escribe nada.
 *
 * Artículo IX (excepción acotada como D-054, D-541 y D-543): Angular 14.3 no tiene signals ni `@if`;
 * el componente es OnPush y usa `*ngIf` / `*ngFor`.
 */
@Component({
  selector: 'app-order-options-modal',
  templateUrl: './order-options-modal.component.html',
  styleUrls: ['./order-options-modal.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderOptionsModalComponent implements OnChanges, AfterViewInit, OnDestroy {
  /** El pedido abierto (solo se leen su número y `revisadoParaProduccion`). */
  @Input() pedido: any = null;
  /** Estados de las acciones (`estadoAcciones`), ya calculados por el padre con los métodos de hoy. */
  @Input() estados: EstadoAcciones | null = null;
  /** El pedido se abrió desde Producción: solo las acciones que hoy aplican allí, en flujo. */
  @Input() desdeProduccion = false;
  /** F2: `true` con la bandera `orderPinnedActions` encendida y el estado cargado. Apagado, el modal no muestra pines. */
  @Input() pinesActivos = false;
  /** F2: las 4 acciones del rol (fijadas por el administrador; llevan candado y no se sueltan). */
  @Input() delRol: AccionPedidoId[] = [];
  /** F2: las acciones que el usuario fijó (máximo 4). */
  @Input() pines: AccionPedidoId[] = [];
  /** F2 (resaltar sin mover, D17): la tarjeta de esta acción se pinta con el par de alerta y su etiqueta. */
  @Input() resaltada: { id: AccionPedidoId; etiqueta: string } | null = null;

  /** El usuario escogió una acción habilitada. */
  @Output() accion = new EventEmitter<AccionPedidoId>();
  /** Esc, la X, «Cerrar» o el clic fuera: cierra sin hacer nada. */
  @Output() cerrar = new EventEmitter<void>();
  /** F2: el usuario tocó un pin. `fijar: true` pide fijarla y `false` soltarla; el padre decide y guarda. */
  @Output() fijar = new EventEmitter<{ id: AccionPedidoId; fijar: boolean }>();

  @ViewChild('buscador', { static: true }) buscador!: ElementRef<HTMLInputElement>;
  @ViewChild('dialogo', { static: true }) dialogo!: ElementRef<HTMLElement>;

  texto = '';
  vista: VistaModal | null = null;
  facturaAbierta = false;
  descuentoAbierto = false;
  /** F2: estado del pin de cada una de las 16 fijas (rol, usuario o libre). */
  estadoPines: Record<string, EstadoPin> = {};

  /** Quién tenía el foco al abrir: vuelve a él al cerrar. */
  private abridor: HTMLElement | null = null;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnChanges(): void {
    this.estadoPines = this.pinesActivos ? estadosPin(this.delRol || [], this.pines || []) : {};
    this.reconstruir();
  }

  ngAfterViewInit(): void {
    this.abridor = (document.activeElement as HTMLElement) || null;
    // El foco va al buscador al abrir. Fuera del ciclo de detección para no alterar el primer pintado.
    Promise.resolve().then(() => this.buscador?.nativeElement.focus());
  }

  ngOnDestroy(): void {
    const a = this.abridor;
    // El foco vuelve al botón que abrió el modal SOLO si nadie más lo tomó: la acción escogida puede haber abierto
    // otra ventana (Editar cliente, Pagos…) y el foco ya está en ella; quitárselo la dejaría sin teclado.
    const activo = document.activeElement;
    const libre = !activo || activo === document.body || this.dialogo?.nativeElement.contains(activo);
    if (libre && a && typeof a.focus === 'function' && document.body.contains(a)) a.focus();
  }

  get numeroPedido(): string {
    return this.pedido?.nroPedido ? String(this.pedido.nroPedido) : '';
  }

  get buscando(): boolean {
    return !!this.texto.trim();
  }

  private reconstruir(): void {
    if (!this.estados) { this.vista = null; return; }
    this.vista = construirVista({
      estados: this.estados,
      texto: this.texto,
      desdeProduccion: !!this.desdeProduccion,
      revisado: !!this.pedido?.revisadoParaProduccion,
    });
    // Si ya no aplica Factura electrónica con varios hijos, la segunda fila se pliega.
    if (!this.vista.contexto.some(c => c.desplegable)) this.facturaAbierta = false;
    if (!this.vista.descuentoConMenu) this.descuentoAbierto = false;
  }

  alEscribir(valor: string): void {
    this.texto = valor;
    this.descuentoAbierto = false;
    this.reconstruir();
  }

  limpiarBusqueda(): void {
    this.alEscribir('');
    this.buscador.nativeElement.focus();
  }

  /** Enter en el buscador: abre la acción solo si queda exactamente una y está habilitada. */
  alEnter(ev: Event): void {
    ev.preventDefault();
    if (!this.estados) return;
    const id = resolverEnter(this.estados, this.texto);
    if (id) this.accion.emit(id);
  }

  tocar(t: TarjetaVista | ContextoVista): void {
    if (!this.vista) return;
    const desplegable = (t as ContextoVista).desplegable === true;
    const r = resolverClic(t, this.vista, desplegable);
    if (r.tipo === 'emitir') this.accion.emit(r.id);
    else if (r.tipo === 'menuFactura') { this.facturaAbierta = !this.facturaAbierta; this.descuentoAbierto = false; }
    else if (r.tipo === 'menuDescuento') { this.descuentoAbierto = !this.descuentoAbierto; this.facturaAbierta = false; }
  }

  /** F2: el pin de una tarjeta. Una fijada por el rol no se suelta. */
  alPin(t: TarjetaVista): void {
    const estado = this.estadoPines[t.id];
    if (!estado || estado === 'rol') return;
    this.fijar.emit({ id: t.id, fijar: estado === 'libre' });
  }

  /** Nombre accesible y `title` del pin de una acción. */
  etiquetaPin(id: string): string {
    const estado = this.estadoPines[id];
    return estado ? etiquetaPin(estado) : '';
  }

  /** Una opción de un menú desplegado (hijos de Factura electrónica; Aplicar otro / Editar o quitar). */
  elegir(t: TarjetaVista): void {
    if (t.habilitada) this.accion.emit(t.id);
  }

  alFondo(ev: Event): void {
    if (ev.target === ev.currentTarget) this.cerrar.emit();
  }

  /** Esc cierra el modal. Se detiene aquí para que el `keydown` del padre no lo cierre dos veces. */
  alEscape(ev: Event): void {
    ev.stopPropagation();
    this.cerrar.emit();
  }

  /** Tab no sale del modal: del último pasa al primero y al revés. */
  alTab(ev: KeyboardEvent): void {
    const foco = Array.from(
      this.dialogo.nativeElement.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled])'),
    ).filter(el => el.offsetParent !== null);
    if (!foco.length) return;
    const primero = foco[0];
    const ultimo = foco[foco.length - 1];
    const actual = document.activeElement;
    if (ev.shiftKey && actual === primero) { ev.preventDefault(); ultimo.focus(); }
    else if (!ev.shiftKey && actual === ultimo) { ev.preventDefault(); primero.focus(); }
  }

  trackColumna = (_: number, c: ColumnaVista) => c.id;
  trackTarjeta = (_: number, t: TarjetaVista) => t.id;
}
