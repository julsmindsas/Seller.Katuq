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
  // Tickets desde el chat integrado (D-545). Dueño: Daniel. Revisión/retiro: 2027-01-31.
  'opttiaSupportTickets',
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
  // SIIGO: retención en la fuente e IVA por renglón en la factura (ticket 1417). Solo ALMACEN BOMBAS.
  // Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
  'invoiceItemWithholding',
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
  // Estado del pedido de Katuq a WooCommerce: Entregado → Completado, Cancelado → Cancelado (D-578).
  // Se enciende a mano, primero en sombra. Dueño: Daniel. Se revisa el 2027-04-30.
  'wooOrderStatusPublish',
  // Evolución mensual de la cartera (ticket 1464): foto diaria y gráfica de 12 meses. Dueño: Daniel. Se retira el 2027-04-30.
  'carteraEvolucion',
  // Cartera interna separada (ticket 1461, D-666): tipo de relación del cliente, Cartera sin internos y vista «Cartera interna». Dueño: Daniel. Se retira el 2027-05-31.
  'carteraInterna',
  // Acciones de cobro en la tarjeta del cliente de Cartera (ticket 1463): estado de cuenta en PDF, compromiso de pago, gestiones y cupo y plazo. Dueño: Daniel. Se retira el 2027-05-31.
  'accionesCartera',
  // Castigar deuda (ticket 1463): solo Administrador, sale de Cartera y queda en «Cartera castigada». Dueño: Daniel. Se retira el 2027-05-31.
  'carteraCastigo',
  // Recordatorios de pago desde CxC (tickets 1385 y 1457): «Recordar pago» por correo y WhatsApp, por cliente, por pedido y masivo. Dueño: Daniel. Se retira el 2027-05-31.
  'recordatoriosCobro',
  // Cartera por vendedor y mora por fila de «Sin pago» (ticket 1457). Dueño: Daniel. Se retira el 2027-05-31.
  'carteraVendedorMora',
  // Alerta suave de posible pedido duplicado (ticket 1459, D-669): aviso tras crear en la venta asistida y marca en Tesorería. Dueño: Daniel. Se retira el 2027-05-31.
  'alertaPedidoDuplicado',
  // Calidad de datos de clientes (ticket 1462, D-667, fase 1): NIT y dígito de verificación separados, avisos al
  // guardar («Este cliente ya existe», documento que parece un celular…), «Usar el existente» y la vista «Posibles
  // duplicados» en Clientes (Administrador y Tesorería). Mismo nombre que el backend. Dueño: Daniel. Se retira el 2027-05-31.
  'calidadDatosClientes',
  // Cambiar el cliente de un pedido creado (ticket 1505, D-670, fase 1): «Cambiar cliente» en «Para este pedido» del modal de
  // opciones y dentro de «Editar cliente», con vista previa y motivo. Además exige la acción `cambiar_cliente` en el rol
  // (la revisa el servidor). Mismo nombre que el backend. Dueño: Daniel. Se retira el 2027-05-31.
  'cambiarClientePedido',
  // Motivo de rechazo con lista y registro de cambios de pagos (ticket 1455): el servidor decide; la pantalla lo lee de /treasury/config. Dueño: Daniel. Se retira el 2027-05-31.
  'motivoRechazoPago',
  // Estado de pago Crédito (ticket 1448, D-660): marcar Crédito, cupo en la ficha del cliente e instrucción de cobro
  // («cobrar saldo» / «no cobrar») en Logística. El servidor decide; la pantalla lo ofrece solo si está encendida. Dueño: Daniel. Se retira el 2027-05-31.
  'estadoCredito',
  // Un solo pago para varios pedidos del mismo cliente (ticket 1453, D-661 propuesta): casillas en «Sin pago», diálogo de
  // pago de grupo en Tesorería y en «Registrar pago» de Cartera, y decisión del grupo completo. El servidor decide.
  // Dueño: Daniel. Se retira el 2027-05-31.
  'pagoVariosPedidos',
  // Registrar pago subiendo primero el comprobante, con lectura de IA que solo sugiere (ticket 1449, D-662 propuesta): el servidor
  // lee el comprobante, marca lo «editado a mano» y avisa de referencias o archivos repetidos sin bloquear. Dueño: Daniel. Se retira el 2027-05-31.
  'comprobantePrimero',
  // Ajuste al peso configurable por comercio (ticket 1452, D-663 propuesta): al aprobar un pago, el saldo o el sobrante pequeño que
  // el comercio configuró se cierra solo con una línea «Ajuste al peso». Dueño: Daniel. Se retira el 2027-05-31.
  'ajusteAlPeso',
  // Pago a cuotas en la tienda en línea con Addi y Sistecrédito (D-517, ticket 1233): cada comercio
  // con su convenio y sus credenciales. Dueño: Daniel. Se retira el 2027-04-30.
  'storeInstallmentPayments',
  // Un envío, una clave (D-499 fase 0, FE-03). Dueño: Daniel. Se retira el 2027-03-31.
  'invoiceIdempotency',
  // Bandeja única de facturación (D-499 fase 1, FE-02). Dueño: Daniel. Se retira el 2027-03-31.
  'invoicingTray',
  // D-539 (ticket 1331): pedido con productos de varias bodegas de una misma zona.
  'multiBodegaMismaZona',
  // Cifras oficiales de los reportes (D-551, tickets 1341-1348, F1): una sola definición de venta,
  // por fecha de entrega, sin pedidos caídos. Apagada, los reportes calculan como hoy.
  // Dueño: Daniel. Se retira el 2027-04-30 (Artículo XII).
  'reportsOfficialMetrics',
  // Acciones principales del pedido por rol y por usuario (D-547 F2, ticket 1349 parte 1): el bloque
  // ACCIONES de 8 (4 del rol y 4 del usuario), el pin, las sugerencias y el resaltado. Apagada, el bloque
  // y el modal son los de F1. Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada
  // (Artículo XII).
  'orderPinnedActions',
  // Historial del producto (D-548 F1, tickets 1357 y 1358): quién cambió qué en un producto, sus precios
  // y su costo, desde el panel, las importaciones, las acciones masivas y Claude. Apagada, la ficha
  // muestra la pestaña de hoy y Listas de precios no ofrece «Historial». Dueño: Daniel. Se retira el
  // 2027-04-30: encendida para todos o eliminada (Artículo XII).
  'productHistoryLog',
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
  // Tablero de estado de «Configuración DIAN» para el comercio activo en producción (D-622, ticket
  // 1491, fase 1): el asistente queda detrás de «Editar». Dueño: Daniel. Se retira el 2027-04-30.
  'dianTableroEstado',
  // Detalle ampliado del documento DIAN: totales, líneas, forma de pago y vencimiento (D-621,
  // ticket 1489, fase 1). Dueño: Daniel. Se retira el 2027-04-30.
  'dianDetalleAmpliado',
  // Formulario de nueva factura mejorado (D-623 fase 1, ticket 1492): plazo a crédito en días, IVA
  // sugerido, orden de compra del cliente y medio de pago recordado. Solo la factura libre.
  // Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada (Artículo XII).
  'facturaFormularioMejorado',
  // Compras, ciclo completo (D-626, tickets 1468, 1469 y 1470; fases A y B): Qué comprar con costo en la fila,
  // proveedor principal, cantidad por unidad de compra, órdenes en borrador por proveedor, filtros, avisos,
  // Excel y Qué producir. Mismo nombre que el backend. Dueño: Daniel. Se retira el 2027-04-30.
  'comprasV2',
  // Centro de ayuda, fase 1 (D-628, tickets 1441 a 1437): base de conocimiento, pantalla «Centro de ayuda» y
  // su administración para Julsmind. Además existe el corte general `config/feature_flags.centroDeAyuda`.
  // Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
  'centroDeAyuda',
  // Mis Ideas maestro-detalle con estado propio de idea y «A mí también me sirve» (D-627, tickets 1442 y 1443).
  'misIdeasV2',
  // Estándar de foto de producto al subir: rechazo claro y avisos a 800 px (D-629, tickets 1426 y 1427).
  'fotosEstandar',
  // Panel ACCIONES del pedido de nueve (D-635 fase 1, ticket 1472): 4 del rol y 5 personales, «Frecuente» sobre 30
  // días, pin en el panel y estado en la tarjeta. Delta de orderPinnedActions (D-547). Mismo nombre que el
  // backend. Dueño: Daniel. Se retira el 2027-04-30: encendida para todos o eliminada.
  'panelAccionesV2',
  // Landings por objetivo, fase 1 (D-633, tickets 1396 a 1399): bandeja «Leads landing», consentimiento de la
  // Ley 1581 en el formulario de leads y /l/{slug}. Mismo nombre que el backend. Dueño: Daniel. Se retira el 2027-04-30.
  'landingsV2',
  // Diseño nuevo de las páginas del constructor de sitios (PLAN-V2 T01): «Diseño nuevo» en Estilo del editor. Apagada,
  // no se ofrece (si la página ya lo usa, se puede apagar). El servidor tampoco deja encenderlo sin ella. Mismo nombre
  // que el backend. Dueño: Daniel. Se retira el 2027-06-30: encendida para todos o eliminada.
  'siteDesignV2',
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
