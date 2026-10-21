/**
 * Paso opcional de clientes (F5-30, tarea 9.4; design-clientes.md y design-woocommerce.md W5).
 * Puro, sin Angular: la espera y los envíos se inyectan.
 *
 * Privacidad: el navegador solo envía las columnas conocidas (nunca «Note», gasto, pedidos ni
 * etiquetas) y esta lógica NUNCA devuelve correos, teléfonos ni nombres: todo lo que sale hacia la
 * pantalla, el reporte o el log son conteos, códigos y números de fila. El servidor es quien
 * normaliza y decide; aquí la normalización es solo para anunciar posibles duplicados.
 */
import { FilaEnvio, ProveedorTienda, RespuestaClientes, RespuestaDeshacerClientes, CuerpoClientes, ErrorImportador } from '../tipos';
import { FilaLeida, leerCsv } from './csv';
import { OpcionesReintento, enviarConReintento, procesarLotes } from './errores';
import { partirEn } from './lotes';

export const FILAS_POR_LOTE_CLIENTES = 500;
export const TOPE_FILAS_CLIENTES = 100000;

type Alias = readonly string[];
const a = (...n: string[]): Alias => Object.freeze(n);

export interface PerfilClientes {
  id: ProveedorTienda;
  nombre: string;
  /** Al menos un alias de estos grupos debe existir para reconocer el archivo (correo o teléfono). */
  contacto: readonly Alias[];
  /** Encabezados que solo trae este proveedor; sin ellos se prueba el siguiente perfil. */
  marcas: Alias;
  correo: Alias;
  telefono: Alias;
  /** Columna de «acepta marketing por correo»; null si el proveedor no trae consentimiento. */
  acepta: Alias | null;
  /** Todas las columnas que pueden salir del navegador. */
  conocidas: readonly Alias[];
}

const SHOPIFY: PerfilClientes = {
  id: 'shopify',
  nombre: 'Shopify',
  contacto: [a('Email', 'Phone', 'Default Address Phone')],
  marcas: a('Accepts Email Marketing', 'Default Address Address1', 'Default Address City', 'Default Address Country Code'),
  correo: a('Email'),
  telefono: a('Phone', 'Default Address Phone'),
  acepta: a('Accepts Email Marketing'),
  conocidas: [
    a('First Name'), a('Last Name'), a('Email'), a('Accepts Email Marketing'), a('Phone'), a('Default Address Phone'),
    a('Default Address Company'), a('Default Address Address1'), a('Default Address Address2'), a('Default Address City'),
    a('Default Address Province Code'), a('Default Address Country Code'), a('Default Address Zip'),
    a('Accepts SMS Marketing'), a('Accepts WhatsApp Marketing'),
  ],
};

const WOO_CORREO = a('Email', 'Billing Email', 'Correo electrónico', 'Correo electronico', 'Email (facturación)');
const WOO_TELEFONO = a('Phone', 'Billing Phone', 'Telephone', 'Teléfono', 'Telefono', 'Teléfono (facturación)', 'Shipping Phone');
const WOOCOMMERCE: PerfilClientes = {
  id: 'woocommerce',
  nombre: 'WooCommerce',
  contacto: [a(...WOO_CORREO, ...WOO_TELEFONO)],
  marcas: a(),
  correo: WOO_CORREO,
  telefono: WOO_TELEFONO,
  acepta: null,
  conocidas: [
    a('Name', 'Nombre', 'Customer name', 'Nombre del cliente'),
    a('First Name', 'First name', 'Billing First Name', 'Nombre de pila', 'Nombre (facturación)'),
    a('Last Name', 'Last name', 'Billing Last Name', 'Apellidos', 'Apellido'),
    WOO_CORREO,
    WOO_TELEFONO,
    a('Billing Company', 'Company', 'Empresa'),
    a('Billing Address 1', 'Address 1', 'Dirección 1', 'Direccion 1'),
    a('Billing Address 2', 'Address 2', 'Dirección 2', 'Direccion 2'),
    a('City', 'Billing City', 'Ciudad'),
    a('Region', 'State', 'Billing State', 'Región', 'Region / State', 'Departamento'),
    a('Country / Region', 'Country', 'Billing Country', 'País / Región', 'País', 'Pais'),
    a('Postal Code', 'Postcode', 'Billing Postcode', 'Código postal', 'Codigo postal'),
  ],
};

