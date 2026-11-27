/**
 * Contrato del dominio Mensajería (D-437): líneas del comercio y dueño del chat.
 * No depende del canal: una línea es hoy un número de WhatsApp y mañana puede ser
 * una cuenta de Instagram o una página de Messenger.
 */

/** Persona del comercio a la que se le puede asignar una línea o un chat. */
export interface MiembroEquipo {
  email: string;
  nombre: string;
  rol?: string;
}

export interface VendedorLinea {
  email: string;
  nombre: string;
}

export type TipoConexionLinea = 'coexistence' | 'dedicated';
export type EstadoLinea = 'connected' | 'disconnected';
/** ¿La línea quedó operativa? (D-704) `por_terminar`: falta un paso; `por_reconectar`: el proveedor ya no la reconoce. */
export type SetupLinea = 'completo' | 'por_terminar' | 'por_reconectar';
/** Cómo conectar un número directo con Meta (D-704). */
export type ModoConexionMeta = 'celular' | 'nuevo';

/** Línea registrada del comercio (`messaging_lines`). */
export interface MessagingLine {
  id: string;
  provider: string;
  channel: string;
  externalId: string;
  displayName: string;
  displayPhone: string;
  verifiedName?: string | null;
  connectionType: TipoConexionLinea;
  status: EstadoLinea;
  sellers: VendedorLinea[];
  botEnabled: boolean;
  /** ISO, epoch o Timestamp serializado de Firestore: se muestra solo si se puede leer. */
  connectedAt?: unknown;
  setup?: SetupLinea;
  /** Causa en palabras sencillas cuando `setup` no es `completo`. */
  setupError?: string | null;
}

/** `GET /v1/messaging/lines`. */
export interface MessagingLinesResponse {
  habilitado: boolean;
  puedeAdministrar: boolean;
  lines: MessagingLine[];
  equipo: MiembroEquipo[];
  /** Conexión directa con Meta (D-704): si se ofrece y si se puede compartir el número del celular. */
  metaDirecto: { habilitada: boolean; modoCelular: boolean };
}

/** Lo que devuelve conectar en Meta directo: los datos para abrir el registro insertado (D-704). */
export interface DatosRegistroMeta {
  kind: 'embedded_signup';
  appId: string;
  configId: string;
  graphVersion: string;
  versionRegistro: number;
  featureType: string | null;
  modo: ModoConexionMeta;
}

/** Respuesta de `POST /lines/connect`: un enlace (Kapso) o el registro insertado (Meta). */
export type ConexionProveedor = { url: string; expiresAt?: string } | DatosRegistroMeta;

/** Plantilla de la cuenta de WhatsApp de una línea. */
export interface PlantillaLinea {
  id: string | null;
  name: string;
  language: string | null;
  category: string | null;
  status: string | null;
  estadoHumano: string;
  motivoRechazo: string | null;
  bodyText: string;
}

/** Cambios permitidos en `PATCH /v1/messaging/lines/:lineId` (vendedores por email). */
export interface CambiosLinea {
  displayName?: string;
  sellers?: string[];
  botEnabled?: boolean;
}

/** Resumen de la línea que viaja con cada chat del buzón (`null` = número compartido de Katuq). */
export interface LineaResumen {
  id: string;
  displayName: string;
  displayPhone: string;
}

/** Dueño del chat (`messaging_threads.owner`). */
export interface DuenoChat {
  email: string;
  nombre: string;
  desde?: string | null;
}

/** Cuerpo del 409 cuando el chat lo atiende otra persona. */
export interface ErrorChatConDueno {
  error: 'CHAT_CON_DUENO';
  owner: DuenoChat;
  message: string;
}

/** Lee el cuerpo de un error HTTP y dice si es un 409 de chat con dueño. */
export function esErrorChatConDueno(err: any): err is { status: number; error: ErrorChatConDueno } {
  return !!err && err.status === 409 && err.error?.error === 'CHAT_CON_DUENO';
}

/* ---------- Atención multiagente (D-725, fase C de CONV) ---------- */

/** Nota interna de un chat: nunca va al cliente. */
export interface NotaChat {
  id: string;
  texto: string;
  /** Correo de quien la escribió. */
  por: string;
  nombre: string;
  /** ISO. */
  en: string;
  menciones: string[];
}

/** Disponibilidad del asesor para el reparto automático. */
export type EstadoAsesor = 'disponible' | 'ausente';

