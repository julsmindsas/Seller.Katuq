import { EtapaId, EtapaInfo } from '../../servicios/en-vivo.modelos';
import { claveDeTexto } from '../../servicios/en-vivo-reglas';
import { dinero, diaDeColombia, entero } from '../../utilidades/formato';
import { ClaveLista } from '../../utilidades/tarjetas';
import { CeldaFicha, ContenidoLista } from '../ficha.modelos';
import { claveDeCanal, FilaPedido, filasParaPintar, ordenarFilas } from './filas';

/**
 * Listas de la ficha: los pedidos detrás de una cifra, una etapa, un canal o una ciudad, armados
 * con lo que la pantalla YA tiene (la foto; en toda Katuq, los eventos). No piden nada al servidor.
 *
 * Claves (`ClaveLista`): `todos` · `prep` · `ia` · `etapa:<id>` · `canal:<canal>` · `ciudad:<dane o nombre>`.
 * Cada una cuenta lo mismo que la cifra que la abre (`tarjetas.ts`), para que "En camino: 19" abra 19.
 */

export type ClaveParseada =
  | { tipo: 'todos' }
  | { tipo: 'prep' }
  | { tipo: 'ia' }
  | { tipo: 'etapa'; etapa: EtapaId }
  | { tipo: 'canal'; canal: string }
  | { tipo: 'ciudad'; ciudad: string };

const ETAPAS_VALIDAS: ReadonlyArray<EtapaId> = [
  'recibido',
  'produccion',
  'alistamiento',
  'listo',
  'camino',
  'entregado',
  'rechazado',
  'cancelado',
];

/** Las etapas que cuenta "En preparación". */
const PREPARACION: ReadonlyArray<EtapaId> = ['recibido', 'produccion', 'alistamiento'];

const NO_VENDEN: ReadonlyArray<EtapaId> = ['cancelado', 'rechazado'];

const TITULO_ETAPA: Readonly<Record<EtapaId, string>> = {
  recibido: 'Recibidos',
  produccion: 'En producción',
  alistamiento: 'En alistamiento',
  listo: 'Listos para salir',
  camino: 'En camino',
  entregado: 'Entregados hoy',
  rechazado: 'Rechazados',
  cancelado: 'Cancelados',
};

/** Interpreta una clave; null si no es una que la ficha sepa abrir. */
export function parsearClave(clave: ClaveLista | null | undefined): ClaveParseada | null {
  if (typeof clave !== 'string') return null;
  const texto = clave.trim();
  if (texto === 'todos') return { tipo: 'todos' };
  if (texto === 'prep') return { tipo: 'prep' };
  if (texto === 'ia') return { tipo: 'ia' };
  const corte = texto.indexOf(':');
  if (corte === -1) return null;
  const tipo = texto.slice(0, corte);
  const valor = texto.slice(corte + 1).trim();
  if (!valor) return null;
  if (tipo === 'etapa') return ETAPAS_VALIDAS.indexOf(valor as EtapaId) !== -1 ? { tipo: 'etapa', etapa: valor as EtapaId } : null;
  if (tipo === 'canal') return { tipo: 'canal', canal: valor };
  if (tipo === 'ciudad') return { tipo: 'ciudad', ciudad: valor };
  return null;
}

export function claveListaValida(clave: ClaveLista | null | undefined): boolean {
  return parsearClave(clave) !== null;
}

/** Día de Colombia de un instante; null si no hay instante (una fecha inválida haría fallar `toISOString`). */
function diaDe(ms: number | null | undefined): string | null {
  return typeof ms === 'number' && Number.isFinite(ms) ? diaDeColombia(ms) : null;
}

/** El mismo texto que un nombre de ciudad o un código DANE: "Medellín" = "medellin" = "05001". */
function mismaCiudad(fila: FilaPedido, ciudad: string): boolean {
  if (fila.dane && fila.dane === ciudad) return true;
  return !!fila.ciudad && claveDeTexto(fila.ciudad) === claveDeTexto(ciudad);
}

/**
 * Las filas de una lista, del más nuevo al más viejo. `dia` es el de hoy (AAAA-MM-DD): con él,
 * "todos", "ia", canal y ciudad cuentan lo de HOY sin cancelados ni rechazados (igual que las
 * cifras del servidor) y "entregados" cuenta los entregados hoy. Sin `dia` (toda Katuq, que solo
 * tiene eventos) no se filtra por día. Null si la clave no se entiende.
 */
