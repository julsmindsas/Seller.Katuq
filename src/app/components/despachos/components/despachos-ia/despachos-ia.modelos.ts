/** Forma de `GET /v1/logistica/insights` y `POST /v1/logistica/insights/explicar` (IA de despachos). */

export type TramoCola = 'vencido_reciente' | 'hoy' | 'manana' | 'atrasado';

export interface FilaCola {
  id: string;
  pedidoId: string;
  nroPedido: string;
  estado: string;
  tramo: TramoCola;
  diasVencido: number;
  franja: string | null;
  ciudad: string | null;
  zona: string | null;
  transportador: string | null;
  porCobrar: number;
  motivoBase: string;
}

export interface RutaCola {
  ciudad: string;
  zona: string | null;
  pedidos: number;
  porCobrar: number;
}

export interface TransportadorSinCerrar {
  id: string;
  transportador: string;
  pedidos: number;
  porCobrar: number;
  masViejoDias: number;
  motivoBase: string;
}

export interface AvisoDespacho {
  id: string;
  tipo: 'sin_fecha' | 'sin_destino' | 'sin_transportador' | 'problema_transportadora' | 'estancado' | 'vencido_viejo';
  pedidoId: string;
  nroPedido: string;
  ciudad: string | null;
  transportador: string | null;
  motivoBase: string;
}

export interface DispatchInsights {
  company: string;
  generadoAt: string;
  cola: { filas: FilaCola[]; total: number; porTramo: Record<TramoCola, number>; porCobrar: number; rutas: RutaCola[] };
  sinCerrar: { total: number; porCobrar: number; transportadores: TransportadorSinCerrar[] };
  avisos: { filas: AvisoDespacho[]; total: number; porTipo: Record<string, number> };
  totales: { activos: number; porDespachar: number; despachados: number; porCobrarDespachados: number };
}

export interface ExplicacionDespachos {
  resumen: string | null;
  cola: Record<string, string>;
  transportadores: Record<string, string>;
  avisos: Record<string, { frase: string; prioridad: 'alta' | 'media' | 'baja' }>;
}

export interface RespuestaDispatchInsights {
  success: boolean;
  insights: DispatchInsights;
  ia?: ExplicacionDespachos | null;
  aviso?: string | null;
}
