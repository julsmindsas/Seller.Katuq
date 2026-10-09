/**
 * Tienda en minutos con IA, en UN solo paso — parte pura (sin Angular, sin DOM).
 *
 * Aquí vive todo lo que se puede probar sin navegador: qué se le pide al comercio y
 * cómo se valida, el precio que escribe, la solicitud que viaja al servidor, cómo se
 * traduce el avance del servidor a pasos en lenguaje de negocio, cuándo se deja de
 * consultar y qué mensaje ve la persona ante cada error.
 *
 * Reglas de oro (las vigilan las pruebas de `tests/sitios/tienda-en-un-paso.test.js`):
 *  - El precio SIEMPRE lo pone el comercio: sin precio no hay foto que valga, y nada de
 *    aquí inventa uno.
 *  - Una sola solicitud por intento: el `requestId` se genera UNA vez y se reusa en los
 *    reintentos, así un doble clic o un reintento de red nunca duplica nada.
 *  - Los mensajes son para el comercio: qué pasó y qué hacer, sin códigos ni jerga.
 *
 * Esto solo decide qué se MUESTRA. Quien manda es el servidor
 * (`requireFeature('singleStepStore')`, 403 si la función está apagada).
 */

// ── Límites (los mismos del servidor: `services/sites/tiendaEnUnPasoContenido.js`) ──

export const MAX_FOTOS = 3;
export const MIN_NOMBRE = 2;
export const MAX_NOMBRE = 80;
export const MIN_DESCRIPCION = 8;
export const MAX_DESCRIPCION = 300;
export const PRECIO_MAXIMO = 99999999;

/** Cada cuánto se consulta el avance, y a partir de cuándo se espacia. */
export const CONSULTA_MS = 3000;
export const CONSULTA_LENTA_MS = 5000;
export const LENTA_DESPUES_MS = 120000;
/** Si en tanto tiempo no terminó, se deja de consultar (el trabajo sigue en el servidor). */
export const MAX_ESPERA_MS = 12 * 60 * 1000;
/** Consultas seguidas que pueden fallar antes de avisar que se perdió la conexión. */
export const MAX_FALLOS_SEGUIDOS = 5;

/** Con qué origen el servidor marca los sitios de esta función. */
export const ORIGEN_TIENDA_EN_UN_PASO = 'tienda-en-un-paso';

// ── Lo que devuelve el servidor ──────────────────────────────────────────────

export type EstadoTrabajo = 'queued' | 'running' | 'done' | 'interrupted' | 'failed';
export type PasoTrabajo = 'photos' | 'texts' | 'design' | 'publishing' | 'finished';
export type EstadoFoto = 'pending' | 'processing' | 'ready' | 'skipped';
export type LoQueFalta = 'product' | 'plan' | 'setup' | 'publish' | null;

export interface FotoDelAvance {
  index: number;
  state: EstadoFoto;
  price: number;
  productName: string;
  photoUrl: string;
  /** Si la foto se dejó por fuera: qué pasó y qué hacer, ya redactado para el comercio. */
  reason: string;
}

export interface AvanceTienda {
  siteId: string;
  /** La llave del intento: con ella se retoma un trabajo interrumpido sin duplicar nada. */
  requestId: string;
  siteName: string;
  slug: string;
  state: EstadoTrabajo;
  step: PasoTrabajo;
  /** Mensaje amable del servidor para este momento. */
  message: string;
  productsReady: number;
  productsTotal: number;
  items: FotoDelAvance[];
  warnings: string[];
  published: boolean;
  missing: LoQueFalta;
  canRetry: boolean;
  siteUrl: string;
  previewUrl: string;
  editorUrl: string;
  startedAt: string;
  updatedAt: string;
  finishedAt: string;
}

export interface RespuestaIniciar {
  success: boolean;
  data: { siteId: string; reused: boolean; resumed: boolean; progress: AvanceTienda };
}

export interface RespuestaAvance {
  success: boolean;
  data: AvanceTienda;
}

// ── El formulario ────────────────────────────────────────────────────────────

export interface FotoDelFormulario {
  /** Identificador local, solo para el `trackBy` y los errores por foto. */
  id: number;
  nombreArchivo: string;
  /** La foto ya reducida (data URL), la que viaja al servidor. */
  imagen: string;
  vistaPrevia: string;
  /** Lo que la persona escribió como precio (puede traer puntos o el signo $). */
  precioTexto: string;
}

