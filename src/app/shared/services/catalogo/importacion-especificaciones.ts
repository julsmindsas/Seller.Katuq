import {
  AttributeSchemas,
  AtributoEfectivo,
  IndiceDeRutas,
  esquemaEfectivo,
} from './atributos-categoria';
import {
  AvisoDeFila,
  FilaDeLote,
  LecturaDeHoja,
  SEPARADOR_VALORES,
  TOPE_FILAS_POR_PETICION,
  hojaDePlantilla,
  instruccionesDeEspecificaciones,
  leerHoja,
  partirEnLotes,
} from './hoja-especificaciones';

/**
 * Importador del Seller con la hoja «Especificaciones» (D-495, ticket 1234, F2-42, F3;
 * design.md E10, tarea 10.4). Lógica PURA, sin Angular ni Excel ni red: `import-modal` solo
 * pinta y llama a `CatalogAttributesService`; aquí se decide qué categorías ofrecer, cómo
 * se arma la hoja de la plantilla, cómo se lee el archivo con el esquema, cómo se parte en
 * tandas de 200 filas, cómo se juntan los resultados por fila y qué se baja como
 * «Filas rechazadas». Todo se apoya en `hoja-especificaciones.ts` (10.3).
 *
 * Manda el servidor (POST /v1/productos/attributes/lote): vuelve a validar cada fila contra el
 * esquema de la categoría DEL PRODUCTO y es idempotente (lo que ya está igual no se escribe),
 * así que repetir una tanda es seguro.
 */

// ── Categorías para la plantilla ────────────────────────────────────────────

export interface RutaDePlantilla {
  /** Clave de ruta (la que entiende `esquemaEfectivo`). */
  ruta: string;
  /** Cómo se escribe en el árbol: `Networking > Routers`. */
  etiqueta: string;
  /** Atributos efectivos (propios y heredados). */
  atributos: number;
  heredados: number;
}

const esObjeto = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const propio = (o: unknown, k: string): boolean => esObjeto(o) && Object.prototype.hasOwnProperty.call(o, k);

function etiquetaDeRuta(ruta: string, indice?: IndiceDeRutas | null): string {
  const nombres = indice && esObjeto(indice.rutas) && propio(indice.rutas, ruta) ? indice.rutas[ruta] : null;
  return Array.isArray(nombres) && nombres.length ? nombres.join(' > ') : ruta;
}

/**
 * Las categorías que tienen al menos un atributo (propio o heredado): son las únicas para las
 * que una plantilla tiene columnas. Salen del índice del GET de esquemas (las rutas del árbol);
 * sin índice se usan las claves del documento de esquemas. Una subcategoría de «Networking»
 * aparece con los atributos que hereda de «Networking».
 */
export function rutasParaPlantilla(schemas: AttributeSchemas | null | undefined, indice?: IndiceDeRutas | null): RutaDePlantilla[] {
  if (!esObjeto(schemas)) return [];
  const claves = new Set<string>(indice && esObjeto(indice.rutas) ? Object.keys(indice.rutas) : Object.keys(schemas));
  const salida: RutaDePlantilla[] = [];
  claves.forEach((ruta) => {
    const efectivo = esquemaEfectivo(schemas, ruta, indice);
    if (!efectivo.length) return;
    salida.push({ ruta, etiqueta: etiquetaDeRuta(ruta, indice), atributos: efectivo.length, heredados: efectivo.filter((d) => d.heredado).length });
  });
  return salida.sort((a, b) => a.etiqueta.localeCompare(b.etiqueta, 'es'));
}

export interface HojaDePlantillaEspecificaciones {
  ruta: string;
  etiqueta: string;
  /** Encabezados y una fila de ejemplo (la hoja «Especificaciones»). */
  filas: (string | number)[][];
  /** Filas para sumar al final de la hoja «Instrucciones» (4 columnas). */
  instrucciones: string[][];
  anchos: number[];
  columnas: AtributoEfectivo[];
}

