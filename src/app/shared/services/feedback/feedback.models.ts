import { ReportResult } from '../../../components/dashboard/model/report-spec.interfaces';

/**
 * Contrato de `/v1/nps` (D-483). La empresa y el usuario salen del JWT: el front no los
 * manda en el cuerpo.
 */

export type SegmentoNps = 'promotor' | 'pasivo' | 'detractor';

/** Quién respondió: un comercio sobre Katuq (fase 1) o un comprador sobre un comercio (fase 2). */
export type PublicoNps = 'merchant' | 'buyer';

/** Códigos de error del backend (`{ success: false, code, error }`). */
export type CodigoErrorNps = 'NOTA_INVALIDA' | 'NO_ENCONTRADA' | 'YA_REGISTRADA' | 'SIN_NOTA' | 'COMENTARIO_LARGO';

export interface NpsPregunta {
  id: string;
}

/** GET /v1/nps/pendiente. Nunca falla con error: si algo pasa, `pregunta` llega null. */
export interface NpsPendienteRespuesta {
  success: boolean;
  pregunta: NpsPregunta | null;
}

export interface NpsOk {
  success: boolean;
}

export interface NpsReparto {
  promotor: number;
  pasivo: number;
  detractor: number;
}

export interface NpsComentario {
  id: string;
  /** ISO. */
  fecha: string;
  nota: number;
  segmento: SegmentoNps;
  comentario: string | null;
  publico: PublicoNps;
  empresa: string | null;
  rol: string | null;
  plan: string | null;
  pedido: string | number | null;
  nroTicket: string | number | null;
  /** Respuesta de Julsmind o FLORECER (solo llega con `?pruebas=1`). */
  prueba: boolean;
}

export interface NpsTablero {
  company: string;
  generadoAt: string;
  conPruebas: boolean;
  /** Por debajo de este número de respuestas el NPS todavía se mueve mucho (30). */
  minimoConfiable: number;
  /** NPS de 90 días, entero; null sin respuestas (nunca un valor por defecto). */
  nps: number | null;
  respuestas: number;
  reparto: NpsReparto;
  /** A cuántos usuarios se les mostró la pregunta en 90 días. */
  mostradas: number;
  /** Porcentaje entero; null si no se le ha mostrado a nadie. */
  tasaRespuesta: number | null;
  /** Dimensión `respondida_month`, medida `nps`. */
  tendencia: ReportResult;
  /** Dimensión `segmento` (etiquetas ya humanas), medida `respuestas`; siempre promotores, pasivos, detractores. */
  graficaReparto: ReportResult;
  comentarios: NpsComentario[];
}

export interface NpsTableroRespuesta {
  success: boolean;
  tablero: NpsTablero;
}

/** Segmento según la nota, con el mismo corte del backend (0–6, 7–8, 9–10). */
export function segmentoDeNota(nota: number): SegmentoNps {
  if (nota >= 9) return 'promotor';
  if (nota >= 7) return 'pasivo';
  return 'detractor';
}
