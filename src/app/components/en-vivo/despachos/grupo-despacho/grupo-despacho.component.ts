import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EstadoApp, OpcionTransportadoraPlan, ResultadoGrupo, TarifaPlan, TipoGrupo } from '../plan-despachos.modelos';
import { dinero } from '../../utilidades/formato';

/** Un pedido del grupo, con la huella que se manda al aprobar. */
export interface PedidoEditable {
  id: string;
  nroPedido: string;
  porCobrar: number;
  zona: string;
  franja: string;
  huella: string;
  /** Tipo del grupo del que viene: uno sacado de un grupo de transportadora solo vuelve a uno de transportadora. */
  origen: TipoGrupo;
}

export interface OpcionMensajero {
  id: string;
  nombre: string;
  razon: string | null;
  app: EstadoApp;
}

/** Un grupo del plan tal como lo puede ajustar la persona antes de aprobar. */
export interface GrupoEditable {
  id: string;
  tipo: TipoGrupo;
  zona: string;
  /** null en los grupos de transportadora. */
  franja: string | null;
  urgente: boolean;
  pedidos: PedidoEditable[];
  mensajeroId: string | null;
  /** La transportadora elegida; null en los grupos de mensajero. */
  proveedor: string | null;
  /** La sugerida primero y luego las alternativas; vacío en los grupos de mensajero. */
  transportadoras: OpcionTransportadoraPlan[];
  frase: string | null;
}

/**
 * Tarjeta de un grupo del plan de despachos (D-410): franja, zona, el mensajero sugerido con su
 * razón (y las alternativas para cambiarlo con un toque), los pedidos y el botón Aprobar. En un
 * grupo "Por <transportadora>" (fase 2) muestra la transportadora con su tarifa y cada pedido sale
 * con su propia orden de envío. No llama al servidor: avisa a quien la contiene (la hoja "Ajustar" de
 * la tarjeta de Opttia, D-422), que es la que aprueba.
 */
