import { MiembroEquipo } from "../../../../shared/services/messaging/messaging.models";

/**
 * Nombre visible de un asesor: el del equipo del comercio; si no está, el nombre guardado en el chat (que en
 * acciones viejas puede ser el mismo correo); y solo al final, el correo. Así «Atiende ana@tienda.com» se lee
 * «Atiende Ana López» aunque el chat haya guardado el correo como nombre. Función pura: no guarda nada.
 */
export function nombreDeAsesor(
  email: string | null | undefined,
  nombreGuardado: string | null | undefined,
  equipo: MiembroEquipo[] | null | undefined,
): string {
  return nombreConMapa(email, nombreGuardado, mapaDeEquipo(equipo));
}

/** Mapa correo → nombre del equipo, para resolver muchas filas sin recorrer la lista cada vez. */
export function mapaDeEquipo(equipo: MiembroEquipo[] | null | undefined): Map<string, string> {
  const mapa = new Map<string, string>();
  for (const m of equipo || []) {
    const clave = (m.email || "").trim().toLowerCase();
    const nombre = (m.nombre || "").trim();
    if (clave && nombre && nombre.toLowerCase() !== clave) mapa.set(clave, nombre);
  }
  return mapa;
}

/** Igual que `nombreDeAsesor`, con el mapa ya armado. */
export function nombreConMapa(
  email: string | null | undefined,
  nombreGuardado: string | null | undefined,
  mapa: Map<string, string>,
): string {
  const correo = String(email || "").trim();
  const delEquipo = mapa.get(correo.toLowerCase());
  if (delEquipo) return delEquipo;
  const guardado = String(nombreGuardado || "").trim();
  if (guardado && guardado.toLowerCase() !== correo.toLowerCase()) return guardado;
  return correo || guardado;
}
