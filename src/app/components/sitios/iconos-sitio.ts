/**
 * Íconos de las tarjetas de los sitios: el mismo catálogo cerrado y los mismos trazos que valida y dibuja el
 * servidor (`ICONOS` en utils/siteBlocks.js y `TRAZOS_ICONO` en utils/siteHtml.js del backend). Lo usan el editor y
 * la vista previa: si divergen, la vista previa mostraría un ícono que la página publicada no tiene.
 *
 * Diseño nuevo (PLAN-V2 T02, DISENO §3.4): a los 12 de siempre se suman 23 de tecnología, hogar y negocio. Los de
 * wifi, camara, casa, celular, audifonos, parlante, tv, bateria, cerradura, servidor, camion, herramienta, cuadricula,
 * soporte, devolucion y factura vienen de Feather (https://feathericons.com, licencia MIT, Copyright (c) 2013-2023
 * Cole Bemis; el aviso completo está junto a `TRAZOS_ICONO` en el backend), pasados a un solo trazo.
 */
export const ICONOS_SITIO: readonly string[] = [
  "envio", "garantia", "pago", "reloj", "estrella", "corazon", "chat", "ubicacion", "regalo", "hoja", "escudo", "rayo",
  "wifi", "router", "camara", "casa", "portatil", "celular", "audifonos", "parlante", "tv", "auto", "enchufe", "bateria",
  "bombillo", "cerradura", "servidor", "edificio", "tienda", "camion", "herramienta", "cuadricula", "soporte", "devolucion", "factura",
];

export const TRAZOS_ICONO_SITIO: { readonly [nombre: string]: string } = {
  envio: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
  garantia: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z M9 12l2 2 4-4",
  pago: "M2 7h20v10H2zM2 11h20M6 15h3",
  reloj: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
  estrella: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",
  corazon: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z",
  chat: "M4 5h16v11H8l-4 3z",
  ubicacion: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 10h.01",
  regalo: "M3 11h18v9H3zM3 7h18v4H3zM12 7v13M8 7a2.5 2.5 0 1 1 4-2c2-2 4-1 4 1 0 1-1 1-1 1z",
  hoja: "M20 4C10 4 4 9 4 17c0 1 0 2 1 3 6-9 9-10 15-11z",
  escudo: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
  rayo: "M13 3 5 14h6l-1 7 8-11h-6z",
  wifi: "M5 12.55a11 11 0 0 1 14.08 0M1.42 9a16 16 0 0 1 21.16 0M8.53 16.11a6 6 0 0 1 6.95 0M12 20L12.01 20",
  router: "M4 14h16a2 2 0 0 1 2 2v2a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2zM6.5 17h.01M10 17h.01M15 14v-4M12.5 7.5a3.5 3.5 0 0 1 5 0M10 5a7 7 0 0 1 10 0",
  camara: "M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2zM8 13a4 4 0 1 0 8 0a4 4 0 1 0 -8 0",
  casa: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22L9 12L15 12L15 22",
  portatil: "M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9H4zM4 15l-2 4h20l-2-4",
  celular: "M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2zM12 18L12.01 18",
  audifonos: "M3 18v-6a9 9 0 0 1 18 0v6M21 19a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3zM3 19a2 2 0 0 0 2 2h1a2 2 0 0 0 2-2v-3a2 2 0 0 0-2-2H3z",
  parlante: "M6 2h12a2 2 0 0 1 2 2v16a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2v-16a2 2 0 0 1 2 -2zM8 14a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M12 6L12.01 6",
  tv: "M4 7h16a2 2 0 0 1 2 2v11a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-11a2 2 0 0 1 2 -2zM17 2L12 7L7 2",
  auto: "M3 16v-4l2.2-5.1A1.5 1.5 0 0 1 6.6 6h10.8a1.5 1.5 0 0 1 1.4.9L21 12v4h-2M3 16h2M9 16h6M3 12h18M5 16a2 2 0 1 0 4 0a2 2 0 1 0-4 0M15 16a2 2 0 1 0 4 0a2 2 0 1 0-4 0",
  enchufe: "M9 2v6M15 2v6M6 8h12v4a6 6 0 0 1-12 0zM12 18v4",
  bateria: "M3 6h14a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-8a2 2 0 0 1 2 -2zM23 13L23 11",
  bombillo: "M9 17h6M10 21h4M12 3a6 6 0 0 0-3.6 10.8c.6.5.6 1.2.6 2.2h6c0-1 0-1.7.6-2.2A6 6 0 0 0 12 3z",
  cerradura: "M5 11h14a2 2 0 0 1 2 2v7a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-7a2 2 0 0 1 2 -2zM7 11V7a5 5 0 0 1 10 0v4",
  servidor: "M4 2h16a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2zM4 14h16a2 2 0 0 1 2 2v4a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-4a2 2 0 0 1 2 -2zM6 6L6.01 6M6 18L6.01 18",
  edificio: "M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17M3 21h18M9 7h.01M12 7h.01M15 7h.01M9 11h.01M12 11h.01M15 11h.01M9 15h.01M15 15h.01M10 21v-3h4v3",
  tienda: "M3 9l2-5h14l2 5M3 9h18M3 9a3 3 0 0 0 6 0a3 3 0 0 0 6 0a3 3 0 0 0 6 0M5 12v9h14v-9M10 21v-5h4v5",
  camion: "M1 3h15v13h-15zM16 8L20 8L23 11L23 16L16 16L16 8zM3 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0M16 18.5a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0",
  herramienta: "M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z",
  cuadricula: "M3 3h7v7h-7zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7h-7z",
  soporte: "M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0M8 12a4 4 0 1 0 8 0a4 4 0 1 0 -8 0M4.93 4.93L9.17 9.17M14.83 14.83L19.07 19.07M14.83 9.17L19.07 4.93M14.83 9.17L18.36 5.64M4.93 19.07L9.17 14.83",
  devolucion: "M1 4L1 10L7 10M3.51 15a9 9 0 1 0 2.13-9.36L1 10",
  factura: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2L14 8L20 8M16 13L8 13M16 17L8 17M10 9L9 9L8 9",
};
