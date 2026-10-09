import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  NgZone,
  ViewEncapsulation,
} from '@angular/core';
import { EnVivoInteraccionService } from '../compartido/en-vivo-interaccion.service';
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { AlertaRadar, CifrasGlobalEnVivo, EstadoEnVivo, EventoEnVivo } from '../servicios/en-vivo.modelos';
import type { CiudadKatuqEscena } from './ciudad-katuq.escena';
import { ContextoMontaje, EnVivoEscenaBase } from './en-vivo-escena-base';
import { ToqueMapa } from './mapas.tipos';
import { EnVivoOrbeService } from './opttia-guia.service';
import type { IdEscenaOrbe } from './opttia-orbe';
import type { ObjetivoOrbe } from './opttia-puntos';

/**
 * Escena 3D "Ciudad Katuq" de toda la plataforma (D-386, 5.10 y 5.12): un edificio por comercio (los
 * 16 que más venden hoy) con su letrero "N pedidos hoy", una caja que cae en el techo con cada
 * pedido nuevo, motos y camiones que salen con cada envío y un anillo de alerta cuando el radar lo
 * señala. Se alimenta de `cifrasGlobal` y del radar del estado de toda Katuq y anima cada evento
 * global (`nuevos$`) sobre el comercio que lo tuvo. Tocar un edificio abre el tablero de ese
 * comercio (`abrir-comercio`). Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-escena-ciudad',
  templateUrl: './en-vivo-escena-comun.component.html',
  styleUrls: ['./en-vivo-escenas-mapa.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEscenaCiudadComponent extends EnVivoEscenaBase<CiudadKatuqEscena> {
  readonly etiquetaAria =
    'Escena 3D de una ciudad con un edificio por comercio de Katuq: crece con lo vendido hoy, recibe una caja con cada pedido nuevo y saca motos y camiones con cada envío. Las cifras, la carrera y la lista dicen lo mismo en texto.';

  private ultimasCifras: CifrasGlobalEnVivo | null = null;
  private ultimasAlertas: ReadonlyArray<AlertaRadar> | null = null;

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

  /** Anima un evento (lo usa "Repetir el día"); con `contar` también suma el pedido a su edificio. */
  aplicarEvento(evento: EventoEnVivo, contar = false): void {
    this.escena?.aplicarEvento(evento, contar);
  }

  /** Pone la escena al día con unas cifras (lo usa "Repetir el día" y las pruebas). */
  aplicarFoto(cifras: CifrasGlobalEnVivo, alertas?: ReadonlyArray<AlertaRadar> | null): void {
    this.escena?.aplicarFoto(cifras, alertas);
  }

  /** Vuelve a dejar la escena igual al estado real. */
  sincronizar(): void {
    const e = this.estadoSvc.estado;
    this.ultimasCifras = e.cifrasGlobal;
    this.ultimasAlertas = e.radar?.alertas ?? null;
    if (!this.escena) return;
    this.escena.fijarEtapas(e.etapas);
    if (e.vista === 'katuq' && e.cifrasGlobal) this.escena.aplicarFoto(e.cifrasGlobal, e.radar?.alertas ?? null);
  }

  /** Centro del lote de un comercio (suelo). Para el orbe (5.14) y la ficha. */
  posComercio(empresa: string) {
    return this.escena?.posComercio(empresa) ?? null;
  }

  // -------------------------------------------------------------- lo de la base

  protected readonly idOrbe: IdEscenaOrbe = 'ciudad';

  protected lugarOrbe(obj: ObjetivoOrbe) {
    const e = this.escena;
    return e && obj.tipo === 'comercio' ? e.posComercio(obj.id) : null;
  }

  protected async crear(c: ContextoMontaje): Promise<CiudadKatuqEscena> {
    const mod = await import('./ciudad-katuq.escena');
    return mod.CiudadKatuqEscena.crear(c.T, c.RB, c.opciones);
  }

  protected conectar(): void {
    this.sincronizar();
    this.subs.add(this.estadoSvc.estado$.subscribe((e) => this.alEstado(e)));
    this.subs.add(this.estadoSvc.nuevos$.subscribe((ev) => this.alEventoNuevo(ev)));
  }

  protected accionDeToque(t: ToqueMapa) {
    if (t.tipo !== 'comercio') return null;
    const nombre = this.estadoSvc.estado.cifrasGlobal?.comercios.find((c) => c.empresa === t.id)?.nombre ?? t.id;
    return { tipo: 'abrir-comercio', empresa: t.id, nombre } as const;
  }

  // ---------------------------------------------------------- estado y eventos

  private alEstado(e: EstadoEnVivo): void {
    if (!this.escena || e.vista !== 'katuq' || !e.cifrasGlobal) return;
    const alertas = e.radar?.alertas ?? null;
    if (e.cifrasGlobal === this.ultimasCifras && alertas === this.ultimasAlertas) return;
    if (this.repitiendo || this.pausada) {
      this.pendienteSync = true;
      this.ultimasCifras = e.cifrasGlobal;
      this.ultimasAlertas = alertas;
      return;
    }
    this.sincronizar();
  }

  private alEventoNuevo(ev: EventoEnVivo): void {
    if (!this.escena) return;
    if (this.pausada || this.repitiendo) { this.pendienteSync = true; return; }
    this.escena.aplicarEvento(ev);
  }
}
