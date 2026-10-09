import {
  AfterViewInit,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  EventEmitter,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { Subscription } from 'rxjs';
import type { FuenteMargenes, MargenesEncuadre, RoundedBox, Three } from '../../../shared/escena-3d/escena-base';
import type { GeoColombia } from '../../../shared/escena-3d/mapa-colombia.scene';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EstadoEnVivo, EtapaInfo } from '../servicios/en-vivo.modelos';
import { alCambiarMovimiento, prefiereMenosMovimiento } from '../utilidades/movimiento';
import { cargarGeoColombia } from './geo-colombia';
import type { GestorEtiquetas } from './etiquetas-html';
import { EnVivoOrbeService } from './opttia-guia.service';
import type { AnfitrionOrbe, EscenaOrbitable, IdEscenaOrbe } from './opttia-orbe';
import type { ObjetivoOrbe } from './opttia-puntos';
import { leerTokens } from './escena-tokens';
import { OpcionesEscenaMapa, ToqueMapa, margenesBase } from './mapas.tipos';

/** Cuánto esperar tras prender el modo pantalla antes de releer los colores (el shell cambia la clase en su ciclo). */
const ESPERA_TEMA_MS = 60;

/** Lo que el componente le pide a cualquiera de las tres escenas nuevas. */
export interface EscenaMontable extends EscenaOrbitable {
  /** Gestor de etiquetas HTML (el orbe de Opttia pone ahí su burbuja). */
  readonly gestorEtiquetas: GestorEtiquetas;
  iniciar(): void;
  destruir(): void;
  redimensionar(ancho: number, alto: number, margenDerecho?: number): void;
  pausar(pausado: boolean): void;
  fijarMargenes(margenes: FuenteMargenes): void;
  retema(): void;
  fijarReducirMovimiento(reducir: boolean): void;
  fijarPrivado(privado: boolean): void;
  fijarAutomatica(activa: boolean): void;
  fijarEtapas(etapas: ReadonlyArray<EtapaInfo>): void;
  reiniciar(): void;
  soltarEfectos(): void;
  resaltar(ids: string | string[] | null): void;
}

/** Lo que el componente entrega a la escena para que se construya (three ya cargado). */
export interface ContextoMontaje {
  T: Three;
  RB: RoundedBox;
  opciones: OpcionesEscenaMapa;
}

/**
 * Base de los tres componentes de escena nuevos (mapa del comercio, país de Katuq y ciudad de Katuq).
 * Crea el canvas, baja three y la escena como un chunk aparte, y se encarga de lo que es igual en
 * las tres: degradar sin WebGL, pausar con la pestaña oculta o fuera de pantalla SIN perder eventos
 * (al volver, la escena se pone al día con el estado real), "reducir movimiento", el tema oscuro
 * del modo pantalla, "ocultar clientes y montos", la cámara automática y los márgenes del encuadre.
 *
 * Cada hija dice qué escena crear (`crear`), cómo alimentarla (`conectar`/`sincronizar`) y qué
 * acción de pantalla emite un toque (`accionDeToque`). Solo lectura.
 */
@Directive()
export abstract class EnVivoEscenaBase<E extends EscenaMontable> implements AfterViewInit, OnChanges, OnDestroy {
  /** Espacio (px) que la escena debe dejar libre a cada lado (paneles flotantes); se suma al margen base del encuadre. */
  @Input() margenes: Partial<MargenesEncuadre> | null = null;
  /** false = la escena no es la vista actual: se pausa (los eventos se recuperan al volver a activarla). */
  @Input() activa = true;
  /** Cámara automática: true/false la fija; null (por defecto) la prende con el modo pantalla. */
  @Input() automatica: boolean | null = null;
  /** Avisa si la vista 3D se pudo montar (false = sin WebGL o la escena falló). */
  @Output() disponible3d = new EventEmitter<boolean>();
  /** Lo que se tocó: una ciudad (código DANE) o un comercio (su empresa). */
  @Output() tocar = new EventEmitter<ToqueMapa>();

  @ViewChild('canvas', { static: true }) protected canvasRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('etiquetas', { static: true }) protected etiquetasRef!: ElementRef<HTMLElement>;
  @ViewChild('stage', { static: true }) protected stageRef!: ElementRef<HTMLElement>;

  /** true = no hay vista 3D (sin WebGL o falló); la plantilla muestra el aviso. */
  sin3d = false;
  /** Colores de la leyenda de demanda (solo el país de Katuq la llena; vacía = no se muestra). */
  coloresLeyenda: string[] = [];
  /** Texto accesible del canvas (lo pone cada escena). */
  abstract readonly etiquetaAria: string;

