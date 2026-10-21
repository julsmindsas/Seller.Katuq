import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

/** Proveedores de pago a cuotas de la tienda en línea (D-517). */
type ProveedorCuotas = 'addi' | 'sistecredito';

/** Estado normalizado de un intento, tal como lo guarda el servidor. */
type EstadoIntento = 'Iniciando' | 'Pendiente' | 'Aprobado' | 'Rechazado' | 'Fallido' | 'Desconocido';

/** Un intento de pago a cuotas (`pedido.pagoTienda.intentos[]`). */
interface IntentoCuotas {
  referencia: string;
  proveedor: string;
  estado: EstadoIntento | string;
  estadoProveedor?: string;
  transaccionId?: string;
  monto: number;
  montoAprobado?: number;
  creadoEn: string;
  actualizadoEn: string;
}

const PROVEEDORES: Record<ProveedorCuotas, { nombre: string; portal: string }> = {
  addi: {
    nombre: 'Addi',
    portal: 'Para anular o devolver, hazlo en el portal de aliados de Addi.',
  },
  sistecredito: {
    nombre: 'Sistecrédito',
    portal: 'Para anular o devolver, hazlo en el portal Credinet de Sistecrédito.',
  },
};

/** Estado del intento → par semántico del tema (openspec/specs/design-system). */
const TONO_ESTADO: Record<string, 'ok' | 'espera' | 'mal' | 'neutro'> = {
  Aprobado: 'ok',
  Iniciando: 'espera',
  Pendiente: 'espera',
  Rechazado: 'mal',
  Fallido: 'mal',
  Desconocido: 'neutro',
};

/**
 * Pago a cuotas de un pedido de tienda (D-517, ticket 1233). Solo presentación: lee
 * `pedido.pagoTienda` y no se pinta si el pedido no se pagó con Addi o Sistecrédito.
 * Muestra el proveedor y cada intento (referencia, estado, fecha y monto aprobado) y, si
 * alguno quedó aprobado, dónde se anula o se devuelve: en esta fase se hace a mano en el
 * portal del proveedor, no desde Katuq.
 */
@Component({
  selector: 'app-pedido-pago-cuotas',
  templateUrl: './pedido-pago-cuotas.component.html',
  styleUrls: ['./pedido-pago-cuotas.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PedidoPagoCuotasComponent {
  /** El pedido completo; con OnPush basta, porque el detalle cambia de objeto al elegir otro pedido. */
  @Input() set pedido(valor: any) {
    const pago = valor && valor.pagoTienda;
    const proveedor = pago && pago.proveedor;
    this.proveedor = proveedor === 'addi' || proveedor === 'sistecredito' ? proveedor : null;
    const intentos: IntentoCuotas[] = this.proveedor && Array.isArray(pago.intentos)
      ? pago.intentos.filter((i: IntentoCuotas) => !!i && !!i.referencia)
      : [];
    // El más reciente arriba: es el que decide el estado del pago.
    this.intentos = intentos
      .map((intento, orden) => ({ intento, orden }))
      .sort((a, b) => this.tiempo(b.intento) - this.tiempo(a.intento) || b.orden - a.orden)
      .map((x) => x.intento);
    this.hayAprobado = this.intentos.some((i) => i.estado === 'Aprobado');
  }

  proveedor: ProveedorCuotas | null = null;
  intentos: IntentoCuotas[] = [];
  hayAprobado = false;

  get nombre(): string {
    return this.proveedor ? PROVEEDORES[this.proveedor].nombre : '';
  }

  get notaPortal(): string {
    return this.proveedor ? PROVEEDORES[this.proveedor].portal : '';
  }

  tono(estado: string): string {
    return TONO_ESTADO[estado] || 'neutro';
  }

  /** Fecha del último cambio del intento (o la de creación si nunca cambió). */
  fecha(intento: IntentoCuotas): string | null {
    return intento.actualizadoEn || intento.creadoEn || null;
  }

  /** Texto del estado que reportó el proveedor, para quien atiende soporte. */
  detalleEstado(intento: IntentoCuotas): string | null {
    return intento.estadoProveedor ? `Estado en ${this.nombre}: ${intento.estadoProveedor}` : null;
  }

  trackByReferencia(_: number, intento: IntentoCuotas): string {
    return intento.referencia;
  }

  private tiempo(intento: IntentoCuotas): number {
    const t = Date.parse(intento.creadoEn || intento.actualizadoEn || '');
    return Number.isFinite(t) ? t : 0;
  }
}
