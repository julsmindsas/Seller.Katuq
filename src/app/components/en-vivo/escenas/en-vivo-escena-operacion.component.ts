import {
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import { Subscription } from 'rxjs';
import type { FuenteMargenes, MargenesEncuadre, Three } from '../../../shared/escena-3d/escena-base';
import { KatuqCommerceContextService } from '../../../shared/services/security/katuq-commerce-context.service';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { VistaFicha } from '../ficha/ficha.modelos';
import { EnVivoRepeticionService } from '../repeticion/en-vivo-repeticion.service';
import { EscenaRepetible } from '../repeticion/repeticion.tipos';
import { EnVivoFichaService } from '../ficha/ficha.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EstadoEnVivo, EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { alCambiarMovimiento, prefiereMenosMovimiento } from '../utilidades/movimiento';
import { leerTokens } from './escena-tokens';
import { EnVivoOrbeService } from './opttia-guia.service';
import type { AnfitrionOrbe } from './opttia-orbe';
import type { ObjetivoOrbe } from './opttia-puntos';
import type { OperacionEnVivoEscena } from './operacion-en-vivo.escena';
import { ToqueEscena, esEstacion } from './operacion.tipos';

/** Cuánto esperar tras prender el modo pantalla antes de releer los colores (el shell cambia la clase en su ciclo). */
const ESPERA_TEMA_MS = 60;

/**
 * Escena 3D "Mi operación" de la pantalla En vivo (D-386, 5.1/5.2/5.4).
 *
 * Crea el canvas, baja three como un chunk aparte (carga diferida, igual que la bienvenida) y
 * alimenta la escena con `EnVivoEstadoService`: la foto se coloca sin animar (al cargar, al
 * reconectar, al volver a la pestaña) y cada evento en vivo (`nuevos$`) se anima por el director.
 * Tocar una caja, una estación o un mensajero avisa por `EnVivoInteraccionService` (la ficha lo
 * abre); la cámara sigue a lo que mire la ficha (`EnVivoFichaService.vistaActual$`).
 *
 * Degrada sin romper: sin WebGL (o si la escena falla al arrancar) muestra el aviso y deja que las
 * cifras, las etapas y la lista sigan en vivo; con "reducir movimiento" quita el movimiento de
 * ambiente y las animaciones pasan a cambios cortos; con la pestaña oculta o la escena fuera de
 * pantalla se pausa SIN perder eventos (al volver, la escena se sincroniza con el estado).
 *
 * Solo lectura: no cambia pedidos ni escribe nada.
 */
@Component({
  selector: 'app-en-vivo-escena-operacion',
  templateUrl: './en-vivo-escena-operacion.component.html',
  styleUrls: ['./en-vivo-escena-operacion.component.scss'],
  // Sin encapsulación: las etiquetas HTML las crea la escena (ver la hoja de estilos).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEscenaOperacionComponent implements AfterViewInit, OnChanges, OnDestroy, EscenaRepetible {
  /** Espacio (px) que la escena debe dejar libre a cada lado (paneles flotantes); se suma al margen base del encuadre. */
  @Input() margenes: Partial<MargenesEncuadre> | null = null;
  /** false = la escena no es la vista actual: se pausa (los eventos se recuperan al volver a activarla). */
  @Input() activa = true;
  /** Avisa si la vista 3D se pudo montar (false = sin WebGL o la escena falló). */
  @Output() disponible3d = new EventEmitter<boolean>();
  /** Lo que se tocó en la escena: pedido (id), estación (id de la etapa) o vehículo (nombre). */
  @Output() tocar = new EventEmitter<ToqueEscena>();

  @ViewChild('canvas', { static: true }) private canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('etiquetas', { static: true }) private etiquetasRef!: ElementRef<HTMLElement>;
  @ViewChild('stage', { static: true }) private stageRef!: ElementRef<HTMLElement>;

  /** true = no hay vista 3D (sin WebGL o falló); la plantilla muestra el aviso. */
  sin3d = false;

  private escena: OperacionEnVivoEscena | null = null;
  private three: Three | null = null;
  private quitarOrbe: (() => void) | null = null;
  private destruido = false;
  private readonly subs = new Subscription();
  private resizeObs: ResizeObserver | null = null;
  private interObs: IntersectionObserver | null = null;
  private soltarMovimiento: (() => void) | null = null;
  private temporizadorTema = 0;

  private visibleEnPantalla = true;
  private pestanaVisible = true;
  private pausada = false;
  /** Hubo eventos que la escena no vio (pausa o repetición): al reanudar se pone al día con el estado. */
  private pendienteSync = false;
  private repitiendo = false;
  private ultimaFoto: number | null = null;
  private vistaFicha: VistaFicha | null = null;

  constructor(
    private readonly estado: EnVivoEstadoService,
    private readonly ficha: EnVivoFichaService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly repeticion: EnVivoRepeticionService,
    private readonly contexto: KatuqCommerceContextService,
    private readonly zona: NgZone,
    private readonly cdr: ChangeDetectorRef,
    private readonly host: ElementRef<HTMLElement>,
    private readonly orbe: EnVivoOrbeService
  ) {}

  ngAfterViewInit(): void {
    this.zona.runOutsideAngular(() => {
      void this.montar();
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['margenes'] && this.escena) this.escena.fijarMargenes(this.fuenteMargenes());
    if (cambios['activa'] && this.escena) this.actualizarPausa();
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.quitarOrbe?.();
    this.quitarOrbe = null;
    this.repeticion.quitarEscena(this);
    this.subs.unsubscribe();
    this.resizeObs?.disconnect();
    this.interObs?.disconnect();
    this.soltarMovimiento?.();
    window.clearTimeout(this.temporizadorTema);
    document.removeEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.escena?.destruir();
    this.escena = null;
  }

  // ------------------------------------------------------ API para quien la integra

  /** La escena ya está montada y pintando. */
  get lista(): boolean {
    return this.escena !== null;
  }

  /** Coloca estos pedidos sin animar (lo usa "Repetir el día" para mostrar el día simulado). */
  aplicarFoto(pedidos: ReadonlyArray<PedidoEnVivo>): void {
    this.escena?.aplicarFoto(pedidos);
  }

  /** Anima un evento (lo usa "Repetir el día": los eventos simulados no pasan por el estado). */
  aplicarEvento(evento: EventoEnVivo): void {
    this.escena?.aplicarEvento(evento);
  }

  /** Vacía la escena: "Repetir el día" empieza de cero (la escena se vuelve a llenar con los eventos simulados). */
  reiniciar(): void {
    this.escena?.aplicarFoto([]);
  }

  /** Vuelve a dejar la escena igual al estado real. */
  sincronizar(): void {
    this.pendienteSync = false;
    const e = this.estado.estado;
    this.ultimaFoto = e.actualizadoEn;
    this.escena?.fijarEtapas(e.etapas);
    this.escena?.aplicarFoto(e.pedidos, e.flota);
  }

  // ----------------------------------------------------------------- montaje

  private soportaWebgl(): boolean {
    try {
      const c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch {
      return false;
    }
  }

  private marcarSin3d(): void {
    this.zona.run(() => {
      this.sin3d = true;
      this.disponible3d.emit(false);
      this.cdr.markForCheck();
    });
  }

  private async montar(): Promise<void> {
    // Un turno de espera: lo que cambie aquí no debe tocar la plantilla en medio de su primera revisión.
    await Promise.resolve();
    if (this.destruido) return;
    if (!this.soportaWebgl()) { this.marcarSin3d(); return; }
    try {
      // Carga diferida: three y la escena solo bajan cuando se muestra la pantalla.
      const [T, rb, mod] = await Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        import('./operacion-en-vivo.escena'),
      ]);
      if (this.destruido) return;
      this.three = T;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const calidadBaja = !!window.matchMedia?.('(pointer: coarse)').matches
        || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
      const escena = mod.OperacionEnVivoEscena.crear(T, rb.RoundedBoxGeometry, {
        canvas: this.canvasRef.nativeElement,
        etiquetas: this.etiquetasRef.nativeElement,
        reducirMovimiento: prefiereMenosMovimiento(),
        calidadBaja,
        tokens: () => leerTokens(this.host.nativeElement),
        onClick: (t) => this.zona.run(() => this.alToque(t)),
        onVacio: () => this.zona.run(() => this.ficha.cerrar()),
      });
      escena.iniciar();
      this.escena = escena;
      this.conectar(escena);
      // "Repetir el día" le manda los eventos simulados por aquí (EscenaRepetible).
      this.repeticion.registrarEscena(this);
      // El orbe de Opttia se cuelga de la escena (señala lo siguiente, guía el recorrido).
      this.quitarOrbe = this.orbe.registrar(this.anfitrionOrbe(escena));
      this.zona.run(() => {
        this.disponible3d.emit(true);
        this.cdr.markForCheck();
      });
    } catch {
      // La escena no arrancó (contexto WebGL perdido, memoria...): la pantalla sigue sin 3D.
      this.escena?.destruir();
      this.escena = null;
      this.marcarSin3d();
    }
  }

  private conectar(escena: OperacionEnVivoEscena): void {
    escena.fijarMargenes(this.fuenteMargenes());
    this.medir();
    this.resizeObs = new ResizeObserver(() => this.medir());
    this.resizeObs.observe(this.stageRef.nativeElement);
    this.interObs = new IntersectionObserver((es) => {
      this.visibleEnPantalla = es.some((e) => e.isIntersecting);
      this.actualizarPausa();
    });
    this.interObs.observe(this.host.nativeElement);
    this.pestanaVisible = !document.hidden;
    document.addEventListener('visibilitychange', this.alCambiarVisibilidad);
    this.soltarMovimiento = alCambiarMovimiento((menos) => escena.fijarReducirMovimiento(menos));

    this.sincronizar();
    this.alFicha(this.vistaFicha);

    this.subs.add(this.estado.estado$.subscribe((e) => this.alEstado(e)));
    this.subs.add(this.estado.nuevos$.subscribe((ev) => this.alEventoNuevo(ev)));
    this.subs.add(this.estado.preferencias$.subscribe((p) => this.escena?.fijarPrivado(p.ocultar)));
    this.subs.add(this.ficha.vistaActual$.subscribe((v) => this.alFicha(v)));
    this.subs.add(
      this.interaccion.acciones$.subscribe((a) => {
        if (a.tipo === 'resaltar-pedidos') this.escena?.resaltar(a.ids);
        else if (a.tipo === 'modo-pantalla') this.programarRetema();
      })
    );
    this.subs.add(
      this.interaccion.repeticion$.subscribe((r) => {
        const antes = this.repitiendo;
        this.repitiendo = r.activa;
        // Al terminar la repetición, la escena vuelve al estado real sin perder lo que llegó mientras tanto.
        if (antes && !r.activa) this.sincronizar();
      })
    );
    this.actualizarPausa();
  }

  /** Lo que el orbe de Opttia necesita de esta escena. */
  private anfitrionOrbe(escena: OperacionEnVivoEscena): AnfitrionOrbe {
    return {
      id: 'operacion',
      T: this.three as Three,
      escena,
      etiquetas: escena.gestorEtiquetas,
      tokens: () => leerTokens(this.host.nativeElement),
      reducir: () => this.orbe.reducirMovimiento,
      visible: () => this.escena !== null && !this.pausada && !this.destruido,
      lugarDe: (o) => this.lugarOrbe(o),
      retenerCamara: () => undefined,
    };
  }

  /** Dónde está, en la operación, lo que Opttia señala: una caja, una moto o camión, o una estación. */
  private lugarOrbe(o: ObjetivoOrbe) {
    const e = this.escena;
    if (!e) return null;
    switch (o.tipo) {
      case 'estacion':
        return e.posEstacion(o.id);
      case 'veh':
        return e.posVeh(o.id) ?? e.posEstacion('listo');
      case 'pedido': {
        const caja = e.posCaja(o.id);
        if (caja) return caja;
        const p = this.estado.estado.pedidos.find((x) => x.id === o.id);
        if (!p) return null;
        if (p.etapa === 'camino' && p.transportador) return e.posVeh(p.transportador);
        return esEstacion(p.etapa) ? e.posEstacion(p.etapa) : null;
      }
      default:
        return null;
    }
  }

  private fuenteMargenes(): FuenteMargenes {
    const extra = this.margenes;
    return (ancho: number): Partial<MargenesEncuadre> => {
      const base = ancho < 520 ? { t: 66, b: 100, l: 8, r: 50 } : { t: 76, b: 116, l: 18, r: 62 };
      return extra
        ? { t: extra.t ?? base.t, b: extra.b ?? base.b, l: extra.l ?? base.l, r: extra.r ?? base.r }
        : base;
    };
  }

  private medir(): void {
    const el = this.stageRef.nativeElement;
    const w = Math.max(2, el.clientWidth);
    const h = Math.max(2, el.clientHeight);
    this.escena?.redimensionar(w, h);
  }

  // ----------------------------------------------------- estado y eventos

  /** Una foto nueva (carga, reconexión, sondeo) deja la escena igual al estado; lo demás llega por `nuevos$`. */
  private alEstado(e: EstadoEnVivo): void {
    if (!this.escena) return;
    if (e.etapas.length) this.escena.fijarEtapas(e.etapas);
    this.escena.fijarComercio(e.vista === 'comercio' ? e.empresa ?? this.contexto.resolve()?.displayName : null);
    if (!e.cargado || e.actualizadoEn === this.ultimaFoto) return;
    if (this.repitiendo || this.pausada) { this.pendienteSync = true; this.ultimaFoto = e.actualizadoEn; return; }
    this.sincronizar();
  }

  private alEventoNuevo(ev: EventoEnVivo): void {
    if (!this.escena) return;
    if (this.pausada || this.repitiendo) { this.pendienteSync = true; return; }
    this.escena.aplicarEvento(ev);
  }

  // ------------------------------------------------------------- pausa y tema

  private readonly alCambiarVisibilidad = (): void => {
    this.pestanaVisible = !document.hidden;
    this.actualizarPausa();
  };

  private actualizarPausa(): void {
    if (!this.escena) return;
    const pausar = !this.pestanaVisible || !this.visibleEnPantalla || !this.activa;
    if (pausar === this.pausada) return;
    this.pausada = pausar;
    this.escena.pausar(pausar);
    // Se reanuda: si pasó algo mientras estaba pausada, la escena se pone al día con el estado.
    if (!pausar && this.pendienteSync && !this.repitiendo) this.sincronizar();
  }

  private programarRetema(): void {
    window.clearTimeout(this.temporizadorTema);
    this.temporizadorTema = window.setTimeout(() => this.escena?.retema(), ESPERA_TEMA_MS);
  }

  // ------------------------------------------------------------- ficha y toques

  /** La cámara sigue a lo que mira la ficha: un pedido, un mensajero o una estación; sin ficha vuelve al encuadre. */
  private alFicha(v: VistaFicha | null): void {
    this.vistaFicha = v;
    const escena = this.escena;
    if (!escena) return;
    if (v && v.tipo === 'pedido') escena.seguir({ tipo: 'pedido', id: v.id });
    else if (v && v.tipo === 'mensajero') escena.seguir({ tipo: 'vehiculo', id: v.nombre });
    else if (v && v.tipo === 'lista' && v.clave.startsWith('etapa:') && esEstacion(v.clave.slice(6))) {
      escena.seguir({ tipo: 'estacion', id: v.clave.slice(6) });
    } else escena.seguir(null);
  }

  private alToque(t: ToqueEscena): void {
    this.tocar.emit(t);
    const e = this.estado.estado;
    if (t.tipo === 'pedido') {
      this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: t.id, empresa: e.empresa });
    } else if (t.tipo === 'estacion') {
      this.interaccion.emitir({ tipo: 'abrir-lista', clave: 'etapa:' + t.id });
    } else {
      const nombre = t.id.trim().toLowerCase();
      const pedidoIds = e.pedidos
        .filter((p) => p.etapa === 'camino' && (p.transportador ?? '').trim().toLowerCase() === nombre)
        .map((p) => p.id);
      this.interaccion.emitir({ tipo: 'abrir-mensajero', nombre: t.id, pedidoIds });
    }
  }
}
