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

/** Fase 2: además de los grupos de mensajero, el plan trae grupos "Por <transportadora>". */
export type TipoGrupo = 'mensajero' | 'transportadora';

/** Tarifa que declara el adaptador de la transportadora; el front no la calcula. */
export interface TarifaPlan {
  tipo: 'incluida' | 'fija' | 'ninguna';
  /** Solo en "fija": la plata por pedido. */
  valor: number | null;
  /** Lo que se muestra tal cual en "incluida" y "ninguna". */
  texto: string | null;
}

export interface OpcionTransportadoraPlan {
  proveedor: string;
  nombre: string;
  tarifa: TarifaPlan;
  /** Aviso que declara la integración (p. ej. con qué transportadora sale); se muestra tal cual. */
  nota?: string | null;
}

export interface TransportadoraDelGrupo extends OpcionTransportadoraPlan {
  nota: string | null;
  /** Otras que aceptan todos los pedidos del grupo; casi siempre vacío. */
  alternativas: OpcionTransportadoraPlan[];
}

export interface GrupoPlan {
  id: string;
  tipo: TipoGrupo;
  /** En los de transportadora es "Por <nombre>". */
  zona: string;
  zonasClave: string[];
  ciudades: string[];
  /** null en los grupos de transportadora: cada pedido sale con su propia orden de envío. */
  franja: FranjaPlan | null;
  pedidos: PedidoDelGrupo[];
  /** Huella de cada pedido tal como lo vio la persona: el servidor la compara al aprobar. */
  huellasPedidos: Record<string, string>;
  sugerido: MensajeroSugerido | null;
  /** Solo en los grupos de transportadora. */
  transportadora?: TransportadoraDelGrupo;
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
    /** Pedidos en grupos de transportadora. */
    porTransportadora?: number;
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

interface GrupoParaAprobarBase {
  planHuella: string;
  pedidos: Array<{ id: string; huella: string }>;
}

/** Un grupo va O BIEN con el mensajero (`transportadorId`) O BIEN con la transportadora (`proveedor`), nunca con los dos. */
export type GrupoParaAprobar =
  | (GrupoParaAprobarBase & { transportadorId: string; proveedor?: never })
  | (GrupoParaAprobarBase & { proveedor: string; transportadorId?: never });

export type EstadoResultado = 'despachado' | 'despachado-parcial' | 'no-despachado' | 'ya-aprobado' | 'en-curso' | 'reanudado';

export interface ResultadoGrupo {
  indice: number;
  estado: EstadoResultado;
  razon?: string;
  nroShippingOrder?: number;
  /** Transportadora: una orden de envío por pedido. */
  nroShippingOrders?: number[];
  /** Transportadora: su nombre. */
  transportadora?: string;
  despachados?: string[];
  fuera?: Array<{ id: string; nroPedido: string; razon: string }>;
  aprobadoPor?: string;
  aprobadoEn?: string;
}

export interface RespuestaAprobacion {
  success: boolean;
  resultados: ResultadoGrupo[];
}