/** Orden de prueba: el que tiene marcas propias primero; el último sin marcas es el comodín. */
export const PERFILES_CLIENTES: readonly PerfilClientes[] = Object.freeze([SHOPIFY, WOOCOMMERCE]);

const tiene = (encabezados: string[], alias: Alias): boolean => alias.some((n) => encabezados.includes(n));

export function perfilDeClientes(id: string): PerfilClientes | undefined {
  return PERFILES_CLIENTES.find((p) => p.id === id);
}

export function detectarPerfilClientes(encabezados: string[]): PerfilClientes | null {
  for (const p of PERFILES_CLIENTES) {
    if (!p.contacto.every((g) => tiene(encabezados, g))) continue;
    if (p.marcas.length === 0 || tiene(encabezados, p.marcas)) return p;
  }
  return null;
}

// ── Normalización previa (solo para contar) ─────────────────────────────────────────

export const correoNormal = (v: string): string => String(v || '').trim().toLowerCase();

/** Solo dígitos; el 57 de Colombia (12 dígitos) se quita. */
export function celularNormal(v: string): string {
  const d = String(v || '').replace(/\D/g, '');
  return d.length === 12 && d.startsWith('57') ? d.slice(2) : d;
}

const primero = (fila: FilaLeida, alias: Alias): string => {
  for (const n of alias) {
    const v = fila.valores[n];
    if (v !== undefined && String(v).trim() !== '') return String(v).trim();
  }
  return '';
};

export const esSi = (v: string): boolean => /^(yes|true|1|si|sí)$/i.test(String(v || '').trim());

export interface ResumenClientes {
  total: number;
  /** Filas sin correo ni celular: el servidor las deja por fuera. */
  sinContacto: number;
  /** Filas repetidas dentro del archivo (mismo celular o mismo correo en minúsculas). */
  repetidasEnArchivo: number;
  /** Correos con mayúsculas: si el CRM ya los guardó así, la búsqueda exacta no los encuentra y podrían duplicarse. */
  correosConMayusculas: number;
  /** Filas que dicen «yes» a correo de marketing (solo Shopify). */
  aceptanCorreo: number;
  /** Filas que traían SMS o WhatsApp: no se importan, solo se cuentan. */
  conSmsOWhatsapp: number;
}

export type LecturaClientes =
  | { ok: false; code: 'EMPTY' | 'UNKNOWN_FORMAT' | 'TOO_MANY_ROWS'; message: string }
  | { ok: true; perfil: PerfilClientes; filas: { row: number; data: FilaEnvio }[]; resumen: ResumenClientes };

export const MENSAJES_LECTURA = {
  EMPTY: 'El archivo está vacío o no tiene clientes.',
  UNKNOWN_FORMAT: 'No reconocimos este archivo de clientes. Sube el CSV de clientes que exportas desde Shopify o WooCommerce, con al menos correo o teléfono.',
  TOO_MANY_ROWS: 'El archivo tiene demasiados clientes para un solo envío. Divídelo en partes y súbelas una por una.',
};

