import { Domicilio, EstadoDomicilio, ESTADOS_DOMICILIO, FiltrosListado, PuntoDomicilio } from './domicilios.models';
import { csvDeDomicilios, etiquetaEstadoDomicilio, sePuedeCancelar } from './domicilios.utils';

/**
 * Cómo se muestra un domicilio: colores e íconos por estado, mensajero, línea de tiempo, filas de la tabla,
 * búsqueda local, rango de fechas y CSV del listado. Lógica pura, sin Angular ni DOM.
 */

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

/** Pares color fuerte / fondo suave del sistema de diseño. */
export type TonoDomicilio = 'warn' | 'info' | 'primario' | 'ok' | 'err' | 'neutro';

const TONO_POR_ESTADO: Record<EstadoDomicilio, TonoDomicilio> = {
  pendiente: 'warn',
  asignado: 'info',
  en_camino: 'primario',
  entregado: 'ok',
  no_entregado: 'err',
  cancelado: 'neutro'
};

// El estado no se dice solo con el color: cada uno lleva además un ícono y su texto.
const ICONO_POR_ESTADO: Record<EstadoDomicilio, string> = {
  pendiente: 'pi-clock',
  asignado: 'pi-user',
  en_camino: 'pi-truck',
  entregado: 'pi-check-circle',
  no_entregado: 'pi-exclamation-circle',
  cancelado: 'pi-times-circle'
};

export const DESCRIPCION_ESTADO: Record<EstadoDomicilio, string> = {
  pendiente: 'Esperando mensajero. Vuelve aquí si el mensajero lo suelta.',
  asignado: 'Un mensajero lo tomó y va a recogerlo.',
  en_camino: 'El mensajero ya lo recogió y va hacia el cliente.',
  entregado: 'Entregado al cliente.',
  no_entregado: 'El mensajero no pudo entregarlo (cliente ausente o lo rechazó).',
  cancelado: 'Cancelado.'
};

export function esEstadoDomicilio(valor: unknown): valor is EstadoDomicilio {
  return typeof valor === 'string' && (ESTADOS_DOMICILIO as string[]).includes(valor);
}

export function tonoEstadoDomicilio(estado: unknown): TonoDomicilio {
  return esEstadoDomicilio(estado) ? TONO_POR_ESTADO[estado] : 'neutro';
}

export function iconoEstadoDomicilio(estado: unknown): string {
  return esEstadoDomicilio(estado) ? ICONO_POR_ESTADO[estado] : 'pi-question-circle';
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

/** El texto ISO del servidor como `Date`; `null` si falta o no se entiende. */
export function fechaDeApi(valor: unknown): Date | null {
  if (typeof valor !== 'string' || !valor.trim()) return null;
  const f = new Date(valor);
  return isNaN(f.getTime()) ? null : f;
}

function dosDigitos(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** `YYYY-MM-DD` con la hora local de quien mira (con `toISOString` a las 8 p. m. ya sería «mañana»). */
export function fechaIsoLocal(fecha: Date): string {
  return `${fecha.getFullYear()}-${dosDigitos(fecha.getMonth() + 1)}-${dosDigitos(fecha.getDate())}`;
}

/** Texto `YYYY-MM-DD` que además es un día real del calendario (no acepta «2026-02-31»). */
export function esFechaIso(valor: unknown): valor is string {
  if (typeof valor !== 'string') return false;
  const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!partes) return false;
  const [anio, mes, dia] = [Number(partes[1]), Number(partes[2]), Number(partes[3])];
  const f = new Date(anio, mes - 1, dia);
  return f.getFullYear() === anio && f.getMonth() === mes - 1 && f.getDate() === dia;
}

/** Los últimos 7 días, contando hoy. */
export const DIAS_POR_DEFECTO = 7;
/** El servidor no acepta rangos de más de 31 días. */
export const MAX_DIAS_RANGO = 31;
/** Tope de domicilios que devuelve el servidor por consulta. */
export const LIMITE_LISTADO = 100;

export function rangoPorDefecto(hoy: Date = new Date()): { desde: string; hasta: string } {
  const inicio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate() - (DIAS_POR_DEFECTO - 1));
  return { desde: fechaIsoLocal(inicio), hasta: fechaIsoLocal(hoy) };
}