/** La hoja de la plantilla de una categoría, o null si la categoría no tiene atributos. */
export function hojaEspecificacionesDePlantilla(
  schemas: AttributeSchemas | null | undefined,
  indice: IndiceDeRutas | null | undefined,
  ruta: string,
): HojaDePlantillaEspecificaciones | null {
  const columnas = esquemaEfectivo(schemas, ruta, indice);
  if (!columnas.length) return null;
  const filas = hojaDePlantilla(columnas);
  return {
    ruta,
    etiqueta: etiquetaDeRuta(ruta, indice),
    filas,
    instrucciones: instruccionesDeEspecificaciones(columnas, indice),
    anchos: filas[0].map((h) => Math.max(14, Math.min(40, String(h).length + 2))),
    columnas,
  };
}

// ── Lectura ─────────────────────────────────────────────────────────────────

type Definicion = Pick<AtributoEfectivo, 'key' | 'type'> & Partial<AtributoEfectivo>;

/**
 * Las definiciones para leer una hoja cuando el archivo no dice de qué categoría es: la unión
 * de las de todas las rutas. Si una clave tiene tipo (o «varias») distinto entre rutas, se
 * deja sin definición: se lee como texto y el servidor decide con el esquema de la categoría de
 * cada producto (el sí/no se sigue reconociendo por `(SI/NO)` en el encabezado).
 *
 * `partirPorPuntoYComa`: las claves en conflicto que son lista de opciones en todas las rutas y
 * de varias opciones en alguna. El servidor no parte un texto «A; B» (lo tomaría como una sola
 * opción), así que `leerEspecificaciones` lo parte aquí cuando trae `;`.
 */
export function definicionesParaLeer(
  schemas: AttributeSchemas | null | undefined,
  indice?: IndiceDeRutas | null,
): { defs: Definicion[]; conflictos: string[]; partirPorPuntoYComa: string[] } {
  const porClave = new Map<string, Definicion>();
  const conflictos = new Set<string>();
  const sinOpciones = new Set<string>();
  const algunaMultiple = new Set<string>();
  const claves = esObjeto(schemas) ? (indice && esObjeto(indice.rutas) ? Object.keys(indice.rutas) : Object.keys(schemas)) : [];
  for (const ruta of claves) {
    for (const d of esquemaEfectivo(schemas, ruta, indice)) {
      if (d.type !== 'option') sinOpciones.add(d.key);
      if (d.type === 'option' && d.multiple === true) algunaMultiple.add(d.key);
      const previa = porClave.get(d.key);
      if (!previa) porClave.set(d.key, d);
      else if (previa.type !== d.type || (previa.multiple === true) !== (d.multiple === true)) conflictos.add(d.key);
    }
  }
  const defs: Definicion[] = [];
  porClave.forEach((d, k) => {
    if (!conflictos.has(k)) defs.push(d);
  });
  const partirPorPuntoYComa = Array.from(conflictos).filter((k) => !sinOpciones.has(k) && algunaMultiple.has(k));
  return { defs, conflictos: Array.from(conflictos), partirPorPuntoYComa };
}

/**
 * Lee la hoja con el esquema de la empresa (ver `definicionesParaLeer`). En las claves en conflicto
 * que son lista de opciones, «A; B» se manda como lista y un valor sin `;` queda como texto: así
 * lo aceptan tanto la categoría de una sola opción como la de varias.
 */
export function leerEspecificaciones(filas: unknown, schemas: AttributeSchemas | null | undefined, indice?: IndiceDeRutas | null): LecturaDeHoja {
  const { defs, partirPorPuntoYComa } = definicionesParaLeer(schemas, indice);
  const lectura = leerHoja(filas, defs);
  if (partirPorPuntoYComa.length) {
    for (const f of lectura.filas) {
      for (const k of partirPorPuntoYComa) {
        const v = f.attributes[k];
        if (typeof v === 'string' && v.includes(SEPARADOR_VALORES)) {
          const partes = v.split(SEPARADOR_VALORES).map((x) => x.trim()).filter(Boolean);
          if (partes.length > 1) f.attributes[k] = partes as any;
          else if (partes.length === 1) f.attributes[k] = partes[0];
        }
      }
    }
  }
  return lectura;
}

