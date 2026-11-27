import {
  CifraInforme,
  FilaInforme,
  ResumenInforme,
  TotalInforme,
} from "../../../../../shared/services/messaging/messaging.models";

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

/**
 * `dd/MM/yyyy HH:mm` en hora de Colombia (UTC-5, sin horario de verano), sin importar la zona del
 * navegador: así el informe y el CSV dicen la misma hora que el servidor. Vacío si no hay fecha válida.
 */
export function fechaColombia(iso: string | null | undefined): string {
  if (!iso) return "";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return "";
  const f = new Date(t - 5 * 3600 * 1000);
  return `${dosDig(f.getUTCDate())}/${dosDig(f.getUTCMonth() + 1)}/${f.getUTCFullYear()} ${dosDig(f.getUTCHours())}:${dosDig(f.getUTCMinutes())}`;
}

/** Una fecha `AAAA-MM-DD` como `dd/MM/yyyy` (sin pasar por la zona del navegador); si no lo es, tal cual. */
export function fechaCorta(fecha: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(fecha || ""));
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(fecha || "");
}

/** Filas por página de la auditoría (igual que el servidor). */
export const FILAS_POR_PAGINA = 50;

/** Una fila de motivos o etiquetas con su parte del total, para la barra. */
export interface TotalConPorcentaje extends TotalInforme {
  /** 0 a 100, entero. */
  pct: number;
}

/**
 * Porcentaje de cada fila sobre la suma de la lista (las barras suman 100 %). En motivos la suma es la de
 * cierres; en etiquetas es la de etiquetas usadas (un chat con dos etiquetas suma en las dos), por eso esa
 * columna dice «% de etiquetas usadas» y no «% de chats».
 */
export function conPorcentaje(lista: TotalInforme[] | null | undefined): TotalConPorcentaje[] {
  const filas = Array.isArray(lista) ? lista : [];
  const suma = filas.reduce((s, f) => s + (Number(f.total) || 0), 0);
  return filas.map((f) => ({ ...f, pct: suma > 0 ? Math.round(((Number(f.total) || 0) * 100) / suma) : 0 }));
}

/** Un número si el servidor lo mandó (cifras nuevas que aún pueden no llegar); si no, null. */
export function numeroOpcional(v: unknown): number | null {
  return typeof v === "number" && isFinite(v) ? v : null;
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

/** CSV de la auditoría: BOM, separador `;`, fechas en hora de Colombia. Sin teléfonos completos ni mensajes. */
export function construirCsv(filas: FilaInforme[], t: TextosCsv): string {
  const lineas = [t.cabeceras.map(celdaCsv).join(";")];
  for (const f of filas) {
    lineas.push(
      [
        // D-729: el CSV circula; el id del chat (lleva el hash del contacto) no sale en el archivo.
        t.nombreCanal(f.canal),
        t.nombreLinea ? t.nombreLinea(f.linea) : f.linea,
        f.contacto,
        f.asesor === "Sistema" ? t.sistema : f.asesor || "",
        f.cola || "",
        (f.etiquetas || []).join(" | "),
        fechaColombia(f.creadoEn),
        fechaColombia(f.ultimoMensajeEn),
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

/** Textos ya traducidos del CSV del resumen. */
export interface TextosCsvResumen {
  /** Encabezado del archivo, p. ej. «Informe de atención del 01/11/2026 al 07/11/2026 (hora de Colombia)». */
  titulo: string;
  cifras: string;
  valor: string;
  creados: string;
  cerrados: string;
  abiertos: string;
  sinResponder: string;
  primeraRespuestaSeg: string;
  conPrimeraRespuesta: string;
  /** Cifras que el servidor puede mandar después; si no llegan, su fila no sale. */
  opcionales: { clientesNuevos: string; clientesVuelven: string; reabiertos: string; p90Seg: string; dentroObjetivoPct: string };
  porCanal: string;
  porCola: string;
  porAsesor: string;
  porMotivo: string;
  porEtiqueta: string;
  colCanal: string;
  colCola: string;
  colAsesor: string;
  colMotivo: string;
  colEtiqueta: string;
  colCreados: string;
  colCerrados: string;
  colTotal: string;
  colPct: string;
  /** Cabecera del % de etiquetas: es sobre las etiquetas usadas, no sobre los chats. */
  colPctEtiquetas: string;
  sinCola: string;
  sinAsignar: string;
  sistema: string;
  nombreCanal: (canal: string) => string;
}

/**
 * CSV del resumen (las cifras y las tablas pequeñas), armado con lo que ya está en pantalla: BOM, separador
 * `;` y celdas sin fórmulas. Solo cifras y nombres de canal, cola, asesor, motivo y etiqueta: ningún
 * contacto ni id de chat.
 */
export function construirCsvResumen(r: ResumenInforme, t: TextosCsvResumen): string {
  const filas: unknown[][] = [];
  const bloque = (titulo: string, cabeceras: string[], datos: unknown[][]) => {
    filas.push([]);
    filas.push([titulo]);
    filas.push(cabeceras);
    datos.forEach((d) => filas.push(d));
  };
  filas.push([t.titulo]);
  const cifras: unknown[][] = [
    [t.creados, r.creados],
    [t.cerrados, r.cerrados],
    [t.abiertos, r.abiertos],
    [t.sinResponder, r.sinResponder],
    [t.primeraRespuestaSeg, r.primeraRespuestaSeg ?? ""],
    [t.conPrimeraRespuesta, r.conPrimeraRespuesta ?? ""],
  ];
  const opc: Array<[string, unknown]> = [
    [t.opcionales.clientesNuevos, r.clientesNuevos],
    [t.opcionales.clientesVuelven, r.clientesVuelven],
    [t.opcionales.reabiertos, r.reabiertos],
    [t.opcionales.p90Seg, r.primeraRespuestaP90Seg],
    [t.opcionales.dentroObjetivoPct, r.dentroObjetivoPct],
  ];
  opc.forEach(([k, v]) => {
    const n = numeroOpcional(v);
    if (n !== null) cifras.push([k, n]);
  });
  bloque(t.cifras, [t.cifras, t.valor], cifras);

  const nombreCola = (f: CifraInforme) => (f.clave === "" ? t.sinCola : f.nombre);
  const nombreAsesor = (f: CifraInforme) => (f.clave === "" ? t.sinAsignar : f.clave === "sistema" ? t.sistema : f.nombre);
  bloque(t.porCanal, [t.colCanal, t.colCreados, t.colCerrados], (r.porCanal || []).map((f) => [t.nombreCanal(f.clave), f.creados, f.cerrados]));
  bloque(t.porCola, [t.colCola, t.colCreados, t.colCerrados], (r.porCola || []).map((f) => [nombreCola(f), f.creados, f.cerrados]));
  bloque(t.porAsesor, [t.colAsesor, t.colCreados, t.colCerrados], (r.porAsesor || []).map((f) => [nombreAsesor(f), f.creados, f.cerrados]));
  bloque(t.porMotivo, [t.colMotivo, t.colTotal, t.colPct], conPorcentaje(r.porMotivo).map((f) => [f.nombre, f.total, f.pct]));
  bloque(t.porEtiqueta, [t.colEtiqueta, t.colTotal, t.colPctEtiquetas], conPorcentaje(r.porEtiqueta).map((f) => [f.nombre, f.total, f.pct]));
  return "\uFEFF" + filas.map((f) => f.map(celdaCsv).join(";")).join("\r\n");
}

/** Descarga un texto como archivo CSV desde el navegador (nada se guarda en el servidor). */
export function descargarCsv(texto: string, nombre: string): void {
  const blob = new Blob([texto], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombre;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
