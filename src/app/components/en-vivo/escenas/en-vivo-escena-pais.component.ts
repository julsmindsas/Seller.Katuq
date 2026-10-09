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
import { EnVivoEstadoService } from '../servicios/en-vivo-estado.service';
import { AlertaRadar, CifrasGlobalEnVivo, EstadoEnVivo, EventoEnVivo } from '../servicios/en-vivo.modelos';
import { ContextoMontaje, EnVivoEscenaBase } from './en-vivo-escena-base';
import { leerTokens } from './escena-tokens';
import { ToqueMapa } from './mapas.tipos';
import { EnVivoOrbeService } from './opttia-guia.service';
import type { IdEscenaOrbe } from './opttia-orbe';
import type { ObjetivoOrbe } from './opttia-puntos';
import type { PaisKatuqEscena } from './pais-katuq.escena';
import { coloresDeLeyenda } from './pais.utilidades';

/**
 * Escena 3D "Katuq en Colombia" de toda la plataforma (D-386, 5.10 y 5.12): una torre por comercio
 * que crece con lo vendido hoy, el calor de pedidos por departamento con su leyenda, anillos de
 * alerta, a lo sumo 3 tarjetas y nombres fijos solo de los comercios líderes. Se alimenta de
 * `cifrasGlobal` y del radar del estado de toda Katuq (`vista: 'katuq'`) y anima cada evento global
 * (`nuevos$`) sobre el comercio que lo tuvo. Tocar una torre abre el tablero de ese comercio
 * (`abrir-comercio`). "Ocultar comercios y montos" dice "Comercio en <ciudad>". Solo lectura.
 */
@Component({
  selector: 'app-en-vivo-escena-pais',
  templateUrl: './en-vivo-escena-comun.component.html',
  styleUrls: ['./en-vivo-escenas-mapa.component.scss'],
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoEscenaPaisComponent extends EnVivoEscenaBase<PaisKatuqEscena> {
  /** Muestra la leyenda del mapa de demanda por departamento (abajo a la izquierda). */
  @Input() leyenda = true;

  readonly etiquetaAria =
    'Mapa 3D de Colombia con todos los comercios de Katuq: una torre por comercio que crece con lo vendido hoy y departamentos más oscuros donde hay más pedidos. Las cifras, la carrera y la lista dicen lo mismo en texto.';

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

  /** Anima un evento (lo usa "Repetir el día"); con `contar` también suma el pedido a su torre y al calor. */
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

  /** Pie de la torre de un comercio (mundo). Para el orbe (5.14) y la ficha. */
  posComercio(empresa: string) {
    return this.escena?.posComercio(empresa) ?? null;
  }

  posCiudad(dane: string) {
    return this.escena?.posCiudad(dane) ?? null;
  }

  // -------------------------------------------------------------- lo de la base

  protected readonly idOrbe: IdEscenaOrbe = 'pais';

  protected lugarOrbe(obj: ObjetivoOrbe) {
    const e = this.escena;
    if (!e) return null;
    if (obj.tipo === 'comercio') return e.posComercio(obj.id);
    if (obj.tipo === 'ciudad') return e.posCiudad(obj.id);
    return null;
  }

  protected async crear(c: ContextoMontaje): Promise<PaisKatuqEscena> {
    const mod = await import('./pais-katuq.escena');
    return mod.PaisKatuqEscena.crear(c.T, c.RB, c.opciones);
  }

  protected override alMontar(): void {
    this.pintarLeyenda();
  }

  protected override alRetemar(): void {
    this.pintarLeyenda();
  }

  protected override alCambiarEntradas(cambios: SimpleChanges): void {
    if (cambios['leyenda'] && this.escena) this.pintarLeyenda();
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

  /** La leyenda sale de los mismos colores del tema que usa el mapa (tierra y acento). */
  private pintarLeyenda(): void {
    const tokens = leerTokens(this.host.nativeElement);
    this.zona.run(() => {
      this.coloresLeyenda = this.leyenda ? coloresDeLeyenda(tokens['map-land'], tokens['accent']) : [];
      this.cdr.markForCheck();
    });
  }

  // ---------------------------------------------------------- estado y eventos

  /** Cifras o alertas nuevas: la escena se pone al día (crece lo que creció; no reinicia nada). */
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
