/**
 * Ficha del producto desde UNA foto — parte pura (sin Angular, sin DOM).
 *
 * Aquí vive todo lo que se puede probar sin navegador: qué trae la ficha del
 * servidor, qué campos del formulario se llenan, cuáles se respetan porque ya
 * tenían algo, cómo se buscan la categoría y los mensajes de error. Los dos
 * formularios (rápido y completo) usan estas mismas reglas, así que se
 * comportan igual.
 *
 * Reglas de oro (las vigilan las pruebas de `tests/productos/ficha-desde-foto.test.js`):
 *  - Se rellenan SOLO los campos vacíos. Un campo con algo escrito se respeta, a
 *    menos que la persona autorice reemplazarlo (una sola pregunta).
 *  - NUNCA se toca un precio: la ficha ni siquiera tiene uno.
 *  - La categoría solo se marca si existe de verdad en el árbol del comercio.
 *  - Lo que la persona NO ve por error técnico: los mensajes son para el comercio.
 */

/** Separador de la ruta de una categoría: el mismo del servidor y del selector del formulario rápido. */
export const SEPARADOR_RUTA = ' › ';

/** Tope de etiquetas de búsqueda que se guardan. */
export const MAX_ETIQUETAS = 10;

/**
 * Cuánto espera el cliente la respuesta de la ficha antes de rendirse. El servidor le
 * corta a la IA a los 55 s y el proxy a los 60 s: si a los 70 s no llegó ni un error, la
 * conexión se cayó a medias. Sin este tope, el botón quedaba girando para siempre y
 * "Guardar" bloqueado hasta recargar la página (y perder lo escrito).
 */
export const TIEMPO_LIMITE_FICHA_MS = 70000;

// ── Lo que devuelve el servidor ──────────────────────────────────────────────

/** Una categoría REAL de la empresa. */
export interface CategoriaFicha {
  nombre: string;
  ruta: string[];
  etiqueta: string;
}

export interface FichaDesdeFoto {
  nombre: string;
  descripcion: string;
  categoria: CategoriaFicha | null;
  colores: string[];
  material: string | null;
  etiquetasSeo: string[];
  /** Hoy siempre null: todavía no hay proveedor para quitar el fondo. */
  imagenSinFondo: string | null;
}

export interface RespuestaFichaDesdeFoto {
  success: boolean;
  ficha?: unknown;
  code?: string;
  message?: string;
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return !!valor && typeof valor === 'object' && !Array.isArray(valor);
}

function listaDeTextos(valor: unknown): string[] {
  if (!Array.isArray(valor)) {
    return [];
  }
  return valor
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.trim())
    .filter((v) => v !== '');
}

/**
 * Deja la respuesta del servidor en la forma que esperan los formularios. Si
 * algo viene raro (un campo faltante, un tipo equivocado) queda en vacío en vez
 * de romper la pantalla. Devuelve `null` si ni siquiera hay nombre del producto.
 */
export function normalizarFicha(crudo: unknown): FichaDesdeFoto | null {
  if (!esObjeto(crudo)) {
    return null;
  }
  const nombre = typeof crudo['nombre'] === 'string' ? crudo['nombre'].trim() : '';
  if (nombre === '') {
    return null;
  }

  let categoria: CategoriaFicha | null = null;
  const c = crudo['categoria'];
  if (esObjeto(c) && typeof c['etiqueta'] === 'string' && c['etiqueta'].trim() !== '') {
    const etiqueta = c['etiqueta'].trim();
    const rutaDelServidor = listaDeTextos(c['ruta']);
    const ruta = rutaDelServidor.length
      ? rutaDelServidor
      : etiqueta.split(SEPARADOR_RUTA.trim()).map((t) => t.trim()).filter(Boolean);
    categoria = {
      nombre: typeof c['nombre'] === 'string' && c['nombre'].trim() !== '' ? c['nombre'].trim() : (ruta[ruta.length - 1] || etiqueta),
      ruta,
      etiqueta,
    };
  }

  const material = typeof crudo['material'] === 'string' && crudo['material'].trim() !== '' ? crudo['material'].trim() : null;
  const sinFondo = typeof crudo['imagenSinFondo'] === 'string' && crudo['imagenSinFondo'].startsWith('data:image/')
    ? crudo['imagenSinFondo']
    : null;

  return {
    nombre,
    descripcion: typeof crudo['descripcion'] === 'string' ? crudo['descripcion'].trim() : '',
    categoria,
    colores: listaDeTextos(crudo['colores']),
    material,
    etiquetasSeo: listaDeTextos(crudo['etiquetasSeo']),
    imagenSinFondo: sinFondo,
  };
}

