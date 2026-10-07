// Directorio de integraciones para personas no técnicas (rediseño 2026-10-07).
//
// Solo describe QUÉ se muestra, cómo se agrupa y de dónde sale el estado de
// cada tarjeta. No toca cómo se guardan las integraciones: "Conectar" y "Ver y
// editar" abren el mismo formulario (IntegrationsComponent) con el mismo `type`
// y la misma categoría de siempre, así que lo que llega a
// /v1/integration/config/:provider no cambia.
//
// - 'conectable': tiene backend y formulario hoy.
// - 'pronto': se muestra como "Próximamente", sin botón.
// - Lo que no aparece aquí queda escondido (Magento, PrestaShop, Stripe, PayU,
//   FedEx, DHL, CRM, etc.). Sigue en getAvailableIntegrations() por si vuelve.

import { IntegrationCategory } from './integrations.service';

export type EstadoDirectorio = 'conectable' | 'pronto';

/**
 * De dónde se sabe si está conectada:
 * - 'config': listado de /v1/integration/config (solo trae las activas).
 * - 'whatsapp' / 'whatsapp_bot': configuración de WhatsApp del comercio.
 * - 'meta': conexiones de Instagram y Facebook.
 * - 'ninguna': no hay forma de saberlo desde aquí; no se muestra estado.
 */
export type FuenteEstado = 'config' | 'whatsapp' | 'whatsapp_bot' | 'meta' | 'ninguna';

export interface EntradaDirectorio {
  /** Identificador de la tarjeta. En las de fuente 'config' es el `type` con el que se guarda. */
  id: string;
  nombre: string;
  /** Una frase de para qué le sirve al negocio, sin jerga. */
  queHace: string;
  estado: EstadoDirectorio;
  /** Categoría que recibe el formulario al crear (la misma de siempre). */
  categoria: IntegrationCategory;
  fuente: FuenteEstado;
  /** `type` que abre el formulario cuando no es el mismo `id` (p. ej. el bot abre WhatsApp). */
  abre?: string;
  /** Pantalla propia en vez del formulario. */
  ruta?: string;
  /** Logo en assets; sin logo se muestra la inicial. */
  logo?: string;
}

export interface GrupoDirectorio {
  id: string;
  pregunta: string;
  ayuda: string;
  icono: string; // path SVG (stroke) de 24x24
  entradas: EntradaDirectorio[];
}

const C = IntegrationCategory;
const L = 'assets/images/logos/';

