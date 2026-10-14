import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { IntegrationsService } from '../../../components/integrations/integrations.service';
import { opcionesDeFactura, ProveedorContable, resolverProveedorCon } from './facturacion-automatica.util';

export * from './facturacion-automatica.util';

/**
 * D-419 (ticket 1171): facturación electrónica automática de un pedido recién
 * creado, compartida por la venta asistida y el POS.
 *
 * - Resuelve el proveedor contable activo de la empresa en el mismo orden que
 *   la venta asistida: DIAN directo, Siigo, World Office.
 * - Encola la factura por la ruta asíncrona del backend
 *   (`POST /v1/accounting/:provider/invoices/from-order-async`), que responde
 *   202 de inmediato y tiene candado contra doble factura.
 */
@Injectable({ providedIn: 'root' })
export class FacturacionAutomaticaService {
  constructor(private integrationsService: IntegrationsService) {}

  /** Primer proveedor contable configurado de la empresa, o null si no hay. */
  resolverProveedor(): Observable<ProveedorContable | null> {
    return resolverProveedorCon((p) => this.integrationsService.getIntegration(p));
  }

  /**
   * Encola la factura del pedido con el proveedor dado. El backend responde
   * 202 y avisa el resultado (INVOICE_CREATED / INVOICE_FAILED) por las
   * notificaciones de la empresa.
   */
  encolar(proveedor: ProveedorContable, orderId: string): Observable<any> {
    return this.integrationsService.createAccountingInvoiceAsync(
      proveedor.provider,
      orderId,
      opcionesDeFactura(proveedor.config),
    );
  }
}
