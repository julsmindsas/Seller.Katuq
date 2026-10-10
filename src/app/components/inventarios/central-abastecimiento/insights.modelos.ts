/**
 * Forma de `GET /v1/inventory/insights` y `POST /v1/inventory/insights/explicar`
 * (openspec/changes/inventario-ia-util, D-401). Toda cifra viene calculada del servidor;
 * la IA solo aporta frases.
 */

export interface TrasladoCorto {
  origen: string;
  cantidad: number;
}

export interface FilaComprar {
  id: string;
  productoId: string;
  referencia: string | null;
  nombre: string | null;
  idBodega: string;
  saldo: number;
  consumoDiario: number;
  coberturaDias: number | null;
  diasEntrega: number;
  diasEntregaSupuesto: boolean;
  yaPedido: number;
  sugerido: number;
  proveedor: string | null;
  ventasEnRiesgo: number | null;
  traslado: TrasladoCorto | null;
  motivoBase: string;
}

export type AccionCapital = 'trasladar' | 'promocionar' | 'liquidar' | 'revisar';

export interface FilaCapital {
  id: string;
  productoId: string;
  referencia: string | null;
  nombre: string | null;
  idBodega: string;
  unidades: number;
  coberturaDias: number | null;
  inmovilizado: boolean;
  sinCosto: boolean;
  valorCosto: number | null;
  acciones: AccionCapital[];
  accionBase: AccionCapital;
  traslado: { destino: string; cantidad: number } | null;
  motivoBase: string;
}

export interface FilaAviso {
  id: string;
  tipo: 'saldo_negativo' | 'salidas_sin_motivo' | 'doble_conteo' | 'ajuste_atipico';
  productoId: string;
  nombre: string | null;
  referencia: string | null;
  idBodega: string;
  evidencia: Record<string, number>;
  motivoBase: string;
}

export interface InventoryInsights {
  company: string;
  idBodega: string | null;
  ventana: { dias: number; desde: string; hasta: string };
  confianza: 'exacta' | 'parcial' | string;
  advertencias: string[];
  comprar: { filas: FilaComprar[]; total: number; sinPrecio: number; ventasEnRiesgo: number; sinDemanda: number };
  capital: { filas: FilaCapital[]; total: number; valorCosto: number; unidades: number; sinCosto: number };
  traslados: { productoId: string; nombre: string | null; origen: string; destino: string; cantidad: number; motivoBase: string }[];
  avisos: { filas: FilaAviso[]; total: number };
  bodegas: Record<string, string>;
  generadoAt: string;
}

export interface ExplicacionIA {
  resumen: string | null;
  comprar: Record<string, string>;
  capital: Record<string, { accion: AccionCapital; motivo: string }>;
  avisos: Record<string, { explicacion: string; prioridad: 'alta' | 'media' | 'baja' }>;
}

export interface RespuestaInsights {
  success: boolean;
  insights: InventoryInsights;
  ia?: ExplicacionIA | null;
  aviso?: string | null;
  error?: string;
}