/** Días del rango contando los dos extremos; `null` si alguna fecha no es válida. */
export function diasDelRango(desde: unknown, hasta: unknown): number | null {
  if (!esFechaIso(desde) || !esFechaIso(hasta)) return null;
  const [d, h] = [desde, hasta].map(t => {
    const [a, m, dia] = t.split('-').map(Number);
    return Date.UTC(a, m - 1, dia);
  });
  return Math.round((h - d) / 86400000) + 1;
}

/** Frase con lo que está mal del rango, o `null` si se puede consultar. */
export function validarRangoFechas(desde: unknown, hasta: unknown): string | null {
  if (!desde) return 'Elige la fecha de inicio.';
  if (!hasta) return 'Elige la fecha final.';
  const dias = diasDelRango(desde, hasta);
  if (dias === null) return 'Revisa las fechas: alguna no es válida.';
  if (dias < 1) return 'La fecha de inicio no puede ser posterior a la fecha final.';
  if (dias > MAX_DIAS_RANGO) return `El rango puede ser de máximo ${MAX_DIAS_RANGO} días.`;
  return null;
}

/** Texto de consulta para `GET /v1/domicilios`, con `?` al inicio. Sin estado trae todos. */
export function parametrosListado(f: FiltrosListado): string {
  const partes: string[] = [];
  if (f.estado) partes.push(`estado=${encodeURIComponent(f.estado)}`);
  partes.push(`desde=${encodeURIComponent(f.desde)}`, `hasta=${encodeURIComponent(f.hasta)}`);
  partes.push(`limite=${f.limite ?? LIMITE_LISTADO}`);
  return '?' + partes.join('&');
}

let formatoPesos: Intl.NumberFormat | null = null;

/** Pesos colombianos sin decimales: 7000 → «$ 7.000». Lo que no es número vale 0. */
export function formatearPesos(valor: unknown): string {
  formatoPesos = formatoPesos || new Intl.NumberFormat('es-CO', {
    style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0
  });
  const n = Number(valor);
  return formatoPesos.format(isFinite(n) ? Math.round(n) : 0);
}

// ---------------------------------------------------------------------------
// Mensajero
// ---------------------------------------------------------------------------

export interface ResumenMensajero {
  nombre: string;
  /** «Moto · ABC123». */
  detalle: string;
  independiente: boolean;
}

function capitalizar(texto: string): string {
  const t = texto.trim();
  return t ? t.charAt(0).toUpperCase() + t.slice(1).toLowerCase() : '';
}

/** Nombre de pila, vehículo y placa del mensajero; `null` si todavía no tiene. */
export function resumenMensajero(m: Domicilio['mensajero'] | undefined): ResumenMensajero | null {
  if (!m || typeof m !== 'object') return null;
  const nombre = String(m.nombre ?? '').trim();
  if (!nombre) return null;
  const detalle = [capitalizar(String(m.vehiculo ?? '')), String(m.placa ?? '').trim().toUpperCase()]
    .filter(Boolean)
    .join(' · ');
  return { nombre, detalle, independiente: m.independiente === true };
}

// ---------------------------------------------------------------------------
// Línea de tiempo
// ---------------------------------------------------------------------------

export type EstadoPaso = 'hecho' | 'actual' | 'pendiente' | 'fallo';

export interface PasoTiempo {
  clave: 'creado' | 'asignado' | 'recogido' | 'entregado' | 'cancelado' | 'no_entregado';
  titulo: string;
  fecha: Date | null;
  estado: EstadoPaso;
  /** Una línea de apoyo: quién lo tomó, qué sigue o por qué se canceló. */
  nota: string | null;
}

export function textoEstadoPaso(estado: EstadoPaso): string {
  switch (estado) {
    case 'hecho': return 'Hecho';
    case 'actual': return 'En curso';
    case 'fallo': return 'No se completó';
    default: return 'Pendiente';
  }
}

