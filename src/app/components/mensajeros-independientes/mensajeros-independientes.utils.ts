import {
  AccionSolicitud,
  EnlaceDocumento,
  EstadoSolicitud,
  FechaServidor,
  SolicitudMensajero,
  TipoDocumento,
} from './mensajeros-independientes.models';

/**
 * Lógica pura de "Mensajeros independientes": etiquetas, fechas, validación del motivo, qué botones
 * se ven y cómo se interpretan los errores. Sin Angular ni acceso al DOM (salvo la lectura de la
 * sesión, que está aislada), para probarla con un spec sencillo.
 */

// ---------------------------------------------------------------------------
// Estados
// ---------------------------------------------------------------------------

export const ESTADOS_SOLICITUD: readonly EstadoSolicitud[] = [
  'en_revision',
  'pendiente_documentos',
  'rechazado',
  'aprobado',
  'suspendido',
];

/** El backend responde `en_revision` cuando no se manda `?estado=`. */
export const ESTADO_POR_DEFECTO: EstadoSolicitud = 'en_revision';

export type TonoEstado = 'info' | 'warn' | 'ok' | 'err' | 'neutro';

interface InfoEstado {
  /** Etiqueta de una solicitud concreta ("Aprobada"). */
  etiqueta: string;
  /** Texto de la pestaña del filtro ("Aprobadas"). */
  pestana: string;
  tono: TonoEstado;
}

const INFO_ESTADO: Record<EstadoSolicitud, InfoEstado> = {
  en_revision: { etiqueta: 'En revisión', pestana: 'En revisión', tono: 'info' },
  pendiente_documentos: { etiqueta: 'Faltan documentos', pestana: 'Faltan documentos', tono: 'warn' },
  rechazado: { etiqueta: 'Rechazada', pestana: 'Rechazadas', tono: 'err' },
  aprobado: { etiqueta: 'Aprobada', pestana: 'Aprobadas', tono: 'ok' },
  suspendido: { etiqueta: 'Suspendida', pestana: 'Suspendidas', tono: 'neutro' },
};

export function esEstadoSolicitud(valor: unknown): valor is EstadoSolicitud {
  return typeof valor === 'string' && (ESTADOS_SOLICITUD as readonly string[]).includes(valor);
}

/** "pendiente_documentos" -> "Pendiente documentos": para valores que el backend agregue después. */
function humanizar(valor: string): string {
  const texto = valor.replace(/[_-]+/g, ' ').trim();
  return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : '';
}

export function etiquetaEstado(estado: unknown): string {
  if (esEstadoSolicitud(estado)) {
    return INFO_ESTADO[estado].etiqueta;
  }
  return typeof estado === 'string' && estado.trim() ? humanizar(estado) : 'Sin estado';
}

export function etiquetaPestana(estado: EstadoSolicitud): string {
  return INFO_ESTADO[estado].pestana;
}

export function tonoEstado(estado: unknown): TonoEstado {
  return esEstadoSolicitud(estado) ? INFO_ESTADO[estado].tono : 'neutro';
}

// ---------------------------------------------------------------------------
// Fechas
// ---------------------------------------------------------------------------

function fechaValida(fecha: Date): boolean {
  return !isNaN(fecha.getTime());
}

/** Números menores a 1e11 son segundos (1e11 s está en el año 5138; 1e11 ms, en 1973). */
function desdeNumero(n: number): Date | null {
  if (!isFinite(n)) {
    return null;
  }
  const fecha = new Date(Math.abs(n) < 1e11 ? n * 1000 : n);
  return fechaValida(fecha) ? fecha : null;
}

function numeroOpcional(valor: unknown): number | null {
  if (typeof valor === 'number' && isFinite(valor)) {
    return valor;
  }
  if (typeof valor === 'string' && /^-?\d+(\.\d+)?$/.test(valor.trim())) {
    return Number(valor);
  }
  return null;
}

/**
 * Convierte lo que mande el servidor en un `Date`. Acepta el Timestamp de Firestore serializado
 * (`{_seconds, _nanoseconds}` o `{seconds, nanoseconds}`), texto ISO, milisegundos y `Date`.
 * Devuelve `null` si no hay un valor utilizable.
 */
