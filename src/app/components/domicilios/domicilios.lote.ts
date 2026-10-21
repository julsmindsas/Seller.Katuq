import { textoDeCodigo } from './domicilios.errores';
import { DomicilioNuevo, ResultadoLote } from './domicilios.models';
import { ArchivoLeido, celdaCsv, FilaLeida } from './domicilios.utils';

/**
 * Archivo y lote: qué filas se pueden enviar, cómo se resume lo que respondió el servidor y el CSV con
 * las que fallaron para corregirlas y volver a subirlas. Lógica pura, sin Angular ni DOM.
 */

function plural(n: number, uno: string, varios: string): string {
  return `${n} ${n === 1 ? uno : varios}`;
}

/** Más que esto no es un archivo de domicilios (50 filas pesan unos pocos KB; el servidor acepta 256 KB). */
export const MAX_BYTES_ARCHIVO = 512 * 1024;

/** Frase con lo que está mal del archivo elegido, o `null` si se puede leer. */
export function validarArchivoElegido(archivo: { name?: string; size?: number; type?: string } | null | undefined): string | null {
  if (!archivo) return 'No se pudo leer el archivo. Intenta de nuevo.';
  const nombre = String(archivo.name || '').toLowerCase();
  const tipo = String(archivo.type || '').toLowerCase();
  const esCsv = nombre.endsWith('.csv') || tipo === 'text/csv' || tipo === 'application/csv';
  if (!esCsv) return 'El archivo debe ser .csv. Si lo tienes en Excel, usa «Guardar como» y elige CSV.';
  if (!archivo.size) return 'El archivo está vacío.';
  if (archivo.size > MAX_BYTES_ARCHIVO) return 'El archivo es demasiado grande. Debe traer máximo 50 domicilios.';
  return null;
}

export interface ResumenArchivo {
  listos: FilaLeida[];
  conErrores: FilaLeida[];
  /** «3 listos, 1 con errores». */
  texto: string;
}

export function resumirArchivo(archivo: ArchivoLeido): ResumenArchivo {
  const listos = archivo.filas.filter(f => f.errores.length === 0);
  const conErrores = archivo.filas.filter(f => f.errores.length > 0);
  const texto = `${plural(listos.length, 'listo', 'listos')}, ${plural(conErrores.length, 'con error', 'con errores')}`;
  return { listos, conErrores, texto };
}

export type EstadoItemLote = 'creado' | 'repetido' | 'fallo';

export interface ItemResultadoLote {
  /** Posición dentro de lo que se envió. */
  indice: number;
  /** Línea del archivo de donde salió. */
  linea: number;
  estado: EstadoItemLote;
  cliente: string;
  idExterno: string;
  /** Número del domicilio creado o ya existente. */
  numero: string | null;
  /** Por qué falló, en una frase. */
  motivo: string | null;
  campo: string | null;
  codigo: string | null;
  domicilio: DomicilioNuevo;
}

export interface ResumenLote {
  items: ItemResultadoLote[];
  creados: ItemResultadoLote[];
  repetidos: ItemResultadoLote[];
  fallidos: ItemResultadoLote[];
  /** «2 creados, 1 repetido, 1 falló». */
  texto: string;
}

const MOTIVO_SIN_RESPUESTA = 'El servidor no dijo qué pasó con este domicilio. Revisa en «Mis domicilios» si se creó.';

/**
 * Une cada fila enviada con lo que respondió el servidor (por su `indice`). Una fila sin respuesta cuenta
 * como fallida, para que nunca se dé por creado algo que no se confirmó.
 */
export function agruparResultadosLote(resultados: ResultadoLote[] | null | undefined, enviadas: FilaLeida[]): ResumenLote {
  const porIndice = new Map<number, ResultadoLote>();
  (Array.isArray(resultados) ? resultados : []).forEach(r => {
    if (r && typeof r.indice === 'number') porIndice.set(r.indice, r);
  });

  const items: ItemResultadoLote[] = enviadas.map((fila, indice) => {
    const r = porIndice.get(indice);
    const base = {
      indice,
      linea: fila.linea,
      cliente: fila.domicilio.entrega.nombre,
      idExterno: fila.domicilio.idExterno,
      campo: null as string | null,
      codigo: null as string | null,
      domicilio: fila.domicilio
    };
    if (r && r.success) {
      return {
        ...base,
        estado: r.repetido ? 'repetido' : 'creado',
        numero: r.domicilio?.numero ?? null,
        motivo: null
      } as ItemResultadoLote;
    }
    return {
      ...base,
      estado: 'fallo',
      numero: null,
      motivo: r ? (r.error || textoDeCodigo(r.codigo) || 'No se pudo crear.') : MOTIVO_SIN_RESPUESTA,
      campo: r?.campo ?? null,
      codigo: r?.codigo ?? (r ? null : 'SIN_RESPUESTA')
    } as ItemResultadoLote;
  });

  const creados = items.filter(i => i.estado === 'creado');
  const repetidos = items.filter(i => i.estado === 'repetido');
  const fallidos = items.filter(i => i.estado === 'fallo');
  const partes = [plural(creados.length, 'creado', 'creados')];
  if (repetidos.length) partes.push(plural(repetidos.length, 'repetido', 'repetidos'));
  if (fallidos.length) partes.push(`${fallidos.length} ${fallidos.length === 1 ? 'falló' : 'fallaron'}`);
  return { items, creados, repetidos, fallidos, texto: partes.join(', ') };
}

const ENCABEZADOS_FALLIDOS = [
  'id_externo', 'cliente', 'telefono', 'direccion', 'ciudad', 'barrio', 'indicaciones',
  'valor_domicilio', 'valor_pedido', 'cobrar_al_entregar', 'descripcion', 'motivo_del_error'
];

/**
 * CSV con los que fallaron: las mismas columnas de la plantilla (se puede corregir y volver a subir) y al
 * final el motivo. Con `;` y BOM para que Excel en español lo abra bien.
 */
export function csvDeFallidos(fallidos: ItemResultadoLote[]): string {
  const filas = fallidos.map(i => {
    const d = i.domicilio;
    return [
      d.idExterno, d.entrega.nombre, d.entrega.telefono, d.entrega.direccion, d.entrega.ciudad, d.entrega.barrio,
      d.entrega.indicaciones, d.valorDomicilio || '', d.valorPedido || '', d.cobrarAlEntregar || '', d.descripcion,
      i.motivo || ''
    ].map(celdaCsv).join(';');
  });
  return '﻿' + [ENCABEZADOS_FALLIDOS.join(';'), ...filas].join('\r\n') + '\r\n';
}

export const NOMBRE_ARCHIVO_FALLIDOS = 'domicilios-que-fallaron.csv';