export const DIRECTORIO_INTEGRACIONES: GrupoDirectorio[] = [
  {
    id: 'vender',
    pregunta: '¿Dónde vendes?',
    ayuda: 'Trae los pedidos de tus canales de venta y mantén tus existencias al día.',
    icono: 'M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z M3 6h18 M16 10a4 4 0 0 1-8 0',
    entradas: [
      { id: 'shopify', nombre: 'Shopify', queHace: 'Recibe los pedidos de tu tienda Shopify y mantén tus existencias al día.', estado: 'conectable', categoria: C.ECOMMERCE, fuente: 'config', logo: L + 'shopify.svg' },
      { id: 'woocommerce', nombre: 'WooCommerce', queHace: 'Recibe los pedidos de tu tienda en WordPress.', estado: 'conectable', categoria: C.ECOMMERCE, fuente: 'config', logo: L + 'woocommerce.svg' },
      { id: 'whatsapp_pedidos', nombre: 'Pedidos por WhatsApp', queHace: 'Tus clientes piden conversando y el pedido te queda como cotización para que lo confirmes.', estado: 'conectable', categoria: C.MARKETING, fuente: 'whatsapp_bot', abre: 'whatsapp_kapso' },
      { id: 'mercadolibre', nombre: 'Mercado Libre', queHace: 'Publica tus productos y recibe las ventas en Katuq.', estado: 'pronto', categoria: C.ECOMMERCE, fuente: 'ninguna' },
      { id: 'whatsapp_catalogo', nombre: 'Catálogo en WhatsApp', queHace: 'Tus productos dentro de WhatsApp; el carrito del cliente llega como pedido.', estado: 'pronto', categoria: C.MARKETING, fuente: 'ninguna' },
      { id: 'tiktok_shop', nombre: 'TikTok Shop', queHace: 'Vende desde tus videos de TikTok.', estado: 'pronto', categoria: C.ECOMMERCE, fuente: 'ninguna' },
      { id: 'dropi', nombre: 'Dropi', queHace: 'Recibe los pedidos de tus proveedores y revendedores.', estado: 'pronto', categoria: C.ECOMMERCE, fuente: 'ninguna' },
      { id: 'amazon', nombre: 'Amazon', queHace: 'Vende tus productos en Amazon.', estado: 'pronto', categoria: C.ECOMMERCE, fuente: 'ninguna' },
    ],
  },
  {
    id: 'cobrar',
    pregunta: '¿Cómo cobras?',
    ayuda: 'Recibe pagos con tarjeta, PSE o Nequi y que el pedido quede pagado solo.',
    icono: 'M2 5h20v14H2z M2 10h20 M6 15h4',
    entradas: [
      { id: 'wompi', nombre: 'Wompi', queHace: 'Cobra con tarjeta, PSE, Nequi y Bancolombia.', estado: 'conectable', categoria: C.PAYMENT, fuente: 'config', logo: L + 'wompi.svg' },
      { id: 'epayco', nombre: 'ePayco', queHace: 'Cobra con tarjeta, PSE y efectivo.', estado: 'pronto', categoria: C.PAYMENT, fuente: 'ninguna', logo: L + 'epayco.svg' },
      { id: 'mercadopago', nombre: 'Mercado Pago', queHace: 'Cobra con tu cuenta de Mercado Pago.', estado: 'pronto', categoria: C.PAYMENT, fuente: 'ninguna', logo: L + 'mercadopago.svg' },
    ],
  },
  {
    id: 'enviar',
    pregunta: '¿Cómo envías?',
    ayuda: 'Genera guías, sigue tus envíos y conecta la bodega que te despacha.',
    icono: 'M1 3h15v13H1z M16 8h4l3 3v5h-7z M5.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z M18.5 21a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
    entradas: [
      { id: 'enviame', nombre: 'Envíame', queHace: 'Cotiza y genera guías con varias transportadoras.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config', logo: L + 'enviame.svg' },
      { id: 'partners_logistics', nombre: 'Partners Logística', queHace: 'Despacha tus pedidos con tu operador logístico aliado.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config', logo: L + 'partners-logistics.svg' },
      { id: 'prindel', nombre: 'Prindel', queHace: 'Envía tus pedidos con Prindel.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config', logo: L + 'prindel.png' },
      { id: 'fullpi', nombre: 'Fullpi', queHace: 'Tu bodega en Fullpi alista y despacha tus pedidos.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config', logo: L + 'fullpi.svg' },
      { id: 'aliaddo_fulfillment', nombre: 'Aliaddo', queHace: 'Sincroniza tu inventario y tus despachos con Aliaddo.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config' },
      { id: 'servientrega', nombre: 'Servientrega', queHace: 'Guías y contra entrega con Servientrega.', estado: 'pronto', categoria: C.LOGISTICS, fuente: 'ninguna', logo: L + 'servientrega.svg' },
      { id: 'coordinadora', nombre: 'Coordinadora', queHace: 'Guías y contra entrega con Coordinadora.', estado: 'pronto', categoria: C.LOGISTICS, fuente: 'ninguna', logo: L + 'coordinadora.svg' },
      { id: 'interrapidisimo', nombre: 'Interrapidísimo', queHace: 'Guías y contra entrega con Interrapidísimo.', estado: 'pronto', categoria: C.LOGISTICS, fuente: 'ninguna' },
      { id: 'tcc', nombre: 'TCC', queHace: 'Guías y contra entrega con TCC.', estado: 'pronto', categoria: C.LOGISTICS, fuente: 'ninguna' },
    ],
  },
  {
    id: 'facturar',
    pregunta: '¿Cómo facturas?',
    ayuda: 'Cada venta sale facturada y llega sola a tu programa contable.',
    icono: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M8 13h8 M8 17h5',
    entradas: [
      { id: 'siigo', nombre: 'SIIGO', queHace: 'Envía tus facturas y tus clientes a SIIGO.', estado: 'conectable', categoria: C.ACCOUNTING, fuente: 'config', logo: L + 'siigo.svg' },
      { id: 'world_office', nombre: 'World Office', queHace: 'Envía tus facturas y consulta tu cartera en World Office.', estado: 'conectable', categoria: C.ACCOUNTING, fuente: 'config', logo: L + 'world-office.svg' },
      { id: 'dian', nombre: 'Factura electrónica DIAN', queHace: 'Factura directo ante la DIAN, sin otro programa.', estado: 'conectable', categoria: C.ACCOUNTING, fuente: 'config', ruta: '/integrations/configure?provider=dian' },
      { id: 'alegra', nombre: 'Alegra', queHace: 'Envía tus facturas a Alegra.', estado: 'pronto', categoria: C.ACCOUNTING, fuente: 'ninguna' },
    ],
  },
  {
    id: 'atender',
    pregunta: '¿Cómo atiendes a tus clientes?',
    ayuda: 'Avísales del estado de su pedido y responde sus mensajes desde Katuq.',
    icono: 'M21 11.5a8.4 8.4 0 0 1-9 8.4 8.6 8.6 0 0 1-3.8-.9L3 21l1.9-5.2A8.4 8.4 0 1 1 21 11.5z',
    entradas: [
      { id: 'whatsapp_kapso', nombre: 'WhatsApp Business', queHace: 'Avisa a tus clientes por WhatsApp cuando su pedido avanza.', estado: 'conectable', categoria: C.MARKETING, fuente: 'whatsapp' },
      { id: 'meta', nombre: 'Instagram y Messenger', queHace: 'Responde desde Katuq los mensajes que te llegan por redes.', estado: 'conectable', categoria: C.MARKETING, fuente: 'meta', ruta: '/integrations/meta' },
    ],
  },
  {
    id: 'otros',
    pregunta: 'Otros sistemas',
    ayuda: 'Conexiones con sistemas propios de tu operación.',
    icono: 'M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7 M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7',
    entradas: [
      { id: 'flows', nombre: 'Automatizaciones', queHace: 'Tareas que mueven datos entre Katuq y tus otros sistemas cada cierto tiempo.', estado: 'conectable', categoria: C.OTHER, fuente: 'ninguna', ruta: '/flows' },
      { id: 'osmosis', nombre: 'Cereza', queHace: 'Sincroniza tus productos, existencias y pedidos con Cereza.', estado: 'conectable', categoria: C.LOGISTICS, fuente: 'config', logo: L + 'guiacereza.svg' },
      { id: 'multiop', nombre: 'MultiOP', queHace: 'Recibe el avance de producción de tus pedidos en el laboratorio óptico.', estado: 'conectable', categoria: C.OTHER, fuente: 'config' },
    ],
  },
];