export interface FormularioTienda {
  nombre: string;
  descripcion: string;
  fotos: FotoDelFormulario[];
}

export interface ErroresFormulario {
  nombre?: string;
  descripcion?: string;
  general?: string;
  /** Por el `id` de cada foto. */
  fotos: { [id: number]: string };
}

export interface ResultadoValidacion {
  valido: boolean;
  errores: ErroresFormulario;
}

export const MENSAJES = {
  /** El servidor ya tenía OTRA tienda armándose (otro envío): se muestra esa, y lo de ahora no se aplicó. */
  datosAnteriores:
    'Ya había una tienda armándose con un envío anterior. Te mostramos su avance; lo que mandaste ahora no se aplicó: si cambiaste precios o fotos, corrígelos en Productos cuando termine.',
  nombre: `Escribe el nombre de tu negocio (mínimo ${MIN_NOMBRE} letras).`,
  descripcion: `Cuéntanos en una frase qué vendes (mínimo ${MIN_DESCRIPCION} letras), o sube al menos una foto de un producto.`,
  demasiadasFotos: `Puedes subir hasta ${MAX_FOTOS} fotos. Quita las que sobren e inténtalo de nuevo.`,
  fotoSinPrecio: (n: number): string => `Escribe el precio de la foto ${n}. Tiene que ser un valor mayor que cero.`,
  fotoPrecioConDecimales: (n: number): string =>
    `Escribe el precio de la foto ${n} en pesos, sin decimales (por ejemplo 45000 o 45.000).`,
  fotosPreparando: 'Espera un momento: todavía estamos preparando tus fotos.',
  sinConexion: 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.',
  tardoDemasiado:
    'La respuesta tardó más de lo normal. Mira en Mis páginas si tu tienda ya apareció; si no, inténtalo de nuevo.',
  sesion: 'No pudimos identificar tu sesión. Cierra sesión, vuelve a entrar e inténtalo de nuevo.',
  generico: 'Algo salió mal al crear tu tienda. Inténtalo de nuevo; si sigue igual, escríbenos por soporte.',
  seCortoLaConsulta:
    'Perdimos la conexión con tu tienda, pero sigue creándose. Búscala en Mis páginas en unos minutos.',
  muchoTiempo:
    'Está tardando más de lo normal. Puedes cerrar esta ventana: tu tienda sigue creándose y la encuentras en Mis páginas.',
};

/** Texto de una línea: sin saltos ni espacios de más. */
export function limpiarTexto(valor: unknown, max: number): string {
  if (typeof valor !== 'string') {
    return '';
  }
  return valor
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max)
    .trim();
}

export type MotivoPrecio = 'ok' | 'decimales' | 'invalido';

export interface AnalisisPrecio {
  precio: number | null;
  motivo: MotivoPrecio;
}

/**
 * Qué se entiende del precio que escribió la persona. Es la MISMA regla del servidor
 * (`analyzePrice` en `services/sites/tiendaEnUnPasoContenido.js`):
 *
 *  - PESOS ENTEROS: "45000", "$ 45.000" y "  8900 " valen lo que dicen.
 *  - El punto o la coma son separador de MILES solo en grupos de 3 dígitos y con el mismo signo
 *    en todo el número: "12.500", "12,500", "1.250.000". Nunca "1.250,000".
 *  - Cualquier valor con 1 o 2 decimales ("12.5", "1.5", "45,50", "1.250,50") NO se redondea: se
 *    rechaza con motivo `decimales` para decirle a la persona que escriba el precio en pesos, sin
 *    decimales (redondear en silencio cambiaba lo que se cobra: "1.5" quedaba en $2).
 *  - Cero, negativo, vacío, texto o algo por encima del tope: motivo `invalido`.
 */
