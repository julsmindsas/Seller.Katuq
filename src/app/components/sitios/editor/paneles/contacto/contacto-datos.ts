/**
 * Datos del panel «Contacto y cotización» (el módulo `contacto` del servidor, `functions/utils/sitioModulos/contacto.js`)
 * en el editor: los mismos topes y reglas. El servidor normaliza todo al guardar; aquí solo se ayuda y se avisa.
 */

/** Un punto de confianza: un ícono (opcional) y una línea de hasta 80 letras. */
export interface PuntoConfianza {
  icono: string;
  texto: string;
}

/** Una opción de «¿Qué necesitas?»: el texto, una línea de lo que cubre y un ícono (estos dos solo los pinta el cotizador por pasos). */
export interface NecesidadContacto {
  texto: string;
  detalle: string;
  icono: string;
}

/** Cómo se ve la sección: la tarjeta de siempre («plano») o el cotizador por pasos («guiado»). */
export type ModoContacto = "plano" | "guiado";

/**
 * Topes del servidor (`contacto.js`): hasta 4 puntos de 80 letras, 6 opciones de 40 (con su línea de 60), 8 marcas de 24, el
 * antetítulo de 40 y la línea de respuesta de 80.
 */
export const TOPES_CONTACTO = Object.freeze({
  puntos: 4,
  textoPunto: 80,
  intereses: 6,
  textoInteres: 40,
  detalleInteres: 60,
  marcas: 8,
  textoMarca: 24,
  antetitulo: 40,
  respuesta: 80,
});

/** Lo más angosta que puede ser una imagen del cotizador para no verse borrosa (la columna mide hasta ~560 px en pantallas grandes). */
export const ANCHO_MINIMO_IMAGEN = 1000;

export function modoDe(datos: any): ModoContacto {
  return datos && datos.modo === "guiado" ? "guiado" : "plano";
}

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

/**
 * Las opciones de «¿Qué necesitas?» para editar: las `necesidades` o, si el sitio solo trae los `intereses` de siempre
 * (solo texto), esos mismos. Siempre una lista nueva.
 */
export function necesidadesDe(datos: any): NecesidadContacto[] {
  const nuevas = Array.isArray(datos && datos.necesidades) ? datos.necesidades : [];
  const viejas = Array.isArray(datos && datos.intereses) ? datos.intereses : [];
  const fuente = nuevas.length ? nuevas : viejas;
  return fuente.map((n: any) =>
    typeof n === "string"
      ? { texto: n, detalle: "", icono: "" }
      : { texto: String((n && n.texto) || ""), detalle: String((n && n.detalle) || ""), icono: String((n && n.icono) || "") }
  );
}

/**
 * Guarda las opciones en `necesidades` y quita los `intereses` viejos (el servidor lee primero las `necesidades`, y así no
 * quedan dos listas). Las filas a medio llenar (sin texto) se conservan mientras se escribe: el servidor las descarta.
 */
export function conNecesidades(datos: any, lista: NecesidadContacto[]): void {
  datos.necesidades = lista.slice(0, TOPES_CONTACTO.intereses).map((n) => ({
    texto: n.texto,
    ...(n.detalle ? { detalle: n.detalle } : {}),
    ...(n.icono ? { icono: n.icono } : {}),
  }));
  delete datos.intereses;
}

/** Las marcas en texto del cotizador por pasos. */
export function marcasDe(datos: any): string[] {
  const fuente = Array.isArray(datos && datos.marcas) ? datos.marcas : [];
  return fuente.map((m: any) => (typeof m === "string" ? m : String((m && m.texto) || "")));
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
