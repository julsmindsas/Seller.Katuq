import { ChangeDetectionStrategy, Component, ElementRef, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable, Subscription } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { MargenesEncuadre } from '../../../shared/escena-3d/escena-base';
import { EnVivoInteraccionService, OpcionVista } from '../compartido/en-vivo-interaccion.service';
import { EnVivoOrbeService } from '../escenas/opttia-guia.service';
import { RespuestaParaEscena } from '../opttia/en-vivo-opttia.component';
import { prefiereMenosMovimiento } from '../utilidades/movimiento';
import { anchoAcoplado$, anchoFlotante$, margenesEscena } from './margenes-escena';
import { EventoAbierto } from '../eventos/en-vivo-eventos.component';
import { TableroSolicitado } from '../ficha/ficha.modelos';
import { EnVivoFichaService } from '../ficha/ficha.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EtapaInfo, EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { irAlTablero } from './navegacion';
import { EnVivoPropuestasService } from '../propuestas/en-vivo-propuestas.service';
import { sesionEsJulsmind } from './sesion-katuq';

/** Las vistas del selector del comercio: dos escenas 3D (las enchufa otro módulo) y el tablero. */
const OPCIONES: ReadonlyArray<OpcionVista> = [
  { id: 'operacion', etiqueta: 'Mi operación' },
  { id: 'pais', etiqueta: 'Mi país' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
];

/** Vistas que no son escena 3D: llenan el recuadro como lista, sin paneles flotantes ni narración encima. */
const SIN_ESCENA = new Set(['pedidos']);

/**
 * Vistas con la tarjeta "Opttia propone" (D-422). La pestaña "Despachos" de D-410 ya no existe: el
 * plan se propone y se aprueba aquí, en la escena. Quien tenía guardada esa vista cae en la primera.
 */
const CON_PROPUESTAS = new Set(['operacion', 'pais', 'pedidos']);

/** Lo que la página lee del estado para pintar lo suyo (la lista flotante de eventos y la vista elegida). */
interface VistaPagina {
  opcion: string | null;
  eventos: ReadonlyArray<EventoEnVivo>;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  etapas: ReadonlyArray<EtapaInfo>;
  ocultar: boolean;
  /** false si el comercio apagó a Opttia (D-386): sin panel ni narración. */
  opttiaActivo: boolean;
  /** Katuq mirando a un comercio ajeno ("Bodega" en vez de "Tu bodega"). */
  soloLectura: boolean;
  /** Espacio que la escena deja libre para los paneles flotantes y la tarjeta acoplada (null = ninguno). */
  margenes: Partial<MargenesEncuadre> | null;
  /** La tarjeta "Opttia propone" va en esta vista (D-422): Opttia prendido, sesión propia y el servidor dijo que aplica. */
  conPropuestas: boolean;
  /** Modo pantalla (TV): solo ahí va la narración de Opttia sobre la escena (D-468). */
  tv: boolean;
}

/**
 * Pantalla "En vivo" del comercio (`/en-vivo`, D-386 tareas 4.6 y 4.9). Envuelve al shell
 * `<app-en-vivo>` y le enchufa, por slots, lo propio del comercio:
 *
 * - encabezado: "Toda Katuq" (solo si una sesión de Julsmind mira un comercio con `?empresa=`) y
 *   "Ampliar" (quita los paneles flotantes y la lista vuelve a su columna);
 * - escena: el recuadro `.ev-escena-slot` con las vistas "Mi operación", "Mi país" (escenas 3D por
 *   enchufar) y "Pedidos" (el tablero por etapas), la narración de Opttia, la tarjeta "Opttia
 *   propone" (D-422), la ficha y, flotando
 *   encima en >= 1181 px, "Lo próximo", "Tu flota" y la lista de eventos (si no, apilados debajo);
 * - abajo: atención ahora, Opttia, tiempos, logros y productos estrella.
 *
 * El héroe, las cifras, las etapas, las ventas por hora y la flota los pinta el propio shell
 * (`cuerpoPorDefecto`); la página solo le quita la lista de eventos de su columna
 * (`eventosFlotantes`) para no repetirla. La página no escribe: solo la tarjeta de Opttia, al aprobar.
 */
@Component({
  selector: 'app-en-vivo-comercio-pagina',
  templateUrl: './en-vivo-comercio-pagina.component.html',
  styleUrls: ['./en-vivo-comercio-pagina.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoComercioPaginaComponent implements OnInit, OnDestroy {
  /** Comercio que se mira (`?empresa=`, solo con una sesión de Katuq); el backend lo ignora para los demás. */
  readonly empresa$: Observable<string | undefined>;
  readonly vm$: Observable<VistaPagina>;
  /** Panel de Opttia solo con el interruptor prendido (D-386). */
  readonly opttiaActivo$: Observable<boolean>;
  /** Sesión de Julsmind: puede volver a "Toda Katuq". */
  readonly esJulsmind = sesionEsJulsmind();
  /** "Ampliar": sin paneles flotantes; la lista de eventos vuelve a su columna. */
  private readonly ampliadoSubject = new BehaviorSubject<boolean>(false);
  /** La vista elegida tiene escena 3D y esta sí se pudo montar (si no, Opttia no ofrece recorrido ni "Verlo en la escena"). */
  readonly conEscena$: Observable<boolean>;
  private readonly sin3d$ = new BehaviorSubject<boolean>(false);
  private readonly subs = new Subscription();

  get ampliado(): boolean {
    return this.ampliadoSubject.value;
  }

  constructor(
    ruta: ActivatedRoute,
    private readonly router: Router,
    private readonly estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly ficha: EnVivoFichaService,
    private readonly orbe: EnVivoOrbeService,
    private readonly host: ElementRef<HTMLElement>,
    private readonly propuestas: EnVivoPropuestasService
  ) {
    this.empresa$ = ruta.queryParamMap.pipe(
      map((p) => p.get('empresa') ?? undefined),
      distinctUntilChanged()
    );
    // La tarjeta de Opttia acoplada abajo (celular) le pide a la escena dejar su alto libre.
    const acoplada$ = combineLatest([anchoAcoplado$(), propuestas.tarjetaVisible$]).pipe(
      map(([angosta, visible]) => angosta && visible),
      distinctUntilChanged()
    );
    this.vm$ = combineLatest([
      estado.estado$,
      estado.preferencias$,
      interaccion.opcionActiva$,
      this.ampliadoSubject,
      anchoFlotante$(),
      propuestas.disponible$,
      acoplada$,
      this.empresa$,
      interaccion.modoPantalla$,
    ]).pipe(
      map(([e, prefs, opcion, ampliado, ancho, hayPropuestas, acoplada, empresa, tv]): VistaPagina => {
        const opttiaActivo = e.opttiaActivo !== false;
        // Opttia propone (D-422): Opttia prendido y sesión propia (ni Katuq mirando otro comercio ni solo lectura).
        const conPropuestas = hayPropuestas && opttiaActivo && !e.soloLectura && !empresa && CON_PROPUESTAS.has(opcion ?? '');
        const conEscena = !SIN_ESCENA.has(opcion ?? '');
        return {
          opcion,
          eventos: e.eventos,
          pedidos: e.pedidos,
          etapas: e.etapas,
          ocultar: prefs.ocultar,
          opttiaActivo,
          soloLectura: e.soloLectura,
          // "Lo próximo" y "Tu flota" flotan a la izquierda solo sobre la operación; los eventos, a la derecha.
          margenes: margenesEscena(
            { izquierda: opcion === 'operacion', derecha: true },
            ancho && !ampliado && conEscena,
            conPropuestas && acoplada && conEscena
          ),
          conPropuestas,
          tv,
        };
      })
    );
    this.opttiaActivo$ = estado.estado$.pipe(map((e) => e.opttiaActivo !== false), distinctUntilChanged());
    this.conEscena$ = combineLatest([interaccion.opcionActiva$, this.sin3d$]).pipe(
      map(([opcion, sin3d]) => !SIN_ESCENA.has(opcion ?? '') && !sin3d)
    );
  }

  ngOnInit(): void {
    // Antes de que el shell inicie: así su encabezado ya trae el selector y la vista guardada vuelve sola.
    this.interaccion.fijarOpciones(OPCIONES);
    // Opttia propone en la escena (D-422). Katuq mirando otro comercio (?empresa=) no pide propuestas;
    // el servicio tampoco las pide con solo lectura, para el vendedor D-349 ni con Opttia apagado.
    this.subs.add(this.empresa$.subscribe((empresa) => this.propuestas.fijarAjena(!!empresa)));
    this.propuestas.iniciar();
    // El botón del orbe es el que vuelve a abrir la tarjeta; solo existe con una escena 3D con orbe.
    // Sin él (vista "Pedidos" o sin WebGL) la tarjeta no se retira sola.
    this.subs.add(this.orbe.hayOrbe$.pipe(distinctUntilChanged()).subscribe((hay) => this.propuestas.fijarBotonOrbe(hay)));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.propuestas.detener();
  }

  /** "Pedidos" llena el recuadro como lista (sin escena 3D). */
  sinEscena(opcion: string | null | undefined): boolean {
    return SIN_ESCENA.has(opcion ?? '');
  }

  /** Los paneles flotan (y la lista sale de la columna) salvo en "Ampliar" y en la vista "Pedidos". */
  flotando(opcion: string | null): boolean {
    return !this.ampliado && !SIN_ESCENA.has(opcion ?? '');
  }

  alternarAmpliado(): void {
    this.ampliadoSubject.next(!this.ampliadoSubject.value);
  }

  /** La escena avisó si pudo montar su vista 3D (sin WebGL el resto de la página sigue). */
  alDisponible3d(disponible: boolean): void {
    this.sin3d$.next(!disponible);
  }

  abrirPedido(abierto: EventoAbierto): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: abierto.pedidoId, empresa: abierto.empresa });
  }

  resaltarPedidos(ids: string[] | null): void {
    this.interaccion.emitir({ tipo: 'resaltar-pedidos', ids });
  }

  alAbrirTablero(solicitud: TableroSolicitado): void {
    irAlTablero(this.router, this.ficha, solicitud);
  }

  // ── Opttia y las escenas ──────────────────────────────────────────────────
  /** Botón "Recorrido con Opttia" de la tarjeta: la cámara sigue al orbe por lo que necesita atención. */
  alRecorrido(): void {
    this.verLaEscena();
    this.orbe.alternarRecorrido();
  }

  /** "Verlo en la escena": Opttia vuela a lo que menciona la respuesta. */
  alVerEnEscena(respuesta: RespuestaParaEscena): void {
    this.verLaEscena();
    this.orbe.irA(respuesta);
  }

  /** Llegó una respuesta con algo que está en la escena: Opttia vuela hasta allí sin que la persona toque nada. */
  alRespondida(respuesta: RespuestaParaEscena): void {
    this.orbe.irA(respuesta);
  }

  /** En pantallas angostas la escena queda arriba de la tarjeta: se trae a la vista. */
  private verLaEscena(): void {
    const escena = this.host.nativeElement.querySelector<HTMLElement>('.ev-escena-slot');
    escena?.scrollIntoView({ block: 'nearest', behavior: prefiereMenosMovimiento() ? 'auto' : 'smooth' });
  }
}