export function analizarPrecio(valor: unknown): AnalisisPrecio {
  const INVALIDO: AnalisisPrecio = { precio: null, motivo: 'invalido' };
  const DECIMALES: AnalisisPrecio = { precio: null, motivo: 'decimales' };
  let n: number;
  if (typeof valor === 'number') {
    if (!Number.isFinite(valor) || valor <= 0) {
      return INVALIDO;
    }
    if (!Number.isInteger(valor)) {
      return DECIMALES;
    }
    n = valor;
  } else if (typeof valor === 'string') {
    const t = valor.trim().replace(/^\$\s*/, '').replace(/\s+/g, '');
    if (!t) {
      return INVALIDO;
    }
    if (/^\d+$/.test(t)) {
      n = Number(t);
    } else if (/^[1-9]\d{0,2}(?:\.\d{3})+$/.test(t) || /^[1-9]\d{0,2}(?:,\d{3})+$/.test(t)) {
      n = Number(t.replace(/[.,]/g, ''));
    } else if (
      /^\d+[.,]\d{1,2}$/.test(t) ||
      /^[1-9]\d{0,2}(?:\.\d{3})+,\d{1,2}$/.test(t) ||
      /^[1-9]\d{0,2}(?:,\d{3})+\.\d{1,2}$/.test(t)
    ) {
      return DECIMALES;
    } else {
      return INVALIDO;
    }
  } else {
    return INVALIDO;
  }
  if (!Number.isFinite(n) || n < 1 || n > PRECIO_MAXIMO) {
    return INVALIDO;
  }
  return { precio: n, motivo: 'ok' };
}

/** El precio en pesos enteros, o `null` si no sirve. */
export function parsearPrecio(valor: unknown): number | null {
  return analizarPrecio(valor).precio;
}

/** "$ 45.000": los pesos con punto de miles, sin depender de la configuración regional del navegador. */
export function formatearPesos(valor: number): string {
  const entero = Math.max(0, Math.round(Number(valor) || 0));
  return `$ ${String(entero).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`;
}

export function textoPlural(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

/**
 * Revisa el formulario ANTES de mandarlo. El servidor vuelve a revisar todo; esto solo
 * evita un viaje para algo que ya se sabe que no sirve y le dice a la persona qué falta.
 */
export function validarFormulario(form: FormularioTienda, opciones: { preparando?: boolean } = {}): ResultadoValidacion {
  const errores: ErroresFormulario = { fotos: {} };
  const nombre = limpiarTexto(form.nombre, MAX_NOMBRE);
  const descripcion = limpiarTexto(form.descripcion, MAX_DESCRIPCION);
  const fotos = Array.isArray(form.fotos) ? form.fotos : [];

  if (nombre.length < MIN_NOMBRE) {
    errores.nombre = MENSAJES.nombre;
  }
  if (fotos.length === 0 && descripcion.length < MIN_DESCRIPCION) {
    errores.descripcion = MENSAJES.descripcion;
  }
  if (fotos.length > MAX_FOTOS) {
    errores.general = MENSAJES.demasiadasFotos;
  }
  fotos.forEach((foto, i) => {
    const analisis = analizarPrecio(foto.precioTexto);
    if (analisis.precio === null) {
      errores.fotos[foto.id] =
        analisis.motivo === 'decimales' ? MENSAJES.fotoPrecioConDecimales(i + 1) : MENSAJES.fotoSinPrecio(i + 1);
    }
  });
  if (opciones.preparando && !errores.general) {
    errores.general = MENSAJES.fotosPreparando;
  }

  const valido = !errores.nombre && !errores.descripcion && !errores.general && Object.keys(errores.fotos).length === 0;
  return { valido, errores };
}

export interface SolicitudTienda {
  requestId: string;
  businessName: string;
  description: string;
  photos: Array<{ image: string; price: number }>;
}

/**
 * La solicitud que viaja al servidor. Lanza si el formulario no es válido: así es
 * imposible mandar una foto sin precio por un descuido de quien llama.
 */
export function construirSolicitud(form: FormularioTienda, requestId: string): SolicitudTienda {
  const revision = validarFormulario(form);
  if (!revision.valido) {
    throw new Error('El formulario no está completo.');
  }
  return {
    requestId,
    businessName: limpiarTexto(form.nombre, MAX_NOMBRE),
    description: limpiarTexto(form.descripcion, MAX_DESCRIPCION),
    photos: form.fotos.map((foto) => ({ image: foto.imagen, price: parsearPrecio(foto.precioTexto) as number })),
  };
}

/**
 * Un resumen de lo que hay en el formulario: nombre, descripción, y de cada foto cuál es y su
 * precio. Dos formularios con la misma huella piden lo mismo (los espacios de más o "45000" frente
 * a "45.000" no cambian nada); si cambia, la persona corrigió algo.
 *
 * Sirve para decidir si un reintento puede usar el mismo `requestId`: con el mismo contenido sí
 * (así nunca se duplica nada); con el contenido cambiado NO, porque el servidor reengancharía el
 * trabajo viejo y el precio corregido se ignoraría. Lo que se compara es una cadena propia del
 * navegador: no viaja al servidor (el servidor calcula la suya).
 */
export function huellaDelFormulario(form: FormularioTienda): string {
  const fotos = Array.isArray(form.fotos) ? form.fotos : [];
  return JSON.stringify([
    limpiarTexto(form.nombre, MAX_NOMBRE),
    limpiarTexto(form.descripcion, MAX_DESCRIPCION),
    fotos.map((foto) => [foto.id, analizarPrecio(foto.precioTexto).precio]),
  ]);
}

/**
 * El identificador de UN intento. Se genera una sola vez y se reusa en los reintentos:
 * la misma solicitud cae siempre en la misma tienda y no se duplica nada.
 */
export function nuevoRequestId(generador?: () => string): string {
  let base = '';
  if (generador) {
    base = generador();
  } else {
    const web: any = typeof globalThis !== 'undefined' ? (globalThis as any).crypto : undefined;
    if (web && typeof web.randomUUID === 'function') {
      base = web.randomUUID();
    } else {
      base = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
    }
  }
  return `tep-${base}`.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 128);
}

