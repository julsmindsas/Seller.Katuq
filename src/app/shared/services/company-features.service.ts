import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { distinctUntilChanged, map } from 'rxjs/operators';
import { SecurityService } from './security/security.service';

/**
 * Banderas de función por comercio (contrato común de las funciones nuevas).
 * Mismos nombres que `FEATURE_FLAG_NAMES` del backend
 * (functions/services/companyFeatureFlags.js): si se suma una, va en los dos.
 */
export const COMPANY_FEATURE_FLAGS = [
  'productFromPhoto',
  'productImportPhotos',
  'buyNowCod',
  'whatsappCartRecovery',
  'whatsappOrderConfirmation',
  'enviameCodGuide',
  'singleStepStore',
  'landingPrompt',
  'product3d',
  'pickingAlistamiento',
  // Opttia organiza los despachos y una persona aprueba, en En vivo (D-410).
  'despachosOpttia',
  // Opttia propone en la escena, fase 2 (D-422): pasar a En producción con aprobación de una persona.
  'opttiaProduccion',
  // Opttia propone en la escena, fase 2 (D-422): "Abrir WhatsApp" en la señal de cobro (no envía nada).
  'opttiaCobroWhatsapp',
  // Varios números de WhatsApp por comercio, asignados a vendedores, y dueño del chat (D-437).
  // Dueño: Daniel. Se retira 30 días después de tenerla encendida para todos.
  'whatsappMultiNumero',
  // Agenda de servicios (D-491): citas, horario y personas que atienden. Dueño: Daniel.
  // Se retira el 2027-03-31: encendida para todos o eliminada.
  'serviceAgenda',
  // Módulo NPS por comercio (D-490): encuestas, resultados y seguimiento. Dueño: Daniel.
  // Revisión el 2027-01-31: encendida para todos o eliminada.
  'npsModulo',
  // Plantillas de sitio que nacen apagadas (D-385, ticket 1257): producto único para pauta y
  // «Tecnología / catálogo grande». Dueño: Daniel. Se retiran el 2027-03-31.
  'singleProductTemplate',
  'techCatalogTemplate',
  // Atributos por categoría (D-495, ticket 1234): esquemas en Maestros y pestaña "Especificaciones".
  // Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
  'categoryAttributes',
  // Fotos uniformes del producto (D-501, ticket 1252). Dueño: Daniel. Se retira el 2027-04-30.
  'productPhotoUniform',
  // Quitar el fondo con IA al uniformar fotos (D-518 TX-37·6, ticket 1252, fase 2). Exige
  // productPhotoUniform (COMPANY_FEATURE_REQUIRES): sola no prende. Dueño: Daniel. Se retira el
  // 2027-06-30: encendida para todos o eliminada.
  'productPhotoBackground',
  // SIIGO: facturar con el producto equivalente en vez de crear otro (D-504, ticket 1229).
  // Solo donde se comprobó la regla (ALMACEN BOMBAS). Dueño: Daniel. Se revisa el 2027-04-30.
  'siigoProductEquivalence',
  // Traer mi tienda desde Shopify o WooCommerce (D-498, ticket 1245). Solo a mano, primero en
  // FLORECER y nunca en OH MY STORE. Dueño: Daniel. Se retira el 2027-03-31.
  'storeMigrationImport',
  // Clientes traídos con su autorización de correo (F5-30, D-531). Apagada hasta el concepto legal
  // (tarea 0.7): sin ella los clientes entran sin suscripción. Dueño: Daniel. Se retira el 2027-03-31.
  'storeMigrationCustomerConsent',
  // Facturación electrónica en Integraciones (D-500, ticket 1260, FE-01): tarjeta única, elección
  // del proveedor y resolvedor del servidor. Dueño: Daniel. Se retira el 2027-03-31.
  'invoicingHub',
  // La factura automática al aprobar el pago sigue la elección (D-500). Dueño: Daniel. Se retira el 2027-03-31.
  'invoicingAutoFollowsChoice',
  // Stock de Katuq a WooCommerce: ventas, POS y despachos actualizan la tienda (D-515).
  // Se enciende a mano, primero en una empresa de prueba. Dueño: Daniel. Se revisa el 2027-04-30.
  'wooStockPublish',
  // Pago a cuotas en la tienda en línea con Addi y Sistecrédito (D-517, ticket 1233): cada comercio
  // con su convenio y sus credenciales. Dueño: Daniel. Se retira el 2027-04-30.
  'storeInstallmentPayments',
  // Un envío, una clave (D-499 fase 0, FE-03). Dueño: Daniel. Se retira el 2027-03-31.
  'invoiceIdempotency',
  // Bandeja única de facturación (D-499 fase 1, FE-02). Dueño: Daniel. Se retira el 2027-03-31.
  'invoicingTray',
  // La tienda en el celular (TX-34, D10): una bandera por pieza; el modo lo pone el interruptor
  // general `config/feature_flags.storeMobile`. No nacen encendidas para empresas nuevas.
  // Dueño: Daniel. Cada una se retira 30 días después de quedar su pieza para todas las tiendas.
  'storeLightIndex',
  'storeSmartSearch',
  'storeSalesRanking',
  'storePaymentRetry',
  'storeDrawer',
  'storeShippingEstimate',
  // Bot de WhatsApp con pedido directo, atención y seguimiento (ticket F4-40, D-531): mismos nombres
  // que el backend; la llave general vive en `config/feature_flags`. Nacen apagadas.
  // Dueño: Daniel. Se revisan el 2027-04-30.
  'whatsappBotDirectOrder',
  'whatsappBotAttention',
  'whatsappBotFollowUp',
] as const;