@Component({
  selector: 'app-en-vivo-grupo-despacho',
  templateUrl: './grupo-despacho.component.html',
  styleUrls: ['./grupo-despacho.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EnVivoGrupoDespachoComponent {
  @Input() grupo!: GrupoEditable;
  @Input() numero = 1;
  /** Sugerido y alternativas primero; luego los demás mensajeros de la empresa. */
  @Input() opciones: ReadonlyArray<OpcionMensajero> = [];
  @Input() otrosGrupos: ReadonlyArray<{ id: string; etiqueta: string }> = [];
  @Input() puedeAprobar = false;
  @Input() bloqueado: string | null = null;
  @Input() aplicando = false;
  /** Hay una aprobación en curso (de este u otro grupo): las aprobaciones van de a una, nunca en paralelo. */
  @Input() ocupado = false;
  @Input() resultado: ResultadoGrupo | null = null;

  @Output() cambiarMensajero = new EventEmitter<string>();
  @Output() cambiarTransportadora = new EventEmitter<string>();
  @Output() sacar = new EventEmitter<PedidoEditable>();
  @Output() mover = new EventEmitter<{ pedido: PedidoEditable; destino: string }>();
  @Output() aprobar = new EventEmitter<void>();
  @Output() abrirPedido = new EventEmitter<string>();

  get esTransportadora(): boolean {
    return this.grupo.tipo === 'transportadora';
  }

  get mensajero(): OpcionMensajero | null {
    return this.opciones.find((o) => o.id === this.grupo.mensajeroId) ?? null;
  }

  get transportadora(): OpcionTransportadoraPlan | null {
    return this.grupo.transportadoras.find((t) => t.proveedor === this.grupo.proveedor) ?? null;
  }

  /** Mensajero: ya tiene a quién; transportadora: ya tiene cuál. */
  get conQuien(): boolean {
    return this.esTransportadora ? !!this.grupo.proveedor : !!this.grupo.mensajeroId;
  }

  get porCobrar(): number {
    return this.grupo.pedidos.reduce((s, p) => s + (p.porCobrar || 0), 0);
  }

  get aprobado(): boolean {
    return !!this.resultado && ['despachado', 'despachado-parcial', 'ya-aprobado', 'reanudado', 'en-curso'].includes(this.resultado.estado);
  }

  get puedeTocar(): boolean {
    return this.puedeAprobar && !this.bloqueado && !this.aplicando && !this.aprobado;
  }

  get textoResultado(): string {
    const r = this.resultado;
    if (!r) return '';
    if (this.esTransportadora) return this.textoResultadoTransportadora(r);
    const orden = r.nroShippingOrder ? ` en la orden ${r.nroShippingOrder}` : '';
    switch (r.estado) {
      case 'despachado':
        return `Despachado${orden}.`;
      case 'despachado-parcial':
        return `Salieron ${r.despachados?.length ?? 0}${orden}; ${r.fuera?.length ?? 0} quedaron por fuera.`;
      case 'reanudado':
        return `Se terminaron de despachar${orden}.`;
      case 'ya-aprobado':
      case 'en-curso':
        return r.razon || 'Ya estaba aprobado.';
      default:
        return r.razon || 'No se pudo despachar.';
    }
  }

  /** Cada pedido sale con su propia orden de envío: "Enviados a Cereza: 3 órdenes de envío (51, 52, 53)." */
  private textoResultadoTransportadora(r: ResultadoGrupo): string {
    const nombre = r.transportadora || this.transportadora?.nombre || 'la transportadora';
    const ordenes = r.nroShippingOrders?.length ? r.nroShippingOrders : r.nroShippingOrder ? [r.nroShippingOrder] : [];
    const salieron = r.despachados?.length ?? ordenes.length;
    const fuera = r.fuera?.length ?? 0;
    switch (r.estado) {
      case 'despachado': {
        const n = ordenes.length || salieron;
        const detalle = ordenes.length ? ` (${ordenes.join(', ')})` : '';
        return `${n === 1 ? 'Enviado' : 'Enviados'} a ${nombre}: ${n} ${n === 1 ? 'orden de envío' : 'órdenes de envío'}${detalle}.`;
      }
      case 'despachado-parcial': {
        const detalle = ordenes.length ? ` (${ordenes.length === 1 ? 'orden' : 'órdenes'} ${ordenes.join(', ')})` : '';
        return `${salieron === 1 ? 'Salió' : 'Salieron'} ${salieron} a ${nombre}${detalle}; ${fuera} ${fuera === 1 ? 'quedó' : 'quedaron'} por fuera.`;
      }
      case 'reanudado':
        return `Se terminaron de enviar a ${nombre}.`;
      case 'ya-aprobado':
      case 'en-curso':
        return r.razon || 'Ya estaba aprobado.';
      default:
        return r.razon || 'No se pudo enviar.';
    }
  }

  get tonoResultado(): string {
    const e = this.resultado?.estado;
    if (e === 'despachado' || e === 'reanudado') return 't-ok';
    if (e === 'despachado-parcial' || e === 'ya-aprobado' || e === 'en-curso') return 't-warn';
    return 't-bad';
  }

  /** Plata con el formato de En vivo ("$1.210.000"). */
  readonly dinero = dinero;

  /** El selector no repite la razón (va debajo): solo dice cuál es la sugerencia y cuáles las alternativas. */
  etiquetaOpcion(o: OpcionMensajero, i: number): string {
    if (!o.razon) return o.nombre;
    return i === 0 ? `${o.nombre} · sugerido` : `${o.nombre} · alternativa`;
  }

  elegir(id: string): void {
    if (id && id !== this.grupo.mensajeroId) this.cambiarMensajero.emit(id);
  }

  /** "Fija": la plata por pedido; "incluida" y "ninguna": el texto del servidor tal cual. */
  textoTarifa(t: TarifaPlan): string {
    if (t.tipo === 'fija' && typeof t.valor === 'number') return `${dinero(t.valor)} por pedido`;
    return t.texto || 'Sin tarifa';
  }

  /** Como con el mensajero: el selector dice cuál es la sugerida; la tarifa de la elegida va debajo. */
  etiquetaTransportadora(t: OpcionTransportadoraPlan, i: number): string {
    return i === 0 ? `${t.nombre} · sugerida` : `${t.nombre} · alternativa`;
  }

  elegirTransportadora(proveedor: string): void {
    if (proveedor && proveedor !== this.grupo.proveedor) this.cambiarTransportadora.emit(proveedor);
  }

  moverA(pedido: PedidoEditable, destino: string): void {
    if (destino) this.mover.emit({ pedido, destino });
  }

  trackPedido(_: number, p: PedidoEditable): string {
    return p.id;
  }

  trackOpcion(_: number, o: OpcionMensajero): string {
    return o.id;
  }

  trackTransportadora(_: number, t: OpcionTransportadoraPlan): string {
    return t.proveedor;
  }
}