// ── El avance, en lenguaje de negocio ────────────────────────────────────────

export type ClavePaso = 'photos' | 'texts' | 'design' | 'publishing';
export type EstadoPaso = 'pendiente' | 'activo' | 'listo' | 'omitido' | 'detenido';

export interface PasoVisible {
  clave: ClavePaso;
  titulo: string;
  detalle: string;
  estado: EstadoPaso;
}

const ORDEN_PASOS: ClavePaso[] = ['photos', 'texts', 'design', 'publishing'];

const TITULOS_PASOS: { [clave: string]: string } = {
  photos: 'Leemos tus fotos y creamos tus productos',
  texts: 'Escribimos los textos de tu tienda',
  design: 'Elegimos los colores y el diseño',
  publishing: 'Publicamos tu tienda',
};

function indiceDelPaso(paso: PasoTrabajo | undefined): number {
  if (paso === 'finished') {
    return ORDEN_PASOS.length;
  }
  const i = ORDEN_PASOS.indexOf((paso || 'photos') as ClavePaso);
  return i < 0 ? 0 : i;
}

/**
 * Los cuatro pasos que ve la persona, con su estado. `avance` en `null` es el momento
 * entre el clic y la primera respuesta del servidor: todo pendiente.
 */
export function pasosDelAvance(avance: AvanceTienda | null, conFotos: boolean): PasoVisible[] {
  const total = avance ? avance.productsTotal : conFotos ? 1 : 0;
  const hayFotos = avance ? total > 0 : conFotos;
  const actual = avance ? indiceDelPaso(avance.step) : 0;
  const trabajando = !avance || avance.state === 'queued' || avance.state === 'running';
  const terminado = !!avance && avance.state === 'done';
  const detenido = !!avance && (avance.state === 'interrupted' || avance.state === 'failed');

  return ORDEN_PASOS.map((clave, i) => {
    let estado: EstadoPaso;
    let detalle = '';

    if (clave === 'photos' && !hayFotos) {
      estado = 'omitido';
      detalle = 'Sin fotos: tu página queda como borrador.';
    } else if (terminado) {
      if (clave === 'publishing' && !avance!.published) {
        estado = 'omitido';
        detalle = 'Falta un paso tuyo para publicarla.';
      } else {
        estado = 'listo';
      }
    } else if (i < actual) {
      estado = 'listo';
    } else if (i === actual) {
      estado = trabajando ? 'activo' : detenido ? 'detenido' : 'pendiente';
    } else {
      estado = 'pendiente';
    }

    if (clave === 'photos' && hayFotos && avance && (estado === 'activo' || estado === 'listo' || estado === 'detenido')) {
      detalle = `${avance.productsReady} de ${avance.productsTotal} ${avance.productsTotal === 1 ? 'producto listo' : 'productos listos'}`;
    }
    return { clave, titulo: TITULOS_PASOS[clave], detalle, estado };
  });
}

