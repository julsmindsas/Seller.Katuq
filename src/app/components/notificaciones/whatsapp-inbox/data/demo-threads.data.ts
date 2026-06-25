/**
 * Datos MOCK para el módulo WhatsApp Inbox (spec 009).
 *
 * Estos datos alimentan el `WhatsappInboxService` mientras los endpoints reales
 * (009.1 listado, 009.2 detalle, 009.4 envío, 009.5.1 contexto) no estén listos.
 *
 * REGLA: las fechas son strings ISO hardcoded (NO `new Date()` ni `Date.now()`)
 * para que la demo sea determinística y revisable.
 */

import {
  ContactProfile,
  Order,
  WhatsappMessage,
  WhatsappThread,
} from "../models/whatsapp-thread.model";

/**
 * Hash determinístico simple para los demo threads.
 * NO usar en producción — usa SHA-256 con sal en backend.
 */
export function phoneHashFor(name: string): string {
  // btoa puede fallar con caracteres no-ASCII (tildes) — los normalizamos.
  const normalized = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
  // En Node/SSR `btoa` puede no existir; fallback a hex simple.
  let b64 = "";
  try {
    b64 = btoa(normalized);
  } catch {
    b64 = Array.from(normalized)
      .map((ch) => ch.charCodeAt(0).toString(16))
      .join("");
  }
  return `wahash_${b64.replace(/[^a-zA-Z0-9]/g, "").slice(0, 16)}`;
}

// Hashes precalculados para enlazar threads ↔ mensajes ↔ perfiles ↔ pedidos.
const HASH_MARIA = phoneHashFor("Maria Restrepo");
const HASH_CARLOS = phoneHashFor("Carlos Gomez");
const HASH_PROFILE_ONLY = phoneHashFor("Profile sin registrar");
const HASH_ANA = phoneHashFor("Ana Sofia Lopez");
const HASH_PEDRO = phoneHashFor("Pedro Mendez");

/**
 * Listado de hilos para la columna izquierda del inbox.
 */
export const DEMO_THREADS: WhatsappThread[] = [
  {
    phoneHash: HASH_MARIA,
    phoneMasked: "+57***4567",
    contactName: "María Restrepo",
    lastMessageAt: "2026-06-16T15:42:00Z",
    lastMessageSnippet:
      "Hola, ¿el pedido ya salió de bodega? Necesito confirmarlo para...",
    unreadCount: 2,
    lastDirection: "inbound",
    messageCount: 8,
  },
  {
    phoneHash: HASH_CARLOS,
    phoneMasked: "+57***1234",
    contactName: "Carlos Gómez",
    lastMessageAt: "2026-06-16T12:10:00Z",
    lastMessageSnippet:
      "[OH MY STORE] Tu pedido KAT-2026-00451 fue despachado. Sigue tu...",
    unreadCount: 0,
    lastDirection: "outbound",
    messageCount: 12,
  },
  {
    phoneHash: HASH_PROFILE_ONLY,
    phoneMasked: "+57***9999",
    contactName: "luis.profile",
    lastMessageAt: "2026-06-15T20:05:00Z",
    lastMessageSnippet:
      "Buenas, vi su tienda en Instagram y quería preguntar por precio mayorista",
    unreadCount: 1,
    lastDirection: "inbound",
    messageCount: 3,
  },
  {
    phoneHash: HASH_ANA,
    phoneMasked: "+57***5555",
    contactName: "Ana Sofía López",
    lastMessageAt: "2026-06-14T09:18:00Z",
    lastMessageSnippet:
      "Mil gracias, ya recibí el paquete. Quedó perfecto, los voy a recomendar",
    unreadCount: 3,
    lastDirection: "inbound",
    messageCount: 25,
    flags: { inboundTruncatedAt90d: true },
  },
  {
    phoneHash: HASH_PEDRO,
    phoneMasked: "+57***7777",
    contactName: "Pedro Méndez",
    lastMessageAt: "2026-06-12T17:30:00Z",
    lastMessageSnippet:
      "[OH MY STORE] Tu pedido KAT-2026-00388 está confirmado y en preparación.",
    unreadCount: 0,
    lastDirection: "outbound",
    messageCount: 5,
  },
];

/**
 * Mensajes por hilo (vista detalle).
 */