export type CompanyFeatureFlag = typeof COMPANY_FEATURE_FLAGS[number];

/**
 * Banderas que exigen otras (mismo `FEATURE_FLAG_REQUIRES` del backend): solo cuentan como
 * prendidas si cada una de sus requeridas también vale exactamente `true`. Las demás no tienen
 * requisitos.
 */
export const COMPANY_FEATURE_REQUIRES: Readonly<Partial<Record<CompanyFeatureFlag, readonly CompanyFeatureFlag[]>>> = Object.freeze({
  productPhotoBackground: Object.freeze(['productPhotoUniform'] as const),
});

/**
 * ¿Tiene la empresa activa prendida una función nueva?
 *
 * Toda función nueva nace APAGADA para los comercios que ya operan y se prende
 * por comercio (campo `featureFlags` del documento de la empresa). Ausente, o
 * con cualquier valor distinto del booleano `true`, la bandera está apagada.
 *
 * De dónde sale: `currentCompany` en localStorage, la empresa completa que el
 * login guarda con `SecurityService.setCompanyInformationLogged`. El mapeo de
 * `SecurityService.companyInformation$` solo copia tres campos y NO trae
 * `featureFlags`, así que acá se usa únicamente como aviso de "cambió la
 * empresa" para refrescar `isEnabled$`.
 *
 * Cuándo se actualiza: al iniciar sesión. Una bandera que se cambia en el
 * servidor mientras alguien tiene la sesión abierta le llega en su próximo
 * inicio de sesión; el servidor, en cambio, la aplica de inmediato y responde
 * 403 (`FEATURE_DISABLED`) si la función sigue apagada.
 *
 * Esto solo decide qué se MUESTRA. Quien manda es el servidor (`requireFeature`).
 *
 * Uso:
 *   constructor(public features: CompanyFeaturesService) {}
 *   <button *ngIf="features.isEnabled('productFromPhoto')">…</button>
 *   <button *ngIf="features.isEnabled$('buyNowCod') | async">…</button>
 */
@Injectable({ providedIn: 'root' })
export class CompanyFeaturesService {
  // Último par de textos de localStorage ya interpretado. Solo evita repetir el
  // JSON.parse de la empresa completa en cada ciclo de detección de cambios (un
  // `*ngIf` dentro de un `*ngFor` lo llamaría cientos de veces). No guarda datos
  // aparte: en cada llamada se vuelve a leer el storage y, si cambió, se
  // reinterpreta, así que nunca sirve una bandera vieja.
  private textoEmpresa: string | null | undefined;
  private textoSesion: string | null | undefined;
  private banderas: Record<string, boolean> = {};

  constructor(private readonly securityService: SecurityService) {}

  /**
   * `true` solo si la bandera está en el documento de la empresa y vale exactamente `true` y, si
   * está en `COMPANY_FEATURE_REQUIRES`, también cada una de las que exige.
   */
  isEnabled(flag: CompanyFeatureFlag): boolean {
    const banderas = this.leerBanderas();
    if (banderas[flag] !== true) return false;
    const requeridas = COMPANY_FEATURE_REQUIRES[flag] || [];
    return requeridas.every((r) => banderas[r] === true);
  }

  /** Igual que `isEnabled`, pero se vuelve a evaluar cuando cambia la empresa de la sesión. */
  isEnabled$(flag: CompanyFeatureFlag): Observable<boolean> {
    return this.securityService.companyInformation$.pipe(
      map(() => this.isEnabled(flag)),
      distinctUntilChanged()
    );
  }

  private leerBanderas(): Record<string, boolean> {
    let textoEmpresa: string | null;
    let textoSesion: string | null;
    try {
      textoEmpresa = localStorage.getItem('currentCompany');
      textoSesion = localStorage.getItem('user');
    } catch {
      // Almacenamiento bloqueado (ventana privada, permisos): sin datos, todo apagado.
      return {};
    }

    if (textoEmpresa !== this.textoEmpresa || textoSesion !== this.textoSesion) {
      this.textoEmpresa = textoEmpresa;
      this.textoSesion = textoSesion;
      this.banderas = this.interpretar(textoEmpresa, textoSesion);
    }
    return this.banderas;
  }

  private interpretar(textoEmpresa: string | null, textoSesion: string | null): Record<string, boolean> {
    const empresa = this.leerObjeto(textoEmpresa);
    if (!empresa) return {};

    // Solo se confía en las banderas si la empresa guardada es la de la sesión.
    // La llave de tenant autoritativa es `user.company` (la del JWT); si la
    // empresa guardada es otra, o no hay sesión, son restos de un inicio de
    // sesión anterior (por ejemplo, mientras carga la empresa recién elegida) y
    // no se le prestan sus banderas a otra empresa.
    const sesion = this.leerObjeto(textoSesion);
    const empresaDeLaSesion = this.normalizar(sesion ? sesion['company'] : undefined);
    const empresaGuardada = this.normalizar(empresa['nomComercial']);
    if (!empresaDeLaSesion || empresaDeLaSesion !== empresaGuardada) return {};

    const banderas = empresa['featureFlags'];
    if (!banderas || typeof banderas !== 'object' || Array.isArray(banderas)) return {};
    return banderas as Record<string, boolean>;
  }

  private leerObjeto(texto: string | null): Record<string, unknown> | null {
    if (!texto) return null;
    try {
      const valor = JSON.parse(texto);
      return valor && typeof valor === 'object' && !Array.isArray(valor)
        ? (valor as Record<string, unknown>)
        : null;
    } catch {
      return null;
    }
  }

  private normalizar(valor: unknown): string {
    return typeof valor === 'string' ? valor.trim().toLowerCase() : '';
  }
}