/** ¿La hoja trae algo que mostrar o mandar (filas, avisos o filas sin cambios)? */
export function hayContenido(lectura: LecturaDeHoja | null | undefined): boolean {
  return !!lectura && (lectura.filas.length > 0 || lectura.avisos.length > 0 || lectura.sinCambios.length > 0);
}

// ── Envío por tandas ────────────────────────────────────────────────────────

export interface ErrorDeFila {
  campo: string;
  etiqueta?: string;
  motivo: string;
  mensaje: string;
  opciones?: string[];
}

export type EstadoDeFila = 'ok' | 'sin_cambios' | 'error';

/** Una fila de la respuesta del servidor. */
export interface FilaRespondida {
  fila: number;
  estado: EstadoDeFila;
  escritos: number;
  borrados: number;
  errores: ErrorDeFila[];
}

export interface RespuestaLote {
  success: boolean;
  resumen: { total: number; ok: number; sin_cambios: number; rechazadas: number };
  filas: FilaRespondida[];
}

export interface ResultadoDeFila extends FilaRespondida {
  referencia: string;
}

export type CodigoDeFallo = 'sin_sesion' | 'sin_permiso' | 'no_disponible' | 'cuerpo_invalido' | 'demasiado_grande' | 'servidor' | 'red';

export interface FalloDeLote {
  /** 1 = primera tanda. */
  lote: number;
  codigo: CodigoDeFallo;
  /** Mensaje del servidor, si lo trajo (solo informativo). */
  detalle: string;
  filas: { fila: number; referencia: string }[];
  /** Volver a mandar la misma tanda puede funcionar (el lote es idempotente). */
  reintentable: boolean;
}

export interface ResumenEspecificaciones {
  total: number;
  ok: number;
  sinCambios: number;
  rechazadas: number;
  /** Filas cuya tanda no llegó al servidor o no se procesó. */
  noEnviadas: number;
  escritos: number;
  borrados: number;
  filas: ResultadoDeFila[];
  fallos: FalloDeLote[];
  /** Se dejó de mandar por un 401, 403 o 404 (no tiene sentido seguir). */
  detenidoPor: CodigoDeFallo | null;
}

export interface ClasificacionDeFallo {
  codigo: CodigoDeFallo;
  detalle: string;
  /** Las demás tandas fallarían igual: no se mandan. */
  detener: boolean;
  reintentable: boolean;
}

/** Del error de la petición al motivo que se le explica a la persona. */
export function clasificarFallo(err: any): ClasificacionDeFallo {
  const status = Number(err && err.status);
  const cuerpo = err && err.error;
  const detalle = typeof (cuerpo && cuerpo.message) === 'string' ? cuerpo.message : '';
  if (status === 401) return { codigo: 'sin_sesion', detalle, detener: true, reintentable: true };
  if (status === 403) return { codigo: 'sin_permiso', detalle, detener: true, reintentable: true };
  if (status === 404) return { codigo: 'no_disponible', detalle, detener: true, reintentable: true };
  if (status === 413) return { codigo: 'demasiado_grande', detalle, detener: false, reintentable: false };
  if (status === 400) return { codigo: 'cuerpo_invalido', detalle, detener: false, reintentable: false };
  if (status >= 500) return { codigo: 'servidor', detalle, detener: false, reintentable: true };
  return { codigo: 'red', detalle: '', detener: false, reintentable: true };
}

const MENSAJE_OMITIDA = 'El producto no se modificó (modo «Solo crear nuevos»): sus especificaciones tampoco.';
const MENSAJE_OMITIDA_INCIERTA = 'Con «Solo crear nuevos» no se pudo saber si el producto ya existía: no se cargó. Sube la hoja «Especificaciones» sola.';
const SIN_RESPUESTA: ErrorDeFila = { campo: '', motivo: 'sin_respuesta', mensaje: 'El servidor no devolvió resultado para esta fila.' };

