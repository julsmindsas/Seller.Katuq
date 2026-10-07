/**
 * Ticket 1145 (ALMACEN BOMBAS): a quién sale la factura electrónica de un pedido.
 *
 * La ventana de facturar mostraba el cliente del pedido, pero el sistema contable
 * factura con la sección "Facturación" del pedido. BAS-000026 mostraba a Geronimo
 * y la factura salió a "Consumidor Final".
 *
 * Misma prioridad que el backend (accountingManager.createInvoiceFromOrder):
 * documento = facturacion.documento || cliente.documento;
 * nombre = facturacion.nombres || facturacion.nombreCompleto || cliente.nombres_completos || cliente.nombre.
 */

export const DOCUMENTO_CONSUMIDOR_FINAL = '222222222222';

export interface ClienteFactura {
  nombre: string;
  documento: string;
  tipoDocumento: string;
  esConsumidorFinal: boolean;
}

const limpiar = (valor: any): string => String(valor ?? '').trim();

/** Mismo criterio que crear-ventas y pedido-facturacion para reconocer al Consumidor Final. */
export function esConsumidorFinal(datos: any): boolean {
  if (!datos) return false;
  const documento = limpiar(datos.documento).replace(/[.\s-]/g, '');
  return (
    documento === DOCUMENTO_CONSUMIDOR_FINAL ||
    limpiar(datos.alias).toLowerCase() === 'consumidor final' ||
    limpiar(datos.nombres).toLowerCase() === 'consumidor final'
  );
}

export function clienteDeFactura(pedido: any): ClienteFactura {
  const facturacion = pedido?.facturacion || {};
  const cliente = pedido?.cliente || {};
  const documento = limpiar(facturacion.documento) || limpiar(cliente.documento);
  return {
    nombre:
      limpiar(facturacion.nombres) ||
      limpiar(facturacion.nombreCompleto) ||
      limpiar(cliente.nombres_completos) ||
      limpiar(cliente.nombre),
    documento,
    tipoDocumento: limpiar(facturacion.tipoDocumento) || limpiar(cliente.tipo_documento) || 'CC',
    esConsumidorFinal: limpiar(facturacion.documento) ? esConsumidorFinal(facturacion) : false,
  };
}

/**
 * La factura sale a Consumidor Final aunque el cliente del pedido tiene documento propio:
 * casi siempre es un error (al crear el pedido el cliente no tenía datos de facturación).
 */
export function facturaPorErrorAConsumidorFinal(pedido: any): boolean {
  const destino = clienteDeFactura(pedido);
  const documentoCliente = limpiar(pedido?.cliente?.documento).replace(/[.\s-]/g, '');
  return destino.esConsumidorFinal && !!documentoCliente && documentoCliente !== DOCUMENTO_CONSUMIDOR_FINAL;
}
