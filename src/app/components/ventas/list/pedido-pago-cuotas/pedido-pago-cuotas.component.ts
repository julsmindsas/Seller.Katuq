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

/** Alerta de pago que el servidor deja en `pedido.pagoTienda.alertas[]` (D-518). */
interface AlertaPago {
  tipo: string;
  referencia?: string;
  proveedor?: string;
  pagadoCon?: string;
  en?: string;
}

/** Una alerta lista para pintar: título corto y qué hacer. */
interface AvisoPago {
  clave: string;
  titulo: string;
  texto: string;
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
 * `pedido.pagoTienda` y no se pinta si el pedido no tuvo intentos con Addi o Sistecrédito.
 * Muestra el proveedor y cada intento (referencia, estado, fecha y monto aprobado) y, si
 * alguno quedó aprobado, dónde se anula o se devuelve: en esta fase se hace a mano en el
 * portal del proveedor, no desde Katuq.
 *
 * D-518: también las alertas de pago que deja el servidor (`pagoTienda.alertas`), sobre
 * todo la de DOBLE COBRO (dos créditos, o crédito y Wompi, para el mismo pedido): el
 * comercio es quien anula el sobrante. El bloque sigue visible si el comprador terminó
 * pagando con Wompi desde «pagar» (`pagoTienda.proveedor` pasa a "wompi").
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
    const pago = (valor && valor.pagoTienda) || {};
    const deCuotas: IntentoCuotas[] = Array.isArray(pago.intentos)
      ? pago.intentos.filter((i: IntentoCuotas) => !!i && !!i.referencia && this.esProveedor(i.proveedor))
      : [];
    const ultimo = deCuotas.length ? deCuotas[deCuotas.length - 1].proveedor : null;
    const proveedor = this.esProveedor(pago.proveedor) ? pago.proveedor : ultimo;
    this.proveedor = this.esProveedor(proveedor) ? proveedor : null;
    const intentos: IntentoCuotas[] = this.proveedor ? deCuotas : [];
    // El más reciente arriba: es el que decide el estado del pago.
    this.intentos = intentos
      .map((intento, orden) => ({ intento, orden }))
      .sort((a, b) => this.tiempo(b.intento) - this.tiempo(a.intento) || b.orden - a.orden)
      .map((x) => x.intento);
    this.hayAprobado = this.intentos.some((i) => i.estado === 'Aprobado');
    this.pasoAWompi = !!this.proveedor && pago.proveedor === 'wompi';
    const alertas: AlertaPago[] = this.proveedor && Array.isArray(pago.alertas) ? pago.alertas : [];
    this.avisos = alertas.filter((a) => !!a && !!a.tipo).map((a, i) => this.aviso(a, i));
  }

  proveedor: ProveedorCuotas | null = null;
  intentos: IntentoCuotas[] = [];
  hayAprobado = false;
  /** El comprador dejó las cuotas y pagó (o está pagando) el mismo pedido con Wompi. */
  pasoAWompi = false;
  avisos: AvisoPago[] = [];

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

  trackByAviso(_: number, aviso: AvisoPago): string {
    return aviso.clave;
  }

  private esProveedor(valor: unknown): valor is ProveedorCuotas {
    return valor === 'addi' || valor === 'sistecredito';
  }

  /** Nombre del proveedor de una referencia de intento; Wompi si no es `CUO-…`. */
  private medioDe(referencia: string | undefined, proveedor?: string): string {
    if (!referencia || !referencia.startsWith('CUO-')) return 'Wompi';
    return this.esProveedor(proveedor) ? PROVEEDORES[proveedor].nombre : this.nombre;
  }

  private aviso(a: AlertaPago, i: number): AvisoPago {
    const ref = a.referencia || '';
    const clave = `${a.tipo}-${ref}-${i}`;
    switch (a.tipo) {
      case 'doble_aprobacion': {
        const sobrante = this.medioDe(ref, a.proveedor);
        const donde = sobrante === 'Wompi' ? 'en tu cuenta de Wompi' : `en el portal de ${sobrante}`;
        return {
          clave,
          titulo: 'Doble cobro',
          texto: `Este pedido ya estaba pagado (${a.pagadoCon || 'otro pago'}) y ${sobrante} aprobó también ${ref}. Anula o devuelve ese cobro ${donde}.`,
        };
      }
      case 'monto_distinto':
        return { clave, titulo: 'Monto distinto', texto: `${this.nombre} aprobó ${ref} por un valor distinto al del pedido. El pago no se aplicó: revísalo con ${this.nombre}.` };
      case 'aprobado_sobre_anulado':
        return { clave, titulo: 'Pago sobre un pedido anulado', texto: `Entró el pago ${ref} con el pedido anulado. Decide si lo despachas o anulas el crédito en el portal de ${this.nombre}.` };
      case 'consulta_no_coincide':
        return { clave, titulo: 'Consulta que no coincide', texto: `La respuesta de ${this.nombre} para ${ref} no coincide con el pedido. El pago no se aplicó: revísalo con ${this.nombre}.` };
      case 'estado_desconocido':
        return { clave, titulo: 'Estado desconocido', texto: `${this.nombre} informó un estado que no reconocemos para ${ref}. El pedido no cambió.` };
      default:
        return { clave, titulo: 'Alerta de pago', texto: ref ? `Revisa el pago ${ref} con ${this.nombre}.` : `Revisa el pago con ${this.nombre}.` };
    }
  }

  private tiempo(intento: IntentoCuotas): number {
    const t = Date.parse(intento.creadoEn || intento.actualizadoEn || '');
    return Number.isFinite(t) ? t : 0;
  }
}
