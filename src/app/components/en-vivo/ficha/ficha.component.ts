import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Inject,
  Input,
  NgZone,
  OnDestroy,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import { Router } from '@angular/router';
import { combineLatest, Observable, of, Subscription } from 'rxjs';
import { catchError, distinctUntilChanged, map, startWith, switchMap } from 'rxjs/operators';
import { AccionPantalla, EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoService } from '../servicios/en-vivo.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EstadoEnVivo, esNoDisponible } from '../servicios/en-vivo.modelos';
import { cadaFueraDeZona } from '../utilidades/movimiento';
import { AccionFicha, ContenidoFicha, PedidoAbierto, TableroSolicitado, VistaFicha, claveDeVista } from './ficha.modelos';
import { EnVivoFichaService } from './ficha.service';
import { armarContenido, empresaDeConsulta } from './utilidades/contenido';
import { destinoTodosLosPedidos, EstadoDetalle, SIN_DETALLE } from './utilidades/pedido';
import { idsCumplidos, pasosNuevos } from './utilidades/recorrido';

/** Lo que pinta la plantilla. */
interface VistaModeloFicha {
  contenido: ContenidoFicha;
  puedeVolver: boolean;
}

/** Lo último que llegó de cada fuente; con esto se arma el contenido. */
interface EntradasFicha {
  vista: VistaFicha | null;
  puedeVolver: boolean;
  estado: EstadoEnVivo;
  ocultar: boolean;
  detalle: EstadoDetalle;
}

/** Cada cuánto se repinta la hora relativa ("hace 5 min") de la ficha abierta. */
const REFRESCO_HORAS_MS = 30000;

/** Cuánto entra animado un paso del recorrido que se acaba de cumplir. */
const DURACION_PASO_NUEVO_MS = 1800;

let contadorDeFichas = 0;

/** Solo lo que la ficha usa del estado: lo demás (cifras, radar, resumen) no la repinta. */
function mismoRecorteDeEstado(a: EstadoEnVivo, b: EstadoEnVivo): boolean {
  return (
    a.vista === b.vista &&
    a.empresa === b.empresa &&
    a.soloLectura === b.soloLectura &&
    a.etapas === b.etapas &&
    a.pedidos === b.pedidos &&
    a.flota === b.flota &&
    a.eventos === b.eventos &&
    a.actualizadoEn === b.actualizadoEn &&
    (a.cifras?.dia ?? null) === (b.cifras?.dia ?? null) &&
    a.cifrasGlobal?.comercios === b.cifrasGlobal?.comercios
  );
}

/**
 * Ficha lateral de "En vivo" (D-386, tarea 4.7; en celular, una hoja desde abajo). Muestra el
 * detalle de un pedido (con su recorrido de hoy y sus productos), de una lista (por cifra, etapa,
 * ciudad o canal) o de un mensajero, sin salir de la pantalla.
 *
 * Cómo se usa: se pone `<app-en-vivo-ficha>` dentro del recuadro de la escena (la ficha se ancla a
 * su esquina). Se abre y se cierra sola escuchando `EnVivoInteraccionService.acciones$`
 * (`abrir-pedido`, `abrir-lista`, `abrir-mensajero`, `abrir-comercio`, `repetir-dia`), y quien la
 * integra puede abrirla por código con `EnVivoFichaService` (la escena, al tocar una caja).
 *
 * - Cierra con su botón, con Escape o por código (`EnVivoFichaService.cerrar()` / `ocultar()`).
 * - Datos: el detalle del pedido se pide UNA vez, al abrirlo (`EnVivoService.detalle`); las fichas
 *   de lista y de mensajero se arman con la foto del estado, sin pedir nada.
 * - Se actualiza sola cuando el pedido cambia (el paso nuevo entra animado) y solo se repinta si
 *   cambió su contenido (no se pierde el scroll ni el puntero).
 * - "Ocultar clientes y montos": muestra "Cliente" y quita los valores del contenido (no los esconde
 *   con estilos: nunca llegan al DOM).
 * - Solo lectura: ninguna acción cambia estados, asigna ni despacha.
 */