  protected escena: E | null = null;
  protected geo: GeoColombia | null = null;
  protected destruido = false;
  protected readonly subs = new Subscription();
  /** three ya cargado (lo necesita el orbe de Opttia). */
  private three: Three | null = null;
  private quitarOrbe: (() => void) | null = null;
  /** Hubo eventos que la escena no vio (pausa o repetición): al reanudar se pone al día con el estado. */
  protected pendienteSync = false;
  protected repitiendo = false;
  protected pausada = false;

  private resizeObs: ResizeObserver | null = null;
  private interObs: IntersectionObserver | null = null;
  private soltarMovimiento: (() => void) | null = null;
  private temporizadorTema = 0;
  private visibleEnPantalla = true;
  private pestanaVisible = true;

  constructor(
    protected readonly zona: NgZone,
    protected readonly cdr: ChangeDetectorRef,
    protected readonly host: ElementRef<HTMLElement>,
    protected readonly estadoSvc: EnVivoEstadoService,
    protected readonly interaccion: EnVivoInteraccionService,
    protected readonly orbe: EnVivoOrbeService,
  ) {}

  // ----------------------------------------------------------- lo que dice cada hija

  /** Importa el módulo de la escena y la construye (sin `iniciar`: eso lo hace la base). */
  protected abstract crear(c: ContextoMontaje): Promise<E>;
  /** Suscribe la escena a lo que le toca del estado y deja puesto el estado actual. */
  protected abstract conectar(escena: E): void;
  /** Deja la escena igual al estado real, sin animar. */
  abstract sincronizar(): void;
  /** Cuál de las escenas es (el orbe de Opttia se mueve distinto en cada una). */
  protected abstract readonly idOrbe: IdEscenaOrbe;
  /** Dónde está, en esta escena, lo que el orbe de Opttia quiere señalar (mundo); null si no se ve. */
  protected abstract lugarOrbe(obj: ObjetivoOrbe): ReturnType<AnfitrionOrbe['lugarDe']>;
  /** Qué acción de pantalla provoca un toque (null = ninguna). */
  protected abstract accionDeToque(t: ToqueMapa): Parameters<EnVivoInteraccionService['emitir']>[0] | null;
  /** Una hija puede reaccionar a cambios de sus @Input propios. */
  protected alCambiarEntradas(_cambios: SimpleChanges): void { /* sin entradas propias */ }
  /** Una hija puede reaccionar a que la escena ya existe (p. ej. para colores de una leyenda). */
  protected alMontar(_escena: E): void { /* nada */ }
  /** Una hija puede reaccionar al cambio de tema. */
  protected alRetemar(): void { /* nada */ }

  // ------------------------------------------------------------------- ciclo

  ngAfterViewInit(): void {
    this.zona.runOutsideAngular(() => {
      void this.montar();
    });
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (cambios['margenes'] && this.escena) this.escena.fijarMargenes(this.fuenteMargenes());
    if (cambios['activa'] && this.escena) this.actualizarPausa();
    if (cambios['automatica'] && this.escena) this.aplicarAutomatica();
    this.alCambiarEntradas(cambios);
  }

  ngOnDestroy(): void {
    this.destruido = true;
    this.quitarOrbe?.();
    this.quitarOrbe = null;
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

  /** Vuelve a dejar la escena en cero (el punto de partida de "Repetir el día"). */
  reiniciar(): void {
    this.escena?.reiniciar();
  }

  /** Resalta lo que corresponda a esos ids (pedidos en el mapa del comercio, comercios en las escenas de Katuq). */
  resaltar(ids: string | string[] | null): void {
    this.escena?.resaltar(ids);
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
      // Carga diferida: three, el mapa y la escena solo bajan cuando se muestra la pantalla.
      const [T, rb, geo] = await Promise.all([
        import('three'),
        import('three/examples/jsm/geometries/RoundedBoxGeometry.js'),
        cargarGeoColombia(),
      ]);
      if (this.destruido) return;
      this.geo = geo;
      this.three = T;
      const nav = navigator as Navigator & { deviceMemory?: number };
      const calidadBaja = !!window.matchMedia?.('(pointer: coarse)').matches
        || (nav.hardwareConcurrency || 8) <= 4 || (nav.deviceMemory || 8) <= 4;
      const escena = await this.crear({
        T,
        RB: rb.RoundedBoxGeometry,
        opciones: {
          canvas: this.canvasRef.nativeElement,
          etiquetas: this.etiquetasRef.nativeElement,
          reducirMovimiento: prefiereMenosMovimiento(),
          calidadBaja,
          tokens: () => leerTokens(this.host.nativeElement),
          geo,
          onClick: (t) => this.zona.run(() => this.alToque(t)),
          onVacio: () => undefined,
        },
      });
      if (this.destruido) { escena.destruir(); return; }
      escena.iniciar();
      this.escena = escena;
      this.preparar(escena);
      this.zona.run(() => {
        this.disponible3d.emit(true);
        this.cdr.markForCheck();
      });
    } catch {
      // La escena no arrancó (sin el mapa, contexto WebGL perdido, memoria...): la pantalla sigue sin 3D.
      this.escena?.destruir();
      this.escena = null;
      this.marcarSin3d();
    }
  }