export const DEMO_MESSAGES: Record<string, WhatsappMessage[]> = {
  [HASH_MARIA]: [
    {
      id: "msg_maria_001",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Hola María, tu pedido KAT-2026-00472 está confirmado. Te avisamos cuando despache.",
      snippet: "[OH MY STORE] Hola María, tu pedido KAT-2026-00472 está...",
      sentAt: "2026-06-15T10:00:00Z",
      status: "read",
    },
    {
      id: "msg_maria_002",
      direction: "inbound",
      type: "text",
      body: "Hola! Perfecto, muchas gracias.",
      snippet: "Hola! Perfecto, muchas gracias.",
      sentAt: "2026-06-15T10:14:00Z",
      status: "delivered",
    },
    {
      id: "msg_maria_003",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido KAT-2026-00472 fue despachado por Servientrega. Guía: 9876543210.",
      snippet: "[OH MY STORE] Tu pedido KAT-2026-00472 fue despachado...",
      sentAt: "2026-06-15T18:32:00Z",
      status: "read",
    },
    {
      id: "msg_maria_004",
      direction: "inbound",
      type: "text",
      body: "Gracias, lo estaré pendiente.",
      snippet: "Gracias, lo estaré pendiente.",
      sentAt: "2026-06-15T19:00:00Z",
      status: "delivered",
    },
    {
      id: "msg_maria_005",
      direction: "inbound",
      type: "image",
      body: "(imagen recibida)",
      snippet: "(imagen recibida)",
      sentAt: "2026-06-16T08:15:00Z",
      status: "delivered",
      mediaPlaceholder: true,
    },
    {
      id: "msg_maria_006",
      direction: "outbound",
      type: "text",
      body: "Recibido, lo verificamos con bodega y te confirmamos.",
      snippet: "Recibido, lo verificamos con bodega y te confirmamos.",
      sentAt: "2026-06-16T08:40:00Z",
      status: "delivered",
    },
    {
      id: "msg_maria_007",
      direction: "inbound",
      type: "text",
      body: "Hola, ¿el pedido ya salió de bodega? Necesito confirmarlo para coordinar la recepción.",
      snippet:
        "Hola, ¿el pedido ya salió de bodega? Necesito confirmarlo para...",
      sentAt: "2026-06-16T15:40:00Z",
      status: "delivered",
    },
    {
      id: "msg_maria_008",
      direction: "inbound",
      type: "text",
      body: "Por favor, urgente.",
      snippet: "Por favor, urgente.",
      sentAt: "2026-06-16T15:42:00Z",
      status: "delivered",
    },
  ],
  [HASH_CARLOS]: [
    {
      id: "msg_carlos_001",
      direction: "inbound",
      type: "text",
      body: "Hola, quisiera saber si tienen disponibilidad de las gafas mod. JCR-2021 en negro.",
      snippet: "Hola, quisiera saber si tienen disponibilidad de las gafas...",
      sentAt: "2026-06-10T11:00:00Z",
      status: "delivered",
    },
    {
      id: "msg_carlos_002",
      direction: "outbound",
      type: "text",
      body: "Hola Carlos! Sí, tenemos stock. ¿Te paso el link para cotizar?",
      snippet: "Hola Carlos! Sí, tenemos stock. ¿Te paso el link para...",
      sentAt: "2026-06-10T11:05:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_003",
      direction: "inbound",
      type: "text",
      body: "Sí por favor.",
      snippet: "Sí por favor.",
      sentAt: "2026-06-10T11:06:00Z",
      status: "delivered",
    },
    {
      id: "msg_carlos_004",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu cotización COT-2026-00118 está lista: https://katuq.com/c/abc",
      snippet: "[OH MY STORE] Tu cotización COT-2026-00118 está lista...",
      sentAt: "2026-06-10T11:09:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_005",
      direction: "inbound",
      type: "text",
      body: "Listo, confirmo el pedido.",
      snippet: "Listo, confirmo el pedido.",
      sentAt: "2026-06-10T15:20:00Z",
      status: "delivered",
    },
    {
      id: "msg_carlos_006",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido KAT-2026-00451 está confirmado.",
      snippet: "[OH MY STORE] Tu pedido KAT-2026-00451 está confirmado.",
      sentAt: "2026-06-10T15:30:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_007",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Recibimos tu pago. Empezamos a preparar el envío.",
      snippet: "[OH MY STORE] Recibimos tu pago. Empezamos a preparar el...",
      sentAt: "2026-06-11T09:00:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_008",
      direction: "inbound",
      type: "text",
      body: "Perfecto!",
      snippet: "Perfecto!",
      sentAt: "2026-06-11T09:01:00Z",
      status: "delivered",
    },
    {
      id: "msg_carlos_009",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido fue despachado por Servientrega. Guía: 1122334455.",
      snippet: "[OH MY STORE] Tu pedido fue despachado por Servientrega...",
      sentAt: "2026-06-13T16:00:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_010",
      direction: "inbound",
      type: "text",
      body: "Ya llegó, gracias!",
      snippet: "Ya llegó, gracias!",
      sentAt: "2026-06-15T11:30:00Z",
      status: "delivered",
    },
    {
      id: "msg_carlos_011",
      direction: "outbound",
      type: "text",
      body: "Gracias a ti Carlos! Cualquier cosa nos avisas.",
      snippet: "Gracias a ti Carlos! Cualquier cosa nos avisas.",
      sentAt: "2026-06-15T11:35:00Z",
      status: "read",
    },
    {
      id: "msg_carlos_012",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido KAT-2026-00451 fue despachado. Sigue tu envío en https://katuq.com/tracking/...",
      snippet:
        "[OH MY STORE] Tu pedido KAT-2026-00451 fue despachado. Sigue tu...",
      sentAt: "2026-06-16T12:10:00Z",
      status: "delivered",
    },
  ],
  [HASH_PROFILE_ONLY]: [
    {
      id: "msg_profile_001",
      direction: "inbound",
      type: "text",
      body: "Buenas tardes",
      snippet: "Buenas tardes",
      sentAt: "2026-06-15T19:55:00Z",
      status: "delivered",
    },
    {
      id: "msg_profile_002",
      direction: "outbound",
      type: "text",
      body: "Hola! Bienvenido a OH MY STORE, ¿en qué te ayudo?",
      snippet: "Hola! Bienvenido a OH MY STORE, ¿en qué te ayudo?",
      sentAt: "2026-06-15T19:58:00Z",
      status: "delivered",
    },
    {
      id: "msg_profile_003",
      direction: "inbound",
      type: "text",
      body: "Buenas, vi su tienda en Instagram y quería preguntar por precio mayorista",
      snippet:
        "Buenas, vi su tienda en Instagram y quería preguntar por precio mayorista",
      sentAt: "2026-06-15T20:05:00Z",
      status: "delivered",
    },
  ],
  [HASH_ANA]: [
    {
      id: "msg_ana_001",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Hola Ana, tu cotización COT-2026-00091 está lista.",
      snippet: "[OH MY STORE] Hola Ana, tu cotización COT-2026-00091 está...",
      sentAt: "2026-06-01T10:00:00Z",
      status: "read",
    },
    {
      id: "msg_ana_002",
      direction: "inbound",
      type: "text",
      body: "Perfecto, confirmo el pedido.",
      snippet: "Perfecto, confirmo el pedido.",
      sentAt: "2026-06-01T12:00:00Z",
      status: "delivered",
    },
    {
      id: "msg_ana_003",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido KAT-2026-00302 está confirmado.",
      snippet: "[OH MY STORE] Tu pedido KAT-2026-00302 está confirmado.",
      sentAt: "2026-06-01T12:10:00Z",
      status: "read",
    },
    {
      id: "msg_ana_004",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido fue despachado. Guía: 5566778899.",
      snippet: "[OH MY STORE] Tu pedido fue despachado. Guía: 5566778899.",
      sentAt: "2026-06-03T09:00:00Z",
      status: "read",
    },
    {
      id: "msg_ana_005",
      direction: "inbound",
      type: "text",
      body: "Ya lo recibí, todo perfecto!",
      snippet: "Ya lo recibí, todo perfecto!",
      sentAt: "2026-06-05T18:00:00Z",
      status: "delivered",
    },
    {
      id: "msg_ana_006",
      direction: "inbound",
      type: "image",
      body: "(imagen recibida)",
      snippet: "(imagen recibida)",
      sentAt: "2026-06-05T18:01:00Z",
      status: "delivered",
      mediaPlaceholder: true,
    },
    {
      id: "msg_ana_007",
      direction: "outbound",
      type: "text",
      body: "Qué bueno Ana! Si necesitas algo más nos escribes.",
      snippet: "Qué bueno Ana! Si necesitas algo más nos escribes.",
      sentAt: "2026-06-05T18:30:00Z",
      status: "read",
    },
    {
      id: "msg_ana_008",
      direction: "inbound",
      type: "text",
      body: "Quisiera repetir el pedido para regalo",
      snippet: "Quisiera repetir el pedido para regalo",
      sentAt: "2026-06-10T11:00:00Z",
      status: "delivered",
    },
    {
      id: "msg_ana_009",
      direction: "outbound",
      type: "text",
      body: "Claro! Te genero la nueva cotización.",
      snippet: "Claro! Te genero la nueva cotización.",
      sentAt: "2026-06-10T11:05:00Z",
      status: "read",
    },
    {
      id: "msg_ana_010",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu cotización COT-2026-00134 está lista.",
      snippet: "[OH MY STORE] Tu cotización COT-2026-00134 está lista.",
      sentAt: "2026-06-10T11:08:00Z",
      status: "read",
    },
    {
      id: "msg_ana_011",
      direction: "inbound",
      type: "text",
      body: "Mil gracias, ya recibí el paquete. Quedó perfecto, los voy a recomendar",
      snippet:
        "Mil gracias, ya recibí el paquete. Quedó perfecto, los voy a recomendar",
      sentAt: "2026-06-14T09:18:00Z",
      status: "delivered",
    },
  ],
  [HASH_PEDRO]: [
    {
      id: "msg_pedro_001",
      direction: "inbound",
      type: "text",
      body: "Hola, hice el pedido por la web pero no me llegó confirmación.",
      snippet: "Hola, hice el pedido por la web pero no me llegó confirmación.",
      sentAt: "2026-06-12T16:50:00Z",
      status: "delivered",
    },
    {
      id: "msg_pedro_002",
      direction: "outbound",
      type: "text",
      body: "Hola Pedro! Déjame revisar el número de pedido.",
      snippet: "Hola Pedro! Déjame revisar el número de pedido.",
      sentAt: "2026-06-12T16:52:00Z",
      status: "read",
    },
    {
      id: "msg_pedro_003",
      direction: "inbound",
      type: "text",
      body: "Es KAT-2026-00388",
      snippet: "Es KAT-2026-00388",
      sentAt: "2026-06-12T16:55:00Z",
      status: "delivered",
    },
    {
      id: "msg_pedro_004",
      direction: "outbound",
      type: "text",
      body: "Listo, ya lo encontré. Te reenvío la confirmación.",
      snippet: "Listo, ya lo encontré. Te reenvío la confirmación.",
      sentAt: "2026-06-12T17:00:00Z",
      status: "read",
    },
    {
      id: "msg_pedro_005",
      direction: "outbound",
      type: "text",
      body: "[OH MY STORE] Tu pedido KAT-2026-00388 está confirmado y en preparación.",
      snippet:
        "[OH MY STORE] Tu pedido KAT-2026-00388 está confirmado y en preparación.",
      sentAt: "2026-06-12T17:30:00Z",
      status: "read",
    },
  ],
};