/** Persona del equipo con su estado (`GET /atencion/equipo`). */
export interface MiembroAtencion {
  email: string;
  nombre: string;
  rol?: string;
  estado: EstadoAsesor;
  coordina: boolean;
}

/** `GET /atencion/yo`. */
export interface YoAtencion {
  email: string;
  nombre: string;
  coordina: boolean;
  esAdmin: boolean;
  estado: EstadoAsesor;
}

/** Ajustes de atención del comercio (`companyConfig/{empresa}.atencion`). */
export interface AjustesAtencion {
  repartoAutomatico: boolean;
  /** 0 apaga el aviso; máximo 240. */
  minutosSinResponder: number;
}

/** Una fila de carga por asesor en la vista Equipo. */
export interface CargaAsesor {
  email: string;
  nombre: string;
  estado: EstadoAsesor;
  chats: number;
  sinResponder: number;
  /** false si solo aparece por ser dueño de un chat abierto (p. ej. ya no está en el equipo). Ausente = servidor anterior. */
  enEquipo?: boolean;
  /** Coordina: no se cuenta como asesor disponible. */
  coordina?: boolean;
}

/** `GET /atencion/resumen` (solo quien coordina). */
export interface ResumenAtencion {
  sinAsignar: number;
  sinResponder: number;
  porAsesor: CargaAsesor[];
  ajustes: AjustesAtencion;
  /** Fase D (D-727): resumen por cola; ausente o vacío si el comercio no tiene colas. */
  porCola?: ResumenCola[];
  /** Cifras opcionales: la pantalla las muestra solo si llegan. Segundos que lleva esperando el chat sin responder más antiguo (0 = nadie espera). */
  esperaMasLargaSeg?: number | null;
  /** Objetivo de respuesta (los minutos del aviso «sin responder», en segundos); null si el aviso está en 0. */
  objetivoSeg?: number | null;
  /** Chats sin responder que ya esperan `objetivoSeg` o más; null sin objetivo. */
  pasaronObjetivo?: number | null;
  /** «Sin asignar» y «Sin responder» cuentan solo los chats con mensajes de estos últimos días. */
  ventanaDias?: number;
  /** Chats abiertos que quedaron fuera de esas dos cifras por no tener mensajes en la ventana. */
  fueraDeVentana?: { sinAsignar?: number; sinResponder?: number };
}

/** Movimiento del historial del chat (`log`). */
export interface MovimientoChat {
  accion: string;
  por?: string;
  para?: string;
  nota?: string;
  en?: string;
}

/** `GET /atencion/threads/:threadId` (el front trata el 404 como sin dueño y sin notas). */
export interface HiloAtencion {
  threadId: string;
  owner: DuenoChat | null;
  notas: NotaChat[];
  log: MovimientoChat[];
  /** Fase D (D-727): cola del chat; ausente o null si no tiene. */
  colaId?: string | null;
  /** Fase E (D-728): cierre del chat; ausente o null = abierto. */
  cierre?: CierreChat | null;
  /** Fase E (D-728): ids de etiqueta vigentes del chat. */
  etiquetas?: string[];
}

/** Lo que emite `app-chat-dueno.pasar` cuando recibe `conNota=true`: una persona o una cola, nunca las dos. */
export interface Transferencia {
  email?: string;
  colaId?: string;
  nota: string;
}

/* ---------- Colas, horarios y entrada (D-727, fase D de CONV) ---------- */

export type RepartoCola = 'turnos' | 'manual';

/** Franja de un día: horas locales de Colombia, `cierra` después de `abre`. */
export interface FranjaCola {
  /** `HH:MM`. */
  abre: string;
  cierra: string;
}

/** Horario de una cola: claves "0" (domingo) a "6"; `null` = cerrado ese día. */
export interface HorarioCola {
  activo: boolean;
  dias: Record<string, FranjaCola | null>;
}

/** Lo mínimo de una cola: lo que recibe quien no coordina. */
export interface ColaBasica {
  id: string;
  nombre: string;
  activa: boolean;
  /** Calculado por el servidor. */
  enHorario?: boolean;
}