function resumir(filas: ResultadoDeFila[], fallos: FalloDeLote[], detenidoPor: CodigoDeFallo | null): ResumenEspecificaciones {
  return {
    total: filas.length,
    ok: filas.filter((f) => f.estado === 'ok').length,
    sinCambios: filas.filter((f) => f.estado === 'sin_cambios').length,
    rechazadas: filas.filter((f) => f.estado === 'error').length,
    noEnviadas: fallos.reduce((n, f) => n + f.filas.length, 0),
    escritos: filas.reduce((n, f) => n + (f.estado === 'error' ? 0 : f.escritos || 0), 0),
    borrados: filas.reduce((n, f) => n + (f.estado === 'error' ? 0 : f.borrados || 0), 0),
    filas,
    fallos,
    detenidoPor,
  };
}

export interface OpcionesDeCarga {
  tope?: number;
  /** Para pintar «tanda X de Y». */
  alAvanzar?: (lote: number, totalLotes: number) => void;
}

/**
 * Manda las filas por tandas (una a la vez, en orden, esperando a cada una: sin temporizadores) y
 * junta lo que responde el servidor. NUNCA lanza: un fallo de una tanda queda anotado y las demás
 * siguen, salvo 401, 403 y 404 (que fallarían todas igual). Lo que ya se guardó no se pierde.
 */
export async function cargarEnLotes(
  filas: FilaDeLote[],
  enviar: (tanda: FilaDeLote[]) => Promise<RespuestaLote | null | undefined>,
  opciones: OpcionesDeCarga = {},
): Promise<ResumenEspecificaciones> {
  const tandas = partirEnLotes(Array.isArray(filas) ? filas : [], opciones.tope || TOPE_FILAS_POR_PETICION);
  const resultados: ResultadoDeFila[] = [];
  const fallos: FalloDeLote[] = [];
  let detenidoPor: CodigoDeFallo | null = null;
  let detalleDetenido = '';

  for (let i = 0; i < tandas.length; i++) {
    const tanda = tandas[i];
    const identidad = tanda.map((f) => ({ fila: f.fila, referencia: f.referencia }));
    if (detenidoPor) {
      fallos.push({ lote: i + 1, codigo: detenidoPor, detalle: detalleDetenido, filas: identidad, reintentable: true });
      continue;
    }
    if (opciones.alAvanzar) opciones.alAvanzar(i + 1, tandas.length);
    try {
      const respuesta = await enviar(tanda);
      const devueltas = respuesta && Array.isArray(respuesta.filas) ? respuesta.filas : null;
      if (!devueltas) throw { status: 500 };
      const porFila = new Map<number, FilaRespondida>();
      for (const d of devueltas) if (d && typeof d.fila === 'number') porFila.set(d.fila, d);
      for (const f of tanda) {
        const d = porFila.get(f.fila);
        resultados.push(
          d
            ? { fila: f.fila, referencia: f.referencia, estado: d.estado, escritos: d.escritos || 0, borrados: d.borrados || 0, errores: Array.isArray(d.errores) ? d.errores : [] }
            : { fila: f.fila, referencia: f.referencia, estado: 'error', escritos: 0, borrados: 0, errores: [{ ...SIN_RESPUESTA }] },
        );
      }
    } catch (err) {
      const c = clasificarFallo(err);
      fallos.push({ lote: i + 1, codigo: c.codigo, detalle: c.detalle, filas: identidad, reintentable: c.reintentable });
      if (c.detener) {
        detenidoPor = c.codigo;
        detalleDetenido = c.detalle;
      }
    }
  }
  return resumir(resultados, fallos, detenidoPor);
}

/** Las filas de las tandas que fallaron y que vale la pena volver a mandar. */
export function filasPorReintentar(resumen: ResumenEspecificaciones | null | undefined, lectura: LecturaDeHoja | null | undefined): FilaDeLote[] {
  if (!resumen || !lectura) return [];
  const pendientes = new Set<number>();
  for (const f of resumen.fallos) if (f.reintentable) for (const x of f.filas) pendientes.add(x.fila);
  return lectura.filas.filter((f) => pendientes.has(f.fila));
}

