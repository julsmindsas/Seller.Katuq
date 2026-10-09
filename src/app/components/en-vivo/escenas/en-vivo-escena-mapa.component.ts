import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  NgZone,
  SimpleChanges,
  ViewEncapsulation,
} from '@angular/core';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { diaDeColombia } from '../servicios/en-vivo-reglas';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { EstadoEnVivo, EventoEnVivo, PedidoEnVivo } from '../servicios/en-vivo.modelos';
import { ContextoMontaje, EnVivoEscenaBase } from './en-vivo-escena-base';
import { ToqueMapa } from './mapas.tipos';
import { EnVivoOrbeService } from './opttia-guia.service';
import type { IdEscenaOrbe } from './opttia-orbe';
import type { ObjetivoOrbe } from './opttia-puntos';
import type { MapaEnVivoEscena } from './mapa-en-vivo.escena';
import { resolverDane } from './pais.utilidades';

/**
 * Escena 3D "Mi país" del comercio (D-386, 5.3): el mapa de Colombia con una columna por ciudad que
 * crece con los pedidos de hoy, un pulso en la ciudad de cada pedido nuevo, un arco desde la ciudad
 * de la bodega hasta la del cliente cuando sale y un pulso verde con confeti al entregar.
 *
 * Alimenta la escena con `EnVivoEstadoService`: la foto se coloca sin animar (al cargar, al
 * reconectar, al volver a la pestaña) y cada evento en vivo (`nuevos$`) se anima. Tocar una ciudad
 * abre la lista de sus pedidos (`abrir-lista` con `ciudad:<dane>`). Degrada sin romper: sin WebGL
 * muestra el aviso y deja las cifras y la lista en vivo; con "reducir movimiento" no hay arcos ni
 * confeti; con la pestaña oculta se pausa SIN perder eventos. Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-escena-mapa',
  templateUrl: './en-vivo-escena-comun.component.html',
  styleUrls: ['./en-vivo-escenas-mapa.component.scss'],
  // Sin encapsulación: las etiquetas HTML las crea la escena (ver la hoja de estilos).
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEscenaMapaComponent extends EnVivoEscenaBase<MapaEnVivoEscena> {
  /** Ciudad de la bodega (código DANE o nombre): de ahí salen los arcos. Sin ella se toma la ciudad con más pedidos hoy. */
  @Input() ciudadBodega: string | null = null;
  /** true = "Tu bodega" (el comercio mira lo suyo); false = "Bodega" (Katuq mira a un comercio). */
  @Input() bodegaPropia = true;

  readonly etiquetaAria =
    'Mapa 3D de Colombia con los pedidos de hoy: una columna por ciudad, un pulso con cada pedido nuevo y un arco por cada envío. Las cifras y la lista dicen lo mismo en texto.';

  private ultimaFoto: number | null = null;

  constructor(
    zona: NgZone,
    cdr: ChangeDetectorRef,
    host: ElementRef<HTMLElement>,
    estado: EnVivoEstadoService,
    interaccion: EnVivoInteraccionService,
    orbe: EnVivoOrbeService
  ) {
    super(zona, cdr, host, estado, interaccion, orbe);
  }

  // ------------------------------------------------------ API para quien la integra

  /** Coloca estos pedidos sin animar (lo usa "Repetir el día" para mostrar el día simulado). `dia` = día de Colombia (AAAA-MM-DD). */
  aplicarFoto(pedidos: ReadonlyArray<PedidoEnVivo>, dia: string): void {
    this.escena?.aplicarFoto(pedidos, dia);
  }

  /** Anima un evento (lo usa "Repetir el día": los eventos simulados no pasan por el estado). */
  aplicarEvento(evento: EventoEnVivo): void {
    this.escena?.aplicarEvento(evento);
  }

  /** Vuelve a dejar la escena igual al estado real. */
  sincronizar(): void {
    const e = this.estadoSvc.estado;
    this.ultimaFoto = e.actualizadoEn;
    if (!this.escena) return;
    this.escena.fijarEtapas(e.etapas);
    this.escena.aplicarFoto(e.pedidos, e.cifras?.dia ?? diaDeColombia(Date.now()));
  }

  /** Posición (mundo) de una ciudad; null si no está a la vista. Para el orbe (5.14) y la ficha. */
  posCiudad(dane: string) {
    return this.escena?.posCiudad(dane) ?? null;
  }

  /** Dónde se dibuja un pedido de hoy (su ciudad). */
  posPedido(id: string) {
    return this.escena?.posPedido(id) ?? null;
  }

  posBodega() {
    return this.escena?.posBodega() ?? null;
  }

  // -------------------------------------------------------------- lo de la base

  protected readonly idOrbe: IdEscenaOrbe = 'mapa';

  /** Comercio mirando su país: lo de la operación (pedido, mensajero, estación) cae en la ciudad del pedido o en la bodega. */
  protected lugarOrbe(obj: ObjetivoOrbe) {
    const e = this.escena;
    if (!e) return null;
    switch (obj.tipo) {
      case 'pedido': return e.posPedido(obj.id) ?? e.posBodega();
      case 'ciudad': return e.posCiudad(obj.id);
      case 'veh':
      case 'estacion': return e.posBodega();
      default: return null;
    }
  }

  protected async crear(c: ContextoMontaje): Promise<MapaEnVivoEscena> {
    const mod = await import('./mapa-en-vivo.escena');
    return mod.MapaEnVivoEscena.crear(c.T, c.RB, c.opciones);
  }

  protected conectar(escena: MapaEnVivoEscena): void {
    this.aplicarOrigen(escena);
    this.sincronizar();
    this.subs.add(this.estadoSvc.estado$.subscribe((e) => this.alEstado(e)));
    this.subs.add(this.estadoSvc.nuevos$.subscribe((ev) => this.alEventoNuevo(ev)));
  }

  protected override alCambiarEntradas(cambios: SimpleChanges): void {
    if ((cambios['ciudadBodega'] || cambios['bodegaPropia']) && this.escena) {
      this.aplicarOrigen(this.escena);
      this.sincronizar();
    }
  }

  protected accionDeToque(t: ToqueMapa) {
    return t.tipo === 'ciudad' ? ({ tipo: 'abrir-lista', clave: 'ciudad:' + t.id } as const) : null;
  }

  private aplicarOrigen(escena: MapaEnVivoEscena): void {
    const dane = this.ciudadBodega && this.geo ? resolverDane(this.geo, this.ciudadBodega, this.ciudadBodega) : null;
    escena.fijarOrigen(dane, this.bodegaPropia);
  }

  // ---------------------------------------------------------- estado y eventos

  /** Una foto nueva (carga, reconexión, sondeo) deja la escena igual al estado; lo demás llega por `nuevos$`. */
  private alEstado(e: EstadoEnVivo): void {
    if (!this.escena || !e.cargado || e.actualizadoEn === this.ultimaFoto) return;
    if (this.repitiendo || this.pausada) { this.pendienteSync = true; this.ultimaFoto = e.actualizadoEn; return; }
    this.sincronizar();
  }

  private alEventoNuevo(ev: EventoEnVivo): void {
    if (!this.escena) return;
    if (this.pausada || this.repitiendo) { this.pendienteSync = true; return; }
    this.escena.aplicarEvento(ev);
  }
}