@Component({
  selector: 'app-en-vivo-ficha',
  templateUrl: './ficha.component.html',
  styleUrls: ['./ficha.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoFichaComponent implements OnInit, OnDestroy {
  /** Comercio que se mira cuando es Katuq quien mira uno ajeno (`?empresa=`): se usa para pedir el detalle. */
  @Input() empresa?: string;
  /** Katuq pidió el tablero de un comercio ("Ver el tablero de <comercio>"): quien integra navega. */
  @Output() abrirTablero = new EventEmitter<TableroSolicitado>();
  /** true al abrirse la ficha y false al cerrarse (la escena acomoda sus herramientas). */
  @Output() abierta = new EventEmitter<boolean>();

  @ViewChild('titulo') titulo?: ElementRef<HTMLElement>;
  @ViewChild('cuerpo') cuerpo?: ElementRef<HTMLElement>;

  vm: VistaModeloFicha | null = null;
  /** Id único del título, para `aria-labelledby`. */
  readonly idTitulo = `ev-ficha-titulo-${++contadorDeFichas}`;

  private readonly suscripciones = new Subscription();
  private ultima: EntradasFicha | null = null;
  private claveActual: string | null = null;
  /** Pasos cumplidos la última vez: lo que no estaba aquí y ahora sí, entra animado. */
  private hechosPrevios: string[] | null = null;
  private nuevos: ReadonlySet<string> = new Set<string>();
  private temporizadorNuevos = 0;
  private pararReloj: (() => void) | null = null;
  private elementoPrevio: HTMLElement | null = null;
  private enfocarTitulo = false;
  private destruido = false;

  constructor(
    private readonly servicio: EnVivoFichaService,
    private readonly estadoSvc: EnVivoEstadoService,
    private readonly api: EnVivoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly router: Router,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    @Inject(DOCUMENT) private readonly doc: Document
  ) {}

  ngOnInit(): void {
    // El detalle del pedido se pide una vez por pedido abierto; cambiar de ficha cancela la petición en curso.
    const detalle$ = this.servicio.vistaActual$.pipe(
      map((vista) => (vista && vista.tipo === 'pedido' ? vista : null)),
      distinctUntilChanged((a, b) => (a === null || b === null ? a === b : a.id === b.id && a.empresa === b.empresa)),
      switchMap((vista) => (vista ? this.pedirDetalle(vista.id, vista.empresa) : of(SIN_DETALLE)))
    );

    this.suscripciones.add(this.interaccion.acciones$.subscribe((accion) => this.alAccion(accion)));
    this.suscripciones.add(
      combineLatest([
        this.servicio.estadoFicha$,
        this.estadoSvc.estado$.pipe(distinctUntilChanged(mismoRecorteDeEstado)),
        this.estadoSvc.preferencias$,
        detalle$,
      ]).subscribe(([ficha, estado, preferencias, detalle]) => {
        this.ultima = { vista: ficha.vista, puedeVolver: ficha.puedeVolver, estado, ocultar: preferencias.ocultar, detalle };
        this.revisarPedidoPendiente(estado);
        this.refrescar(false);
      })
    );

    // La hora relativa ("hace 5 min") sube sola, sin esperar un evento.
    this.pararReloj = cadaFueraDeZona(this.zona, REFRESCO_HORAS_MS, () => {
      if (this.vm) this.refrescar(true);
    });
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.suscripciones.unsubscribe();
    this.pararReloj?.();
    window.clearTimeout(this.temporizadorNuevos);
    // Que la cámara y la escena suelten lo que seguían.
    this.servicio.cerrar();
  }

  // ── Cerrar y volver ───────────────────────────────────────────────────────

  cerrar(): void {
    this.servicio.cerrar();
  }

  /** Lo mismo que `cerrar()`, por si la escena lo pide con ese nombre. */
  ocultar(): void {
    this.servicio.cerrar();
  }

  atras(): void {
    this.servicio.atras();
  }

  @HostListener('document:keydown', ['$event'])
  alTeclado(evento: KeyboardEvent): void {
    if (evento.key === 'Escape' && this.vm && !evento.defaultPrevented) this.servicio.cerrar();
  }

  // ── Lo que llega de la pantalla y de la ficha ─────────────────────────────

  private alAccion(accion: AccionPantalla): void {
    switch (accion.tipo) {
      case 'abrir-pedido':
        this.servicio.abrirPedido(accion.pedidoId, accion.empresa ?? null);
        break;
      case 'abrir-lista':
        this.servicio.abrirLista(accion.clave);
        break;
      case 'abrir-mensajero':
        // La foto de toda Katuq nunca trae a los mensajeros.
        if (this.estadoSvc.estado.vista !== 'katuq') this.servicio.abrirMensajero(accion.nombre);
        break;
      case 'abrir-comercio':
        // Se sale al tablero de otro comercio: la ficha se cierra y quien integra navega.
        this.servicio.cerrar();
        this.abrirTablero.emit({ empresa: accion.empresa, nombre: accion.nombre, foco: accion.foco });
        break;
      case 'repetir-dia':
        // La repetición muestra un día simulado: la ficha mostraría datos reales.
        this.servicio.cerrar();
        break;
      default:
        break;
    }
  }

  /** Una fila de una lista: abre la ficha del pedido y deja "Atrás" para volver a la lista. */
  abrirFila(fila: PedidoAbierto): void {
    this.servicio.abrirPedido(fila.id, fila.empresa, true);
  }

  alAccionDeFicha(accion: AccionFicha): void {
    switch (accion.tipo) {
      case 'abrir-pedidos': {
        const destino = destinoTodosLosPedidos(accion.numero, accion.creado);
        void this.router.navigate(destino.comandos, { queryParams: destino.parametros });
        break;
      }
      case 'ver-tablero':
        // El tablero nuevo es otra pantalla: se anota el pedido para abrirlo allá.
        this.servicio.dejarPedidoPendiente(accion.pedidoId, accion.empresa);
        this.servicio.cerrar();
        this.abrirTablero.emit({ empresa: accion.empresa, nombre: accion.nombre, pedidoId: accion.pedidoId });
        break;
      case 'ver-mensajero':
        this.servicio.abrirMensajero(accion.nombre, true);
        break;
      default:
        break;
    }
  }

  // ── Detalle del pedido ────────────────────────────────────────────────────

  private pedirDetalle(id: string, empresaDeLaVista: string | null): Observable<EstadoDetalle> {
    const empresa = empresaDeConsulta(empresaDeLaVista, this.empresa ?? null, this.estadoSvc.estado.empresa);
    const falla: EstadoDetalle = { id, fase: 'error', detalle: null, reflejados: [] };
    return this.api.detalle(id, empresa ?? undefined).pipe(
      map((respuesta): EstadoDetalle => {
        if (esNoDisponible(respuesta)) return falla;
        // Lo que ya había pasado con este pedido está reflejado en el detalle; lo que llegue después se suma encima.
        const reflejados = this.estadoSvc.estado.eventos.filter((e) => e.pedidoId === id).map((e) => e.id);
        return { id, fase: 'listo', detalle: respuesta, reflejados };
      }),
      catchError(() => of(falla)),
      startWith<EstadoDetalle>({ id, fase: 'cargando', detalle: null, reflejados: [] })
    );
  }

  /** Venimos de toda Katuq con "Ver el tablero de <comercio>": al llegar a ese comercio se abre el pedido. */
  private revisarPedidoPendiente(estado: EstadoEnVivo): void {
    const pendiente = this.servicio.pedidoPendiente();
    if (!pendiente || estado.vista !== 'comercio') return;
    if ((this.empresa || estado.empresa) !== pendiente.empresa) return;
    this.servicio.consumirPedidoPendiente();
    // Fuera del ciclo de esta suscripción: la ficha se arma con el siguiente turno.
    void Promise.resolve().then(() => {
      if (!this.destruido) this.servicio.abrirPedido(pendiente.pedidoId, pendiente.empresa);
    });
  }

  // ── Armado de la vista ────────────────────────────────────────────────────

  /** Rearma el contenido con lo último que llegó. Con `sincrono` (temporizadores fuera de la zona) repinta ya. */
  private refrescar(sincrono: boolean): void {
    const entradas = this.ultima;
    if (!entradas || this.destruido) return;

    const vista = entradas.vista;
    const clave = vista ? claveDeVista(vista) : null;
    if (clave !== this.claveActual) this.alCambiarDeVista(clave);

    if (!vista) {
      if (this.vm) {
        this.vm = null;
        if (sincrono) this.cambios.detectChanges();
        else this.cambios.markForCheck();
      }
      return;
    }

    const ahoraMs = Date.now();
    const armar = (nuevos: ReadonlySet<string>): ContenidoFicha =>
      armarContenido({
        vista,
        estado: entradas.estado,
        detalle: entradas.detalle,
        ocultar: entradas.ocultar,
        ahoraMs,
        nuevos,
        empresaEnfoque: this.empresa ?? null,
      });

    let contenido = armar(this.nuevos);

    // Un paso que se cumplió con la ficha abierta entra animado un momento.
    const pasos = contenido.pedido?.recorrido ?? [];
    if (pasos.length > 0) {
      const cumplidos = idsCumplidos(pasos);
      const recienCumplidos = pasosNuevos(this.hechosPrevios, cumplidos);
      this.hechosPrevios = cumplidos;
      if (recienCumplidos.length > 0) {
        this.nuevos = new Set(recienCumplidos);
        contenido = armar(this.nuevos);
        this.programarFinDePasosNuevos();
      }
    }

    this.publicar({ contenido, puedeVolver: entradas.puedeVolver }, sincrono);
  }

  /** Solo repinta si cambió el contenido o la vista: no se pierde el scroll ni el puntero. */
  private publicar(vm: VistaModeloFicha, sincrono: boolean): void {
    const anterior = this.vm;
    if (
      anterior &&
      anterior.contenido.clave === vm.contenido.clave &&
      anterior.contenido.firma === vm.contenido.firma &&
      anterior.puedeVolver === vm.puedeVolver
    ) {
      return;
    }
    const cambioDeVista = !anterior || anterior.contenido.clave !== vm.contenido.clave;
    this.vm = vm;

    if (cambioDeVista) {
      this.cambios.detectChanges();
      if (this.cuerpo) this.cuerpo.nativeElement.scrollTop = 0;
      if (this.enfocarTitulo) {
        this.enfocarTitulo = false;
        this.titulo?.nativeElement.focus({ preventScroll: true });
      }
    } else if (sincrono) {
      this.cambios.detectChanges();
    } else {
      this.cambios.markForCheck();
    }
  }

  private alCambiarDeVista(clave: string | null): void {
    const abriendo = this.claveActual === null && clave !== null;
    const cerrando = this.claveActual !== null && clave === null;
    this.claveActual = clave;
    this.hechosPrevios = null;
    this.nuevos = new Set<string>();
    window.clearTimeout(this.temporizadorNuevos);

    if (clave !== null) this.enfocarTitulo = true;
    if (abriendo) {
      this.recordarFoco();
      this.abierta.emit(true);
    }
    if (cerrando) {
      this.abierta.emit(false);
      this.restaurarFoco();
    }
  }

  private programarFinDePasosNuevos(): void {
    window.clearTimeout(this.temporizadorNuevos);
    this.zona.runOutsideAngular(() => {
      this.temporizadorNuevos = window.setTimeout(() => {
        this.nuevos = new Set<string>();
        this.refrescar(true);
      }, DURACION_PASO_NUEVO_MS);
    });
  }

  // ── Foco ──────────────────────────────────────────────────────────────────

  private recordarFoco(): void {
    const activo = this.doc.activeElement as HTMLElement | null;
    this.elementoPrevio = activo && activo !== this.doc.body ? activo : null;
  }

  /** Al cerrar, el foco vuelve a lo que lo tenía antes de abrir (si sigue en la página). */
  private restaurarFoco(): void {
    const elemento = this.elementoPrevio;
    this.elementoPrevio = null;
    if (elemento && this.doc.contains(elemento) && typeof elemento.focus === 'function') {
      elemento.focus({ preventScroll: true });
    }
  }
}
