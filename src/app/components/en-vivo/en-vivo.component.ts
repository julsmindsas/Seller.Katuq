import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Inject,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';
import { LoaderService } from '../../shared/services/loader.service';
import { KatuqCommerceContextService } from '../../shared/services/security/katuq-commerce-context.service';
import { EnVivoCelebracionComponent } from './celebracion/en-vivo-celebracion.component';
import { EnVivoInteraccionService, EstadoRepeticion, OpcionVista } from './compartido/en-vivo-interaccion.service';
import { EventoAbierto } from './eventos/en-vivo-eventos.component';
import { EnVivoRepeticionService } from './repeticion/en-vivo-repeticion.service';
import { FlotaAbierta } from './flota/en-vivo-flota.component';
import { DatosPulso, VENTANA_PULSO_COMERCIO_MS, VENTANA_PULSO_KATUQ_MS } from './pulso/en-vivo-pulso.component';
import { EnVivoEstadoService } from './servicios/en-vivo-estado.service';
import {
  CifraPorHora,
  EstadoEnVivo,
  EtapaId,
  EventoEnVivo,
  MotivoSinAcceso,
  PreferenciasEnVivo,
  ResumenDia,
  VistaEnVivo,
} from './servicios/en-vivo.modelos';
import { DetectorHitos } from './utilidades/celebraciones';
import { decimal, horaCorta, horaDeColombia, iniciales } from './utilidades/formato';
import { mejorHora } from './utilidades/horas';
import { MensajeSinAcceso, mensajeSinAcceso, textoDeCarga } from './utilidades/mensajes';
import { cadaFueraDeZona } from './utilidades/movimiento';
import { ControlPantalla } from './utilidades/pantalla';
import { Sonidos } from './utilidades/sonidos';
import {
  ClaveLista,
  conteosDeEtapas,
  DatosHeroe,
  datosHeroeComercio,
  datosHeroeKatuq,
  TarjetaCifra,
  tarjetasComercio,
  tarjetasKatuq,
} from './utilidades/tarjetas';

/** Todo lo que pinta el shell, ya armado desde el estado, las preferencias y el reloj. */
interface VistaModelo {
  estado: EstadoEnVivo;
  prefs: PreferenciasEnVivo;
  vista: VistaEnVivo;
  /** Instante que marca "ahora": el real o, en "Repetir el día", el simulado. */
  ahoraMs: number;
  repeticion: EstadoRepeticion;
  modoPantalla: boolean;
  opciones: ReadonlyArray<OpcionVista>;
  opcionActiva: string | null;
  sinAcceso: boolean;
  mensajeSinAcceso: MensajeSinAcceso;
  textoCarga: string;
  marca: string;
  subtitulo: string;
  logo: string;
  etiquetaOcultar: string;
  tarjetas: TarjetaCifra[];
  conteos: Partial<Record<EtapaId, number>>;
  heroe: DatosHeroe | null;
  pulso: DatosPulso | null;
  ventanaPulsoMs: number;
  hoy: ResumenDia | null;
  ayerMismaHora: ResumenDia | null;
  porHora: ReadonlyArray<CifraPorHora>;
  tituloEventos: string;
}

const REFRESCO_RELOJ_MS = 30000;
const DURACION_AVISO_MS = 6000;

/**
 * Shell del tablero "En vivo" (D-386, tarea 4.5). Abre el canal al entrar (`estado.iniciar`) y lo
 * cierra al salir, silencia el loader global (D-072) y arma la pantalla: encabezado con el estado
 * de la conexión, y, por defecto, las cifras del día, el pulso, las etapas en texto, la lista de
 * eventos, las ventas por hora y la flota. Sin WebGL ni escena 3D la pantalla ya es útil.
 *
 * Es la RUTA (`/en-vivo` y `/en-vivo/katuq`), así que otras piezas se enchufan de dos maneras:
 * - por SLOTS de contenido (`<app-en-vivo><div slot="escena">…</div></app-en-vivo>`), si algún
 *   componente envuelve al shell: `acciones` (botones extra del encabezado), `superior`,
 *   `escena`, `inferior` y, sin `slot`, el resto al final;
 * - por `EnVivoInteraccionService`: registrar opciones del selector de vista, escuchar lo que
 *   hace la persona (abrir lista, pedido o mensajero, resaltar, repetir el día, modo pantalla) y
 *   avisar que se está repitiendo el día.
 *
 * Solo lectura: no cambia pedidos ni escribe nada en el servidor.
 */