/**
 * Suma el resultado de un reintento al anterior: las filas ya resueltas se conservan, las que
 * volvieron a fallar quedan con su fallo nuevo y las que ahora sí llegaron salen de los fallos.
 */
export function unirResumenes(anterior: ResumenEspecificaciones, reintento: ResumenEspecificaciones): ResumenEspecificaciones {
  const reintentadas = new Set<number>();
  for (const f of reintento.filas) reintentadas.add(f.fila);
  for (const f of reintento.fallos) for (const x of f.filas) reintentadas.add(x.fila);
  const fallosViejos: FalloDeLote[] = [];
  for (const f of anterior.fallos) {
    const quedan = f.filas.filter((x) => !reintentadas.has(x.fila));
    if (quedan.length) fallosViejos.push({ ...f, filas: quedan });
  }
  const filas = [...anterior.filas.filter((f) => !reintentadas.has(f.fila)), ...reintento.filas].sort((a, b) => a.fila - b.fila);
  const fallos = [...fallosViejos, ...reintento.fallos].map((f, i) => ({ ...f, lote: i + 1 }));
  return resumir(filas, fallos, reintento.detenidoPor);
}

// ── Modo de la importación de productos ─────────────────────────────────────

export type ModoDeImportacion = 'create' | 'update' | 'upsert';

export interface FilaOmitidaPorModo {
  fila: number;
  referencia: string;
  /** `omitida_por_modo`: se sabe que el producto no se tocó. `omitida_por_modo_incierta`: no se pudo saber cuáles. */
  motivo: 'omitida_por_modo' | 'omitida_por_modo_incierta';
}

export interface FiltroPorModo {
  modo: ModoDeImportacion;
  /** `omittedDetails` que devolvió import-products: «<referencia>: ya existe, …» (el servidor manda solo los primeros 50). */
  detalles: string[];
  /** `omitted`: cuántos omitió de verdad. */
  totalOmitidos: number;
}

const referenciaDeOmitido = (detalle: string): string => {
  const i = typeof detalle === 'string' ? detalle.indexOf(': ya existe') : -1;
  return i > 0 ? detalle.slice(0, i).trim().toLowerCase() : '';
};

/**
 * Con «Solo crear nuevos» import-products no toca los productos que ya existían; las especificaciones de
 * esos productos tampoco se tocan. El servidor dice cuáles omitió, pero solo los primeros 50: si hay más
 * omitidos de los que se pueden identificar no se puede saber cuáles son, y por seguridad ninguna fila se
 * manda (se avisa, y la hoja se puede subir sola). Con «Solo actualizar existentes» o «Crear o actualizar»
 * no se filtra nada: lo que no existe lo rechaza el servidor como «referencia no encontrada».
 */
export function filtrarPorModo(filas: FilaDeLote[], filtro?: FiltroPorModo | null): { enviar: FilaDeLote[]; omitidas: FilaOmitidaPorModo[] } {
  const todas = Array.isArray(filas) ? filas : [];
  if (!filtro || filtro.modo !== 'create' || !(filtro.totalOmitidos > 0)) return { enviar: todas, omitidas: [] };
  const conocidas = new Set<string>();
  for (const d of Array.isArray(filtro.detalles) ? filtro.detalles : []) {
    const r = referenciaDeOmitido(d);
    if (r) conocidas.add(r);
  }
  if (conocidas.size < filtro.totalOmitidos) {
    return { enviar: [], omitidas: todas.map((f) => ({ fila: f.fila, referencia: f.referencia, motivo: 'omitida_por_modo_incierta' as const })) };
  }
  const enviar: FilaDeLote[] = [];
  const omitidas: FilaOmitidaPorModo[] = [];
  for (const f of todas) {
    if (conocidas.has(String(f.referencia).trim().toLowerCase())) omitidas.push({ fila: f.fila, referencia: f.referencia, motivo: 'omitida_por_modo' });
    else enviar.push(f);
  }
  return { enviar, omitidas };
}