/** Cola completa (`companyConfig/{empresa}.atencion.colas`). Sin `id` = cola nueva. */
export interface ColaAtencion extends Omit<ColaBasica, 'id'> {
  id?: string;
  /** Ids de líneas del comercio o `red_instagram`, `red_facebook`, `red_tiktok`. */
  lineas: string[];
  /** Correos del equipo. */
  asesores: string[];
  reparto: RepartoCola;
  horario: HorarioCola;
  /** 0 a 500 caracteres. Vacío = no se envía nada. */
  mensajeFuera: string;
  /** Fase E (D-728): 0 a 500 caracteres; se envía al chat nuevo en horario. Vacío = no se envía. */
  mensajeBienvenida?: string;
  /** Fase E (D-728): 0 a 500 caracteres; se envía al cerrar el chat a mano. Vacío = no se envía. */
  mensajeCierre?: string;
}

/** Número o cuenta que se puede meter en una cola (`lineas` de `GET /atencion/colas`). */
export interface LineaDeCola {
  id: string;
  nombre: string;
  canal: string;
}

/** `GET /atencion/colas`. Quien no coordina recibe colas básicas y `lineas` vacío. */
export interface ColasAtencion {
  colas: Array<ColaBasica & Partial<ColaAtencion>>;
  lineas: LineaDeCola[];
}

/** Una fila de `porCola` en el resumen. */
export interface ResumenCola {
  id: string;
  nombre: string;
  activa: boolean;
  enHorario: boolean;
  /** Chats sin dueño. */
  enEspera: number;
  sinResponder: number;
  chats: number;
}

/* ---------- Cerrar con motivo, etiquetas y respuestas rápidas (D-728, fase E de CONV) ---------- */

/** Cierre de un chat; el servidor lo guarda en `messaging_threads.cierre`. */
export interface CierreChat {
  en: string;
  /** Correo de quien cerró, o `sistema` en el cierre automático. */
  por: string;
  nombre?: string;
  motivo: string;
}

export type ColorEtiqueta = 'morado' | 'verde' | 'ambar' | 'rojo' | 'azul' | 'gris';

/** Etiqueta del catálogo del comercio. Sin `id` = etiqueta nueva (el servidor lo genera del nombre). */
export interface EtiquetaChat {
  id?: string;
  nombre: string;
  color: ColorEtiqueta;
}

/** Respuesta rápida: `comando` como `/pagos`; `{cliente}` y `{asesor}` se resuelven al insertarla. */
export interface RespuestaRapida {
  id?: string;
  comando: string;
  texto: string;
}

/** `GET /atencion/catalogos`: siempre los cuatro, con los valores por defecto del servidor. */
export interface CatalogosAtencion {
  motivosCierre: string[];
  /** 0 = apagado; entero de 1 a 720 = horas sin que el cliente escriba. */
  cierreAutoHoras: number;
  etiquetas: EtiquetaChat[];
  rapidos: RespuestaRapida[];
}

/** Respuesta de cerrar, reabrir y etiquetar un chat. */
export interface AccionHilo {
  owner: DuenoChat | null;
  colaId?: string;
  cierre: CierreChat | null;
  etiquetas: string[];
}

// ─── Informes de atención (fase H, D-729) ───

/** Filtros de `GET /atencion/informe`. Fechas `AAAA-MM-DD` (hora de Colombia); `pagina` 0 = descarga completa. */
export interface FiltrosInformeAtencion {
  desde?: string;
  hasta?: string;
  canal?: string;
  lineId?: string;
  colaId?: string;
  asesor?: string;
  pagina?: number;
}

/** Una fila de cifras por canal, cola o asesor. */
export interface CifraInforme {
  clave: string;
  nombre: string;
  creados: number;
  cerrados: number;
}

/** Una fila de «por motivo» o «por etiqueta». */
export interface TotalInforme {
  nombre: string;
  total: number;
}