@Component({
  selector: 'app-en-vivo',
  templateUrl: './en-vivo.component.html',
  styleUrls: ['./en-vivo.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoComponent implements OnInit, OnChanges, OnDestroy {
  /**
   * `katuq` = toda la plataforma (solo Julsmind); `comercio` = la empresa de la sesión. Si no se
   * pasa, sale de `data.vista` de la ruta.
   */
  @Input() vista?: VistaEnVivo;
  /** Comercio que se mira (solo con una sesión de Katuq). Si no se pasa, sale de `?empresa=`. */
  @Input() empresa?: string;
  /** false: solo el encabezado y los slots (lo demás lo arma quien se enchufa). */
  @Input() cuerpoPorDefecto = true;
  /**
   * true: la lista de eventos NO va en la columna de abajo porque la página que envuelve al shell
   * la pinta flotando sobre la escena (pantallas anchas) o apilada debajo de ella. Con "Ampliar"
   * la página lo pone en false y la lista vuelve a su columna.
   */
  @Input() eventosFlotantes = false;

  @ViewChild('raiz', { static: true }) raiz!: ElementRef<HTMLElement>;
  @ViewChild(EnVivoCelebracionComponent) celebracion?: EnVivoCelebracionComponent;

  readonly vm$: Observable<VistaModelo>;
  /** Aviso pasajero "Te pusimos al día: N cambios". */
  aviso: string | null = null;

  private readonly pantalla: ControlPantalla;
  private readonly sonidos = new Sonidos();
  private readonly detector = new DetectorHitos();
  private readonly suscripciones = new Subscription();
  private readonly pedidosConSonido = new Set<string>();
  /** Reloj de 30 s: repinta la hora actual de las gráficas sin esperar un evento. */
  private readonly reloj$ = new BehaviorSubject<number>(Date.now());
  private empresaDeUrl: string | null = null;
  private iniciado = false;
  private pararReloj: (() => void) | null = null;
  private temporizadorAviso = 0;

  constructor(
    private readonly ruta: ActivatedRoute,
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly repeticion: EnVivoRepeticionService,
    private readonly loader: LoaderService,
    private readonly contexto: KatuqCommerceContextService,
    private readonly zona: NgZone,
    private readonly cambios: ChangeDetectorRef,
    @Inject(DOCUMENT) doc: Document
  ) {
    this.pantalla = new ControlPantalla(doc, () => {
      // La persona salió de la pantalla completa con Esc: el modo termina con ella.
      this.interaccion.fijarModoPantalla(false);
      this.cambios.markForCheck();
    });
    this.vm$ = this.armarVm$();
  }

  ngOnInit(): void {
    // D-072: el sondeo de 30 s y las fotos no deben tapar la pantalla con el overlay global.
    this.loader.suppressGlobalLoader();

    this.suscripciones.add(
      this.ruta.queryParamMap.subscribe((parametros) => {
        this.empresaDeUrl = parametros.get('empresa');
        this.abrirCanal();
      })
    );
    this.suscripciones.add(this.estado.nuevos$.subscribe((evento) => this.alLlegarEvento(evento)));
    // Una pieza (p. ej. los logros de toda Katuq) pide celebrar por la interacción: misma regla que los hitos.
    this.suscripciones.add(
      this.interaccion.acciones$.subscribe((accion) => {
        if (accion.tipo === 'celebrar') this.celebrar(accion.texto);
      })
    );
    this.suscripciones.add(this.estado.estado$.subscribe((e) => this.buscarHitos(e)));
    this.suscripciones.add(
      this.estado.avisos$.subscribe((aviso) => {
        window.clearTimeout(this.temporizadorAviso);
        this.aviso = aviso.texto;
        this.cambios.markForCheck();
        this.temporizadorAviso = window.setTimeout(() => {
          this.aviso = null;
          this.cambios.markForCheck();
        }, DURACION_AVISO_MS);
      })
    );
    // La vista que la persona usó por última vez vuelve sola cuando alguien registra las opciones.
    this.suscripciones.add(
      this.interaccion.opciones$.subscribe((opciones) => {
        const guardada = this.estado.preferencias.vista;
        if (guardada && opciones.some((o) => o.id === guardada)) this.interaccion.elegirOpcion(guardada);
      })
    );

    this.pararReloj = cadaFueraDeZona(this.zona, REFRESCO_RELOJ_MS, () => {
      this.zona.run(() => this.reloj$.next(Date.now()));
    });
    this.iniciado = true;
  }

  ngOnChanges(cambios: SimpleChanges): void {
    if (this.iniciado && (cambios['vista'] || cambios['empresa'])) this.abrirCanal();
  }

  ngOnDestroy(): void {
    this.suscripciones.unsubscribe();
    this.pararReloj?.();
    window.clearTimeout(this.temporizadorAviso);
    // Si se estaba repitiendo el día, se corta antes de cerrar el canal (la pantalla queda en el estado real).
    this.repeticion.cancelar();
    this.estado.detener();
    this.pantalla.destruir();
    this.sonidos.cerrar();
    this.interaccion.reiniciar();
    this.loader.releaseGlobalLoader();
  }

  // ── Acciones del encabezado ───────────────────────────────────────────────

  elegirOpcion(id: string): void {
    this.interaccion.elegirOpcion(id);
    this.estado.fijarVista(id);
  }

  /** Enciende o apaga el sonido. Al encender, el audio se crea aquí, dentro del clic (el navegador lo exige). */
  alternarSonido(): void {
    if (!this.estado.preferencias.sonido) {
      this.sonidos.activar();
      this.sonidos.sonar('estado');
    }
    this.estado.alternarSonido();
  }

  /** Con el sonido ya elegido en una visita anterior, el primer gesto en la pantalla despierta el audio. */
  desbloquearSonido(): void {
    if (this.estado.preferencias.sonido && !this.sonidos.listo) this.sonidos.activar();
  }

  alternarOcultar(): void {
    this.estado.alternarOcultar();
  }

  /**
   * "Repetir el día" (tarea 5.7). Avisa por `EnVivoInteraccionService.acciones$` (la ficha se
   * cierra: mostraría datos reales) y arranca `EnVivoRepeticionService`, que cuenta el día con las
   * llegadas reales de la foto en ~28 s y avisa con `fijarRepeticion` (el reloj del encabezado
   * muestra el instante simulado, y los sonidos y celebraciones se callan mientras esté activa). El
   * botón se desactiva mientras corre. Aquí no hay lógica de repetición a propósito.
   */
  alRepetirDia(): void {
    if (this.interaccion.repitiendo) return;
    this.interaccion.emitir({ tipo: 'repetir-dia' });
    this.repeticion.iniciar();
  }

  /** Avance de la repetición como porcentaje entero (0 a 100), para la barra y su texto accesible. */
  porcentaje(progreso: number | null | undefined): number {
    return Math.max(0, Math.min(100, Math.round((progreso ?? 0) * 100)));
  }

  /**
   * Celebra con aviso y confeti (y el sonido de hito, si el sonido está encendido). Es la entrada
   * para quien decide el hito afuera del shell: los logros de toda Katuq la reciben con su
   * `(celebrar)` o por `interaccion.emitir({ tipo: 'celebrar', texto })`. Nunca celebra durante
   * "Repetir el día". Quien llama es quien ya marcó el hito como celebrado hoy.
   */
  celebrar(texto: string): void {
    if (this.interaccion.repitiendo) return;
    this.celebracion?.celebrar(texto);
    if (this.estado.preferencias.sonido) this.sonidos.sonar('hito');
  }

  async alternarModoPantalla(): Promise<void> {
    if (this.pantalla.enModoPantalla) {
      await this.pantalla.salir();
      this.interaccion.fijarModoPantalla(false);
    } else {
      this.interaccion.fijarModoPantalla(true);
      await this.pantalla.entrar(this.raiz.nativeElement);
    }
    this.cambios.markForCheck();
  }

  // ── Lo que hace la persona sobre las piezas ───────────────────────────────

  abrirLista(clave: ClaveLista): void {
    this.interaccion.emitir({ tipo: 'abrir-lista', clave });
  }

  abrirPedido(abierto: EventoAbierto, empresaActual: string | null): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: abierto.pedidoId, empresa: abierto.empresa ?? empresaActual });
  }

  abrirMensajero(abierto: FlotaAbierta): void {
    this.interaccion.emitir({ tipo: 'abrir-mensajero', nombre: abierto.nombre, pedidoIds: abierto.pedidoIds });
  }

  resaltarPedidos(ids: string[] | null): void {
    this.interaccion.emitir({ tipo: 'resaltar-pedidos', ids });
  }

  // ── Canal, sonidos y celebraciones ────────────────────────────────────────

  private vistaActual(): VistaEnVivo {
    return this.vista ?? (this.ruta.snapshot.data['vista'] === 'katuq' ? 'katuq' : 'comercio');
  }

  private abrirCanal(): void {
    const vista = this.vistaActual();
    const empresa = vista === 'comercio' ? this.empresa ?? this.empresaDeUrl ?? undefined : undefined;
    // Otro comercio u otra vista: una repetición a medias ya no sirve.
    this.repeticion.cancelar();
    this.detector.reiniciar();
    this.estado.iniciar({ vista, empresa });
  }

  /** Sonido de un evento que llegó EN VIVO (nunca los de la foto al cargar). Apagado por defecto. */
  private alLlegarEvento(evento: EventoEnVivo): void {
    if (this.vistaActual() !== 'comercio' || this.interaccion.repitiendo) return;
    if (!this.estado.preferencias.sonido) return;
    switch (evento.tipo) {
      case 'pedido_nuevo':
        // Una sola vez por pedido.
        if (this.pedidosConSonido.has(evento.pedidoId)) return;
        this.pedidosConSonido.add(evento.pedidoId);
        this.sonidos.sonar('nuevo');
        break;
      case 'salida':
        this.sonidos.sonar('salida');
        break;
      case 'entregado':
        this.sonidos.sonar('entregado');
        break;
      default:
        break;
    }
  }

  /** Celebra los hitos que se cruzaron: una vez por día cada uno, nunca al cargar ni al repetir. */
  private buscarHitos(estado: EstadoEnVivo): void {
    const hitos = this.detector.procesar(estado, Date.now(), this.interaccion.repitiendo);
    // Todos quedan marcados; solo se anuncia el primero (el más importante).
    const nuevos = hitos.filter((h) => this.estado.marcarCelebrado(h.clave));
    if (nuevos.length === 0) return;
    this.celebrar(nuevos[0].texto);
  }

  // ── Vista ─────────────────────────────────────────────────────────────────

  private armarVm$(): Observable<VistaModelo> {
    return combineLatest([
      this.estado.estado$,
      this.estado.preferencias$,
      this.reloj$,
      this.interaccion.repeticion$,
      this.interaccion.modoPantalla$,
      this.interaccion.opciones$,
      this.interaccion.opcionActiva$,
    ]).pipe(
      map(([estado, prefs, reloj, repeticion, modoPantalla, opciones, opcionActiva]) =>
        this.armarVista(estado, prefs, repeticion.instanteMs ?? reloj, repeticion, modoPantalla, opciones, opcionActiva)
      )
    );
  }

  private armarVista(
    estado: EstadoEnVivo,
    prefs: PreferenciasEnVivo,
    ahoraMs: number,
    repeticion: EstadoRepeticion,
    modoPantalla: boolean,
    opciones: ReadonlyArray<OpcionVista>,
    opcionActiva: string | null
  ): VistaModelo {
    const katuq = estado.vista === 'katuq';
    const sinAcceso = estado.conexion === 'sin-acceso' || estado.disponible === false;
    const motivo: MotivoSinAcceso | null = estado.motivoSinAcceso ?? (estado.disponible === false ? 'rol' : null);
    const conteos = conteosDeEtapas(estado);
    const marca = katuq
      ? 'Katuq en vivo'
      : estado.empresa ?? this.contexto.resolve()?.displayName ?? 'Tu comercio';

    const base = {
      estado,
      prefs,
      vista: estado.vista,
      ahoraMs,
      repeticion,
      modoPantalla,
      opciones,
      opcionActiva,
      sinAcceso,
      mensajeSinAcceso: mensajeSinAcceso(motivo, estado.vista),
      textoCarga: textoDeCarga(estado.conexion),
      marca,
      logo: katuq ? 'K' : iniciales(marca),
      etiquetaOcultar: katuq ? 'Ocultar comercios y montos' : 'Ocultar clientes y montos',
      subtitulo: katuq
        ? 'Toda la plataforma · En vivo'
        : estado.soloLectura
        ? 'Katuq · En vivo · solo lectura'
        : 'Katuq · En vivo',
      conteos,
      ventanaPulsoMs: katuq ? VENTANA_PULSO_KATUQ_MS : VENTANA_PULSO_COMERCIO_MS,
      tituloEventos: katuq ? 'En todos los comercios' : 'Eventos de hoy',
    };

    if (katuq) {
      const g = estado.cifrasGlobal;
      return {
        ...base,
        tarjetas: g ? tarjetasKatuq(g, { ocultar: prefs.ocultar }) : [],
        heroe: datosHeroeKatuq(g, estado.radar),
        pulso: g ? this.pulsoKatuq(g.pedidosPorMinuto ?? 0, g.ritmoRecord?.porMinuto) : null,
        hoy: g ? { ventas: g.ventas, pedidos: g.pedidos, ticketPromedio: g.ticketPromedio } : null,
        ayerMismaHora: g?.ayerMismaHora ?? null,
        porHora: g?.porHora ?? [],
      };
    }

    const c = estado.cifras;
    return {
      ...base,
      tarjetas: c ? tarjetasComercio(c, conteos, estado.flota, { ocultar: prefs.ocultar, soloPropias: estado.soloPropias }) : [],
      heroe: datosHeroeComercio(estado),
      pulso: c ? this.pulsoComercio(c.porHora, ahoraMs, prefs.ocultar) : null,
      hoy: c ? { ventas: c.ventas, pedidos: c.pedidos, ticketPromedio: c.ticketPromedio } : null,
      ayerMismaHora: c?.ayerMismaHora ?? null,
      porHora: c?.porHora ?? [],
    };
  }

  /** Cabecera del pulso de la tienda: pedidos de esta hora y la mejor hora de hoy (del servidor). */
  private pulsoComercio(porHora: ReadonlyArray<CifraPorHora>, ahoraMs: number, ocultar: boolean): DatosPulso {
    const hora = horaDeColombia(ahoraMs);
    const pedidos = porHora.find((h) => h.hora === hora)?.pedidos ?? 0;
    const mejor = mejorHora(porHora, ocultar ? 'pedidos' : 'ventas');
    return {
      etiqueta: 'El pulso de tu tienda · cada pico es un pedido',
      valor: String(pedidos),
      unidad: `${pedidos === 1 ? 'pedido' : 'pedidos'} esta hora`,
      nota: mejor ? `Mejor hora de hoy: ${horaCorta(mejor.hora)} · ${mejor.pedidos} pedidos` : '',
    };
  }

  private pulsoKatuq(porMinuto: number, record: number | undefined): DatosPulso {
    return {
      etiqueta: 'El pulso de Katuq · cada pico es un pedido',
      valor: decimal(porMinuto),
      unidad: 'pedidos por minuto',
      nota: record !== undefined ? `Récord de hoy ${decimal(record)}` : '',
    };
  }
}
