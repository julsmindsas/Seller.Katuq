/**
 * Datos del panel «Contacto y cotización» (el módulo `contacto` del servidor, `functions/utils/sitioModulos/contacto.js`)
 * en el editor: los mismos topes y reglas. El servidor normaliza todo al guardar; aquí solo se ayuda y se avisa.
 */

/** Un punto de confianza: un ícono (opcional) y una línea de hasta 80 letras. */
export interface PuntoConfianza {
  icono: string;
  texto: string;
}

/** Topes del servidor (`contacto.js`): hasta 4 puntos de 80 letras, 6 opciones de 40, el antetítulo de 40 y la línea de respuesta de 80. */
export const TOPES_CONTACTO = Object.freeze({ puntos: 4, textoPunto: 80, intereses: 6, textoInteres: 40, antetitulo: 40, respuesta: 80 });

/** Los canales que el comercio puede quitar de la columna izquierda. Salen solos si hay dato real; sin dato no salen. */
export type CanalContacto = "whatsapp" | "correo" | "horario";
export const CANALES_CONTACTO: readonly CanalContacto[] = ["whatsapp", "correo", "horario"];

/** Los puntos para editar: siempre una lista nueva (el panel la arma y la devuelve con `conPuntos`). */
export function puntosDe(datos: any): PuntoConfianza[] {
  const fuente = Array.isArray(datos && datos.puntos) ? datos.puntos : [];
  return fuente.map((p: any) => ({ icono: String((p && p.icono) || ""), texto: String((p && p.texto) || "") }));
}

/**
 * Guarda los puntos en los datos del bloque. Los que están a medio llenar (sin texto) se conservan mientras el comercio
 * escribe: el servidor descarta los vacíos al guardar. Sin ícono, la clave no viaja (la página pone su chulo).
 */
export function conPuntos(datos: any, lista: PuntoConfianza[]): void {
  datos.puntos = lista.slice(0, TOPES_CONTACTO.puntos).map((p) => (p.icono ? { icono: p.icono, texto: p.texto } : { texto: p.texto }));
}

/** Las opciones de «¿Qué necesitas?» para editar (texto plano). */
export function interesesDe(datos: any): string[] {
  const fuente = Array.isArray(datos && datos.intereses) ? datos.intereses : [];
  return fuente.map((t: any) => (typeof t === "string" ? t : String((t && t.texto) || "")));
}

/** Los canales que el comercio quitó. */
export function canalesOcultosDe(datos: any): CanalContacto[] {
  const fuente = Array.isArray(datos && datos.canalesOcultos) ? datos.canalesOcultos : [];
  return CANALES_CONTACTO.filter((c) => fuente.includes(c));
}

/** Un número de relleno («3000000000», «573000000000»): la página tampoco lo muestra (es el del maestro sin llenar). */
export function esNumeroDeRelleno(tel: string | null | undefined): boolean {
  return /^(57)?3?0{6,}$/.test(String(tel || "").replace(/\D/g, ""));
}

const DIAS_CORTOS = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];

/** «lun a vie de 08:00 a 18:00», igual que lo escribe la página (y el botón de WhatsApp). */
export function textoHorarioAtencion(h: { dias?: number[]; desde?: string; hasta?: string } | null | undefined): string {
  if (!h) return "";
  const dias = (Array.isArray(h.dias) ? h.dias : []).slice().sort((a, b) => a - b);
  const seguidos = dias.length > 1 && dias.every((x, k) => k === 0 || x === dias[k - 1] + 1);
  const qDias = !dias.length ? "" : dias.length === 7 ? "todos los días" : seguidos ? `${DIAS_CORTOS[dias[0]]} a ${DIAS_CORTOS[dias[dias.length - 1]]}` : dias.map((x) => DIAS_CORTOS[x]).join(", ");
  return `${qDias} de ${h.desde} a ${h.hasta}`.trim();
}

/** «300 123 4567» para leer. */
export function numeroParaLeer(digitos: string | null | undefined): string {
  const d = String(digitos || "").replace(/\D/g, "");
  if (/^57\d{10}$/.test(d)) return `+57 ${d.slice(2, 5)} ${d.slice(5, 8)} ${d.slice(8)}`;
  if (/^3\d{9}$/.test(d)) return `${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6)}`;
  return d;
}