const RANGO_ESTADO: Record<string, number> = { pendiente: 0, asignado: 1, en_camino: 2, entregado: 3 };

/**
 * Pasos de la vida de un domicilio: creado, asignado, recogido y entregado (o cancelado / no entregado).
 * En un domicilio abierto, el primer paso sin hacer queda «en curso» y los siguientes «pendientes».
 */
export function lineaDeTiempo(d: Domicilio): PasoTiempo[] {
  const mensajero = resumenMensajero(d.mensajero);
  const quien = mensajero ? `${mensajero.nombre}${mensajero.independiente ? ' · independiente de Katuq' : ''}` : null;
  const creado: PasoTiempo = { clave: 'creado', titulo: 'Creado', fecha: fechaDeApi(d.creado), estado: 'hecho', nota: null };
  const asignado = (estado: EstadoPaso, nota: string | null): PasoTiempo =>
    ({ clave: 'asignado', titulo: 'Mensajero asignado', fecha: estado === 'hecho' ? fechaDeApi(d.asignadoEn) : null, estado, nota });
  const recogido = (estado: EstadoPaso, nota: string | null): PasoTiempo =>
    ({ clave: 'recogido', titulo: 'Recogido', fecha: estado === 'hecho' ? fechaDeApi(d.recogidoEn) : null, estado, nota });

  if (d.estado === 'cancelado') {
    const pasos = [creado];
    if (d.asignadoEn) pasos.push(asignado('hecho', quien));
    if (d.recogidoEn) pasos.push(recogido('hecho', null));
    pasos.push({
      clave: 'cancelado', titulo: 'Cancelado', fecha: fechaDeApi(d.canceladoEn), estado: 'fallo',
      nota: (d.motivoCancelacion || '').trim() || null
    });
    return pasos;
  }
  if (d.estado === 'no_entregado') {
    return [
      creado,
      asignado('hecho', quien),
      recogido('hecho', null),
      {
        clave: 'no_entregado', titulo: 'No se pudo entregar', fecha: fechaDeApi(d.entregadoEn), estado: 'fallo',
        nota: 'Cliente ausente o rechazó el pedido.'
      }
    ];
  }

  const rango = RANGO_ESTADO[d.estado] ?? 0;
  const paso = (minimo: number): EstadoPaso => (rango >= minimo ? 'hecho' : rango === minimo - 1 ? 'actual' : 'pendiente');
  return [
    creado,
    asignado(paso(1), rango >= 1 ? quien : rango === 0 ? 'Esperando a que un mensajero lo tome.' : null),
    recogido(paso(2), rango === 1 ? 'El mensajero va hacia el punto de recogida.' : null),
    {
      clave: 'entregado', titulo: 'Entregado', fecha: rango >= 3 ? fechaDeApi(d.entregadoEn) : null, estado: paso(3),
      nota: rango === 2 ? 'El mensajero va hacia el cliente.' : null
    }
  ];
}

// ---------------------------------------------------------------------------
// Filas de la tabla
// ---------------------------------------------------------------------------

export interface FilaDomicilio {
  id: string;
  numero: string;
  idExterno: string;
  estado: string;
  estadoEtiqueta: string;
  estadoTono: TonoDomicilio;
  estadoIcono: string;
  cliente: string;
  /** Dirección de entrega con el barrio. */
  direccion: string;
  ciudad: string;
  mensajero: ResumenMensajero | null;
  valorDomicilio: number;
  creado: Date | null;
  /** Milisegundos de `creado` (0 si no hay): para ordenar. */
  marca: number;
  puedeCancelar: boolean;
  domicilio: Domicilio;
}