export function leerClientes(texto: string): LecturaClientes {
  const csv = leerCsv(texto);
  if (csv.encabezados.length === 0 || csv.filas.length === 0) return { ok: false, code: 'EMPTY', message: MENSAJES_LECTURA.EMPTY };
  if (csv.filas.length > TOPE_FILAS_CLIENTES) return { ok: false, code: 'TOO_MANY_ROWS', message: MENSAJES_LECTURA.TOO_MANY_ROWS };
  const perfil = detectarPerfilClientes(csv.encabezados);
  if (!perfil) return { ok: false, code: 'UNKNOWN_FORMAT', message: MENSAJES_LECTURA.UNKNOWN_FORMAT };

  const permitidas = new Set<string>();
  perfil.conocidas.forEach((g) => g.forEach((n) => permitidas.add(n)));
  const smsWa = [a('Accepts SMS Marketing'), a('Accepts WhatsApp Marketing')];
  const resumen: ResumenClientes = { total: 0, sinContacto: 0, repetidasEnArchivo: 0, correosConMayusculas: 0, aceptanCorreo: 0, conSmsOWhatsapp: 0 };
  const vistos = new Set<string>();
  const filas: { row: number; data: FilaEnvio }[] = [];

  for (const f of csv.filas) {
    const data: FilaEnvio = {};
    for (const h of Object.keys(f.valores)) if (permitidas.has(h) && f.valores[h] !== '') data[h] = f.valores[h];
    if (Object.keys(data).length === 0) continue; // línea sin ninguna columna conocida
    resumen.total++;
    const crudoCorreo = primero(f, perfil.correo);
    const correo = correoNormal(crudoCorreo);
    const cel = celularNormal(primero(f, perfil.telefono));
    if (!correo && !cel) resumen.sinContacto++;
    else {
      const llaves = [cel ? `t:${cel}` : '', correo ? `e:${correo}` : ''].filter(Boolean);
      if (llaves.some((k) => vistos.has(k))) resumen.repetidasEnArchivo++;
      else llaves.forEach((k) => vistos.add(k));
    }
    if (crudoCorreo && crudoCorreo !== crudoCorreo.toLowerCase()) resumen.correosConMayusculas++;
    if (perfil.acepta && correo && esSi(primero(f, perfil.acepta))) resumen.aceptanCorreo++;
    if (perfil.acepta && smsWa.some((g) => esSi(primero(f, g)))) resumen.conSmsOWhatsapp++;
    filas.push({ row: f._row, data });
  }
  if (filas.length === 0) return { ok: false, code: 'EMPTY', message: MENSAJES_LECTURA.EMPTY };
  return { ok: true, perfil, filas, resumen };
}

// ── Lotes y envío ───────────────────────────────────────────────────────────────────

export interface ContextoClientes {
  migrationId: string;
  proveedor: ProveedorTienda;
  siteId: string;
  /** Casilla de la persona administradora; sin marcar por defecto. */
  declaracion: boolean;
  /** Fecha del export, `AAAA-MM-DD`, opcional. */
  exportadoEn?: string;
  filas: { row: number; data: FilaEnvio }[];
}

export const lotesDeClientes = (filas: ContextoClientes['filas']): ContextoClientes['filas'][] => partirEn(filas, FILAS_POR_LOTE_CLIENTES);

/** La declaración solo viaja si el proveedor trae consentimiento: WooCommerce nunca crea autorización. */
export function cuerpoClientes(ctx: ContextoClientes, filas: ContextoClientes['filas'], lot: number): CuerpoClientes {
  const perfil = perfilDeClientes(ctx.proveedor);
  const cuerpo: CuerpoClientes = {
    migrationId: ctx.migrationId,
    source: ctx.proveedor,
    siteId: ctx.siteId,
    lot,
    declaration: !!perfil && perfil.acepta !== null && ctx.declaracion === true,
    rows: filas,
  };
  if (ctx.exportadoEn && /^\d{4}-\d{2}-\d{2}$/.test(ctx.exportadoEn)) cuerpo.exportedAt = ctx.exportadoEn;
  return cuerpo;
}

export const FECHA_EXPORT_VALIDA = (v: string): boolean => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v);

export interface EnviosClientes {
  importarClientes(cuerpo: CuerpoClientes): Promise<RespuestaClientes>;
}