export interface ResumenInforme {
  creados: number;
  cerrados: number;
  abiertos: number;
  sinResponder: number;
  /** Mediana en segundos; null si ningún chat la tiene. */
  primeraRespuestaSeg: number | null;
  conPrimeraRespuesta: number;
  // Cifras que el servidor aún no manda: la pantalla las muestra solo si llegan (nunca se inventan).
  /** Clientes que escribieron por primera vez en el rango. */
  clientesNuevos?: number;
  /** Clientes que ya habían escrito antes y volvieron en el rango. */
  clientesVuelven?: number;
  /** Chats cerrados que el cliente volvió a abrir en el rango. */
  reabiertos?: number;
  /** Percentil 90 de la primera respuesta, en segundos. */
  primeraRespuestaP90Seg?: number | null;
  /** Objetivo de primera respuesta del comercio, en segundos. */
  objetivoSeg?: number | null;
  /** Porcentaje (0-100) de primeras respuestas dentro del objetivo. */
  dentroObjetivoPct?: number | null;
  /** Las mismas cifras del periodo anterior de igual largo, para la tendencia. */
  anterior?: { creados?: number; cerrados?: number; primeraRespuestaSeg?: number | null };
  porCanal: CifraInforme[];
  porCola: CifraInforme[];
  porAsesor: CifraInforme[];
  porMotivo: TotalInforme[];
  porEtiqueta: TotalInforme[];
}

/** Fila de auditoría: nunca trae teléfonos completos ni texto de mensajes. */
export interface FilaInforme {
  threadId: string;
  canal: string;
  linea: string;
  contacto: string;
  asesor: string | null;
  cola: string | null;
  etiquetas: string[];
  creadoEn: string | null;
  ultimoMensajeEn: string | null;
  estado: 'abierto' | 'cerrado';
  motivoCierre: string | null;
  cerradoPor: string | null;
  duracionMin: number | null;
  primeraRespuestaSeg: number | null;
}

export interface InformeAtencion {
  rango: { desde: string; hasta: string };
  resumen: ResumenInforme;
  filas: FilaInforme[];
  pagina: number;
  paginas: number;
  total: number;
  /** Solo con `pagina=0`: hay más filas de las que caben en la descarga. */
  truncado?: boolean;
}

// ─── Ayuda de Opttia al asesor (fase F, D-730) ───

/** Qué pide el asesor: un resumen del chat o una respuesta sugerida. */
export type TipoAyudaOpttia = 'resumen' | 'respuesta';

/** `POST /atencion/threads/:id/ayuda`: no guarda nada en el chat ni envía nada al cliente. */
export type AyudaOpttia =
  | { tipo: 'resumen'; resumen: string; pendiente: string }
  | { tipo: 'respuesta'; texto: string };

/** Lo que el asesor eligió hacer con la sugerencia en el cuadro de escribir. */
export type ResultadoUsoSugerencia = 'usado' | 'bloqueado' | 'cancelado';

/** Texto sugerido para el cuadro de escribir; `n` cambia en cada uso para detectar repetidos. */
export interface TextoSugerido {
  texto: string;
  n: number;
}

/* ---------- Otros chats de este cliente (CONV, solo lectura) ---------- */

export type CanalRelacionados = 'whatsapp' | 'instagram' | 'facebook' | 'tiktok';

/** Por qué el servidor une el chat con el abierto. `mismo_telefono` y `misma_ficha` son deducidos al leer; solo `vinculo_manual` lo hizo una persona. */
export type PorqueRelacionado = 'mismo_telefono' | 'misma_ficha' | 'vinculo_manual';

export interface AnclaRelacionados {
  tipo: 'telefono' | 'cliente';
  /** Hay más de una ficha con ese teléfono: solo se unen los chats del mismo teléfono. */
  ambiguo?: boolean;
  clienteNombre?: string | null;
}

export interface ItemRelacionado {
  canal: CanalRelacionados;
  /** WhatsApp con número propio: id de la línea; ausente = número compartido. Redes: `red_<canal>`. */
  lineId?: string;
  linea?: { id: string; nombre: string; telefono: string };
  /** WhatsApp: phoneHash. Redes: identidadHash. */
  hash: string;
  phoneMasked?: string;
  nombre: string;
  ultimoEn: string;
  ultimaDireccion: 'inbound' | 'outbound';
  /** No existe en el número compartido. */
  threadId?: string;
  owner?: DuenoChat;
  colaId?: string;
  cerrado: boolean;
  motivoCierre?: string;
  /** Etiquetas vigentes del chat (solo los que tienen hilo): evita que guardar una etiqueta borre las que ya tenía. */
  etiquetas?: string[];
  porque: PorqueRelacionado;
}

export interface RelacionadosRespuesta {
  /** null = sin ancla (ver `motivo`). */
  ancla: AnclaRelacionados | null;
  motivo?: 'sin_telefono' | 'sin_vinculo';
  /** La lista puede estar incompleta (una conversación muy larga tapó otros chats). */
  truncado?: boolean;
  items: ItemRelacionado[];
}