export type Etapa = 'trabajando' | 'publicada' | 'borrador' | 'interrumpido' | 'fallo';

/** En qué punto está el trabajo, para decidir qué pantalla mostrar. */
export function etapaDelAvance(avance: AvanceTienda | null | undefined): Etapa {
  if (!avance) {
    return 'trabajando';
  }
  switch (avance.state) {
    case 'done':
      return avance.published ? 'publicada' : 'borrador';
    case 'interrupted':
      return 'interrumpido';
    case 'failed':
      return 'fallo';
    default:
      return 'trabajando';
  }
}

/** Cada cuántos milisegundos consultar, según cuánto lleva esperando. */
export function esperaAntesDeConsultar(transcurridoMs: number): number {
  return transcurridoMs >= LENTA_DESPUES_MS ? CONSULTA_LENTA_MS : CONSULTA_MS;
}

/**
 * ¿Hay que volver a consultar? Mientras el trabajo corre, sí; se deja de consultar
 * cuando terminó, cuando se interrumpió o falló (la persona decide si reintenta),
 * cuando pasó demasiado tiempo o cuando se perdió la conexión varias veces seguidas.
 */
export function debeSeguirConsultando(
  avance: AvanceTienda | null,
  transcurridoMs: number,
  fallosSeguidos: number
): boolean {
  if (fallosSeguidos >= MAX_FALLOS_SEGUIDOS) {
    return false;
  }
  if (transcurridoMs > MAX_ESPERA_MS) {
    return false;
  }
  return etapaDelAvance(avance) === 'trabajando';
}

// ── La pantalla final ────────────────────────────────────────────────────────

export type Tono = 'ok' | 'info' | 'aviso';

export interface ResumenFinal {
  tono: Tono;
  titulo: string;
  texto: string;
  /** Cuántos productos se crearon. */
  productos: number;
  /** Las fotos que se dejaron por fuera, con lo que pasó y qué hacer. */
  avisos: string[];
  /** ¿Qué botones tienen sentido? */
  puedeVer: boolean;
  puedeAgregarProducto: boolean;
  puedeReintentar: boolean;
}

/** Lo que se le cuenta a la persona cuando el trabajo termina (o se detiene). */
export function resumenFinal(avance: AvanceTienda): ResumenFinal {
  const etapa = etapaDelAvance(avance);
  const avisos = (avance.items || []).filter((i) => i.state === 'skipped' && i.reason).map((i) => i.reason);
  for (const aviso of avance.warnings || []) {
    if (aviso && avisos.indexOf(aviso) < 0) {
      avisos.push(aviso);
    }
  }
  const base = {
    productos: avance.productsReady,
    avisos,
    puedeVer: false,
    puedeAgregarProducto: false,
    puedeReintentar: false,
  };

  if (etapa === 'publicada') {
    return {
      ...base,
      tono: 'ok',
      titulo: '¡Tu tienda ya está publicada!',
      texto: avance.message,
      puedeVer: !!avance.siteUrl,
    };
  }
  if (etapa === 'borrador') {
    return {
      ...base,
      tono: 'info',
      titulo: 'Tu página quedó como borrador',
      texto: avance.message,
      puedeAgregarProducto: avance.missing === 'product',
    };
  }
  if (etapa === 'interrumpido') {
    return {
      ...base,
      tono: 'aviso',
      titulo: 'Se interrumpió, pero no perdiste nada',
      texto: avance.message,
      puedeReintentar: true,
    };
  }
  return {
    ...base,
    tono: 'aviso',
    titulo: 'No pudimos terminar tu tienda',
    texto: avance.message,
    puedeReintentar: avance.canRetry !== false,
  };
}

// ── Errores ──────────────────────────────────────────────────────────────────

export interface MensajeDeError {
  texto: string;
  /** El sitio de un trabajo sin terminar (cuando el servidor dice "ya tienes una tienda a medio crear"). */
  siteIdPendiente?: string;
  /** ¿Tiene sentido volver a intentar con el mismo botón? */
  reintentable: boolean;
}

