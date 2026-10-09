import { ChangeDetectionStrategy, Component, ElementRef, OnInit } from '@angular/core';
import { Router } from '@angular/router';
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

/** Las vistas del selector de toda Katuq: dos escenas 3D (las enchufa otro módulo) y el muro. */
const OPCIONES: ReadonlyArray<OpcionVista> = [
  { id: 'comercios', etiqueta: 'Comercios' },
  { id: 'colombia', etiqueta: 'Colombia' },
  { id: 'muro', etiqueta: 'Muro' },
];

/** Lo que la página lee del estado para pintar lo suyo. */
interface VistaPagina {
  opcion: string | null;
  eventos: ReadonlyArray<EventoEnVivo>;
  pedidos: ReadonlyArray<PedidoEnVivo>;
  etapas: ReadonlyArray<EtapaInfo>;
  ocultar: boolean;
  /** false si el comercio apagó a Opttia (D-386): sin panel ni narración. */
  opttiaActivo: boolean;
  /** Espacio que la escena deja libre para los paneles flotantes (null = ninguno). */
  margenes: Partial<MargenesEncuadre> | null;
}

/**
 * Pantalla "Katuq en vivo" (`/en-vivo/katuq`, solo administradores de Julsmind; D-386 tareas 4.6,
 * 4.8 y 4.9). Envuelve al shell `<app-en-vivo vista="katuq">` y le enchufa:
 *
 * - arriba: la cinta con todos los comercios;
 * - escena: el recuadro `.ev-escena-slot` con las vistas "Comercios" y "Colombia" (escenas 3D por
 *   enchufar) y el "Muro"; la ficha y, flotando en >= 1181 px, la carrera, el comercio del momento
 *   y la lista de eventos (si no, apilados debajo). "Ampliar" los quita;
 * - abajo: Opttia, radar, logros, tiempos, canales y ciudades.
 *
 * Tocar un comercio (carrera, cinta, muro, torre, respuesta de Opttia) emite `abrir-comercio`: la
 * ficha lo atiende y esta página navega a `/en-vivo?empresa=<empresa>` (un solo oyente). Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-katuq-pagina',
  templateUrl: './en-vivo-katuq-pagina.component.html',
  styleUrls: ['./en-vivo-katuq-pagina.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoKatuqPaginaComponent implements OnInit {
  readonly vm$: Observable<VistaPagina>;
  /** Panel de Opttia solo con el interruptor prendido (D-386). */
  readonly opttiaActivo$: Observable<boolean>;
  /** "Ampliar": sin paneles flotantes; la lista de eventos vuelve a su columna. */
  private readonly ampliadoSubject = new BehaviorSubject<boolean>(false);
  /** La vista elegida tiene escena 3D y esta sí se pudo montar (si no, Opttia no ofrece recorrido ni "Verlo en la escena"). */
  readonly conEscena$: Observable<boolean>;
  private readonly sin3d$ = new BehaviorSubject<boolean>(false);

  get ampliado(): boolean {
    return this.ampliadoSubject.value;
  }

  constructor(
    private readonly router: Router,
    estado: EnVivoEstadoService,
    private readonly interaccion: EnVivoInteraccionService,
    private readonly ficha: EnVivoFichaService,
    private readonly orbe: EnVivoOrbeService,
    private readonly host: ElementRef<HTMLElement>
  ) {
    this.vm$ = combineLatest([estado.estado$, estado.preferencias$, interaccion.opcionActiva$, this.ampliadoSubject, anchoFlotante$()]).pipe(
      map(([e, prefs, opcion, ampliado, ancho]) => ({
        opcion,
        eventos: e.eventos,
        pedidos: e.pedidos,
        etapas: e.etapas,
        ocultar: prefs.ocultar,
        opttiaActivo: e.opttiaActivo !== false,
        // "Comercio del momento" y la carrera flotan a la izquierda; los eventos, a la derecha.
        margenes: margenesEscena({ izquierda: true, derecha: true }, ancho && !ampliado && opcion !== 'muro'),
      }))
    );
    this.opttiaActivo$ = estado.estado$.pipe(map((e) => e.opttiaActivo !== false), distinctUntilChanged());
    this.conEscena$ = combineLatest([interaccion.opcionActiva$, this.sin3d$]).pipe(
      map(([opcion, sin3d]) => opcion !== 'muro' && !sin3d)
    );
  }

  ngOnInit(): void {
    // Antes de que el shell inicie: así su encabezado ya trae el selector y la vista guardada vuelve sola.
    this.interaccion.fijarOpciones(OPCIONES);
  }

  /** Los paneles flotan (y la lista sale de la columna) salvo en "Ampliar" y en el muro. */
  flotando(opcion: string | null): boolean {
    return !this.ampliado && opcion !== 'muro';
  }

  alternarAmpliado(): void {
    this.ampliadoSubject.next(!this.ampliadoSubject.value);
  }

  /** La escena avisó si pudo montar su vista 3D (sin WebGL el resto de la página sigue). */
  alDisponible3d(disponible: boolean): void {
    this.sin3d$.next(!disponible);
  }

  /** Un hito de los logros de Katuq: aviso con confeti (el shell lo atiende y nunca celebra al repetir el día). */
  celebrar(texto: string): void {
    this.interaccion.emitir({ tipo: 'celebrar', texto });
  }

  abrirPedido(abierto: EventoAbierto): void {
    this.interaccion.emitir({ tipo: 'abrir-pedido', pedidoId: abierto.pedidoId, empresa: abierto.empresa });
  }

  resaltarPedidos(ids: string[] | null): void {
    this.interaccion.emitir({ tipo: 'resaltar-pedidos', ids });
  }

  /** La ficha ya atendió `abrir-comercio` (cerró y avisó): aquí solo se navega. */
  alAbrirTablero(solicitud: TableroSolicitado): void {
    irAlTablero(this.router, this.ficha, solicitud);
  }

  // ── Opttia y las escenas ──────────────────────────────────────────────────
  /** Botón "Recorrido con Opttia" de la tarjeta: la cámara sigue al orbe por cada comercio con alerta y el que está en racha. */
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
