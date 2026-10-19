/**
 * Contratos de la pantalla "Mensajeros independientes" (solicitudes de quienes se inscriben solos en
 * la app de mensajeros). El backend cuelga de `/v1/logistica/independientes`.
 */

/** Estados de una solicitud (`estadoRegistro`). También son los valores del filtro `?estado=`. */
export type EstadoSolicitud =
  | 'en_revision'
  | 'pendiente_documentos'
  | 'rechazado'
  | 'aprobado'
  | 'suspendido';

/** Documentos que sube el mensajero. Quien va a pie o en bicicleta solo trae los tres primeros. */
export type TipoDocumento =
  | 'cedulaFrente'
  | 'cedulaReverso'
  | 'selfie'
  | 'licencia'
  | 'soat'
  | 'fotoVehiculo';

/**
 * Fecha tal como llega del servidor: Timestamp de Firestore serializado (`_seconds`/`_nanoseconds`,
 * o `seconds`/`nanoseconds`), texto ISO o, por tolerancia, milisegundos.
 */
export type FechaServidor =
  | string
  | number
  | { _seconds: number; _nanoseconds?: number }
  | { seconds: number; nanoseconds?: number }
  | null
  | undefined;

export interface RevisionSolicitud {
  /** Quién tomó la última decisión. */
  por?: string;
  en?: FechaServidor;
  /** Último motivo (rechazo o suspensión). */
  motivo?: string;
}

export interface DocumentoSubido {
  subido: boolean;
  subidoAt?: FechaServidor;
}

export interface SolicitudMensajero {
  id: string;
  nombres?: string;
  apellidos?: string;
  cedula?: string;
  celular?: string;
  ciudad?: string;
  correo?: string;
  tipoVehiculo?: string;
  placa?: string;
  estadoRegistro: EstadoSolicitud | string;
  creadoAt?: FechaServidor;
  enviadoAt?: FechaServidor;
  documentosFaltantes?: string[];
  revision?: RevisionSolicitud;
  reenvios?: number;
  documentos?: { [tipo: string]: DocumentoSubido | undefined };
}

/** Enlace firmado y temporal a un documento. Vive solo en memoria: no se registra ni se guarda. */
export interface EnlaceDocumento {
  url: string;
  contentType?: string;
}

export interface RespuestaListaSolicitudes {
  success: boolean;
  estado: EstadoSolicitud | string;
  total: number;
  solicitudes: SolicitudMensajero[];
}

export interface RespuestaDetalleSolicitud {
  success: boolean;
  solicitud: SolicitudMensajero;
  enlaces: { [tipo: string]: EnlaceDocumento | undefined };
  enlacesVencenEnSegundos: number;
}

/** Respuesta de aprobar, rechazar y suspender: el backend no promete más que `success`. */
export interface RespuestaAccionSolicitud {
  success: boolean;
  [campo: string]: unknown;
}

export type AccionSolicitud = 'aprobar' | 'rechazar' | 'suspender';

// ---------------------------------------------------------------------------
// Liquidación (lo que Katuq cobra a cada comercio por las entregas de independientes)
// ---------------------------------------------------------------------------

/** Todos los valores en pesos colombianos, enteros. */
export interface TotalesLiquidacion {
  entregas: number;
  totalEnvio: number;
  comision: number;
  pagoMensajeros: number;
}

export interface LiquidacionComercio extends TotalesLiquidacion {
  comercio: string;
}

export interface EntregaLiquidada {
  pedidoId: string;
  nroPedido: string | number;
  comercio: string;
  fecha: FechaServidor;
  mensajeroId: string;
  mensajero: string;
  totalEnvio: number;
  pagoMensajero: number;
  comision: number;
}

/** `GET /v1/logistica/independientes/liquidacion?desde=YYYY-MM-DD&hasta=YYYY-MM-DD` (solo operadora). */
export interface RespuestaLiquidacion {
  success: boolean;
  desde: string;
  hasta: string;
  comisionPorcentaje: number;
  totales: TotalesLiquidacion;
  porComercio: LiquidacionComercio[];
  entregas: EntregaLiquidada[];
}
