import { ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, combineLatest, Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import type { MargenesEncuadre } from '../../../shared/escena-3d/escena-base';
import { EnVivoInteraccionService, OpcionVista } from '../compartido/en-vivo-interaccion.service';
import { EnVivoOrbeService } from '../escenas/opttia-guia.service';
import { RespuestaParaEscena } from '../opttia/en-vivo-opttia.component';
import { prefiereMenosMovimiento } from '../utilidades/movimiento';
import { anchoFlotante$, margenesEscena } from './margenes-escena';
import { EventoAbierto } from '../eventos/en-vivo-eventos.component';
import { TableroSolicitado } from '../ficha/ficha.modelos';
import { EnVivoFichaService } from '../ficha/ficha.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EtapaInfo, EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { irAlTablero } from './navegacion';
import { sesionEsJulsmind } from './sesion-katuq';

/** Las vistas del selector del comercio: dos escenas 3D (las enchufa otro módulo) y el tablero. */
const OPCIONES: ReadonlyArray<OpcionVista> = [
  { id: 'operacion', etiqueta: 'Mi operación' },
  { id: 'pais', etiqueta: 'Mi país' },
  { id: 'pedidos', etiqueta: 'Pedidos' },
];

/** Lo que la página lee del estado para pintar lo suyo (la lista flotante de eventos y la vista elegida). */
interface VistaPagina {
  opcion: string | null;
  eventos: ReadonlyArray<EventoEnVivo>;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  etapas: ReadonlyArray<EtapaInfo>;
  ocultar: boolean;
  /** Katuq mirando a un comercio ajeno ("Bodega" en vez de "Tu bodega"). */
  soloLectura: boolean;
  /** Espacio que la escena deja libre para los paneles flotantes (null = ninguno). */
  margenes: Partial<MargenesEncuadre> | null;
}

/**
 * Pantalla "En vivo" del comercio (`/en-vivo`, D-386 tareas 4.6 y 4.9). Envuelve al shell
 * `<app-en-vivo>` y le enchufa, por slots, lo propio del comercio:
 *
 * - encabezado: "Toda Katuq" (solo si una sesión de Julsmind mira un comercio con `?empresa=`) y
 *   "Ampliar" (quita los paneles flotantes y la lista vuelve a su columna);
 * - escena: el recuadro `.ev-escena-slot` con las vistas "Mi operación", "Mi país" (escenas 3D por
 *   enchufar) y "Pedidos" (el tablero por etapas), la narración de Opttia, la ficha y, flotando
 *   encima en >= 1181 px, "Lo próximo", "Tu flota" y la lista de eventos (si no, apilados debajo);
 * - abajo: atención ahora, Opttia, tiempos, logros y productos estrella.
 *
 * El héroe, las cifras, las etapas, las ventas por hora y la flota los pinta el propio shell
 * (`cuerpoPorDefecto`); la página solo le quita la lista de eventos de su columna
 * (`eventosFlotantes`) para no repetirla. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-comercio-pagina',
  templateUrl: './en-vivo-comercio-pagina.component.html',
  styleUrls: ['./en-vivo-comercio-pagina.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoComercioPaginaComponent implements OnInit {
  /** Comercio que se mira (`?empresa=`, solo con una sesión de Katuq); el backend lo ignora para los demás. */
  readonly empresa$: Observable<string | undefined>;
  readonly vm$: Observable<VistaPagina>;
  /** Sesión de Julsmind: puede volver a "Toda Katuq". */
  readonly esJulsmind = sesionEsJulsmind();
  /** "Ampliar": sin paneles flotantes; la lista de eventos vuelve a su columna. */
  private readonly ampliadoSubject = new BehaviorSubject<boolean>(false);
  /** La vista elegida tiene escena 3D y esta sí se pudo montar (si no, Opttia no ofrece recorrido ni "Verlo en la escena"). */
  readonly conEscena$: Observable<boolean>;
  private readonly sin3d$ = new BehaviorSubject<boolean>(false);

  get ampliado(): boolean {
    return this.ampliadoSubject.value;
  }

  constructor(
    ruta: ActivatedRoute,
    private readonly router: Router,
    estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly ficha: EnVivoFichaService,
    private readonly orbe: EnVivoOrbeService,
    private readonly host: ElementRef<HTMLElement>
  ) {
    this.empresa$ = ruta.queryParamMap.pipe(
      map((p) => p.get('empresa') ?? undefined),
      distinctUntilChanged()
    );
    this.vm$ = combineLatest([estado.estado$, estado.preferencias$, interaccion.opcionActiva$, this.ampliadoSubject, anchoFlotante$()]).pipe(
      map(([e, prefs, opcion, ampliado, ancho]) => ({
        opcion,
        eventos: e.eventos,
        pedidos: e.pedidos,
        etapas: e.etapas,
        ocultar: prefs.ocultar,
        soloLectura: e.soloLectura,
        // "Lo próximo" y "Tu flota" flotan a la izquierda solo sobre la operación; los eventos, a la derecha.
        margenes: margenesEscena({ izquierda: opcion === 'operacion', derecha: true }, ancho && !ampliado && opcion !== 'pedidos'),
      }))
    );
    this.conEscena$ = combineLatest([interaccion.opcionActiva$, this.sin3d$]).pipe(
      map(([opcion, sin3d]) => opcion !== 'pedidos' && !sin3d)
    );
  }

  ngOnInit(): void {
    // Antes de que el shell inicie: así su encabezado ya trae el selector y la vista guardada vuelve sola.
    this.interaccion.fijarOpciones(OPCIONES);
  }

  /** Los paneles flotan (y la lista sale de la columna) salvo en "Ampliar" y en la vista "Pedidos". */
  flotando(opcion: string | null): boolean {
    return !this.ampliado && opcion !== 'pedidos';
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