export function normalizarFecha(valor: FechaServidor | Date | unknown): Date | null {
  if (valor === null || valor === undefined || valor === '') {
    return null;
  }
  if (valor instanceof Date) {
    return fechaValida(valor) ? valor : null;
  }
  if (typeof valor === 'number') {
    return desdeNumero(valor);
  }
  if (typeof valor === 'string') {
    const texto = valor.trim();
    if (!texto) {
      return null;
    }
    const numero = numeroOpcional(texto);
    if (numero !== null) {
      return desdeNumero(numero);
    }
    const fecha = new Date(texto);
    return fechaValida(fecha) ? fecha : null;
  }
  if (typeof valor === 'object') {
    const crudo = valor as Record<string, unknown>;
    const segundos = numeroOpcional(crudo['_seconds'] ?? crudo['seconds']);
    if (segundos === null) {
      return null;
    }
    const nanos = numeroOpcional(crudo['_nanoseconds'] ?? crudo['nanoseconds']) ?? 0;
    const fecha = new Date(segundos * 1000 + Math.floor(nanos / 1e6));
    return fechaValida(fecha) ? fecha : null;
  }
  return null;
}

export interface FechaReferencia {
  fecha: Date;
  /** "Enviada" si ya la mandó a revisión; "Registrada" si solo se inscribió. */
  etiqueta: 'Enviada' | 'Registrada';
}

/** Fecha de envío a revisión o, si aún no la envía, la de registro. */
export function fechaReferencia(
  solicitud: Pick<SolicitudMensajero, 'enviadoAt' | 'creadoAt'>,
): FechaReferencia | null {
  const enviada = normalizarFecha(solicitud?.enviadoAt);
  if (enviada) {
    return { fecha: enviada, etiqueta: 'Enviada' };
  }
  const creada = normalizarFecha(solicitud?.creadoAt);
  return creada ? { fecha: creada, etiqueta: 'Registrada' } : null;
}

// ---------------------------------------------------------------------------
// Datos de la persona y del vehículo
// ---------------------------------------------------------------------------

export function nombreCompleto(solicitud: Pick<SolicitudMensajero, 'nombres' | 'apellidos'>): string {
  const nombre = `${solicitud?.nombres ?? ''} ${solicitud?.apellidos ?? ''}`.replace(/\s+/g, ' ').trim();
  return nombre || 'Sin nombre';
}