/**
 * Perfiles de contacto para el panel derecho (009.5.1).
 */
export const DEMO_PROFILES: Record<string, ContactProfile> = {
  [HASH_MARIA]: {
    phoneHash: HASH_MARIA,
    phoneMasked: "+57***4567",
    clienteNombre: "María Restrepo",
    profileName: "Mari R.",
    isClienteRegistrado: true,
    lead: {
      leadId: "lead_maria_001",
      name: "María Restrepo",
      stage: "Negociación",
      ownerName: "Andrea Vélez",
      score: 78,
    },
    ratingDraft: null,
  },
  [HASH_CARLOS]: {
    phoneHash: HASH_CARLOS,
    phoneMasked: "+57***1234",
    clienteNombre: "Carlos Gómez",
    profileName: "Carlos",
    isClienteRegistrado: true,
    lead: null,
    ratingDraft: { score: 4, updatedAt: "2026-06-12T18:00:00Z" },
  },
  [HASH_PROFILE_ONLY]: {
    phoneHash: HASH_PROFILE_ONLY,
    phoneMasked: "+57***9999",
    clienteNombre: undefined,
    profileName: "luis.profile",
    isClienteRegistrado: false,
    lead: null,
    ratingDraft: null,
  },
  [HASH_ANA]: {
    phoneHash: HASH_ANA,
    phoneMasked: "+57***5555",
    clienteNombre: "Ana Sofía López",
    profileName: "Ana So",
    isClienteRegistrado: true,
    lead: {
      leadId: "lead_ana_001",
      name: "Ana Sofía López",
      stage: "Cliente recurrente",
      ownerName: "Daniel Restrepo",
      score: 92,
    },
    ratingDraft: null,
  },
  [HASH_PEDRO]: {
    phoneHash: HASH_PEDRO,
    phoneMasked: "+57***7777",
    clienteNombre: "Pedro Méndez",
    profileName: "Pedro M.",
    isClienteRegistrado: true,
    lead: null,
    ratingDraft: null,
  },
};