/** Suma al resumen las filas que no se mandaron por el modo: quedan como rechazadas, con su motivo. */
export function agregarOmitidas(resumen: ResumenEspecificaciones, omitidas: FilaOmitidaPorModo[]): ResumenEspecificaciones {
  if (!omitidas.length) return resumen;
  const nuevas: ResultadoDeFila[] = omitidas.map((o) => ({
    fila: o.fila,
    referencia: o.referencia,
    estado: 'error',
    escritos: 0,
    borrados: 0,
    errores: [{ campo: '', motivo: o.motivo, mensaje: o.motivo === 'omitida_por_modo' ? MENSAJE_OMITIDA : MENSAJE_OMITIDA_INCIERTA }],
  }));
  const filas = [...resumen.filas, ...nuevas].sort((a, b) => a.fila - b.fila);
  return resumir(filas, resumen.fallos, resumen.detenidoPor);
}

// ── Filas rechazadas (Excel) ────────────────────────────────────────────────

export const ENCABEZADOS_RECHAZADAS = ['Fila del Excel', 'Referencia (SKU)', 'Especificación', 'Motivo', 'Opciones válidas'];

export interface OpcionesDeRechazadas {
  encabezados?: string[];
  /** Texto para una tanda que no llegó al servidor (ya traducido). */
  textoDeFallo?: (f: FalloDeLote) => string;
  /** Aviso de la lectura de la hoja (sin referencia, referencia repetida). */
  avisos?: AvisoDeFila[];
  /** Texto (ya traducido) de un error de fila generado aquí (`sin_respuesta`, `omitida_por_modo*`); el resto trae el mensaje del servidor. */
  textoDeError?: (e: ErrorDeFila) => string;
  /** Texto (ya traducido) de un aviso de la lectura. */
  textoDeAviso?: (a: AvisoDeFila) => string;
}

/**
 * La hoja «Filas rechazadas»: una fila por cada error de cada fila rechazada (con el campo y las
 * opciones válidas cuando el valor no era una de ellas), más los avisos de la lectura y las filas
 * cuya tanda no llegó al servidor. Vacía (solo encabezados) si no hubo nada que corregir.
 */
export function filasRechazadas(resumen: ResumenEspecificaciones | null | undefined, opciones: OpcionesDeRechazadas = {}): (string | number)[][] {
  const salida: (string | number)[][] = [opciones.encabezados || ENCABEZADOS_RECHAZADAS];
  const filas: { orden: number; celdas: (string | number)[] }[] = [];
  if (resumen) {
    for (const f of resumen.filas) {
      if (f.estado !== 'error') continue;
      const errores = f.errores.length ? f.errores : [{ ...SIN_RESPUESTA }];
      for (const e of errores) filas.push({ orden: f.fila, celdas: [f.fila, f.referencia, e.etiqueta || e.campo || '', opciones.textoDeError ? opciones.textoDeError(e) : e.mensaje, Array.isArray(e.opciones) ? e.opciones.join(' · ') : ''] });
    }
    for (const fallo of resumen.fallos) {
      const texto = opciones.textoDeFallo ? opciones.textoDeFallo(fallo) : fallo.detalle || fallo.codigo;
      for (const x of fallo.filas) filas.push({ orden: x.fila, celdas: [x.fila, x.referencia, '', texto, ''] });
    }
  }
  for (const a of opciones.avisos || []) filas.push({ orden: a.fila, celdas: [a.fila, '', '', opciones.textoDeAviso ? opciones.textoDeAviso(a) : a.mensaje, ''] });
  filas.sort((a, b) => a.orden - b.orden);
  for (const f of filas) salida.push(f.celdas);
  return salida;
}

/** Cuántas filas hay para bajar (sin contar el encabezado). */
export function totalRechazadas(resumen: ResumenEspecificaciones | null | undefined, avisos?: AvisoDeFila[]): number {
  return filasRechazadas(resumen, { avisos }).length - 1;
}
