/**
 * Plan de despachos de Opttia (D-410). Forma de lo que devuelve `GET /v1/logistica/plan`
 * (functions/services/despachos/plan.js). El plan lo arma el servidor con reglas fijas;
 * Opttia solo lo explica.
 */

export type EstadoApp = 'conectada' | 'sin-conectar' | 'sin-dato';

export interface FranjaPlan {
  clave: string;
  etiqueta: string;
  inicioMin: number | null;
  finMin: number | null;
  urgente: boolean;
}

export interface PedidoDelGrupo {
  id: string;
  nroPedido: string;
  porCobrar: number;
  total: number;
  zona: string;
  franja: string;
}

export interface MensajeroSugerido {
  id: string;
  nombre: string;
  razon: string;
  nivel: number;
  app: EstadoApp;
  capacidad: number | null;
  alternativas: ReadonlyArray<{ id: string; nombre: string; razon: string }>;
}

export interface GrupoPlan {
  id: string;
  tipo: 'mensajero';
  zona: string;
  zonasClave: string[];
  ciudades: string[];
  franja: FranjaPlan;
  pedidos: PedidoDelGrupo[];
  /** Huella de cada pedido tal como lo vio la persona: el servidor la compara al aprobar. */
  huellasPedidos: Record<string, string>;
  sugerido: MensajeroSugerido | null;
}

export interface FueraDelPlan {
  id: string;
  nroPedido: string;
  razon: string;
  dias?: number;
}

export interface EnvioAutomatico {
  id: string;
  nroPedido: string;
  estado: 'enviado' | 'esperando' | 'fallo';
  proveedor?: string;
  motivo?: string;
}

export interface AlertaPlan {
  tipo: 'franja-por-vencer' | 'franja-vencida' | 'mensajero-sin-app' | 'sin-sugerencia' | 'fechas-vencidas' | 'envio-automatico-fallido';
  franja?: string;
  minutos?: number;
  pedidos?: number;
  grupos?: number;
  mensajeros?: string[];
}

export interface PerfilDespacho {
  modo: 'mensajeros' | 'transportadora' | 'ambos' | 'ninguno';
  linea: string;
  tamanoGrupo: number;
  minutosPorPedido: number;
}

export interface PlanDespachos {
  huella: string;
  armadoEnMs: number;
  hoy: string;
  perfil: PerfilDespacho;
  resumen: {
    listos: number;
    enGrupos: number;
    grupos: number;
    mensajeros: number;
    sinSugerencia: number;
    envioAutomatico: number;
    fuera: number;
    porCobrar: number;
  };
  grupos: GrupoPlan[];
  fueraDelPlan: FueraDelPlan[];
  envioAutomatico: EnvioAutomatico[];
  alertas: AlertaPlan[];
  mensajerosDisponibles: ReadonlyArray<{ id: string; nombre: string; app: EstadoApp }>;
  avisos?: string[];
}

export interface ExplicacionPlan {
  titular: string | null;
  puntos: string[];
  /** Por id del grupo. */
  grupos: Record<string, string>;
}

export interface RespuestaPlan {
  success: boolean;
  plan: PlanDespachos;
  puedeAprobar: boolean;
  explicacion: ExplicacionPlan | null;
}

export interface GrupoParaAprobar {
  transportadorId: string;
  planHuella: string;
  pedidos: Array<{ id: string; huella: string }>;
}

export type EstadoResultado = 'despachado' | 'despachado-parcial' | 'no-despachado' | 'ya-aprobado' | 'en-curso' | 'reanudado';

export interface ResultadoGrupo {
  indice: number;
  estado: EstadoResultado;
  razon?: string;
  nroShippingOrder?: number;
  despachados?: string[];
  fuera?: Array<{ id: string; nroPedido: string; razon: string }>;
  aprobadoPor?: string;
  aprobadoEn?: string;
}

export interface RespuestaAprobacion {
  success: boolean;
  resultados: ResultadoGrupo[];
}
