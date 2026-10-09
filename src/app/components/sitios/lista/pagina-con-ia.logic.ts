/**
 * Página con IA desde una descripción (bandera `landingPrompt`) — lógica pura de la pantalla.
 *
 * El comercio escribe un párrafo y el servidor arma la página en borrador. Aquí solo viven las
 * reglas que se pueden probar sin Angular: cuántas letras se piden, los ejemplos y los mensajes.
 * Quién manda sobre la función es el servidor (`requireFeature('landingPrompt')` responde 403
 * si está apagada); esta pantalla solo se dibuja con la bandera prendida.
 */

/** Los mismos topes que el servidor (`services/sites/paginaDesdeDescripcion.js`). */
export const DESCRIPCION_MIN = 15;
export const DESCRIPCION_MAX = 600;
export const NOMBRE_MAX = 60;

/** Frases para empezar: tocar una llena el cuadro. Sin precios ni teléfonos (el servidor no los deja pasar). */
export const EJEMPLOS_DESCRIPCION: ReadonlyArray<{ titulo: string; texto: string }> = [
  {
    titulo: "Flores y regalos",
    texto: "Vendo ramos de flores y arreglos para toda ocasión en Medellín. Quiero que mis clientes me escriban por WhatsApp para pedirlos.",
  },
  {
    titulo: "Ropa",
    texto: "Tengo una marca de ropa para mujer hecha en Colombia. Quiero mostrar mi colección y vender en línea con envío a todo el país.",
  },
  {
    titulo: "Servicios",
    texto: "Soy contador independiente y ayudo a pequeños negocios con sus impuestos. Quiero que me contacten para agendar una asesoría.",
  },
];

export type ResultadoDescripcion = { ok: true; descripcion: string } | { ok: false; mensaje: string };

/** Lo que se manda al servidor, o el mensaje que se le muestra a la persona. */
export function validarDescripcion(texto: string): ResultadoDescripcion {
  const descripcion = String(texto == null ? "" : texto).replace(/\s+/g, " ").trim();
  if (descripcion.length < DESCRIPCION_MIN) {
    return {
      ok: false,
      mensaje: `Cuéntanos un poco más de tu negocio (mínimo ${DESCRIPCION_MIN} letras): qué ofreces y qué quieres lograr con la página.`,
    };
  }
  return { ok: true, descripcion: descripcion.slice(0, DESCRIPCION_MAX) };
}

/** Cuántas letras faltan para el mínimo (0 si ya alcanza). */
export function letrasQueFaltan(texto: string): number {
  const largo = String(texto == null ? "" : texto).replace(/\s+/g, " ").trim().length;
  return Math.max(0, DESCRIPCION_MIN - largo);
}

/** El mensaje para el comercio cuando falla el envío. Sin jerga: el del servidor ya viene escrito para él. */
export function mensajeDeErrorPaginaConIA(error: any): string {
  const mensaje = error && error.error && typeof error.error.message === "string" ? error.error.message.trim() : "";
  if (mensaje) return mensaje;
  if (error && error.status === 0) return "No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.";
  return "No pudimos crear la página. Inténtalo de nuevo en un momento; si sigue igual, escríbenos por soporte.";
}
