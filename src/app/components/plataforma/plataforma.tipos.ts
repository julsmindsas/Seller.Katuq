/**
 * D-700 13.3 — Formas de lo que entrega `/v1/platform`. El front solo pinta: no suma ni recalcula.
 * Lo que no se pudo calcular llega como `valor: null` con su estado (nunca 0).
 */
export type EstadoMetrica = 'ok' | 'parcial' | 'sin_dato' | 'en_curso' | 'reconstruido' | 'no_disponible' | 'sin_pagos';

export interface Cifra {
  valor: number | null;
  estado: EstadoMetrica | string;
  unidad?: 'n' | 'COP' | 'ratio' | string;
}

export interface MetaPlataforma {
  version?: string;
  generadoEn?: string;
  universo?: string;
  corte?: string;
  corteColombia?: string;
  reglaVersion?: string;
  mesRef?: string;
  antiguedadHoras?: number | null;
  desactualizado?: boolean;
  parcial?: boolean;
  estado?: string;
  empresasEnCurso?: number;
  vista?: string;
  vistaEntregaFaltantes?: number;
  cobroAutomatico?: { estado?: string; advertencia?: string | null; [k: string]: unknown } | null;
  [k: string]: unknown;
}

export interface SobrePlataforma<T> {
  ok: boolean;
  meta: MetaPlataforma;
  datos: T;
}

export interface MePlataforma {
  esPlataforma: boolean;
  esOperador: boolean;
  opttia?: { autorizado?: boolean; [k: string]: unknown } | null;
  banderas: Record<string, boolean>;
}

export interface SeccionOverview {
  [clave: string]: Cifra | string | Record<string, unknown> | null | undefined;
}

export interface Overview {
  vista: 'creacion' | 'entrega';
  rotulo: string;
  mes: string | null;
  mesAnterior: string | null;
  secciones: {
    ingresos: SeccionOverview;
    base: SeccionOverview;
    actividad: SeccionOverview;
    adopcion: SeccionOverview;
    salud: SeccionOverview;
    soporte: SeccionOverview;
  };
  calidadDeDatos: Record<string, number>;
  cuentasExcluidas: number;
  /** Panel de integraciones por proveedor: «configurado», no «usado». */
  adopcionProveedores?: AdopcionProveedores;
}

export interface AdopcionProveedores {
  tipo: string;
  conCenso: number;
  estado: string;
  lista: Array<{ id: string; comercios: number; porcentaje: number | null }>;
}

export interface PuntoTendencia {
  mes: string;
  valor: number | null;
  estado: EstadoMetrica | string;
  unidad: string;
}

export interface Tendencias {
  mesesDisponibles: number;
  nota: string;
  series: Record<string, { unidad: string; puntos: PuntoTendencia[] }>;
}

export interface FilaComercio {
  docId: string;
  nomComercial: string | null;
  nombre: string | null;
  tipoCuenta: { tipo: string; origen: string };
  universo: string;
  ciclo: string | null;
  activa: boolean;
  clasePlan: string | null;
  altaFecha: string | null;
  pedidosMes: number | null;
  gmvMes: number | null;
  ultimoIngreso: string | null;
  contratadoCOP: number | null;
  cobradoMes: number | null;
  porCobrar: number | null;
  mora: number | null;
  diasAtrasoMax: number | null;
  ultimoPago: { estado: string; fecha: string | null; monto: number | null; medio: string | null } | null;
  ticketsAbiertos: number | null;
  saludPuntaje?: number | null;
  saludNivel?: string | null;
  saludParcial?: boolean | null;
  calidad: string[];
  parcial: boolean;
  desactualizada: boolean;
}

export interface Listado {
  filas: FilaComercio[];
  resumen: { comercios?: Cifra; [k: string]: unknown };
  paginacion: { pagina: number; tamano: number; total: number; paginas: number };
  filtros: Record<string, unknown>;
}

export interface FiltrosTabla {
  q: string;
  segmento: string;
  ciclo: string;
  tipoCuenta: string;
  plan: string;
  orden: string;
  dir: 'asc' | 'desc';
  pagina: number;
  tamano: number;
}

export interface Definicion {
  id: string;
  nombre: string;
  definicion: string;
  formula: string;
  universo: string;
  ventana: string;
  version: string;
}

export interface Definiciones {
  reglaVersion: string;
  metricas: Definicion[];
}

export interface CuentaExcluida {
  docId: string;
  nomComercial: string | null;
  tipo: string;
  origen: string;
  motivo: string | null;
}

export interface Excluidas {
  cantidad: number;
  lista: CuentaExcluida[];
}

export type NombreSeccion = 'suscripcion' | 'uso' | 'salud' | 'soporte' | 'historial' | 'integraciones' | 'usuarios';

/** Estado de carga propio de una sección: una falla no oculta a las demás. */
export interface EstadoCarga<T> {
  cargando: boolean;
  error: string | null;
  codigo: string | null;
  datos: T | null;
}

/** Segmentos accionables (D-700 14.3). */
export interface ResumenSegmento {
  clave: string;
  nombre: string;
  criterio: string;
  disponible: boolean;
  motivo?: string;
  cantidad: number | null;
  sinDato: number;
}

export interface FilaSegmento {
  docId: string;
  nomComercial: string | null;
  ciclo: string | null;
  clasePlan: string | null;
  datos: Record<string, unknown> | null;
}

export interface ListaSegmento {
  clave: string;
  nombre: string;
  criterio: string;
  disponible: boolean;
  motivo?: string;
  cantidad: number | null;
  sinDato: number;
  filas: FilaSegmento[];
}

/** Calidad de datos (D-700 14.3). */
export interface ItemCalidad {
  clave: string;
  nombre: string;
  grupo: 'comercio' | 'calculo' | 'lectura' | string;
  aviso: string | null;
  cantidad: number;
  empresas: Array<{ docId: string; nomComercial: string | null }>;
  truncada: boolean;
}

export interface Calidad {
  empresasEvaluadas: number;
  empresasConAvisos: number;
  items: ItemCalidad[];
}

/** Sugerencias de los comercios (D-700 14.4): nunca el texto completo. */
export interface TemaSugerido {
  tema: string;
  comercios: number;
  pedidos: number;
  abiertos: number;
  estados: string[];
  categoria: string | null;
}

export interface Sugerencias {
  estado: string;
  nota: string;
  totalPedidos: number;
  pedidosSinComercio: number;
  temas: TemaSugerido[];
  categorias: Array<{ categoria: string; etiqueta: string; comercios: number; temas: number; pedidos: number }>;
  ideasEnSoporte: { estado: string; tickets: number | null; comercios: number | null };
}

export type FormatoExportacion = 'csv' | 'pdf';
