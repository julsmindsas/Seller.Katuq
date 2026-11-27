import { FiltroListaGuardado } from "../bandeja-lista/bandeja-lista.component";

/**
 * Lo que la bandeja recuerda en este navegador. Son comodidades de cada persona: si el navegador no deja guardar
 * (ventana privada, datos bloqueados), todo sigue igual que antes, sin recordar nada.
 *
 * - Al volver (de un pedido, por ejemplo): el chat abierto y los filtros. Va en `sessionStorage` (solo esta
 *   pestaña) y vence a las 4 horas. Solo guarda claves internas de la fila (hash del número, nunca el número)
 *   y los filtros; no la búsqueda, que puede ser el número o el nombre de un cliente.
 * - El último motivo de cierre que usó la persona, en `localStorage`.
 */
export interface VueltaBandeja {
  /** Clave de la fila abierta (`whatsapp|<hash>…` o `<red>|<hash>`); null = ninguna. */
  clave: string | null;
  asesor: string | null;
  cola: string | null;
  filtro: FiltroListaGuardado | null;
  /** Cuándo se guardó (ms). */
  en: number;
}

const VIGENCIA_VUELTA_MS = 4 * 60 * 60 * 1000;

function claveDe(base: string, usuario: string): string {
  return `katuq.bandeja.${base}.${usuario.toLowerCase()}`;
}

/** Quita la búsqueda (también la que dejó guardada una versión anterior). */
function sinBusqueda(filtro: FiltroListaGuardado): FiltroListaGuardado {
  const copia = { ...filtro } as FiltroListaGuardado & { busqueda?: unknown };
  delete copia.busqueda;
  return copia;
}

export function leerVuelta(usuario: string): VueltaBandeja | null {
  if (!usuario) return null;
  try {
    const crudo = sessionStorage.getItem(claveDe("vuelta", usuario));
    if (!crudo) return null;
    const v = JSON.parse(crudo) as Partial<VueltaBandeja> | null;
    if (!v || typeof v !== "object" || typeof v.en !== "number" || Date.now() - v.en > VIGENCIA_VUELTA_MS) return null;
    return {
      clave: typeof v.clave === "string" && v.clave ? v.clave : null,
      asesor: typeof v.asesor === "string" && v.asesor ? v.asesor : null,
      cola: typeof v.cola === "string" && v.cola ? v.cola : null,
      filtro: v.filtro && typeof v.filtro === "object" ? sinBusqueda(v.filtro) : null,
      en: v.en,
    };
  } catch {
    return null;
  }
}

export function guardarVuelta(usuario: string, v: Omit<VueltaBandeja, "en">): void {
  if (!usuario) return;
  try {
    const filtro = v.filtro ? sinBusqueda(v.filtro) : null;
    sessionStorage.setItem(claveDe("vuelta", usuario), JSON.stringify({ ...v, filtro, en: Date.now() }));
  } catch {
    // Sin almacenamiento: no se recuerda nada.
  }
}

export function leerUltimoMotivo(usuario: string): string {
  if (!usuario) return "";
  try {
    const m = localStorage.getItem(claveDe("ultimoMotivo", usuario));
    return typeof m === "string" ? m.slice(0, 200) : "";
  } catch {
    return "";
  }
}

export function guardarUltimoMotivo(usuario: string, motivo: string): void {
  if (!usuario || !motivo) return;
  try {
    localStorage.setItem(claveDe("ultimoMotivo", usuario), motivo.slice(0, 200));
  } catch {
    // Sin almacenamiento: el motivo no queda marcado la próxima vez.
  }
}
