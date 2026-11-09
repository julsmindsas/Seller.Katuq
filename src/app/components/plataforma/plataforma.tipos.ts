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
  /** Estado del cierre diario de ayer: `ok`, `parcial`, `falta` o `sin_dato` (historia apagada o aún por correr). */
  snapshotAyer?: { estado?: string; fecha?: string; motivo?: string | null; fallos?: number } | null;
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
  /** Quién puede ver la vista de auditoría de pagos por persona (el servidor decide; esto solo muestra u oculta). */
  esLectorAuditoria?: boolean;
  opttia?: { activo?: boolean; autorizado?: boolean; narrativa?: boolean; [k: string]: unknown } | null;
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
  /** `false` si no se pudieron leer los cierres de mes: solo se muestran el mes en curso y el anterior. */
  historiaLeida?: boolean;
  nota: string;
  series: Record<string, { unidad: string; puntos: PuntoTendencia[] }>;
}

/** Un mes de la serie de pedidos de una empresa (sección `uso` de la ficha). */
export interface MesSerie {
  mes: string;
  /** `ok`, `parcial`, `en_curso`, `reconstruido` o `sin_dato`. */
  estado: string;
  pedidos: number | null;
  gmv: number | null;
  canales: Array<{ canal: string; pedidos: number | null; gmv: number | null }>;
}