/**
 * Pedidos asociados al contacto (panel derecho, 009.5.1).
 * El contacto sin registrar (profile only) tiene 0 pedidos.
 */
export const DEMO_ORDERS: Record<string, Order[]> = {
  [HASH_MARIA]: [
    {
      orderId: "ord_maria_001",
      nroPedido: "KAT-2026-00472",
      fechaCreacion: "2026-06-15T10:00:00Z",
      estado: "Despachado",
      total: 285000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00472",
    },
    {
      orderId: "ord_maria_002",
      nroPedido: "KAT-2026-00399",
      fechaCreacion: "2026-05-28T14:00:00Z",
      estado: "Entregado",
      total: 142000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00399",
    },
    {
      orderId: "ord_maria_003",
      nroPedido: "KAT-2026-00321",
      fechaCreacion: "2026-05-12T09:30:00Z",
      estado: "Entregado",
      total: 78500,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00321",
    },
  ],
  [HASH_CARLOS]: [
    {
      orderId: "ord_carlos_001",
      nroPedido: "KAT-2026-00451",
      fechaCreacion: "2026-06-10T15:30:00Z",
      estado: "Despachado",
      total: 530000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00451",
    },
    {
      orderId: "ord_carlos_002",
      nroPedido: "KAT-2026-00410",
      fechaCreacion: "2026-06-03T11:00:00Z",
      estado: "Entregado",
      total: 220000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00410",
    },
    {
      orderId: "ord_carlos_003",
      nroPedido: "KAT-2026-00378",
      fechaCreacion: "2026-05-22T18:00:00Z",
      estado: "Entregado",
      total: 165000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00378",
    },
    {
      orderId: "ord_carlos_004",
      nroPedido: "KAT-2026-00299",
      fechaCreacion: "2026-05-04T16:45:00Z",
      estado: "Entregado",
      total: 98000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00299",
    },
  ],
  [HASH_PROFILE_ONLY]: [],
  [HASH_ANA]: [
    {
      orderId: "ord_ana_001",
      nroPedido: "KAT-2026-00468",
      fechaCreacion: "2026-06-13T10:00:00Z",
      estado: "En preparación",
      total: 415000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00468",
    },
    {
      orderId: "ord_ana_002",
      nroPedido: "KAT-2026-00302",
      fechaCreacion: "2026-06-01T12:10:00Z",
      estado: "Entregado",
      total: 360000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00302",
    },
    {
      orderId: "ord_ana_003",
      nroPedido: "KAT-2026-00244",
      fechaCreacion: "2026-05-18T14:00:00Z",
      estado: "Entregado",
      total: 210000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00244",
    },
    {
      orderId: "ord_ana_004",
      nroPedido: "KAT-2026-00188",
      fechaCreacion: "2026-05-02T09:00:00Z",
      estado: "Entregado",
      total: 480000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00188",
    },
    {
      orderId: "ord_ana_005",
      nroPedido: "KAT-2026-00120",
      fechaCreacion: "2026-04-19T16:30:00Z",
      estado: "Entregado",
      total: 155000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00120",
    },
    {
      orderId: "ord_ana_006",
      nroPedido: "KAT-2026-00077",
      fechaCreacion: "2026-04-08T11:15:00Z",
      estado: "Entregado",
      total: 92000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00077",
    },
    {
      orderId: "ord_ana_007",
      nroPedido: "KAT-2026-00021",
      fechaCreacion: "2026-03-21T19:00:00Z",
      estado: "Entregado",
      total: 67500,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00021",
    },
  ],
  [HASH_PEDRO]: [
    {
      orderId: "ord_pedro_001",
      nroPedido: "KAT-2026-00388",
      fechaCreacion: "2026-06-12T17:30:00Z",
      estado: "En preparación",
      total: 122000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00388",
    },
    {
      orderId: "ord_pedro_002",
      nroPedido: "KAT-2026-00270",
      fechaCreacion: "2026-05-15T13:00:00Z",
      estado: "Entregado",
      total: 88000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00270",
    },
    {
      orderId: "ord_pedro_003",
      nroPedido: "KAT-2026-00199",
      fechaCreacion: "2026-04-30T10:30:00Z",
      estado: "Entregado",
      total: 145000,
      currency: "COP",
      deepLink: "/ventas/detalle/KAT-2026-00199",
    },
  ],
};
