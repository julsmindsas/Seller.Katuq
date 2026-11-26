import { FilaInforme } from "../../../../../shared/services/messaging/messaging.models";

/** Máximo de días del informe (D-729). El servidor responde 422 si se pasa; el front lo valida antes. */
export const MAX_DIAS_INFORME = 31;

/** Fecha `AAAA-MM-DD` de hoy en hora de Colombia (UTC-5), la misma que usa el servidor. */
export function hoyColombia(ahora: number = Date.now()): string {
  return new Date(ahora - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

/** Suma (o resta) días a una fecha `AAAA-MM-DD` sin depender de la zona horaria del navegador. */
export function sumarDias(fecha: string, dias: number): string {
  const [a, m, d] = fecha.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

/** Días del rango, ambos extremos incluidos; NaN si alguna fecha no es válida. */
export function diasDelRango(desde: string, hasta: string): number {
  const ok = (f: string) => /^\d{4}-\d{2}-\d{2}$/.test(f) && !isNaN(Date.parse(f));
  if (!ok(desde) || !ok(hasta)) return NaN;
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86400000) + 1;
}

/** Texto de un tiempo en segundos: «45 s», «12 min» o «1 h 5 min». Vacío = «—». */
export function textoSegundos(seg: number | null | undefined): string {
  if (seg === null || seg === undefined || isNaN(seg)) return "—";
  if (seg < 60) return `${seg} s`;
  return textoMinutos(Math.round(seg / 60));
}

/** Texto de una duración en minutos: «12 min» o «1 h 5 min». */
export function textoMinutos(min: number | null | undefined): string {
  if (min === null || min === undefined || isNaN(min)) return "—";
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

function dosDig(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

/** `dd/MM/yyyy HH:mm` en hora local del navegador; vacío si no hay fecha válida. */
export function fechaLocal(iso: string | null | undefined): string {
  if (!iso) return "";
  const f = new Date(iso);
  if (isNaN(f.getTime())) return "";
  return `${dosDig(f.getDate())}/${dosDig(f.getMonth() + 1)}/${f.getFullYear()} ${dosDig(f.getHours())}:${dosDig(f.getMinutes())}`;
}

/** Una celda de CSV con separador `;`: comillas dobles escapadas y sin fórmulas (=, +, -, @). */
export function celdaCsv(valor: unknown): string {
  let t = valor === null || valor === undefined ? "" : String(valor);
  if (/^[=+\-@\t\r]/.test(t)) t = `'${t}`;
  return /[";\r\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
}

export interface TextosCsv {
  cabeceras: string[];
  abierto: string;
  cerrado: string;
  sistema: string;
  nombreCanal: (canal: string) => string;
  /** Nombre visible del número o cuenta; sin él sale el identificador. */
  nombreLinea?: (lineId: string) => string;
}

/** CSV de la auditoría: BOM, separador `;`, fechas en hora local. Sin teléfonos completos ni mensajes. */
export function construirCsv(filas: FilaInforme[], t: TextosCsv): string {
  const lineas = [t.cabeceras.map(celdaCsv).join(";")];
  for (const f of filas) {
    lineas.push(
      [
        // D-729: el CSV circula; el id del chat (lleva el hash del contacto) no sale en el archivo.
        t.nombreCanal(f.canal),
        t.nombreLinea ? t.nombreLinea(f.linea) : f.linea,
        f.contacto,
        f.asesor || "",
        f.cola || "",
        (f.etiquetas || []).join(" | "),
        fechaLocal(f.creadoEn),
        fechaLocal(f.ultimoMensajeEn),
        f.estado === "cerrado" ? t.cerrado : t.abierto,
        f.motivoCierre || "",
        f.cerradoPor === "Sistema" ? t.sistema : f.cerradoPor || "",
        f.duracionMin ?? "",
        f.primeraRespuestaSeg ?? "",
      ]
        .map(celdaCsv)
        .join(";"),
    );
  }
  return "﻿" + lineas.join("\r\n");
}