function claveTexto(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const ETIQUETA_VEHICULO: Record<string, string> = {
  moto: 'Moto',
  motocicleta: 'Moto',
  carro: 'Carro',
  automovil: 'Carro',
  camioneta: 'Camioneta',
  bicicleta: 'Bicicleta',
  bici: 'Bicicleta',
  pie: 'A pie',
  a_pie: 'A pie',
  apie: 'A pie',
  caminando: 'A pie',
};

export function etiquetaVehiculo(tipo: unknown): string {
  const clave = claveTexto(tipo);
  if (!clave) {
    return 'Sin vehículo';
  }
  return ETIQUETA_VEHICULO[clave] ?? humanizar(String(tipo));
}

export function placaVisible(placa: unknown): string {
  return typeof placa === 'string' ? placa.replace(/\s+/g, '').toUpperCase() : '';
}

// ---------------------------------------------------------------------------
// Motivo de rechazo o suspensión
// ---------------------------------------------------------------------------

export const MOTIVO_MIN = 5;
export const MOTIVO_MAX = 300;

export interface ResultadoMotivo {
  valido: boolean;
  /** Texto sin espacios sobrantes en los extremos: es lo que se envía. */
  texto: string;
  longitud: number;
  error: string | null;
}

/** El motivo debe tener entre 5 y 300 caracteres, sin contar espacios en los extremos. */
export function validarMotivo(valor: string | null | undefined): ResultadoMotivo {
  const texto = (valor ?? '').trim();
  const longitud = texto.length;
  let error: string | null = null;
  if (longitud === 0) {
    error = `Escribe el motivo (mínimo ${MOTIVO_MIN} caracteres).`;
  } else if (longitud < MOTIVO_MIN) {
    error = `El motivo es muy corto: escribe al menos ${MOTIVO_MIN} caracteres.`;
  } else if (longitud > MOTIVO_MAX) {
    error = `El motivo es muy largo: máximo ${MOTIVO_MAX} caracteres.`;
  }
  return { valido: error === null, texto, longitud, error };
}

// ---------------------------------------------------------------------------
// Documentos
// ---------------------------------------------------------------------------

export const TIPOS_DOCUMENTO: readonly TipoDocumento[] = [
  'cedulaFrente',
  'cedulaReverso',
  'selfie',
  'licencia',
  'soat',
  'fotoVehiculo',
];

const ETIQUETA_DOCUMENTO: Record<TipoDocumento, string> = {
  cedulaFrente: 'Cédula (frente)',
  cedulaReverso: 'Cédula (reverso)',
  selfie: 'Foto del rostro (selfie)',
  licencia: 'Licencia de conducción',
  soat: 'SOAT',
  fotoVehiculo: 'Foto del vehículo',
};

export function etiquetaDocumento(tipo: string): string {
  return (ETIQUETA_DOCUMENTO as Record<string, string>)[tipo] ?? (humanizar(tipo) || 'Documento');
}

/** Solo se enlazan direcciones https (o http de la propia máquina, para desarrollo). */
export function esUrlDeDocumento(url: unknown): url is string {
  return typeof url === 'string' && /^(https:\/\/|http:\/\/(localhost|127\.0\.0\.1)([:/]|$))/i.test(url.trim());
}

/** `true` si el archivo se puede mostrar como miniatura (los JPEG). El resto se ofrece para descargar. */
export function esContenidoImagen(contentType: unknown): boolean {
  if (typeof contentType !== 'string' || !contentType.trim()) {
    return true;
  }
  return /^image\//i.test(contentType.trim());
}

export type ModoDocumento = 'imagen' | 'archivo' | 'sin_enlace' | 'faltante';

export interface DocumentoVista {
  tipo: string;
  etiqueta: string;
  modo: ModoDocumento;
  /** Solo para `imagen` y `archivo`. */
  url: string | null;
  /** "PDF" si el archivo es un PDF; texto genérico en otro caso. */
  formato: string | null;
  subidoAt: Date | null;
}

function nombreFormato(contentType: unknown): string {
  return typeof contentType === 'string' && /pdf/i.test(contentType) ? 'PDF' : 'archivo';
}

/**
 * Arma lo que se pinta en la cuadrícula: un recuadro por cada documento que el mensajero subió o que
 * todavía le falta. Quien va a pie o en bicicleta solo trae tres, así que no se inventan los demás.
 */
export function construirDocumentos(
  solicitud: Pick<SolicitudMensajero, 'documentos' | 'documentosFaltantes'>,
  enlaces: { [tipo: string]: EnlaceDocumento | undefined } | null | undefined,
): DocumentoVista[] {
  const faltantes = solicitud?.documentosFaltantes ?? [];
  const subidos = solicitud?.documentos ?? {};
  const conEnlace = enlaces ?? {};

  const presentes = new Set<string>([
    ...Object.keys(conEnlace).filter((tipo) => !!conEnlace[tipo]),
    ...Object.keys(subidos).filter((tipo) => !!subidos[tipo]?.subido),
    ...faltantes,
  ]);
  const conocidos = TIPOS_DOCUMENTO.filter((tipo) => presentes.has(tipo));
  const extras = Array.from(presentes).filter((tipo) => !(TIPOS_DOCUMENTO as readonly string[]).includes(tipo));

  return [...conocidos, ...extras].map((tipo): DocumentoVista => {
    const enlace = conEnlace[tipo];
    const subidoAt = normalizarFecha(subidos[tipo]?.subidoAt);
    const base = { tipo, etiqueta: etiquetaDocumento(tipo), subidoAt };

    if (enlace && esUrlDeDocumento(enlace.url)) {
      return esContenidoImagen(enlace.contentType)
        ? { ...base, modo: 'imagen', url: enlace.url, formato: null }
        : { ...base, modo: 'archivo', url: enlace.url, formato: nombreFormato(enlace.contentType) };
    }
    if (subidos[tipo]?.subido || enlace) {
      return { ...base, modo: 'sin_enlace', url: null, formato: null };
    }
    return { ...base, modo: 'faltante', url: null, formato: null };
  });
}

/** Direcciones de las fotos, en el orden de la cuadrícula: alimentan al visor con zoom. */
export function urlsDeImagenes(documentos: DocumentoVista[]): string[] {
  return documentos.filter((d) => d.modo === 'imagen' && !!d.url).map((d) => d.url as string);
}

// ---------------------------------------------------------------------------
// Vencimiento de los enlaces
// ---------------------------------------------------------------------------

export const VIGENCIA_ENLACES_SEGUNDOS = 600;

/** Segundos que le quedan a los enlaces recibidos en `cargadoEnMs`. Nunca es negativo. */
export function segundosRestantes(
  vencenEnSegundos: number | null | undefined,
  cargadoEnMs: number,
  ahoraMs: number,
): number {
  const vigencia =
    typeof vencenEnSegundos === 'number' && isFinite(vencenEnSegundos) && vencenEnSegundos > 0
      ? vencenEnSegundos
      : VIGENCIA_ENLACES_SEGUNDOS;
  return Math.max(0, Math.ceil(vigencia - (ahoraMs - cargadoEnMs) / 1000));
}

export function textoVencimiento(restantes: number): string {
  if (restantes <= 0) {
    return 'Los enlaces de los documentos ya vencieron. Recarga los documentos para verlos.';
  }
  const minutos = Math.ceil(restantes / 60);
  return minutos <= 1
    ? 'Los enlaces de los documentos vencen en menos de un minuto.'
    : `Los enlaces de los documentos vencen en ${minutos} minutos.`;
}

// ---------------------------------------------------------------------------
// Qué botones se ven
// ---------------------------------------------------------------------------

export interface AccionesDisponibles {
  aprobar: boolean;
  aprobarHabilitado: boolean;
  /** Por qué "Aprobar" está deshabilitado, para decírselo a la persona. */
  aprobarBloqueadoPor: string | null;
  rechazar: boolean;
  suspender: boolean;
}

/**
 * - en revisión: Aprobar (solo si no faltan documentos) y Rechazar.
 * - aprobada: Suspender.
 * - los demás estados no tienen acciones.
 */
export function accionesDisponibles(
  estado: unknown,
  documentosFaltantes: string[] | null | undefined,
): AccionesDisponibles {
  const faltantes = documentosFaltantes ?? [];
  const enRevision = estado === 'en_revision';
  const hayFaltantes = faltantes.length > 0;
  return {
    aprobar: enRevision,
    aprobarHabilitado: enRevision && !hayFaltantes,
    aprobarBloqueadoPor:
      enRevision && hayFaltantes
        ? `No se puede aprobar todavía: faltan documentos (${faltantes.map(etiquetaDocumento).join(', ')}).`
        : null,
    rechazar: enRevision,
    suspender: estado === 'aprobado',
  };
}

/** Rechazar y suspender piden el motivo; aprobar no. */
export function accionPideMotivo(accion: AccionSolicitud): boolean {
  return accion === 'rechazar' || accion === 'suspender';
}

/** El último motivo y quién lo decidió se muestran en solicitudes rechazadas o suspendidas. */
export function muestraMotivoDeRevision(estado: unknown): boolean {
  return estado === 'rechazado' || estado === 'suspendido';
}

// ---------------------------------------------------------------------------
// Mensajes de la pantalla
// ---------------------------------------------------------------------------

export interface MensajeVacio {
  titulo: string;
  texto: string;
}

export function mensajeVacio(estado: EstadoSolicitud): MensajeVacio {
  switch (estado) {
    case 'en_revision':
      return {
        titulo: 'No hay solicitudes en revisión',
        texto: 'Cuando alguien termine su registro y envíe los documentos desde la app de mensajeros, aparecerá aquí.',
      };
    case 'pendiente_documentos':
      return {
        titulo: 'Nadie tiene documentos pendientes',
        texto: 'Aquí aparecen quienes se inscribieron pero todavía no completan sus documentos.',
      };
    case 'rechazado':
      return { titulo: 'No hay solicitudes rechazadas', texto: 'Las solicitudes que rechaces quedarán en esta lista.' };
    case 'aprobado':
      return { titulo: 'Todavía no hay mensajeros aprobados', texto: 'Los mensajeros que apruebes quedarán en esta lista.' };
    case 'suspendido':
      return { titulo: 'No hay mensajeros suspendidos', texto: 'Los mensajeros que suspendas quedarán en esta lista.' };
  }
}

/** Texto del aviso al terminar una acción. El nombre es dato de la persona: solo se interpola. */
export function mensajeExito(accion: AccionSolicitud, nombre: string): string {
  switch (accion) {
    case 'aprobar':
      return `Aprobaste la solicitud de ${nombre}.`;
    case 'rechazar':
      return `Rechazaste la solicitud de ${nombre}.`;
    case 'suspender':
      return `Suspendiste a ${nombre}.`;
  }
}

// ---------------------------------------------------------------------------
// Errores del backend
// ---------------------------------------------------------------------------

export interface ErrorInterpretado {
  /** Texto para la persona. Si el backend mandó `error`, va tal cual. */
  texto: string;
  status: number | null;
  /** 409 con `TRANSICION_NO_PERMITIDA`: la solicitud ya cambió de estado. */
  transicionObsoleta: boolean;
}

export const CODIGO_TRANSICION_NO_PERMITIDA = 'TRANSICION_NO_PERMITIDA';

function textoPorEstado(status: number | null): string {
  if (status === 0) {
    return 'No hay conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  if (status === 401) {
    return 'Tu sesión ya no es válida. Vuelve a iniciar sesión.';
  }
  if (status === 403) {
    return 'No tienes permiso para gestionar las solicitudes de mensajeros independientes.';
  }
  if (status === 404) {
    return 'No encontramos la solicitud. Puede que ya no exista.';
  }
  if (status !== null && status >= 500) {
    return 'El servidor tuvo un problema. Inténtalo de nuevo en unos minutos.';
  }
  return 'No pudimos completar la operación. Inténtalo de nuevo.';
}

/**
 * Lee el error de una respuesta HTTP. El backend responde `{ success:false, error, code? }` con el
 * texto ya en español; ese `error` se muestra tal cual. Solo se lee de un cuerpo JSON: una página de
 * error de un proxy (HTML o texto) no se le muestra a nadie.
 */
export function interpretarError(err: unknown): ErrorInterpretado {
  const crudo = (err ?? {}) as { status?: unknown; error?: unknown };
  const status = typeof crudo.status === 'number' ? crudo.status : null;
  const cuerpo = crudo.error && typeof crudo.error === 'object' ? (crudo.error as Record<string, unknown>) : null;
  const delBackend = cuerpo && typeof cuerpo['error'] === 'string' && (cuerpo['error'] as string).trim() ? (cuerpo['error'] as string) : null;
  const codigo = cuerpo && typeof cuerpo['code'] === 'string' ? (cuerpo['code'] as string) : null;
  return {
    texto: delBackend ?? textoPorEstado(status),
    status,
    transicionObsoleta: status === 409 && codigo === CODIGO_TRANSICION_NO_PERMITIDA,
  };
}

// ---------------------------------------------------------------------------
// Fila de la tabla
// ---------------------------------------------------------------------------

export interface FilaSolicitud {
  id: string;
  nombreCompleto: string;
  cedula: string;
  celular: string;
  ciudad: string;
  vehiculo: string;
  placa: string;
  estado: string;
  estadoEtiqueta: string;
  estadoTono: TonoEstado;
  fecha: Date | null;
  fechaEtiqueta: string | null;
  /** Milisegundos de `fecha` (0 si no hay): sirve para ordenar la columna. */
  marca: number;
  faltantes: number;
}

export function construirFila(solicitud: SolicitudMensajero): FilaSolicitud {
  const referencia = fechaReferencia(solicitud);
  return {
    id: solicitud.id,
    nombreCompleto: nombreCompleto(solicitud),
    cedula: solicitud.cedula ?? '',
    celular: solicitud.celular ?? '',
    ciudad: solicitud.ciudad ?? '',
    vehiculo: etiquetaVehiculo(solicitud.tipoVehiculo),
    placa: placaVisible(solicitud.placa),
    estado: String(solicitud.estadoRegistro ?? ''),
    estadoEtiqueta: etiquetaEstado(solicitud.estadoRegistro),
    estadoTono: tonoEstado(solicitud.estadoRegistro),
    fecha: referencia?.fecha ?? null,
    fechaEtiqueta: referencia?.etiqueta ?? null,
    marca: referencia?.fecha.getTime() ?? 0,
    faltantes: solicitud.documentosFaltantes?.length ?? 0,
  };
}

/** Más recientes primero; las que no tienen fecha, al final. */
export function filasPorFechaReciente(solicitudes: SolicitudMensajero[] | null | undefined): FilaSolicitud[] {
  return (solicitudes ?? []).map(construirFila).sort((a, b) => b.marca - a.marca);
}

// ---------------------------------------------------------------------------
// Quién puede ver la pantalla
// ---------------------------------------------------------------------------

function claveSinEspacios(valor: unknown): string {
  return String(valor ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\s+/g, '');
}

export const EMPRESA_OPERADORA = 'julsmind';
export const ROL_SUPER_ADMINISTRADOR = 'superadministrador';

/**
 * La sesión es del Super Administrador de la operadora (empresa "Julsmind", sin importar mayúsculas
 * ni espacios). Solo decide qué se muestra: el candado real es del backend, que responde 403.
 */
export function esSuperAdminOperadora(usuario: { company?: unknown; rol?: unknown } | null | undefined): boolean {
  return (
    !!usuario &&
    claveSinEspacios(usuario.company) === EMPRESA_OPERADORA &&
    claveSinEspacios(usuario.rol) === ROL_SUPER_ADMINISTRADOR
  );
}

/** Lee `localStorage['user']` (el que arma el login) y aplica `esSuperAdminOperadora`. */
export function sesionEsSuperAdminOperadora(): boolean {
  try {
    const crudo = localStorage.getItem('user');
    return esSuperAdminOperadora(crudo ? JSON.parse(crudo) : null);
  } catch {
    return false;
  }
}
