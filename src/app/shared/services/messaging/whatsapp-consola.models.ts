/**
 * Contrato de la consola de WhatsApp (D-707). Todo vive bajo `/v1/messaging`.
 * Los tipos son tolerantes: el servidor puede mandar `null` en lo que Meta no informa
 * (por ejemplo, en un número compartido de Kapso).
 */

export type CalidadNumero = 'GREEN' | 'YELLOW' | 'RED';
export type ProveedorLinea = 'meta' | 'kapso';

/** Lo que Meta dice de un número (`GET lines/:lineId/salud`). */
export interface SaludNumero {
  calidad: CalidadNumero | null;
  /** Conversaciones por día: número, o el nivel de Meta (`TIER_1K`, `TIER_UNLIMITED`). */
  limiteDiario: number | string | null;
  nombreVisible: string | null;
  /** Estado de aprobación del nombre visible (`APPROVED`, `PENDING_REVIEW`, `DECLINED`…). */
  estadoNombre: string | null;
  enCelular: boolean | null;
  plataforma: string | null;
  actualizadaEn: string | null;
}

export interface RespuestaSalud {
  proveedor: ProveedorLinea;
  salud: SaludNumero | null;
}

// ─── Plantillas ─────────────────────────────────────────────────────────

export type TipoEncabezado = 'TEXT' | 'IMAGE';
export type TipoBoton = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER';
export type CategoriaPlantilla = 'UTILITY' | 'MARKETING';

export interface BotonPlantilla {
  tipo: TipoBoton;
  texto: string;
  url?: string;
  telefono?: string;
}

export interface EncabezadoPlantilla {
  tipo: TipoEncabezado;
  texto?: string;
  imagenBase64?: string;
  mime?: string;
}

/** Cuerpo de `POST lines/:lineId/templates`. */
export interface EntradaPlantilla {
  titulo: string;
  mensaje: string;
  categoria?: CategoriaPlantilla;
  encabezado?: EncabezadoPlantilla;
  pie?: string;
  botones?: BotonPlantilla[];
}

/** Componente de la plantilla en el formato de Meta. */
export interface ComponentePlantilla {
  type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS' | string;
  format?: string;
  text?: string;
  buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
}

export interface PlantillaConsola {
  id: string | null;
  name: string;
  language: string | null;
  category: string | null;
  status: string | null;
  estadoHumano?: string;
  motivoHumano?: string | null;
  motivoRechazo?: string | null;
  bodyText: string;
  componentes?: ComponentePlantilla[];
}

// ─── Envíos masivos ─────────────────────────────────────────────────────

/** Persona de la lista de clientes que se muestra en pantalla (mismos datos del asistente de campañas de Marketing). */
export interface DestinatarioSegmento {
  leadId: string;
  nombre: string;
  /** Solo dígitos, con indicativo. */
  phone: string;
}

/** Lo que recibe el servidor de cada persona marcada: igual que `recipients` de campaigns/broadcast. */
export interface DestinatarioEnvio {
  phone: string;
  nombre?: string;
}

/**
 * A quién se le envía. `destinatarios` (la selección ya marcada en pantalla) manda sobre `fuente`;
 * sin ellos, el servidor arma la lista con los clientes del comercio o los leads CRM de esa etapa.
 */
export interface Segmento {
  fuente: 'clientes' | 'crm';
  etapa?: string;
  destinatarios?: DestinatarioEnvio[];
}

/** El servidor responde 400 con este código cuando la plantilla tiene más de una variable. */
export const CODIGO_PLANTILLA_NO_SOPORTADA = 'TEMPLATE_NOT_SUPPORTED';

export interface ResumenEnvio {
  total: number;
  aEnviar: number;
  excluidos: { sinTelefono: number; noQuieren: number; repetidos: number };
  costoEstimadoCOP: number;
}

export type EstadoEnvio = 'preparado' | 'enviando' | 'pausado' | 'terminado';

export interface MetricasEnvio {
  enviados: number;
  entregados: number;
  leidos: number;
  respondidos: number;
  fallidos: number;
}

export interface EnvioMasivo {
  id: string;
  templateName: string;
  estado: EstadoEnvio;
  motivoPausa?: string | null;
  total: number;
  metricas: MetricasEnvio;
  creadoEn: string | null;
}

export interface FallidoPorMotivo {
  motivo: string;
  cantidad: number;
}

export interface DetalleEnvio {
  envio: EnvioMasivo;
  fallidosPorMotivo: FallidoPorMotivo[];
}

/** El servidor responde 409 con este código cuando la línea es el número compartido de Kapso. */
export const CODIGO_USAR_CAMPANAS_KAPSO = 'USE_KAPSO_CAMPAIGNS';

// ─── Registro ───────────────────────────────────────────────────────────

export type DireccionRegistro = 'entrada' | 'salida';
export type EstadoRegistro = 'sent' | 'delivered' | 'read' | 'failed' | 'received';

export interface ItemRegistro {
  id: string;
  hora: string | null;
  direccion: string;
  tipo: string | null;
  estado: string | null;
  telefono: string | null;
  texto: string | null;
  error: string | null;
  /** Solo para administradores; sin llaves ni tokens. */
  detalle?: unknown;
}

export interface PaginaRegistro {
  items: ItemRegistro[];
  siguiente: string | null;
}

export interface FiltrosRegistro {
  cursor?: string | null;
  direccion?: DireccionRegistro | '';
  estado?: EstadoRegistro | '';
}
