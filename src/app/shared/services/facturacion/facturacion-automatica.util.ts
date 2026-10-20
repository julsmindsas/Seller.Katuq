import { Observable, of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';

/**
 * D-419 (ticket 1171): lógica pura de la facturación automática (sin Angular),
 * compartida por la venta asistida y el POS. La usa FacturacionAutomaticaService.
 */

export type ProveedorContableId = 'dian' | 'siigo' | 'world_office';

export interface ProveedorContable {
  provider: ProveedorContableId;
  nombre: string;
  config: any;
  /** La empresa tiene activada la facturación automática en su configuración. */
  autoFacturacion: boolean;
}

export const ORDEN_PROVEEDORES: ProveedorContableId[] = ['dian', 'siigo', 'world_office'];

const NOMBRES: Record<string, string> = {
  siigo: 'Siigo',
  world_office: 'World Office',
  dian: 'DIAN directo',
  alegra: 'Alegra',
};

export function nombreProveedor(provider: string | null | undefined): string {
  return (provider && NOMBRES[provider]) || 'Sistema Contable';
}

/**
 * Lee la respuesta de `getIntegration(provider)` y decide si el proveedor está
 * configurado y si tiene la facturación automática activa. Misma regla que
 * `CrearVentasComponent.cargarConfiguracionSiigo`.
 */
export function evaluarProveedor(provider: ProveedorContableId, response: any): ProveedorContable | null {
  const config = response?.config || response?.credentials;
  const activo = !!(response?.enabled || response?.config?.status === 'active');
  let configurado = false;
  let autoFacturacion = false;

  if (provider === 'siigo') {
    configurado = activo && !!config?.username;
    autoFacturacion = config?.enableAutoInvoicing === true || config?.facturacionAutomatica === true;
  } else if (provider === 'world_office') {
    configurado = activo && !!(config?.apiToken || config?.idEmpresa);
    autoFacturacion = config?.enableAutoInvoicing === true || config?.facturacionAutomatica === true;
  } else if (provider === 'dian') {
    configurado = activo && !!config?.issuer?.nit && !!config?.environment;
    autoFacturacion = config?.enableAutoInvoicing === true;
  }

  return configurado ? { provider, nombre: nombreProveedor(provider), config, autoFacturacion } : null;
}

/** Opciones de la factura que salen de la configuración del proveedor. */
export function opcionesDeFactura(config: any): any {
  const opciones: any = {};
  if (config?.documentTypeId) opciones.documentTypeId = config.documentTypeId;
  if (config?.defaultPaymentTypeId) opciones.paymentTypeId = config.defaultPaymentTypeId;
  if (config?.costCenterId) opciones.costCenterId = config.costCenterId;
  if (config?.sellerId) opciones.sellerId = config.sellerId;
  return opciones;
}

/** D-500: tipos de documento que decide el servidor (`resolveInvoicingProvider`). */
export type TipoDocumentoFactura = 'orderInvoice' | 'posInvoice' | 'manualInvoice';

/** Respuesta de `GET /v1/accounting/invoicing/resolve`. */
export interface ResolucionServidor {
  provider: ProveedorContableId | null;
  source: 'choice' | 'legacyOrder' | 'originalInvoice' | 'none';
  reason: { code: string; message: string } | null;
}

/** Proveedor con el motivo cuando no hay uno que se pueda usar. */
export interface ProveedorResuelto {
  proveedor: ProveedorContable | null;
  motivo: string | null;
}

const MOTIVO_SIN_CONFIGURACION = 'No se pudo leer la configuración del proveedor de facturación. Intenta de nuevo.';

/**
 * D-500 (decisión 12), con la bandera `invoicingHub`: el servidor decide el proveedor y aquí se
 * arma el mismo `ProveedorContable` de hoy con su configuración (`evaluarProveedor`). Si el
 * servidor no da proveedor, NO se prueba otro: se devuelve null con su motivo.
 */
export function resolverConServidor(
  resolve$: Observable<ResolucionServidor>,
  getIntegration: (p: string) => Observable<any>,
): Observable<ProveedorResuelto> {
  return resolve$.pipe(
    switchMap((r) => {
      if (!r || !r.provider) {
        return of({ proveedor: null, motivo: r?.reason?.message || 'No hay un proveedor de facturación disponible.' });
      }
      const provider = r.provider;
      return getIntegration(provider).pipe(
        map((integracion: any) => evaluarProveedor(provider, integracion)),
        catchError(() => of(null)),
        map((proveedor) => (proveedor ? { proveedor, motivo: null } : { proveedor: null, motivo: MOTIVO_SIN_CONFIGURACION })),
      );
    }),
    catchError(() => of({ proveedor: null, motivo: 'No se pudo consultar el proveedor de facturación. Intenta de nuevo.' })),
  );
}

/**
 * Primer proveedor contable configurado, probando en ORDEN_PROVEEDORES.
 * `getIntegration` es el de IntegrationsService (inyectable para pruebas).
 */
export function resolverProveedorCon(getIntegration: (p: string) => Observable<any>): Observable<ProveedorContable | null> {
  const probar = (i: number): Observable<ProveedorContable | null> => {
    if (i >= ORDEN_PROVEEDORES.length) return of(null);
    const provider = ORDEN_PROVEEDORES[i];
    return getIntegration(provider).pipe(
      map((r: any) => evaluarProveedor(provider, r)),
      catchError(() => of(null)),
      switchMap((p) => (p ? of(p) : probar(i + 1))),
    );
  };
  return probar(0);
}