export interface SerieMensual {
  estado: 'ok' | 'sin_dato' | 'no_leido' | string;
  mesRef?: string;
  meses: MesSerie[];
  nota?: string;
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
  /** `null` en la fila «otros temas» (los pedidos de un solo comercio no muestran texto). */
  tema: string | null;
  agrupado?: boolean;
  temasAgrupados?: number;
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

/** D-700 17.4 — Tipo de cuenta y motivo de baja (escrituras de operador). */
export type TipoCuentaValor = 'real' | 'demo' | 'prueba' | 'cortesia' | 'interna';
export type MotivoBajaValor = 'precio' | 'funcionalidad' | 'soporte' | 'competencia' | 'cierre_negocio' | 'mora' | 'sin_uso' | 'otro';

export interface CambioTipoCuenta {
  docId: string;
  cambio: boolean;
  tipoCuenta: { tipo: string; origen: string };
  tipoAnterior: { tipo: string | null; origen: string };
  vivoActualizado: boolean;
}

export interface CambioMotivoBaja {
  docId: string;
  cambio: boolean;
  bajaMotivo: MotivoBajaValor;
  ciclo: string;
}

/** D-700 18.8 — Pago manual (F2-3). El servidor nunca devuelve la ruta del archivo ni ids de personas. */
export type MedioPagoManual = 'transferencia' | 'consignacion' | 'efectivo' | 'otro';

export interface PagoManual {
  id: string;
  periodo: { desde: string; hasta: string };
  fechaEfectiva: string;
  montoCOP: number;
  medio: MedioPagoManual;
  referencia: string | null;
  registradoEn: string;
  tieneSoporte: boolean;
  soporteId: string | null;
  atipico: boolean;
  duplicadoConfirmado: boolean;
  estado: 'vigente' | 'anulado';
  anuladoEn: string | null;
  origen: 'manual';
}

export interface ListaPagosManuales { items: PagoManual[]; truncado: boolean; }
export interface SoporteSubido { soporteId: string; contentType: string; bytes: number; }
export interface PagoManualRegistrado { repetido: boolean; pago: PagoManual; vivoActualizado: boolean; }
export interface PagoManualAnulado { cambio: boolean; yaAnulado: boolean; pagoId: string; anulacionId: string; companyDocId: string; vivoActualizado: boolean; }
export interface AperturaSoporte { url: string; expiraEnSegundos: number; contentType: string; }

/** Cuerpo de `POST /companies/:docId/manual-payments` (cerrado: el servidor rechaza cualquier otro campo). */
export interface CuerpoPagoManual {
  claveIdempotencia: string;
  periodo: { desde: string; hasta: string };
  fechaEfectiva: string;
  montoCOP: number;
  medio: MedioPagoManual;
  referencia?: string;
  soporteId: string;
  confirmarAtipico?: boolean;
  confirmarDuplicado?: boolean;
  motivoConfirmacion?: string;
}

/** D-700 26.4 (F2-11) — Señales avanzadas (`GET /v1/platform/signals`). El front solo pinta lo que calcula el servidor. */
export interface UsoModulo { clave: string; empresas: number; porcentaje: number | null }

export interface AdopcionUsada {
  estado: EstadoMetrica | string;
  motivo?: string | null;
  rotulo: string;
  ventanaDias: number;
  activasReales: number;
  medidas: number;
  modulos: UsoModulo[];
}

export interface ModulosTopVentas {
  estado: EstadoMetrica | string;
  motivo?: string | null;
  rotulo: string;
  criterio: string;
  grupo: number;
  medidos: number;
  modulos: UsoModulo[];
}

export interface BajasGrupo {
  total: number;
  conMotivo: number;
  sinMotivo: number;
  porMotivo: Array<{ motivo: string; cantidad: number; porcentaje: number | null }>;
}

export interface BajasPorMotivo { estado: EstadoMetrica | string; vigentes: BajasGrupo; mes: BajasGrupo }

export interface ResumenTendenciaSalud {
  estado: EstadoMetrica | string;
  leido: boolean;
  fecha: string | null;
  dias: number;
  evaluadas: number;
  comparadas: number;
  empeoran: number;
  mejoran: number;
  estables: number;
  sinDato: number;
  parcial: boolean;
}

export interface Senales {
  adopcionUsada: AdopcionUsada;
  modulosDeLosQueMasVenden: ModulosTopVentas;
  bajas: BajasPorMotivo;
  saludTendencia: ResumenTendenciaSalud;
  integracionesSinUso: { disponible: boolean; motivo: string };
}

/** Tendencia del puntaje de una empresa (sección `salud` de la ficha). */
export interface TendenciaSalud {
  estado: 'ok' | 'sin_dato' | string;
  motivo?: string;
  fecha?: string | null;
  delta?: number | null;
  direccion?: 'empeora' | 'mejora' | 'estable' | null;
  anterior?: { puntaje: number; nivel: string | null; parcial: boolean } | null;
  parcial?: boolean;
}

export interface CuentaReclasificada {
  docId: string;
  nomComercial: string | null;
  tipo: string;
  origen: string | null;
  cambioEn: string | null;
  ciclo: string | null;
  monto: number;
  facturas: number;
  diasAtrasoMax: number;
  detalle: Array<{ factura: string; saldo: number; vence: string | null; diasAtraso: number }>;
}

export interface Reclasificadas {
  cuentas: CuentaReclasificada[];
  total: { cuentas: number; monto: number; facturas: number };
  estado: string;
  criterio: string;
}

export interface PagosPorPersona {
  mes: string;
  desde: string;
  hasta: string;
  estado: string;
  motivo?: string;
  rotulo: string;
  personas: Array<{
    porId: string;
    pagos: { cantidad: number; montoCOP: number; atipicos: number; duplicadosConfirmados: number };
    anulaciones: { cantidad: number; montoCOP: number; propias: number };
  }>;
  total: { pagos: number; montoCOP: number; atipicos: number; anulaciones: number; montoAnuladoCOP: number; anulacionesPropias: number };
}

/** D-700 25.4 — Respuesta de `POST /v1/platform/opttia/monthly-summary`. Todo es texto para mostrar tal cual, sin formato. */
export interface ResumenMensualRespuesta {
  ok: boolean;
  resumen: string;
  puntos?: Array<{ tema: string; frase: string }>;
  fuente: 'ia' | 'ia_parcial' | 'determinista';
  proveedor?: string | null;
  meta: { mes?: string; corte?: string; universo?: string; reglaVersion?: string; desactualizado?: boolean; parcial?: boolean };
  saneado?: boolean;
  restantesDia?: number | null;
}

/** D-700 23.5 — Lo que el panel sabe de Opttia de plataforma según `GET /me`. Sin respuesta, nada (falla cerrado). */
export interface EstadoOpttiaPlataforma {
  autorizado: boolean;
  activo: boolean;
  narrativa: boolean;
}
