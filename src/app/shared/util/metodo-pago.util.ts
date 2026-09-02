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

// --- Amarre de método con integración (spec 015) --------------------------

/**
 * Palabras clave que hacen que un método "sea" una pasarela de cobro. Es la MISMA lista que usa el
 * enrutamiento de cobro en el backend (`orders.js`): un método cuyo nombre contiene una de estas se cobra
 * por pasarela. Duplicada a propósito (repos separados, sin import compartido) — OQ-3/D-068.
 */
export const PASARELA_KEYWORDS = ['wompi', 'epayco', 'pasarela', 'tarjeta online'];

/** Quita acentos y baja a minúsculas para comparaciones tolerantes (no colapsa espacios). */
function normalizarTexto(v: unknown): string {
  return String(v ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim();
}

/** true si el nombre del método corresponde a una pasarela (por palabra clave). Spec 015. */
export function esPasarelaPorNombre(nombre: unknown): boolean {
  const n = normalizarTexto(nombre);
  return PASARELA_KEYWORDS.some((k) => n.includes(k));
}

/** true si el flag `integracion` del método está en "Sí" (tolera 'Si'/'sí'/'SI'). Spec 015. */
export function integracionEnSi(integracion: unknown): boolean {
  return normalizarTexto(integracion) === 'si';
}

/** Motivo por el que un método queda amarrado (o `null` si está libre). */
export type MotivoAmarre = 'pasarela' | 'flag' | null;

/** Resultado de evaluar el amarre de un método (derivado en lectura, no se persiste). Spec 015. */
export interface AmarreInfo {
  /** true si el método está amarrado por cualquier motivo. */
  amarrado: boolean;
  motivo: MotivoAmarre;
  /** true si NO se puede apagar la disponibilidad de un canal encendido (sin escape deliberado). */
  bloqueaCanalOff: boolean;
  /** true si NO se puede cambiar `Integración` de Sí → No (solo con pasarela activa detrás). */
  bloqueaQuitarFlag: boolean;
}

const AMARRE_LIBRE: AmarreInfo = {
  amarrado: false,
  motivo: null,
  bloqueaCanalOff: false,
  bloqueaQuitarFlag: false,
};

/**
 * Evalúa el amarre de un método (spec 015 / D-067). Regla:
 * - **pasarela activa** (nombre es pasarela Y la empresa tiene pasarela activa) → amarrado; bloquea apagar
 *   canal Y quitar el flag.
 * - **flag manual** (`Integración = Sí` sin pasarela activa) → amarrado; bloquea apagar canal, pero permite
 *   quitar el flag (Sí→No es la vía deliberada de liberar).
 * - en otro caso → libre.
 * Función PURA: misma lógica espejada en el backend (`services/pagosAmarre.js`).
 */
export function evaluarAmarre(
  m: { nombre?: unknown; integracion?: unknown },
  ctx: { hayPasarelaActiva: boolean },
): AmarreInfo {
  if (esPasarelaPorNombre(m?.nombre) && ctx?.hayPasarelaActiva) {
    return { amarrado: true, motivo: 'pasarela', bloqueaCanalOff: true, bloqueaQuitarFlag: true };
  }
  if (integracionEnSi(m?.integracion)) {
    return { amarrado: true, motivo: 'flag', bloqueaCanalOff: true, bloqueaQuitarFlag: false };
  }
  return { ...AMARRE_LIBRE };
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