function esObjeto(valor: unknown): valor is { [clave: string]: unknown } {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

/**
 * Traduce un error del servidor (o de la conexión) a lo que ve el comercio. Nunca
 * muestra un texto técnico: si el servidor mandó un mensaje en español, ese; si no, uno genérico.
 */
export function mensajeDeError(err: unknown): MensajeDeError {
  const e = esObjeto(err) ? err : {};
  const estado = typeof e['status'] === 'number' ? (e['status'] as number) : null;
  const cuerpo = esObjeto(e['error']) ? (e['error'] as { [clave: string]: unknown }) : {};
  const mensaje = typeof cuerpo['message'] === 'string' ? (cuerpo['message'] as string).trim() : '';
  const codigo = typeof cuerpo['code'] === 'string' ? (cuerpo['code'] as string) : '';

  if (estado === 0) {
    return { texto: MENSAJES.sinConexion, reintentable: true };
  }
  // 408 o 504 del servidor, o la espera del navegador que se agotó (sin estado HTTP).
  if (estado === 408 || estado === 504 || (estado === null && e['name'] === 'TimeoutError')) {
    return { texto: MENSAJES.tardoDemasiado, reintentable: true };
  }
  if (estado === 401) {
    return { texto: MENSAJES.sesion, reintentable: false };
  }
  if (codigo === 'PENDING_JOB' && typeof cuerpo['siteId'] === 'string') {
    return { texto: mensaje || MENSAJES.generico, siteIdPendiente: cuerpo['siteId'] as string, reintentable: false };
  }
  if (mensaje) {
    // 400 y 413 (algo por corregir), 403 (cupo, plan, función apagada) y 409: el servidor ya lo redactó.
    return { texto: mensaje, reintentable: estado !== null && estado >= 500 };
  }
  return { texto: MENSAJES.generico, reintentable: true };
}

// ── La lista de páginas ──────────────────────────────────────────────────────

export interface SitioConAvance {
  id: string;
  origen?: string;
  creationProgress?: { state?: string; heartbeatAt?: string } | null;
}

/**
 * Sin señales de vida por tanto tiempo, un trabajo "en curso" ya no corre: el servidor
 * se reinició a medias. El servidor lo marca como interrumpido cuando alguien consulta
 * su avance; mientras tanto la lista lo muestra como "sin terminar" en vez de dejarlo
 * girando para siempre. Es más holgado que el del servidor (45 s) por si los relojes difieren.
 */
export const SIN_LATIDO_MS = 120000;

const SIN_TERMINAR = ['queued', 'running', 'interrupted', 'failed'];

/** El primer sitio de esta función que todavía no terminó, para retomarlo en vez de empezar otro. */
export function sitioSinTerminar<T extends SitioConAvance>(sitios: T[] | null | undefined): T | null {
  for (const sitio of sitios || []) {
    if (sitio && sitio.origen === ORIGEN_TIENDA_EN_UN_PASO && sitio.creationProgress) {
      if (SIN_TERMINAR.indexOf(String(sitio.creationProgress.state)) >= 0) {
        return sitio;
      }
    }
  }
  return null;
}

export type EstadoDeTarjeta = 'creandose' | 'sin-terminar' | null;

/**
 * Qué decir en la tarjeta de "Mis páginas" de un sitio creado por esta función:
 * "CREÁNDOSE" mientras trabaja, "SIN TERMINAR" si se interrumpió o falló. Los demás
 * sitios (los de siempre) devuelven `null` y se ven exactamente igual que hoy.
 */
export function estadoDeTarjeta(sitio: SitioConAvance | null | undefined, ahora: number = Date.now()): EstadoDeTarjeta {
  if (!sitio || sitio.origen !== ORIGEN_TIENDA_EN_UN_PASO || !sitio.creationProgress) {
    return null;
  }
  const estado = String(sitio.creationProgress.state);
  if (estado === 'queued' || estado === 'running') {
    const ultimo = Date.parse(String(sitio.creationProgress.heartbeatAt || ''));
    if (Number.isFinite(ultimo) && ahora - ultimo > SIN_LATIDO_MS) {
      return 'sin-terminar';
    }
    return 'creandose';
  }
  if (estado === 'interrupted' || estado === 'failed') {
    return 'sin-terminar';
  }
  return null;
}
