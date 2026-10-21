import { DomicilioNuevo, EstadoDomicilio, PuntoDomicilio } from './domicilios.models';

/** Cuántos domicilios se mandan juntos en un archivo; el servidor tiene el mismo tope. */
export const MAX_FILAS_POR_LOTE = 50;

export const PUNTO_VACIO: PuntoDomicilio = {
  nombre: '', telefono: '', direccion: '', ciudad: '', barrio: '', indicaciones: ''
};

export function domicilioVacio(recogida?: Partial<PuntoDomicilio>): DomicilioNuevo {
  return {
    idExterno: '',
    recogida: { ...PUNTO_VACIO, ...recogida },
    entrega: { ...PUNTO_VACIO },
    valorDomicilio: 0,
    valorPedido: 0,
    cobrarAlEntregar: 0,
    descripcion: ''
  };
}

/** Quita tildes, pasa a minúsculas y deja solo letras y números: «Valor del domicilio» → «valordeldomicilio». */
function clave(texto: string): string {
  return String(texto || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Columnas del archivo, con los nombres con los que se las conoce. La primera es la de la plantilla;
 * las demás son nombres que la gente suele escribir. Las de recogida son opcionales: lo que falte se
 * toma de la dirección de recogida que se eligió en la pantalla.
 */
const COLUMNAS: Array<{ campo: string; nombres: string[] }> = [
  { campo: 'idExterno', nombres: ['id_externo', 'pedido', 'numero_pedido', 'referencia', 'id'] },
  { campo: 'recogida.nombre', nombres: ['recogida_nombre', 'recoger_en', 'tienda'] },
  { campo: 'recogida.telefono', nombres: ['recogida_telefono'] },
  { campo: 'recogida.direccion', nombres: ['recogida_direccion', 'direccion_recogida'] },
  { campo: 'recogida.ciudad', nombres: ['recogida_ciudad', 'ciudad_recogida'] },
  { campo: 'recogida.barrio', nombres: ['recogida_barrio'] },
  { campo: 'recogida.indicaciones', nombres: ['recogida_indicaciones'] },
  { campo: 'entrega.nombre', nombres: ['cliente', 'cliente_nombre', 'entrega_nombre', 'destinatario', 'nombre'] },
  { campo: 'entrega.telefono', nombres: ['telefono', 'celular', 'cliente_telefono', 'entrega_telefono'] },
  { campo: 'entrega.direccion', nombres: ['direccion', 'direccion_entrega', 'entrega_direccion'] },
  { campo: 'entrega.ciudad', nombres: ['ciudad', 'ciudad_entrega', 'entrega_ciudad'] },
  { campo: 'entrega.barrio', nombres: ['barrio', 'entrega_barrio'] },
  { campo: 'entrega.indicaciones', nombres: ['indicaciones', 'observaciones', 'notas', 'entrega_indicaciones'] },
  { campo: 'valorDomicilio', nombres: ['valor_domicilio', 'domicilio', 'valor_envio', 'envio'] },
  { campo: 'valorPedido', nombres: ['valor_pedido', 'valor', 'total'] },
  { campo: 'cobrarAlEntregar', nombres: ['cobrar_al_entregar', 'cobrar', 'contraentrega', 'valor_a_cobrar'] },
  { campo: 'descripcion', nombres: ['descripcion', 'contenido', 'producto'] }
];

const CAMPO_POR_ENCABEZADO = new Map<string, string>();
for (const { campo, nombres } of COLUMNAS) {
  for (const nombre of nombres) CAMPO_POR_ENCABEZADO.set(clave(nombre), campo);
}

/** Plantilla para descargar: encabezados y una fila de ejemplo, con `;` y BOM para que Excel en español la abra bien. */
export function plantillaCsv(): string {
  const encabezados = [
    'id_externo', 'cliente', 'telefono', 'direccion', 'ciudad', 'barrio', 'indicaciones',
    'valor_domicilio', 'valor_pedido', 'cobrar_al_entregar', 'descripcion'
  ];
  const ejemplo = [
    'MP-1001', 'Ana Gómez', '3101234567', 'Calle 10 # 5-20 apto 301', 'Bogotá', 'Chapinero', 'Torre 2, portería',
    '7000', '45000', '52000', '2 hamburguesas'
  ];
  return '﻿' + [encabezados, ejemplo].map(f => f.join(';')).join('\r\n') + '\r\n';
}

/** Lee un CSV: separador `;`, `,` o tabulador (se elige por el encabezado), comillas con `""` y saltos de línea dentro de comillas. */
export function parsearCsv(texto: string): string[][] {
  const limpio = String(texto || '').replace(/^﻿/, '');
  const primera = limpio.split(/\r?\n/, 1)[0] || '';
  const separadores = [';', ',', '\t'];
  const sep = separadores
    .map(s => ({ s, n: primera.split(s).length }))
    .sort((a, b) => b.n - a.n)[0].s;

  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let entreComillas = false;
  for (let i = 0; i < limpio.length; i++) {
    const c = limpio[i];
    if (entreComillas) {
      if (c === '"') {
        if (limpio[i + 1] === '"') { celda += '"'; i++; } else { entreComillas = false; }
      } else {
        celda += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === sep) {
      fila.push(celda); celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && limpio[i + 1] === '\n') i++;
      fila.push(celda); celda = '';
      filas.push(fila); fila = [];
    } else {
      celda += c;
    }
  }
  if (celda !== '' || fila.length > 0) { fila.push(celda); filas.push(fila); }
  return filas.filter(f => f.some(c => c.trim() !== ''));
}

/** «$ 7.000», «7,000», «7000» y «7000,50» → número. Vacío o ilegible → 0. */
export function leerValor(texto: unknown): number {
  let t = String(texto ?? '').replace(/[^\d.,-]/g, '');
  if (!t) return 0;
  const conComa = t.lastIndexOf(',');
  const conPunto = t.lastIndexOf('.');
  if (conComa > -1 && conPunto > -1) {
    // El último de los dos es el decimal.
    t = conComa > conPunto ? t.replace(/\./g, '').replace(',', '.') : t.replace(/,/g, '');
  } else if (conComa > -1 || conPunto > -1) {
    const pos = Math.max(conComa, conPunto);
    const decimales = t.length - pos - 1;
    // «7.000» o «1,234,567»: un solo separador seguido de 3 cifras es de miles.
    t = decimales === 3 ? t.replace(/[.,]/g, '') : t.replace(',', '.');
  }
  const n = Number(t);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Solo dígitos del teléfono; si trae el 57 de Colombia delante de un celular de 10 cifras, se lo quita. */
export function limpiarTelefono(texto: unknown): string {
  const digitos = String(texto ?? '').replace(/\D/g, '');
  return digitos.length === 12 && digitos.startsWith('57') ? digitos.slice(2) : digitos;
}

export interface ErrorDeCampo {
  /** Nombre del campo como lo usa la API: `entrega.ciudad`, `valorDomicilio`… */
  campo: string;
  mensaje: string;
}

/** Lo que falta o está mal en un domicilio, cada cosa con el campo al que pertenece. Vacío si está bien. */
export function validarDomicilioPorCampo(d: DomicilioNuevo): ErrorDeCampo[] {
  const errores: ErrorDeCampo[] = [];
  if (!d.entrega.nombre.trim()) errores.push({ campo: 'entrega.nombre', mensaje: 'Falta el nombre de quien recibe.' });
  const tel = limpiarTelefono(d.entrega.telefono);
  if (tel.length < 7 || tel.length > 15) errores.push({ campo: 'entrega.telefono', mensaje: 'El teléfono de quien recibe no es válido.' });
  if (!d.entrega.direccion.trim()) errores.push({ campo: 'entrega.direccion', mensaje: 'Falta la dirección de entrega.' });
  if (!d.entrega.ciudad.trim()) errores.push({ campo: 'entrega.ciudad', mensaje: 'Falta la ciudad de entrega.' });
  if (!d.recogida.direccion.trim()) errores.push({ campo: 'recogida.direccion', mensaje: 'Falta la dirección de recogida.' });
  if (!d.recogida.ciudad.trim()) errores.push({ campo: 'recogida.ciudad', mensaje: 'Falta la ciudad de recogida.' });
  if (!(d.valorDomicilio > 0)) errores.push({ campo: 'valorDomicilio', mensaje: 'El valor del domicilio debe ser mayor a cero.' });
  return errores;
}

/** Lo que falta o está mal en un domicilio, en frases para quien lo escribe. Vacío si está bien. */
export function validarDomicilio(d: DomicilioNuevo): string[] {
  return validarDomicilioPorCampo(d).map(e => e.mensaje);
}

export interface FilaLeida {
  /** Número de línea en el archivo (la primera de datos es la 2). */
  linea: number;
  domicilio: DomicilioNuevo;
  errores: string[];
}

export interface ArchivoLeido {
  filas: FilaLeida[];
  /** Encabezados que no se reconocieron: se ignoran, pero se avisa. */
  columnasIgnoradas: string[];
  /** Problemas del archivo completo (sin encabezados, demasiadas filas). */
  errores: string[];
}

/** Convierte un CSV en domicilios listos para enviar. `recogidaPorDefecto` llena lo que el archivo no traiga. */
export function leerArchivoDomicilios(texto: string, recogidaPorDefecto?: Partial<PuntoDomicilio>): ArchivoLeido {
  const tabla = parsearCsv(texto);
  const resultado: ArchivoLeido = { filas: [], columnasIgnoradas: [], errores: [] };
  if (tabla.length < 2) {
    resultado.errores.push('El archivo no tiene filas de datos debajo de los encabezados.');
    return resultado;
  }
  const encabezados = tabla[0].map(h => h.trim());
  const campos = encabezados.map(h => CAMPO_POR_ENCABEZADO.get(clave(h)) || '');
  encabezados.forEach((h, i) => { if (!campos[i] && h) resultado.columnasIgnoradas.push(h); });
  if (!campos.some(c => c.startsWith('entrega.'))) {
    resultado.errores.push('No se reconocieron los encabezados. Descarga la plantilla y usa sus columnas.');
    return resultado;
  }
  const datos = tabla.slice(1);
  if (datos.length > MAX_FILAS_POR_LOTE) {
    resultado.errores.push(`El archivo trae ${datos.length} filas y el máximo es ${MAX_FILAS_POR_LOTE}. Divídelo en varios.`);
    return resultado;
  }
  datos.forEach((celdas, i) => {
    const d = domicilioVacio(recogidaPorDefecto);
    campos.forEach((campo, col) => {
      if (!campo) return;
      const valor = (celdas[col] ?? '').trim();
      if (valor === '') return;
      if (campo === 'valorDomicilio' || campo === 'valorPedido' || campo === 'cobrarAlEntregar') {
        d[campo] = leerValor(valor);
      } else if (campo === 'idExterno' || campo === 'descripcion') {
        d[campo] = valor;
      } else if (campo.startsWith('recogida.') || campo.startsWith('entrega.')) {
        const [grupo, atributo] = campo.split('.') as ['recogida' | 'entrega', keyof PuntoDomicilio];
        d[grupo][atributo] = atributo === 'telefono' ? limpiarTelefono(valor) : valor;
      }
    });
    d.entrega.telefono = limpiarTelefono(d.entrega.telefono);
    d.recogida.telefono = limpiarTelefono(d.recogida.telefono);
    resultado.filas.push({ linea: i + 2, domicilio: d, errores: validarDomicilio(d) });
  });
  return resultado;
}

/** «Pendiente», «En camino»… para mostrar. */
export function etiquetaEstadoDomicilio(estado: EstadoDomicilio | string): string {
  switch (estado) {
    case 'pendiente': return 'Buscando mensajero';
    case 'asignado': return 'Mensajero asignado';
    case 'en_camino': return 'En camino';
    case 'entregado': return 'Entregado';
    case 'no_entregado': return 'No se pudo entregar';
    case 'cancelado': return 'Cancelado';
    default: return String(estado || '');
  }
}

/** Un domicilio se puede cancelar mientras el mensajero no lo haya recogido. */
export function sePuedeCancelar(estado: EstadoDomicilio | string): boolean {
  return estado === 'pendiente' || estado === 'asignado';
}

/** Una celda de CSV con `;`: protege el separador, las comillas y los saltos de línea. */
export function celdaCsv(v: unknown): string {
  const t = String(v ?? '');
  // Una celda que empieza con = + - @ se abriría como fórmula en Excel.
  const seguro = /^[=+\-@]/.test(t) ? `'${t}` : t;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}

/** Columnas del CSV de descarga del listado, con `;` y BOM. */
export function csvDeDomicilios(filas: Array<{
  numero: string; idExterno: string; estado: string; creado: string; cliente: string; direccion: string;
  ciudad: string; valorDomicilio: number; mensajero: string;
}>): string {
  const encabezados = ['numero', 'id_externo', 'estado', 'creado', 'cliente', 'direccion', 'ciudad', 'valor_domicilio', 'mensajero'];
  const lineas = filas.map(f => [
    f.numero, f.idExterno, etiquetaEstadoDomicilio(f.estado), f.creado, f.cliente, f.direccion, f.ciudad, f.valorDomicilio, f.mensajero
  ].map(celdaCsv).join(';'));
  return '\ufeff' + [encabezados.join(';'), ...lineas].join('\r\n') + '\r\n';
}