export interface TotalesClientes {
  lotes: number;
  created: number;
  completed: number;
  resumed: number;
  skipped: number;
  subscriptions: { created: number; noConsent: number; existing: number; suppressed: number; failed: number };
  /** Solo número de fila y código. */
  issues: { row: number; code: string }[];
  issuesTotal: number;
  /** Un `<migrationId>_c<n>` por lote, para deshacerlos. */
  batchIds: string[];
}

export function sumarClientes(respuestas: RespuestaClientes[]): TotalesClientes {
  const t: TotalesClientes = {
    lotes: respuestas.length, created: 0, completed: 0, resumed: 0, skipped: 0,
    subscriptions: { created: 0, noConsent: 0, existing: 0, suppressed: 0, failed: 0 },
    issues: [], issuesTotal: 0, batchIds: [],
  };
  for (const r of respuestas) {
    t.created += r.created || 0;
    t.completed += r.completed || 0;
    t.resumed += r.resumed || 0;
    t.skipped += r.skipped || 0;
    const s = r.subscriptions;
    if (s) (Object.keys(t.subscriptions) as (keyof typeof t.subscriptions)[]).forEach((k) => (t.subscriptions[k] += s[k] || 0));
    for (const i of r.issues || []) t.issues.push({ row: i.row, code: String(i.code) });
    t.issuesTotal += r.issuesTotal !== undefined ? r.issuesTotal : (r.issues || []).length;
    if (r.importBatchId) t.batchIds.push(r.importBatchId);
  }
  return t;
}

export interface AvanceClientes {
  respuestas: RespuestaClientes[];
  siguiente: number;
  total: number;
  detenido: { lote: number; error: ErrorImportador } | null;
}

/** Envía los lotes en orden. Se detiene en el primero que falla; `desde` y `previas` reanudan. */
export async function importarClientesPorLotes(
  envios: EnviosClientes,
  ctx: ContextoClientes,
  opciones: OpcionesReintento & { desde?: number; previas?: RespuestaClientes[]; alTerminar?: (n: number, total: number) => void } = {},
): Promise<AvanceClientes> {
  const lotes = lotesDeClientes(ctx.filas);
  const r = await procesarLotes<ContextoClientes['filas'], RespuestaClientes>(
    lotes,
    (filas, n) => envios.importarClientes(cuerpoClientes(ctx, filas, n)),
    { ...opciones, alTerminar: (n) => opciones.alTerminar && opciones.alTerminar(n, lotes.length) },
  );
  return { respuestas: r.respuestas, siguiente: r.siguiente, total: lotes.length, detenido: r.detenido };
}

export interface EnviosDeshacer {
  deshacerClientes(batchId: string): Promise<RespuestaDeshacerClientes>;
}

export type ResultadoDeshacer = { ok: true; respuesta: RespuestaDeshacerClientes; error?: undefined } | { ok: false; error: ErrorImportador; respuesta?: undefined };

/** Deshace un lote. Un lote que el servidor ya no encuentra (404) se informa tal cual; no se reintenta. */
export async function deshacerLote(envios: EnviosDeshacer, batchId: string, opciones: OpcionesReintento = {}): Promise<ResultadoDeshacer> {
  const r = await enviarConReintento(() => envios.deshacerClientes(batchId), opciones);
  if ('error' in r) return { ok: false, error: r.error };
  return { ok: true, respuesta: r.valor };
}

// ── Textos ──────────────────────────────────────────────────────────────────────────

export const AVISO_CONSENTIMIENTO_APAGADO =
  'Por ahora, mientras llega el concepto legal sobre el consentimiento de tus clientes, tus clientes entran a Katuq sin suscripción a tus correos. Les pediremos la autorización de nuevo.';

export const TEXTO_DECLARACION =
  'Declaro que mis clientes aceptaron recibir correos de mi tienda y que tengo el soporte de esa autorización.';