// ── Texto ────────────────────────────────────────────────────────────────────

/** Minúsculas, sin tildes y con espacios simples: la forma de COMPARAR textos. */
export function normalizar(valor: unknown): string {
  return String(valor == null ? '' : valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036F]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/** Forma de comparar rutas de categoría: un solo tipo de flecha. */
export function claveCategoria(valor: unknown): string {
  return normalizar(valor).replace(/\s*[›»>→]\s*/g, ' > ');
}

/** El texto visible de un HTML (el editor de la descripción del formulario completo guarda HTML). */
export function htmlATexto(html: unknown): string {
  return String(html == null ? '' : html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/p>/gi, ' ')
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/g, '\'')
    .replace(/&amp;/gi, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * ¿Está vacío el campo? Un texto en blanco o un HTML sin texto visible cuentan
 * como vacío; también el marcador "Descripcion" con el que arranca el editor.
 */
export function estaVacio(valor: unknown, esHtml = false): boolean {
  const texto = esHtml ? htmlATexto(valor) : String(valor == null ? '' : valor).trim();
  return texto === '' || (esHtml && normalizar(texto) === 'descripcion');
}

function escaparHtml(texto: string): string {
  return texto
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Texto plano con párrafos -> HTML para el editor de la descripción (con los caracteres especiales escapados). */
export function textoAHtml(texto: string): string {
  return String(texto || '')
    .split(/\n+/)
    .map((p) => p.trim())
    .filter((p) => p !== '')
    .map((p) => `<p>${escaparHtml(p)}</p>`)
    .join('');
}

/** "rojo", "rojo y negro", "rojo, negro y beige" ("e" delante de un sonido "i": "azul e índigo"). */
export function listaEnEspanol(items: string[]): string {
  const lista = items.map((i) => String(i).trim()).filter((i) => i !== '');
  if (lista.length === 0) {
    return '';
  }
  if (lista.length === 1) {
    return lista[0];
  }
  const ultimo = lista[lista.length - 1];
  const conector = /^(i|hi)(?!e|a)/.test(normalizar(ultimo)) ? 'e' : 'y';
  return `${lista.slice(0, -1).join(', ')} ${conector} ${ultimo}`;
}

/**
 * Material y colores como texto para "Características adicionales":
 * "Material: cuero. Colores: negro y café." Vacío si la foto no dio ninguno.
 */
export function construirCaracteristicas(ficha: Pick<FichaDesdeFoto, 'material' | 'colores'>): string {
  const partes: string[] = [];
  if (ficha.material) {
    partes.push(`Material: ${ficha.material}.`);
  }
  if (ficha.colores.length === 1) {
    partes.push(`Color: ${ficha.colores[0]}.`);
  } else if (ficha.colores.length > 1) {
    partes.push(`Colores: ${listaEnEspanol(ficha.colores)}.`);
  }
  return partes.join(' ');
}

/**
 * Suma etiquetas nuevas a las que ya hay, sin repetir (aunque cambien tildes o
 * mayúsculas) y SIN quitar nunca una de las que la persona ya tenía.
 */
export function unirEtiquetas(actuales: string[], nuevas: string[], max = MAX_ETIQUETAS): string[] {
  const vistas = new Set<string>();
  const propias: string[] = [];
  for (const e of actuales || []) {
    const t = String(e == null ? '' : e).trim();
    const clave = normalizar(t);
    if (t !== '' && !vistas.has(clave)) {
      vistas.add(clave);
      propias.push(t);
    }
  }
  const salida = [...propias];
  for (const e of nuevas || []) {
    if (salida.length >= Math.max(max, propias.length)) {
      break;
    }
    const t = String(e == null ? '' : e).trim();
    const clave = normalizar(t);
    if (t !== '' && !vistas.has(clave)) {
      vistas.add(clave);
      salida.push(t);
    }
  }
  return salida;
}

// ── Qué campos se llenan ─────────────────────────────────────────────────────

export type CampoFicha = 'titulo' | 'descripcion' | 'categoria' | 'caracteristicas' | 'etiquetas' | 'imagen';

/** Orden en que se muestran y se aplican. */
export const ORDEN_CAMPOS: CampoFicha[] = ['titulo', 'descripcion', 'categoria', 'caracteristicas', 'etiquetas', 'imagen'];

/** Cómo se llama cada campo ante el comercio. */
export const NOMBRE_DE_CAMPO: Record<CampoFicha, string> = {
  titulo: 'Título',
  descripcion: 'Descripción',
  categoria: 'Categoría',
  caracteristicas: 'Características',
  etiquetas: 'Etiquetas de búsqueda',
  imagen: 'Imagen principal',
};

/** Lo que el formulario tiene escrito ahora. */
export interface EstadoFormulario {
  titulo?: string | null;
  /** Texto plano (formulario rápido) o HTML (editor del formulario completo). */
  descripcion?: string | null;
  /** Etiqueta ("Padre › Hijo") de la categoría ya elegida, o vacío. */
  categoria?: string | null;
  caracteristicas?: string | null;
  etiquetas?: string[] | null;
  tieneImagenPrincipal: boolean;
}

/** Lo que la ficha propone para cada campo. */
export interface ValoresFicha {
  titulo: string;
  descripcion: string;
  categoria: CategoriaFicha | null;
  caracteristicas: string;
  etiquetas: string[];
}

export interface PlanFicha {
  valores: ValoresFicha;
  /** Campos vacíos para los que la ficha trae algo: se llenan sin preguntar. */
  vacios: CampoFicha[];
  /** Campos que ya tienen algo distinto: solo se reemplazan si la persona lo autoriza. */
  conflictos: CampoFicha[];
  /**
   * La ficha no trajo una categoría de la tienda (ninguna calzaba) y el formulario
   * tampoco tiene una: hay que avisar que la elija a mano.
   */
  sinCategoria: boolean;
}

export type DecisionFicha = 'todo' | 'vacios';

export function valoresDeFicha(ficha: FichaDesdeFoto): ValoresFicha {
  return {
    titulo: ficha.nombre.trim(),
    descripcion: ficha.descripcion.trim(),
    categoria: ficha.categoria,
    caracteristicas: construirCaracteristicas(ficha),
    etiquetas: listaDeTextos(ficha.etiquetasSeo),
  };
}

/**
 * Compara el formulario con la ficha y decide, campo por campo:
 *  - la ficha no trae nada para ese campo  -> no se menciona
 *  - el campo está vacío                   -> `vacios` (se llena sin preguntar)
 *  - ya dice lo mismo                      -> no se menciona (no hay nada que cambiar)
 *  - ya tiene algo distinto                -> `conflictos` (se pregunta una sola vez)
 * La imagen principal es la foto que subió la persona: siempre hay una propuesta.
 */
export function planificarFicha(estado: EstadoFormulario, ficha: FichaDesdeFoto): PlanFicha {
  const valores = valoresDeFicha(ficha);
  const vacios: CampoFicha[] = [];
  const conflictos: CampoFicha[] = [];

  const clasificar = (campo: CampoFicha, hayPropuesta: boolean, hayAlgo: boolean, esIgual: boolean): void => {
    if (!hayPropuesta) {
      return;
    }
    if (!hayAlgo) {
      vacios.push(campo);
    } else if (!esIgual) {
      conflictos.push(campo);
    }
  };

  clasificar(
    'titulo',
    valores.titulo !== '',
    !estaVacio(estado.titulo),
    normalizar(estado.titulo) === normalizar(valores.titulo),
  );
  clasificar(
    'descripcion',
    valores.descripcion !== '',
    !estaVacio(estado.descripcion, true),
    normalizar(htmlATexto(estado.descripcion)) === normalizar(valores.descripcion),
  );
  clasificar(
    'categoria',
    !!valores.categoria,
    !estaVacio(estado.categoria),
    !!valores.categoria && claveCategoria(estado.categoria) === claveCategoria(valores.categoria.etiqueta),
  );
  clasificar(
    'caracteristicas',
    valores.caracteristicas !== '',
    !estaVacio(estado.caracteristicas),
    normalizar(estado.caracteristicas) === normalizar(valores.caracteristicas),
  );

  const actuales = listaDeTextos(estado.etiquetas || []);
  const clavesActuales = new Set(actuales.map(normalizar));
  clasificar(
    'etiquetas',
    valores.etiquetas.length > 0,
    actuales.length > 0,
    valores.etiquetas.every((e) => clavesActuales.has(normalizar(e))),
  );

  clasificar('imagen', true, !!estado.tieneImagenPrincipal, false);

  return { valores, vacios, conflictos, sinCategoria: !valores.categoria && estaVacio(estado.categoria) };
}

/** Los campos que se escriben: los vacíos siempre; los que ya tenían algo, solo si autorizó reemplazar. */
export function camposAAplicar(plan: PlanFicha, decision: DecisionFicha): CampoFicha[] {
  const elegidos = new Set<CampoFicha>(plan.vacios);
  if (decision === 'todo') {
    plan.conflictos.forEach((c) => elegidos.add(c));
  }
  return ORDEN_CAMPOS.filter((c) => elegidos.has(c));
}

/** "Título, descripción y categoría" */
export function nombresDeCampos(campos: CampoFicha[]): string {
  const nombres = campos.map((c) => NOMBRE_DE_CAMPO[c].toLowerCase());
  return listaEnEspanol(nombres);
}

/**
 * Frase con el resultado, para el aviso final.
 *  - `aplicados`: lo que se llenó.
 *  - `conservados`: lo que ya tenía algo y se dejó como estaba.
 *  - `extras.sinAplicar`: campos que se quisieron llenar y no se pudo (hoy, la categoría).
 *  - `extras.sinCategoria`: la ficha no trajo categoría y el formulario no tiene una.
 */
export function resumenDeRelleno(
  aplicados: CampoFicha[],
  conservados: CampoFicha[] = [],
  extras: { sinAplicar?: CampoFicha[]; sinCategoria?: boolean } = {},
): string {
  const partes: string[] = [];
  if (aplicados.length > 0) {
    partes.push(`Listo: llenamos ${nombresDeCampos(aplicados)}. Revise y corrija lo que haga falta antes de guardar.`);
    if (conservados.length > 0) {
      partes.push(`Dejamos como estaba: ${nombresDeCampos(conservados)}.`);
    }
  } else if (conservados.length > 0) {
    partes.push('No cambiamos nada: el formulario ya tenía esos datos. Si quiere reemplazarlos, vuelva a intentarlo y elija reemplazar.');
  } else {
    partes.push('La foto no trajo datos nuevos para este formulario.');
  }
  if ((extras.sinAplicar || []).includes('categoria') || extras.sinCategoria) {
    partes.push('No encontramos una categoría de su tienda que calce con la foto: elíjala usted.');
  }
  return partes.join(' ');
}

// ── Categorías ───────────────────────────────────────────────────────────────

function ultimoTramo(etiqueta: string): string {
  const tramos = String(etiqueta || '').split(/[›»>→]/);
  return tramos[tramos.length - 1].trim();
}

/**
 * Busca la categoría de la ficha entre las opciones planas del formulario rápido
 * ("Padre › Hijo"). Por ruta completa; si no, por el último tramo, siempre que
 * identifique UNA sola opción. Nunca inventa.
 */
export function buscarOpcionPlana<T extends { etiqueta: string }>(
  opciones: T[],
  categoria: CategoriaFicha | null | undefined,
): T | null {
  if (!categoria || !Array.isArray(opciones) || opciones.length === 0) {
    return null;
  }
  const clave = claveCategoria(categoria.etiqueta);
  const exacta = opciones.find((o) => claveCategoria(o.etiqueta) === clave);
  if (exacta) {
    return exacta;
  }
  const hoja = normalizar(categoria.nombre);
  const porHoja = opciones.filter((o) => normalizar(ultimoTramo(o.etiqueta)) === hoja);
  return porHoja.length === 1 ? porHoja[0] : null;
}

/** Un nodo del selector de categorías (PrimeNG TreeNode, como lo arma el formulario completo). */
export interface NodoCategoria {
  label?: string | null;
  data?: { nombre?: string | null } | null;
  children?: NodoCategoria[] | null;
  parent?: NodoCategoria | null;
}

export function nombreDeNodo(nodo: NodoCategoria | null | undefined): string {
  if (!nodo) {
    return '';
  }
  const nombre = nodo.label != null && nodo.label !== '' ? nodo.label : nodo.data?.nombre;
  return nombre == null ? '' : String(nombre).trim();
}

/** La ruta de nombres de un nodo subiendo por sus padres: ["Hogar", "Velas"]. */
export function rutaDeNodo(nodo: NodoCategoria | null | undefined): string[] {
  const nombres: string[] = [];
  let actual: NodoCategoria | null | undefined = nodo;
  for (let paso = 0; actual && paso < 8; paso++) {
    const nombre = nombreDeNodo(actual);
    if (nombre !== '') {
      nombres.unshift(nombre);
    }
    actual = actual.parent;
  }
  return nombres;
}

/** La etiqueta ("Padre › Hijo") de la categoría ya elegida en el selector, o vacío. */
export function etiquetaDeNodo(nodo: NodoCategoria | null | undefined): string {
  return rutaDeNodo(nodo).join(SEPARADOR_RUTA);
}

function recorrerArbol(nodos: NodoCategoria[] | null | undefined, visitar: (n: NodoCategoria) => void, profundidad = 0): void {
  if (!Array.isArray(nodos) || profundidad > 8) {
    return;
  }
  for (const nodo of nodos) {
    if (nodo && typeof nodo === 'object') {
      visitar(nodo);
      recorrerArbol(nodo.children, visitar, profundidad + 1);
    }
  }
}

/**
 * Busca la categoría de la ficha en el ÁRBOL del selector del formulario completo
 * y devuelve el MISMO nodo que el selector tiene en sus opciones (no una copia),
 * que es lo que hay que asignar para que quede marcada. Por ruta; si no, por el
 * nombre, siempre que identifique UN solo nodo.
 */
export function buscarNodoEnArbol<T extends NodoCategoria>(
  arbol: T[] | null | undefined,
  categoria: CategoriaFicha | null | undefined,
): T | null {
  if (!categoria || !Array.isArray(arbol) || arbol.length === 0) {
    return null;
  }

  let nivel: NodoCategoria[] = arbol;
  let encontrado: NodoCategoria | null = null;
  for (const tramo of categoria.ruta) {
    const clave = normalizar(tramo);
    encontrado = nivel.find((n) => normalizar(nombreDeNodo(n)) === clave) || null;
    if (!encontrado) {
      break;
    }
    nivel = encontrado.children || [];
  }
  if (encontrado && categoria.ruta.length > 0) {
    return encontrado as T;
  }

  const hoja = normalizar(categoria.nombre);
  const coincidencias: NodoCategoria[] = [];
  recorrerArbol(arbol, (n) => {
    if (normalizar(nombreDeNodo(n)) === hoja) {
      coincidencias.push(n);
    }
  });
  return coincidencias.length === 1 ? (coincidencias[0] as T) : null;
}

// ── La foto ──────────────────────────────────────────────────────────────────

/** La foto original no se acepta por encima de esto (un celular normal no llega). */
export const MAX_FOTO_MB = 15;
/** Hasta este tamaño y en formato web, la foto original se usa tal cual como imagen del producto. */
export const MAX_FOTO_SIN_REDUCIR_MB = 5;
export const TIPOS_DE_FOTO_WEB = ['image/jpeg', 'image/png', 'image/webp'];

/** Lado más largo (px) de la copia que se manda a la IA, y de la imagen del producto cuando hay que reducirla. */
export const LADO_MAXIMO_IA = 1568;
export const LADO_MAXIMO_PRODUCTO = 2048;

export type CodigoErrorFoto = 'NO_ES_IMAGEN' | 'MUY_PESADA' | 'NO_SE_PUDO_LEER';

/** Error de la foto elegida; el mensaje ya está en español para el comercio. */
export class FotoError extends Error {
  constructor(public readonly codigo: CodigoErrorFoto, mensaje: string) {
    super(mensaje);
    this.name = 'FotoError';
  }
}

export const MENSAJES_FOTO: Record<CodigoErrorFoto, string> = {
  NO_ES_IMAGEN: 'El archivo no es una imagen. Elija una foto en formato JPG, PNG o WEBP.',
  MUY_PESADA: `La foto pesa más de ${MAX_FOTO_MB} MB. Tome una nueva con menor resolución o redúzcala y vuelva a intentar.`,
  NO_SE_PUDO_LEER: 'No pudimos abrir esa foto. Pruebe con otra en formato JPG, PNG o WEBP.',
};

/** `aceptar: false` trae el `motivo`; `aceptar: true` trae `usarOriginal`. */
export interface DecisionFoto {
  aceptar: boolean;
  motivo?: CodigoErrorFoto;
  usarOriginal?: boolean;
}

/**
 * Decide qué se hace con el archivo elegido, sin tocar el navegador:
 *  - no es una imagen o pesa demasiado -> se rechaza (con el motivo)
 *  - JPG/PNG/WEBP de hasta 5 MB        -> el original queda como imagen del producto
 *  - cualquier otra (HEIC, GIF, pesada) -> se reduce a un JPG antes de usarla
 */
export function decidirFoto(tipo: string, bytes: number): DecisionFoto {
  if (!String(tipo || '').toLowerCase().startsWith('image/')) {
    return { aceptar: false, motivo: 'NO_ES_IMAGEN' };
  }
  if (bytes > MAX_FOTO_MB * 1024 * 1024) {
    return { aceptar: false, motivo: 'MUY_PESADA' };
  }
  const usarOriginal =
    TIPOS_DE_FOTO_WEB.includes(String(tipo).toLowerCase()) && bytes <= MAX_FOTO_SIN_REDUCIR_MB * 1024 * 1024;
  return { aceptar: true, usarOriginal };
}

/** Medidas de la foto reducida para que su lado más largo no pase de `ladoMaximo` (nunca agranda). */
export function medidasReducidas(ancho: number, alto: number, ladoMaximo: number): { ancho: number; alto: number } {
  if (!(ancho > 0) || !(alto > 0)) {
    return { ancho: 0, alto: 0 };
  }
  const mayor = Math.max(ancho, alto);
  if (mayor <= ladoMaximo) {
    return { ancho: Math.round(ancho), alto: Math.round(alto) };
  }
  const escala = ladoMaximo / mayor;
  return { ancho: Math.max(1, Math.round(ancho * escala)), alto: Math.max(1, Math.round(alto * escala)) };
}

// ── Errores ──────────────────────────────────────────────────────────────────

export interface MensajeFicha {
  titulo: string;
  texto: string;
  icono: 'warning' | 'info' | 'error';
  /** true: ya se le avisó a la persona por otro lado (el interceptor), no repetir. */
  silencioso: boolean;
}

const TITULOS_POR_CODIGO: Record<string, string> = {
  FOTO_INVALIDA: 'No pudimos leer la foto',
  FOTO_MUY_GRANDE: 'La foto pesa demasiado',
  FICHA_SIN_DATOS: 'No identificamos el producto',
  IA_NO_DISPONIBLE: 'K.A.I. no está disponible ahora',
};

const TEXTO_GENERICO = 'No pudimos llenar el formulario con la foto. Intente de nuevo en un momento; si sigue igual, escríbanos por soporte.';

export const MENSAJE_SIN_FICHA =
  'No logramos identificar el producto en esa foto. Pruebe con otra: el producto completo, de frente y con buena luz.';

/**
 * El error que se lanza cuando el servidor respondió pero sin una ficha
 * utilizable. Tiene la misma forma que un error HTTP 422 de verdad, así que
 * `mensajeDeErrorFicha` lo trata igual que "no identificamos el producto".
 */
export function errorSinFicha(mensaje?: string | null): { status: number; error: { code: string; message: string } } {
  return { status: 422, error: { code: 'FICHA_SIN_DATOS', message: (mensaje || '').trim() || MENSAJE_SIN_FICHA } };
}

/**
 * Convierte cualquier error del flujo en el aviso que ve el comercio. Nunca
 * muestra el texto técnico de un error desconocido.
 *  - 401 y 403: el interceptor global ya avisó (cierra la sesión, o muestra el
 *    mensaje del servidor: función apagada, límite del plan), no se repite.
 *  - errores de la foto elegida: su propio mensaje.
 *  - errores del servidor: el mensaje que ya viene redactado para el comercio.
 */
export function mensajeDeErrorFicha(err: unknown): MensajeFicha {
  if (err instanceof FotoError) {
    return { titulo: 'No pudimos usar esa foto', texto: err.message, icono: 'warning', silencioso: false };
  }

  const e = (err && typeof err === 'object' ? err : {}) as { status?: unknown; error?: unknown; name?: unknown };
  const estado = typeof e.status === 'number' ? e.status : null;

  if (estado === 401 || estado === 403) {
    return { titulo: '', texto: '', icono: 'warning', silencioso: true };
  }
  if (estado === 0) {
    return {
      titulo: 'Sin conexión',
      texto: 'No pudimos conectarnos. Revise su internet e intente de nuevo.',
      icono: 'warning',
      silencioso: false,
    };
  }
  // 408/504 del servidor, o la espera del cliente que se agotó (`TimeoutError` de rxjs, sin estado HTTP).
  if (estado === 408 || estado === 504 || e.name === 'TimeoutError') {
    return {
      titulo: 'Tardó demasiado',
      texto: 'La lectura de la foto tardó más de lo normal. Intente de nuevo; si sigue igual, pruebe con una foto más liviana.',
      icono: 'warning',
      silencioso: false,
    };
  }

  const cuerpo = e.error;
  if (esObjeto(cuerpo) && typeof cuerpo['message'] === 'string' && cuerpo['message'].trim() !== '') {
    const codigo = typeof cuerpo['code'] === 'string' ? cuerpo['code'] : '';
    return {
      titulo: TITULOS_POR_CODIGO[codigo] || 'No se pudo llenar con la foto',
      texto: cuerpo['message'].trim(),
      icono: codigo === 'FICHA_SIN_DATOS' ? 'info' : 'warning',
      silencioso: false,
    };
  }

  return { titulo: 'No se pudo llenar con la foto', texto: TEXTO_GENERICO, icono: 'error', silencioso: false };
}
