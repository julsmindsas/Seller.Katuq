import { NpsTablero, SegmentoNps } from '../feedback/feedback.models';

/**
 * Contrato HTTP del módulo NPS por comercio (D-490), sección "Contrato HTTP" de
 * openspec/changes/nps-modulo-por-comercio/design.md. La empresa sale del JWT; las rutas
 * `/publica/*` van sin sesión.
 */

/** `katuq`: la pregunta de Katuq a un comercio, por el enlace del correo (D-506). */
export type CanalEncuesta = 'entrega' | 'enlace' | 'seller' | 'katuq';
export type EstadoEncuesta = 'borrador' | 'activa' | 'pausada';
export type TipoAdicional = 'opcion' | 'texto';
export type EstadoCaso = 'nuevo' | 'contactado' | 'resuelto' | 'sin_solucion';

/** Errores con `code` del contrato (`{ success: false, code, error }`). */
export type CodigoErrorNpsModulo =
  | 'OTRA_ACTIVA' | 'INCOMPLETA' | 'TIENE_RESPUESTAS' | 'NOTA_REQUERIDA'
  | 'INVALIDO' | 'VENCIDO' | 'NO_DISPONIBLE';

export interface PreguntaAdicional {
  id: string;
  tipo: TipoAdicional;
  texto: string;
  /** Solo en `opcion`: de 2 a 6. */
  opciones?: string[];
}

export interface PreguntasEncuesta {
  /** Texto de la pregunta 0 a 10; `{comercio}` se reemplaza al mostrarla al comprador. */
  nps: string;
  abiertas: Record<SegmentoNps, string>;
  /** Máximo 3. */
  adicionales: PreguntaAdicional[];
}

export interface PersonaNps {
  email: string;
  nombre: string;
}

export interface Encuesta {
  id: string;
  nombre: string;
  canal: CanalEncuesta;
  estado: EstadoEncuesta;
  preguntas: PreguntasEncuesta;
  /** Canal entrega: de 1 a 30. */
  diasEspera?: number;
  /** Canal enlace. */
  publicId?: string;
  enlace?: string;
  responsable: PersonaNps | null;
  respuestas90d: number;
  createdAt?: string;
  updatedAt?: string;
  /** La encuesta virtual de Julsmind a sus comercios (D-483). */
  soloLectura?: boolean;
  /** Etapa de `NPS_COMERCIOS` en la encuesta virtual. */
  etapa?: string;
}

/**
 * Lo que se envía al crear (POST, nace en borrador) o editar (PUT, parcial). El canal solo va
 * al crear: después no se cambia (400 CANAL_FIJO). `responsableEmail` vacío deja la encuesta
 * sin responsable; el servidor arma `responsable` (400 RESPONSABLE_INVALIDO si no es un
 * usuario activo de la empresa).
 */
export interface EncuestaCambios {
  nombre: string;
  canal?: Exclude<CanalEncuesta, 'seller'>;
  preguntas: PreguntasEncuesta;
  diasEspera?: number;
  responsableEmail: string;
}

export interface UsuarioResponsable extends PersonaNps {
  rol: string;
}

export interface NotaCaso {
  texto: string;
  autor: string;
  fecha: string;
}

export interface HistorialCaso {
  accion: string;
  de?: string;
  a?: string;
  autor: string;
  fecha: string;
}

export interface Caso {
  id: string;
  encuesta: { id: string; nombre: string; canal: CanalEncuesta };
  nota: number;
  segmento: SegmentoNps;
  comentario: string | null;
  adicionales: { texto: string; valor: string }[];
  fecha: string;
  comprador: { nombre?: string; email?: string; telefono?: string };
  pedido?: { id: string; nroPedido: string | number };
  empresaQueResponde?: string;
  nroTicket?: string | number;
  estado: EstadoCaso;
  responsable: PersonaNps | null;
  vencido: boolean;
  notas: NotaCaso[];
  historial: HistorialCaso[];
  abiertoAt: string;
  primerContactoAt?: string;
  cerradoAt?: string;
  notaCierre?: string;
}

export interface IndicadoresCasos {
  abiertos: number;
  vencidos: number;
  horasPrimerContacto: number | null;
  horasCierre: number | null;
}

export interface FiltrosCasos {
  estado?: EstadoCaso | '';
  responsable?: string;
  encuesta?: string;
}

export interface CambiosCaso {
  estado?: EstadoCaso;
  responsableEmail?: string;
  nota?: string;
}

/** Resumen de una pregunta adicional en Resultados (solo al filtrar por encuesta). */
export interface AdicionalTablero {
  id: string;
  texto: string;
  tipo: TipoAdicional;
  conteo?: { opcion: string; n: number }[];
  respuestas?: { texto: string; fecha: string }[];
}

/** El tablero de D-483 más lo de D-490. */
export interface TableroNps extends Omit<NpsTablero, 'comentarios'> {
  adicionales?: AdicionalTablero[];
  comentarios: (NpsTablero['comentarios'][number] & {
    canal?: CanalEncuesta;
    encuestaId?: string;
    casoEstado?: EstadoCaso | null;
  })[];
}

export interface FiltrosTablero {
  pruebas?: boolean;
  encuesta?: string;
  canal?: CanalEncuesta | '';
}

// ── Pública ────────────────────────────────────────────────────────────

export interface EncuestaPublica {
  comercio: string;
  logo?: string;
  preguntas: PreguntasEncuesta;
  canal: CanalEncuesta;
  /** La pregunta es de Katuq, no de una tienda (D-506). */
  marca?: 'katuq';
}

export interface ContactoPublico {
  nombre?: string;
  email?: string;
  telefono?: string;
}

/** Enlace para calificar un producto del pedido (cuando la tienda tiene opiniones de producto). */
export interface OpinionProducto {
  nombre: string;
  url: string;
}

export interface ComentarioPublico {
  ref: string;
  sesion: string;
  comentario?: string;
  adicionales?: Record<string, string>;
  contacto?: ContactoPublico;
}

export const MAX_ADICIONALES = 3;
export const MAX_TEXTO_ADICIONAL = 300;
export const MAX_COMENTARIO = 1000;