export function construirFila(d: Domicilio): FilaDomicilio {
  const creado = fechaDeApi(d.creado);
  const entrega = d.entrega || {};
  return {
    id: d.id,
    numero: d.numero || d.id,
    idExterno: d.idExterno || '',
    estado: d.estado,
    estadoEtiqueta: etiquetaEstadoDomicilio(d.estado),
    estadoTono: tonoEstadoDomicilio(d.estado),
    estadoIcono: iconoEstadoDomicilio(d.estado),
    cliente: (entrega.nombre || '').trim(),
    direccion: [entrega.direccion, entrega.barrio].map(t => (t || '').trim()).filter(Boolean).join(', '),
    ciudad: (entrega.ciudad || '').trim(),
    mensajero: resumenMensajero(d.mensajero),
    valorDomicilio: Number(d.valorDomicilio) || 0,
    creado,
    marca: creado ? creado.getTime() : 0,
    puedeCancelar: sePuedeCancelar(d.estado),
    domicilio: d
  };
}

/** Las filas más recientes primero. */
export function construirFilas(lista: Domicilio[] | null | undefined): FilaDomicilio[] {
  return (Array.isArray(lista) ? lista : [])
    .filter(d => d && d.id)
    .map(construirFila)
    .sort((a, b) => b.marca - a.marca || b.numero.localeCompare(a.numero));
}

/** Sin tildes ni mayúsculas, para buscar «gomez» y encontrar «Gómez». */
export function normalizarBusqueda(texto: unknown): string {
  return String(texto ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
}

/** Búsqueda local por número, cliente e id externo. Sin texto devuelve todas. */
export function filtrarFilas(filas: FilaDomicilio[], texto: string): FilaDomicilio[] {
  const buscado = normalizarBusqueda(texto);
  if (!buscado) return filas;
  return filas.filter(f => normalizarBusqueda(`${f.numero} ${f.cliente} ${f.idExterno}`).includes(buscado));
}

/** Hay filas con estados que el servidor puede cambiar solos (alguien las tomó, las recogió…). */
export function hayDomiciliosAbiertos(filas: FilaDomicilio[]): boolean {
  return filas.some(f => f.estado === 'pendiente' || f.estado === 'asignado' || f.estado === 'en_camino');
}

// ---------------------------------------------------------------------------
// CSV del listado
// ---------------------------------------------------------------------------

/** `2026-10-20 15:30` con la hora local; vacío si no hay fecha. */
export function fechaHoraTexto(fecha: Date | null): string {
  return fecha ? `${fechaIsoLocal(fecha)} ${dosDigitos(fecha.getHours())}:${dosDigitos(fecha.getMinutes())}` : '';
}

export function csvDelListado(filas: FilaDomicilio[]): string {
  return csvDeDomicilios(
    filas.map(f => ({
      numero: f.numero,
      idExterno: f.idExterno,
      estado: f.estado,
      creado: fechaHoraTexto(f.creado),
      cliente: f.cliente,
      direccion: f.direccion,
      ciudad: f.ciudad,
      valorDomicilio: f.valorDomicilio,
      mensajero: f.mensajero ? `${f.mensajero.nombre}${f.mensajero.detalle ? ' (' + f.mensajero.detalle + ')' : ''}` : ''
    }))
  );
}

export function nombreArchivoListado(desde: string, hasta: string): string {
  return esFechaIso(desde) && esFechaIso(hasta) ? `domicilios_${desde}_${hasta}.csv` : 'domicilios.csv';
}

// ---------------------------------------------------------------------------
// Datos de un punto (recogida / entrega) para el detalle
// ---------------------------------------------------------------------------

export interface LineaDato {
  etiqueta: string;
  valor: string;
}

/** Los datos que tenga un punto, en el orden en que se leen. Lo vacío no aparece. */
export function lineasDePunto(p: Partial<PuntoDomicilio> | null | undefined): LineaDato[] {
  const punto = p || {};
  const lineas: LineaDato[] = [
    { etiqueta: 'Nombre', valor: punto.nombre || '' },
    { etiqueta: 'Teléfono', valor: punto.telefono || '' },
    { etiqueta: 'Dirección', valor: punto.direccion || '' },
    { etiqueta: 'Barrio', valor: punto.barrio || '' },
    { etiqueta: 'Ciudad', valor: punto.ciudad || '' },
    { etiqueta: 'Indicaciones', valor: punto.indicaciones || '' }
  ];
  return lineas.filter(l => l.valor.trim() !== '').map(l => ({ ...l, valor: l.valor.trim() }));
}