  private preparar(escena: E): void {
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

    this.alMontar(escena);
    this.aplicarAutomatica();
    this.subs.add(this.estadoSvc.preferencias$.subscribe((p) => this.escena?.fijarPrivado(p.ocultar)));
    this.subs.add(this.estadoSvc.estado$.subscribe((e) => this.alEtapas(e)));
    this.subs.add(this.interaccion.modoPantalla$.subscribe(() => this.aplicarAutomatica()));
    this.subs.add(
      this.interaccion.acciones$.subscribe((a) => {
        if (a.tipo === 'resaltar-pedidos') this.resaltar(a.ids);
        else if (a.tipo === 'modo-pantalla') this.programarRetema();
      })
    );
    this.subs.add(
      this.interaccion.repeticion$.subscribe((r) => {
        const antes = this.repitiendo;
        this.repitiendo = r.activa;
        // Al terminar la repetición, la escena vuelve al estado real sin perder lo que llegó mientras tanto.
        if (antes && !r.activa) this.volverAlEstadoReal();
      })
    );
    this.conectar(escena);
    this.actualizarPausa();
    this.quitarOrbe = this.orbe.registrar(this.anfitrionOrbe(escena));
  }

  /** Lo que el orbe de Opttia necesita de esta escena. */
  private anfitrionOrbe(escena: E): AnfitrionOrbe {
    return {
      id: this.idOrbe,
      T: this.three as Three,
      escena,
      etiquetas: escena.gestorEtiquetas,
      tokens: () => leerTokens(this.host.nativeElement),
      reducir: () => this.orbe.reducirMovimiento,
      visible: () => this.escena !== null && !this.pausada && !this.destruido,
      lugarDe: (o) => this.lugarOrbe(o),
      // Mientras el orbe mueve la cámara, la automática del modo pantalla se queda quieta.
      retenerCamara: (r) => this.escena?.fijarAutomatica(r ? false : this.automatica ?? this.interaccion.modoPantalla),
    };
  }

  private alEtapas(e: EstadoEnVivo): void {
    if (e.etapas.length) this.escena?.fijarEtapas(e.etapas);
  }

  protected fuenteMargenes(): FuenteMargenes {
    const extra = this.margenes;
    return (ancho: number): Partial<MargenesEncuadre> => {
      const base = margenesBase(ancho);
      return extra
        ? { t: extra.t ?? base.t, b: extra.b ?? base.b, l: extra.l ?? base.l, r: extra.r ?? base.r }
        : base;
    };
  }

  private medir(): void {
    const el = this.stageRef.nativeElement;
    this.escena?.redimensionar(Math.max(2, el.clientWidth), Math.max(2, el.clientHeight));
  }

  private aplicarAutomatica(): void {
    this.escena?.fijarAutomatica(this.automatica ?? this.interaccion.modoPantalla);
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
    if (!pausar && this.pendienteSync && !this.repitiendo) this.volverAlEstadoReal();
  }

  private volverAlEstadoReal(): void {
    this.pendienteSync = false;
    this.escena?.soltarEfectos();
    this.sincronizar();
  }

  private programarRetema(): void {
    window.clearTimeout(this.temporizadorTema);
    this.temporizadorTema = window.setTimeout(() => {
      this.escena?.retema();
      this.alRetemar();
    }, ESPERA_TEMA_MS);
  }

  // ------------------------------------------------------------------ toques

  private alToque(t: ToqueMapa): void {
    this.tocar.emit(t);
    const accion = this.accionDeToque(t);
    if (accion) this.interaccion.emitir(accion);
  }
}