export function filtrarFilas(
  clave: ClaveLista,
  filas: ReadonlyArray<FilaPedido>,
  dia: string | null
): FilaPedido[] | null {
  const k = parsearClave(clave);
  if (!k) return null;

  const deHoy = (fila: FilaPedido): boolean => dia === null || diaDe(fila.ms) === dia;
  const vende = (fila: FilaPedido): boolean => NO_VENDEN.indexOf(fila.etapa) === -1;

  let regla: (fila: FilaPedido) => boolean;
  switch (k.tipo) {
    case 'todos':
      regla = (f) => vende(f) && deHoy(f);
      break;
    case 'prep':
      regla = (f) => PREPARACION.indexOf(f.etapa) !== -1;
      break;
    case 'ia':
      regla = (f) => f.ia && vende(f) && deHoy(f);
      break;
    case 'etapa':
      regla =
        k.etapa === 'entregado'
          ? (f) => f.etapa === 'entregado' && (dia === null || diaDe(f.entregadoMs ?? f.ms) === dia)
          : (f) => f.etapa === k.etapa;
      break;
    case 'canal': {
      const canal = claveDeCanal(k.canal);
      regla = (f) => claveDeCanal(f.canal) === canal && vende(f) && deHoy(f);
      break;
    }
    default: {
      const ciudad = k.ciudad;
      regla = (f) => mismaCiudad(f, ciudad) && vende(f) && deHoy(f);
      break;
    }
  }
  return ordenarFilas(filas.filter(regla));
}

/** Título sin el conteo: "En camino", "Pedidos a Medellín", "Llegaron por WhatsApp". */
export function tituloDeLista(clave: ClaveLista, filasDeLaClave: ReadonlyArray<FilaPedido>, katuq: boolean): string {
  const k = parsearClave(clave);
  if (!k) return 'Pedidos';
  switch (k.tipo) {
    case 'todos':
      return katuq ? 'Pedidos recientes' : 'Pedidos de hoy';
    case 'prep':
      return 'En preparación';
    case 'ia':
      return 'Vendidos con Opttia';
    case 'etapa':
      return TITULO_ETAPA[k.etapa];
    case 'canal':
      return `Llegaron por ${filasDeLaClave.find((f) => !!f.canal)?.canal || k.canal}`;
    default: {
      const nombre = filasDeLaClave.find((f) => !!f.ciudad)?.ciudad;
      // Un código DANE sin pedidos no tiene nombre que mostrar.
      return nombre ? `Pedidos a ${nombre}` : /^\d+$/.test(k.ciudad) ? 'Pedidos a esta ciudad' : `Pedidos a ${k.ciudad}`;
    }
  }
}

/** Cifras de una lista: lo que suman, el ticket promedio (de los que venden) y cuántos comercios hay. */
export function resumenDeFilas(filas: ReadonlyArray<FilaPedido>): { suma: number; ticket: number; comercios: number } {
  let suma = 0;
  let conVenta = 0;
  const comercios = new Set<string>();
  for (const fila of filas) {
    if (fila.monto > 0) {
      suma += fila.monto;
      conVenta += 1;
    }
    if (fila.empresa) comercios.add(fila.empresa);
  }
  return { suma, ticket: conVenta > 0 ? Math.round(suma / conVenta) : 0, comercios: comercios.size };
}

export interface EntradaLista {
  clave: ClaveLista;
  /** Todas las filas de la pantalla (de la foto, o de los eventos en toda Katuq). */
  filas: ReadonlyArray<FilaPedido>;
  /** Día de hoy, AAAA-MM-DD; null = sin filtro de día. */
  dia: string | null;
  katuq: boolean;
  ocultar: boolean;
  /** Nombre del comercio que se mira (para la etiqueta de arriba). */
  nombreComercio: string;
  ahoraMs: number;
  etapas: ReadonlyMap<EtapaId, EtapaInfo>;
}

export interface ResultadoLista {
  eyebrow: string;
  titulo: string;
  contenido: ContenidoLista;
}

/** Arma la ficha de una lista. Null si la clave no se entiende. */
export function armarLista(entrada: EntradaLista): ResultadoLista | null {
  const filas = filtrarFilas(entrada.clave, entrada.filas, entrada.dia);
  if (filas === null) return null;

  const { ocultar, katuq } = entrada;
  const resumen = resumenDeFilas(filas);
  const celdas: CeldaFicha[] = ocultar
    ? []
    : [
        { etiqueta: 'Suman', valor: dinero(resumen.suma), clase: '' },
        katuq
          ? { etiqueta: 'Comercios', valor: entero(resumen.comercios), clase: '' }
          : { etiqueta: 'Ticket promedio', valor: dinero(resumen.ticket), clase: '' },
      ];
  const pintadas = filasParaPintar(filas, { ocultar, katuq, ahoraMs: entrada.ahoraMs, etapas: entrada.etapas });

  return {
    eyebrow: katuq ? 'Toda Katuq' : entrada.nombreComercio,
    titulo: `${tituloDeLista(entrada.clave, filas, katuq)} · ${entero(filas.length)}`,
    contenido: {
      celdas,
      filas: pintadas.filas,
      restantes: pintadas.restantes,
      vacio: 'No hay pedidos aquí ahora.',
      nota: katuq ? 'Muestra los pedidos con movimiento reciente en toda Katuq.' : '',
    },
  };
}
