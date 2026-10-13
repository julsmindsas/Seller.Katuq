import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { EstadoApp, ResultadoGrupo } from '../plan-despachos.modelos';
import { dinero } from '../../utilidades/formato';

/** Un pedido del grupo, con la huella que se manda al aprobar. */
export interface PedidoEditable {
  id: string;
  nroPedido: string;
  porCobrar: number;
  zona: string;
  franja: string;
  huella: string;
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
  zona: string;
  franja: string;
  urgente: boolean;
  pedidos: PedidoEditable[];
  mensajeroId: string | null;
  frase: string | null;
}

/**
 * Tarjeta de un grupo del plan de despachos (D-410): franja, zona, el mensajero sugerido con su
 * razón (y las alternativas para cambiarlo con un toque), los pedidos y el botón Aprobar. No llama
 * al servidor: avisa a la vista Despachos, que es la que aprueba.
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
  @Input() resultado: ResultadoGrupo | null = null;

  @Output() cambiarMensajero = new EventEmitter<string>();
  @Output() sacar = new EventEmitter<PedidoEditable>();
  @Output() mover = new EventEmitter<{ pedido: PedidoEditable; destino: string }>();
  @Output() aprobar = new EventEmitter<void>();
  @Output() abrirPedido = new EventEmitter<string>();

  get mensajero(): OpcionMensajero | null {
    return this.opciones.find((o) => o.id === this.grupo.mensajeroId) ?? null;
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

  moverA(pedido: PedidoEditable, destino: string): void {
    if (destino) this.mover.emit({ pedido, destino });
  }

  trackPedido(_: number, p: PedidoEditable): string {
    return p.id;
  }

  trackOpcion(_: number, o: OpcionMensajero): string {
    return o.id;
  }
}