export const AVISO_WOO_SIN_CONSENTIMIENTO =
  'El archivo de WooCommerce no trae el permiso de correos de tus clientes, así que entran sin suscripción.';

export const ETIQUETA_CODIGO: { [codigo: string]: string } = {
  NO_CONTACT: 'Sin correo ni celular',
  DUPLICATE_IN_FILE: 'Repetido en el archivo',
  INVALID_EMAIL: 'Correo no válido',
};

export function textoCodigo(codigo: string): string {
  return ETIQUETA_CODIGO[codigo] || 'Revisar esta fila';
}

export interface LineaClientes {
  etiqueta: string;
  valor: number;
}

/** Líneas del reporte, sin ceros de relleno salvo los creados. */
export function resumenDeClientes(t: TotalesClientes): LineaClientes[] {
  const l: LineaClientes[] = [{ etiqueta: 'Clientes nuevos', valor: t.created }];
  if (t.completed) l.push({ etiqueta: 'Clientes que ya tenías y se completaron', valor: t.completed });
  if (t.resumed) l.push({ etiqueta: 'Retomados de un envío anterior', valor: t.resumed });
  if (t.skipped) l.push({ etiqueta: 'Filas omitidas', valor: t.skipped });
  if (t.subscriptions.created) l.push({ etiqueta: 'Suscripciones a correo creadas', valor: t.subscriptions.created });
  if (t.subscriptions.existing) l.push({ etiqueta: 'Ya estaban suscritos o dados de baja', valor: t.subscriptions.existing });
  if (t.subscriptions.suppressed) l.push({ etiqueta: 'No se suscribieron (pidieron no recibir correos)', valor: t.subscriptions.suppressed });
  if (t.subscriptions.failed) l.push({ etiqueta: 'Suscripciones que fallaron', valor: t.subscriptions.failed });
  return l;
}

/** Avisos que acompañan el resultado, para que nada quede sin explicar. */
export function avisosDeClientes(t: TotalesClientes, lectura: Pick<ResumenClientes, 'correosConMayusculas'>, quiso: boolean, traeConsentimiento: boolean): string[] {
  const v: string[] = [];
  if (!traeConsentimiento) v.push(AVISO_WOO_SIN_CONSENTIMIENTO);
  else if (quiso && t.subscriptions.created === 0 && t.subscriptions.noConsent > 0) v.push(AVISO_CONSENTIMIENTO_APAGADO);
  else if (!quiso && t.subscriptions.noConsent > 0) v.push('Sin la casilla de declaración, los clientes entraron sin suscripción a tus correos.');
  if (lectura.correosConMayusculas > 0) {
    v.push(`${lectura.correosConMayusculas} clientes traen el correo con mayúsculas. Si ya los tenías guardados así, pueden haber quedado repetidos; revísalos en tu lista de clientes.`);
  }
  return v;
}

/** Confirmación antes de deshacer un lote. */
export const TEXTO_CONFIRMAR_DESHACER = {
  titulo: '¿Deshacer este lote?',
  cuerpo: 'Se quitarán los clientes que esta importación creó y que nadie ha tocado después, junto con sus suscripciones sin cambios. Lo que ya existía no se toca.',
  confirmar: 'Sí, deshacer',
  cancelar: 'Cancelar',
};

export function textoDeshecho(r: RespuestaDeshacerClientes): string {
  const partes = [`Quitamos ${r.clientsDeleted} clientes`];
  if (r.subscribersDeleted) partes.push(`${r.subscribersDeleted} suscripciones`);
  let t = partes.join(' y ') + '.';
  if (r.clientsKept) t += ` Conservamos ${r.clientsKept} clientes porque ya los editaron o tienen pedidos.`;
  if (r.subscribersKept) t += ` Conservamos ${r.subscribersKept} suscripciones que cambiaron después.`;
  return t;
}
