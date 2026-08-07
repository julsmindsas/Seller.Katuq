/**
 * Utilidades de fusión de métodos de pago por canal (Spec 012 — enfoque B).
 *
 * La pantalla única (`extras/metodos-pago`) no cambia el almacenamiento: lee las dos colecciones
 * existentes —`pagos` (e-commerce) y `formaPagosPos` (POS)— y las fusiona por NOMBRE en una sola fila
 * por método, con la disponibilidad y la posición de cada canal por separado.
 *
 * `disponible` de un canal = el método existe en la colección de ese canal Y `activo === true`.
 * `cd` presente = ya hay documento en ese canal (se edita); ausente = se crea al activar el canal.
 */

/** Documento crudo tal como lo devuelven `/v1/pagos/all` y `/v1/pagos/pos/all`. */
export interface FormaPagoRaw {
  cd?: string;
  nombre?: string;
  online?: string;
  integracion?: string;
  activo?: boolean | string;
  posicion?: number | string;
  descripcionCorreoElectronico?: string;
  recordatorioCobro?: string;
  id?: string;
  company?: string;
  /** URL de la imagen/logo del método (spec 014). */
  logo?: string;
  [k: string]: any;
}

export type CanalPago = 'ecommerce' | 'pos';

export interface EstadoCanal {
  /** true si existe en la colección del canal y está activo. */
  disponible: boolean;
  /** true si existe documento en ese canal (para decidir create vs edit). */
  existe: boolean;
  posicion: number | null;
  /** docId del documento en la colección del canal (si existe). */
  cd?: string;
  /** documento crudo del canal (para editar sin perder campos no mapeados). */
  raw?: FormaPagoRaw;
}

export interface MetodoPagoUnificado {
  /** Clave de fusión: nombre tal como se muestra (primer no-vacío encontrado). */
  nombre: string;
  /** Clave normalizada usada para agrupar (trim + lower + espacios colapsados). */
  clave: string;
  /** Config global (se toma del canal e-commerce si existe, si no del POS). */
  online: string;
  integracion: string;
  descripcionCorreoElectronico: string;
  recordatorioCobro: string;
  /** URL de la imagen/logo del método (config global, misma en todos los canales). Spec 014. */
  logo: string;
  ecommerce: EstadoCanal;
  pos: EstadoCanal;
}

/** Tipos MIME aceptados y tamaño máximo del logo del método de pago (spec 014). */
export const IMAGEN_TIPOS = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
export const IMAGEN_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Valida un archivo de imagen para el logo del método (spec 014). Lógica pura:
 * devuelve un mensaje de error o `null` si es válido. Acepta png/jpg/jpeg/webp/svg ≤ 2 MB.
 * Un `File` del navegador satisface la firma estructural.
 */
export function validarImagenMetodoPago(
  file: { name?: string; type?: string; size?: number } | null,
): string | null {
  if (!file) return 'No se seleccionó ningún archivo.';
  const extOk = /\.(png|jpe?g|webp|svg)$/i.test(file.name || '');
  const tipoOk = !!file.type && IMAGEN_TIPOS.includes(file.type);
  if (!tipoOk && !extOk) return 'Formato no válido. Usa png, jpg, webp o svg.';
  if ((file.size || 0) > IMAGEN_MAX_BYTES) return 'La imagen supera el límite de 2 MB.';
  return null;
}

/** Normaliza un nombre para usarlo como clave de fusión: trim, minúsculas, espacios colapsados. */
export function normalizeNombre(nombre: unknown): string {
  return String(nombre ?? '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
}

/** `activo` puede llegar como boolean o string ("true"/"false"). Lo normaliza a boolean. */
export function esActivo(valor: unknown): boolean {
  if (typeof valor === 'boolean') return valor;
  return String(valor ?? '').trim().toLowerCase() === 'true';
}

/** `posicion` puede llegar como number o string. Devuelve number o null. */
export function parsePosicion(valor: unknown): number | null {
  if (valor === null || valor === undefined || valor === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}

function estadoDesde(raw?: FormaPagoRaw): EstadoCanal {
  if (!raw) return { disponible: false, existe: false, posicion: null };
  return {
    disponible: esActivo(raw.activo),
    existe: true,
    posicion: parsePosicion(raw.posicion),
    cd: raw.cd,
    raw,
  };
}

/**
 * Fusiona los métodos de e-commerce y POS en una sola lista, una fila por método (clave por nombre
 * normalizado). Un método presente solo en un canal queda con el otro canal `existe:false`.
 * La config global se toma del canal e-commerce si existe; si no, del POS.
 */
export function fusionarMetodosPorCanal(
  ecom: FormaPagoRaw[] | null | undefined,
  pos: FormaPagoRaw[] | null | undefined,
): MetodoPagoUnificado[] {
  const mapa = new Map<string, { nombre: string; ecommerce?: FormaPagoRaw; pos?: FormaPagoRaw }>();

  const registrar = (raw: FormaPagoRaw, canal: CanalPago) => {
    const clave = normalizeNombre(raw?.nombre);
    if (!clave) return; // ignorar métodos sin nombre (no fusionables)
    let entrada = mapa.get(clave);
    if (!entrada) {
      entrada = { nombre: String(raw.nombre).trim() };
      mapa.set(clave, entrada);
    }
    entrada[canal] = raw;
  };

  (ecom ?? []).forEach((r) => registrar(r, 'ecommerce'));
  (pos ?? []).forEach((r) => registrar(r, 'pos'));

  const filas: MetodoPagoUnificado[] = [];
  for (const [clave, entrada] of mapa) {
    const base = entrada.ecommerce ?? entrada.pos ?? {};
    filas.push({
      nombre: entrada.nombre,
      clave,
      online: String(base.online ?? ''),
      integracion: String(base.integracion ?? 'No'),
      descripcionCorreoElectronico: String(base.descripcionCorreoElectronico ?? ''),
      recordatorioCobro: String(base.recordatorioCobro ?? ''),
      logo: String(base.logo ?? ''),
      ecommerce: estadoDesde(entrada.ecommerce),
      pos: estadoDesde(entrada.pos),
    });
  }

  // Orden estable por nombre para una lista predecible.
  filas.sort((a, b) => a.clave.localeCompare(b.clave));
  return filas;
}
