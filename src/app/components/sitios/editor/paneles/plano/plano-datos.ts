import { anclaValida } from "../../anclas-inicio";
import { tieneMarcador } from "../fichas/fichas-datos";
import { espacioSePinta } from "../tarjeta-solucion/tarjeta-solucion-datos";
export { tieneMarcador, espacioSePinta, anclaValida };

/**
 * Datos del plano y kit (PLAN-V2 T13) en el editor: los mismos topes y reglas del módulo del servidor
 * (`functions/utils/sitioModulos/plano.js`, contrato de T11). El servidor normaliza al guardar y decide qué se pinta; aquí
 * solo se ayuda, se calcula lo que el panel muestra y se avisa. Sin Angular: lo prueban las pruebas locales (D-566).
 */

// ── Forma de los datos (como los guarda `normalizarExtra`) ─────────────────────────────────────────────────────────

export interface LineaKit {
  productoId: string;
  cantidad?: number;
}

export interface PuntoPlano {
  /** Porcentaje del ancho del marco, 2–98, un decimal. */
  x: number;
  /** Porcentaje del alto del marco, 2–98, un decimal. */
  y: number;
  productoId?: string;
  zona?: string;
  que?: string;
  porque?: string;
  /** Cobertura: radio del halo en % del ancho (0 = sin halo). */
  radio?: number;
  /** «unidad 2 de 3» de un paquete. */
  unidad?: number;
  /** Número (posición en la lista, desde 1) del punto del que le llega la señal. */
  senal?: number;
}

export interface AlternativaPlano {
  de?: string;
  por?: string;
  etiqueta?: string;
}

export type Proporcion = "" | "8:5" | "4:3" | "1:1";

export interface EspacioPlano {
  id: string;
  nombre?: string;
  detalle?: string;
  icono?: string;
  enSelector?: boolean;
  imagen?: string;
  alt?: string;
  proporcion?: Proporcion;
  comboId?: string;
  lineas?: LineaKit[];
  puntos?: PuntoPlano[];
  alternativas?: AlternativaPlano[];
  etiquetaBase?: string;
}

export interface EntradaPlano {
  texto?: string;
  detalle?: string;
  icono?: string;
  espacio?: string;
  /** Número del punto (posición en la lista del espacio, desde 1). */
  punto?: number;
}

export interface NombreCortoPlano {
  productoId: string;
  nombre: string;
}

export interface DatosPlano {
  etiqueta?: string;
  titulo?: string;
  tituloSuave?: string;
  subtitulo?: string;
  revisadoPor?: string;
  nota?: string;
  instalacionId?: string;
  permitirCompra?: boolean;
  enviarAsesor?: boolean;
  inicial?: string;
  nombres?: NombreCortoPlano[];
  entradas?: EntradaPlano[];
  espacios?: EspacioPlano[];
}

/** Los topes de `plano.js` (más los avisos del PLAN para el editor). */
export const TOPES_PLANO = Object.freeze({
  espacios: 4,
  lineas: 10,
  puntos: 8,
  /** Desde 7 puntos el editor avisa (PLAN-V2 T11 y T13). */
  puntosComodos: 6,
  alternativas: 2,
  nombres: 24,
  entradas: 3,
  cantidad: 20,
  /** Lo que se lee por bloque: lo que pase de ahí se arma con un asesor. */
  ids: 40,
  /** El tope por línea del carrito (D6). */
  carrito: 50,
  etiqueta: 40,
  titulo: 120,
  tituloSuave: 80,
  subtitulo: 200,
  nota: 120,
  nombreEspacio: 24,
  detalleEspacio: 24,
  alt: 160,
  zona: 40,
  que: 120,
  porque: 200,
  radio: 40,
  unidad: 9,
  etiquetaAlternativa: 30,
  nombreCorto: 40,
  textoEntrada: 60,
  detalleEntrada: 60,
  /** La foto del plano se ve a unos 870 px en computador: menos de 1200 se ve borrosa en pantallas nítidas. */
  fotoAncho: 1200,
  /** Distancia mínima entre dos puntos, en % del ancho del marco: menos, y los discos se tapan. */
  separacion: 6,
  /** Distancia mínima al borde, en %: menos, y el disco queda cortado. */
  borde: 5,
});

export const PROPORCIONES: { valor: Proporcion; texto: string; rx: number; ry: number }[] = [
  { valor: "", texto: "8:5 (apaisado)", rx: 8, ry: 5 },
  { valor: "4:3", texto: "4:3", rx: 4, ry: 3 },
  { valor: "1:1", texto: "1:1 (cuadrado)", rx: 1, ry: 1 },
];

const ID_ESPACIO = /^[a-z0-9-]{1,20}$/;

/** Un texto con un dato por llenar entre corchetes no se publica (la regla de la página). */
export const sinMarcador = (v: string | null | undefined): string => {
  const t = String(v || "").trim();
  return t && !tieneMarcador(t) ? t : "";
};

// ── Posiciones ─────────────────────────────────────────────────────────────────────────────────────────────────────

/** Encierra en 2–98 y redondea a un decimal, como `normalizarPunto` del servidor. */
export function encerrar(valor: number, min = 2, max = 98): number {
  const n = Number.isFinite(valor) ? valor : 50;
  return Math.round(Math.min(max, Math.max(min, n)) * 10) / 10;
}

/** La proporción del marco del plano (`proporcion` vacía = 8:5). */
export function relacionDe(proporcion: Proporcion | undefined): { rx: number; ry: number } {
  const p = PROPORCIONES.find((x) => x.valor === (proporcion === "8:5" ? "" : proporcion || ""));
  return p ? { rx: p.rx, ry: p.ry } : { rx: 8, ry: 5 };
}

/** El alto del marco cuando su ancho es 100 (la caja de la capa SVG: `viewBox="0 0 100 alto"`). */
export function altoRelativo(proporcion: Proporcion | undefined): number {
  const { rx, ry } = relacionDe(proporcion);
  return Math.round(((100 * ry) / rx) * 10) / 10;
}

/** Dónde cae un clic sobre el marco, en % del marco (2–98, un decimal). */
export function posicionDesdeClic(
  clienteX: number,
  clienteY: number,
  caja: { left: number; top: number; width: number; height: number }
): { x: number; y: number } {
  const ancho = caja.width > 0 ? caja.width : 1;
  const alto = caja.height > 0 ? caja.height : 1;
  return { x: encerrar(((clienteX - caja.left) / ancho) * 100), y: encerrar(((clienteY - caja.top) / alto) * 100) };
}

/** Un arrastre: la posición de partida más lo que se movió el puntero, en % del marco. */
export function posicionArrastrada(
  inicio: { x: number; y: number },
  dxPx: number,
  dyPx: number,
  caja: { width: number; height: number }
): { x: number; y: number } {
  const ancho = caja.width > 0 ? caja.width : 1;
  const alto = caja.height > 0 ? caja.height : 1;
  return { x: encerrar(inicio.x + (dxPx / ancho) * 100), y: encerrar(inicio.y + (dyPx / alto) * 100) };
}

/** Las flechas mueven 0,5 % y con Mayús 5 %. null si la tecla no mueve. */
export function moverConTecla(p: { x: number; y: number }, tecla: string, mayus: boolean): { x: number; y: number } | null {
  const paso = mayus ? 5 : 0.5;
  switch (tecla) {
    case "ArrowLeft":
      return { x: encerrar(p.x - paso), y: p.y };
    case "ArrowRight":
      return { x: encerrar(p.x + paso), y: p.y };
    case "ArrowUp":
      return { x: p.x, y: encerrar(p.y - paso) };
    case "ArrowDown":
      return { x: p.x, y: encerrar(p.y + paso) };
    default:
      return null;
  }
}

/** Distancia entre dos puntos en % del ANCHO del marco (el alto se convierte con la proporción). */
export function distancia(a: { x: number; y: number }, b: { x: number; y: number }, proporcion?: Proporcion): number {
  const { rx, ry } = relacionDe(proporcion);
  const dx = a.x - b.x;
  const dy = ((a.y - b.y) * ry) / rx;
  return Math.sqrt(dx * dx + dy * dy);
}

// ── Espacios ───────────────────────────────────────────────────────────────────────────────────────────────────────

/** El id de un espacio a partir de su nombre («Casa de 2 pisos» → `casa-de-2-pisos`), único y de 20 letras o menos. */
export function idDeNombre(nombre: string, usados: string[]): string {
  const base =
    String(nombre || "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20)
      .replace(/-+$/g, "") || "espacio";
  const tomados = new Set(usados);
  if (!tomados.has(base)) return base;
  for (let k = 2; k < 100; k++) {
    const sufijo = `-${k}`;
    const id = `${base.slice(0, 20 - sufijo.length).replace(/-+$/g, "")}${sufijo}`;
    if (!tomados.has(id)) return id;
  }
  return `espacio-${Date.now() % 1000}`;
}

export function idValido(id: string | undefined): boolean {
  return typeof id === "string" && ID_ESPACIO.test(id);
}

/** «Casa de 2 pisos»: el nombre y el detalle sin marcadores, como el título del kit en la página. */
export function tituloDeEspacio(e: EspacioPlano | null | undefined): string {
  if (!e) return "";
  return [sinMarcador(e.nombre), sinMarcador(e.detalle)].filter(Boolean).join(" ");
}

/** Los espacios que la página pinta, con su posición en la lista. */
export function espaciosPintados(d: DatosPlano | null | undefined): { e: EspacioPlano; k: number }[] {
  return ((d && d.espacios) || []).map((e, k) => ({ e, k })).filter(({ e }) => espacioSePinta(e));
}

/** Cambia el id de un espacio y lo que lo nombra dentro del bloque (`inicial` y las entradas). */
export function renombrarIdDeEspacio(d: DatosPlano, viejo: string, nuevo: string): void {
  if (!viejo || viejo === nuevo) return;
  if (d.inicial === viejo) d.inicial = nuevo;
  for (const x of d.entradas || []) if (x && x.espacio === viejo) x.espacio = nuevo;
}

/** Quita un espacio y lo que lo nombra dentro del bloque. */
export function quitarEspacio(d: DatosPlano, k: number): void {
  const lista = [...(d.espacios || [])];
  const [quitado] = lista.splice(k, 1);
  d.espacios = lista;
  if (!quitado) return;
  if (d.inicial === quitado.id) d.inicial = "";
  for (const x of d.entradas || []) {
    if (x && x.espacio === quitado.id) {
      x.espacio = "";
      x.punto = undefined;
    }
  }
}

// ── Kit ────────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Lo que el panel sabe de un combo de la empresa (`GET /v1/combos/all`). */
export interface ComboVista {
  id: string;
  nombre: string;
  /** Líneas con la cantidad del combo (sin cantidad = 1, como el plano). */
  lineas: LineaKit[];
}

/** Por qué un espacio no tiene líneas: su combo ya no está, pasa de 10 piezas o los combos aún no cargan. */
export type MotivoLineas = "" | "combo" | "largo" | "cargando";

/** Las líneas de un espacio: las del combo (si está activo) o las propias. La misma regla de `lineasDe` del servidor. */
export function lineasDe(e: EspacioPlano, combos: ComboVista[] | null): { lineas: LineaKit[]; motivo: MotivoLineas } {
  if (e.comboId) {
    if (!combos) return { lineas: [], motivo: "cargando" };
    const combo = combos.find((c) => c.id === e.comboId);
    if (!combo || !combo.lineas.length) return { lineas: [], motivo: "combo" };
    if (combo.lineas.length > TOPES_PLANO.lineas) return { lineas: [], motivo: "largo" };
    return { lineas: combo.lineas.map((l) => ({ productoId: l.productoId, cantidad: l.cantidad || 1 })), motivo: "" };
  }
  return { lineas: (e.lineas || []).filter((l) => l && l.productoId).map((l) => ({ productoId: l.productoId, cantidad: l.cantidad || 1 })), motivo: "" };
}

/** Las líneas de un combo crudo del servidor: una por producto (las repetidas se suman). */
export function lineasDeCombo(productos: any[]): LineaKit[] {
  const porId = new Map<string, number>();
  for (const p of Array.isArray(productos) ? productos : []) {
    const id = String((p && p.productoId) || "");
    if (!id) continue;
    const cantidad = Number.isInteger(p.cantidad) && p.cantidad > 0 ? p.cantidad : 1;
    porId.set(id, (porId.get(id) || 0) + cantidad);
  }
  const salida: LineaKit[] = [];
  porId.forEach((cantidad, productoId) => salida.push({ productoId, cantidad }));
  return salida;
}

/** Las alternativas que se pintan: con etiqueta, `de` en las líneas, `por` fuera de ellas y distintos. */
export function alternativasValidas(e: EspacioPlano, lineas: LineaKit[]): AlternativaPlano[] {
  const ids = new Set(lineas.map((l) => l.productoId));
  return (e.alternativas || []).filter(
    (a) => !!a && !!a.de && !!a.por && !!sinMarcador(a.etiqueta) && a.de !== a.por && ids.has(a.de) && !ids.has(a.por)
  );
}

/** Por qué una alternativa no sale en la página ("" si sale). */
export function motivoAlternativa(a: AlternativaPlano, lineas: LineaKit[]): string {
  const ids = new Set(lineas.map((l) => l.productoId));
  if (!a.de) return "Elige qué pieza del kit cambia.";
  if (!ids.has(a.de)) return "La pieza que cambia ya no está en el kit.";
  if (!a.por) return "Elige la pieza que la reemplaza.";
  if (a.por === a.de) return "La pieza que la reemplaza es la misma.";
  if (ids.has(a.por)) return "La pieza que la reemplaza ya está en el kit.";
  const etiqueta = String(a.etiqueta || "").trim();
  if (!etiqueta) return "Ponle un nombre («WiFi 7 · Deco BE25»).";
  if (tieneMarcador(etiqueta)) return "El nombre tiene un dato por llenar entre corchetes.";
  return "";
}

/** Lo que el panel sabe de una pieza, solo para mostrar y avisar. */
export interface PiezaInfo {
  titulo: string;
  imagen: string | null;
  /** Precio con IVA: el de vitrina (con su promoción) si se conoce el de la página; si no, el de lista. */
  precio: number;
  /**
   * `fuera`: la página publicada no la muestra (oculta, fuera de la web o de otra empresa). `agotado` solo se afirma con
   * la vista de la página: las existencias del inventario no son las que usa la página.
   */
  estado: "ok" | "agotado" | "inactivo" | "sinPrecio" | "fuera";
  /** ¿El estado salió de la vista de la página publicada? Si no, el panel no sabe de existencias. */
  dePagina: boolean;
}

/**
 * Una pieza desde el catálogo del comercio (`POST /v1/productos/by-ids`): nombre, foto, si está activa y su precio de
 * lista. NO dice «agotado»: ese endpoint trae las existencias del inventario, y la página decide con las del producto.
 */
export function piezaDesdeProducto(p: any, imagen: string | null): PiezaInfo {
  const crear = (p && p.crearProducto) || {};
  const expo = (p && p.exposicion) || {};
  const precio = Number((p && p.precio && p.precio.precioUnitarioConIva) || 0);
  let estado: PiezaInfo["estado"] = "ok";
  if (expo.activar === false) estado = "inactivo";
  else if (!(precio > 0)) estado = "sinPrecio";
  return { titulo: String(crear.titulo || ""), imagen, precio, estado, dePagina: false };
}

/**
 * Suma a una pieza lo que dice la página publicada (`GET /v1/sites/public/:slug/productos`, la vista de vitrina que usa
 * el plano): si se ve, su precio de vitrina y si está disponible. `null` = la página no la muestra.
 */
export function conVitrina(base: PiezaInfo | null, v: { titulo?: string; imagen?: string; precioConIva?: number; disponible?: boolean } | null): PiezaInfo {
  const titulo = (base && base.titulo) || (v && v.titulo) || "";
  const imagen = (base && base.imagen) || (v && v.imagen) || null;
  if (!v) return { titulo, imagen, precio: base ? base.precio : 0, estado: base && base.estado === "inactivo" ? "inactivo" : "fuera", dePagina: true };
  const precio = Number(v.precioConIva) || 0;
  const estado: PiezaInfo["estado"] = !(precio > 0) ? "sinPrecio" : v.disponible === false ? "agotado" : "ok";
  return { titulo, imagen, precio, estado, dePagina: true };
}

/** Un estado del kit: el sugerido (a=0) o una alternativa, con lo que la página haría con él. */
export interface EstadoKit {
  a: number;
  etiqueta: string;
  lineas: LineaKit[];
  completo: boolean;
  /** Piezas que frenan el kit, con su motivo («agotada»). */
  frenos: { productoId: string; motivo: string }[];
  /** Se arma con un asesor: una pieza para cotizar o más de 50 unidades. */
  cotizar: boolean;
  total: number;
}

const MOTIVO: { [estado: string]: string } = {
  agotado: "está agotada",
  inactivo: "no está activa en tu catálogo",
  sinPrecio: "no tiene precio",
  fuera: "no se ve en tu tienda",
  falta: "ya no está en tu catálogo",
};

/**
 * Los estados del kit de un espacio con lo que el panel sabe de cada pieza (`info`; sin una pieza = «cargando»).
 * Es la regla de `estadosDe` del servidor: el kit nunca se vende incompleto (D5).
 */
export function estadosDelKit(
  e: EspacioPlano,
  lineas: LineaKit[],
  info: { [id: string]: PiezaInfo | null | undefined },
  cotizables: string[]
): EstadoKit[] {
  const base: EstadoKit = { a: 0, etiqueta: sinMarcador(e.etiquetaBase), lineas, completo: false, frenos: [], cotizar: false, total: 0 };
  const estados: EstadoKit[] = [base];
  alternativasValidas(e, lineas).forEach((alt) => {
    estados.push({
      a: estados.length,
      etiqueta: sinMarcador(alt.etiqueta),
      lineas: lineas.map((l) => (l.productoId === alt.de ? { productoId: alt.por as string, cantidad: l.cantidad } : l)),
      completo: false,
      frenos: [],
      cotizar: false,
      total: 0,
    });
  });
  const cot = new Set(cotizables || []);
  for (const st of estados) {
    for (const l of st.lineas) {
      const p = info[l.productoId];
      if (p === undefined) continue; // todavía no carga: no se avisa nada de ella
      if (p === null) st.frenos.push({ productoId: l.productoId, motivo: MOTIVO["falta"] });
      else if (p.estado !== "ok") st.frenos.push({ productoId: l.productoId, motivo: MOTIVO[p.estado] });
    }
    const cargadas = st.lineas.every((l) => info[l.productoId] !== undefined);
    st.completo = st.lineas.length > 0 && cargadas && !st.frenos.length;
    st.cotizar = st.completo && st.lineas.some((l) => cot.has(l.productoId) || (l.cantidad || 1) > TOPES_PLANO.carrito);
    st.total = st.completo ? st.lineas.reduce((t, l) => t + ((info[l.productoId] as PiezaInfo).precio || 0) * (l.cantidad || 1), 0) : 0;
  }
  return estados;
}

/** Los IDs de lo que la página pinta, en orden (la regla de `idsOrdenados`): para avisar si pasa de 40. */
export function idsDelPlano(d: DatosPlano, combos: ComboVista[] | null): string[] {
  const salida: string[] = [];
  for (const e of d.espacios || []) {
    if (!espacioSePinta(e)) continue;
    const { lineas } = lineasDe(e, combos);
    for (const l of lineas) salida.push(l.productoId);
    for (const a of alternativasValidas(e, lineas)) salida.push(a.por as string);
  }
  if (d.instalacionId) salida.push(d.instalacionId);
  return Array.from(new Set(salida));
}

/** Todas las piezas que el bloque nombra (para pedir sus nombres y fotos, y para los nombres cortos). */
export function piezasDelBloque(d: DatosPlano, combos: ComboVista[] | null): string[] {
  const salida: string[] = [];
  for (const e of d.espacios || []) {
    const { lineas } = lineasDe(e, combos);
    for (const l of lineas) salida.push(l.productoId);
    for (const a of e.alternativas || []) {
      if (a && a.de) salida.push(a.de);
      if (a && a.por) salida.push(a.por);
    }
    for (const p of e.puntos || []) if (p && p.productoId) salida.push(p.productoId);
  }
  if (d.instalacionId) salida.push(d.instalacionId);
  return Array.from(new Set(salida));
}

// ── Puntos ─────────────────────────────────────────────────────────────────────────────────────────────────────────

/** Agrega un punto en (x, y). null si ya hay 8. */
export function agregarPunto(e: EspacioPlano, x: number, y: number): PuntoPlano | null {
  const lista = Array.isArray(e.puntos) ? e.puntos : [];
  if (lista.length >= TOPES_PLANO.puntos) return null;
  const punto: PuntoPlano = { x: encerrar(x), y: encerrar(y) };
  e.puntos = [...lista, punto];
  return punto;
}

/**
 * Renumera lo que apunta a los puntos de un espacio (`senal` de sus puntos y `punto` de las entradas que llevan a él)
 * después de mover o quitar puntos. `mapa[viejo] = nuevo` (números desde 1; sin entrada = el punto ya no existe).
 */
function renumerar(d: DatosPlano, e: EspacioPlano, mapa: Map<number, number>): void {
  for (const p of e.puntos || []) {
    if (!p.senal) continue;
    const nuevo = mapa.get(p.senal);
    p.senal = nuevo || undefined;
  }
  for (const x of d.entradas || []) {
    if (!x || x.espacio !== e.id || !x.punto) continue;
    x.punto = mapa.get(x.punto) || undefined;
  }
}

/** Mueve un punto de `desde` a `hasta` (posiciones desde 0); la señal y las entradas siguen al mismo punto. */
export function moverPunto(d: DatosPlano, e: EspacioPlano, desde: number, hasta: number): void {
  const lista = [...(e.puntos || [])];
  if (desde < 0 || desde >= lista.length || hasta < 0 || hasta >= lista.length || desde === hasta) return;
  const orden = lista.map((_, k) => k);
  const [m] = orden.splice(desde, 1);
  orden.splice(hasta, 0, m);
  const mapa = new Map<number, number>();
  orden.forEach((viejo, nuevo) => mapa.set(viejo + 1, nuevo + 1));
  e.puntos = orden.map((k) => lista[k]);
  renumerar(d, e, mapa);
}

/** Quita el punto k (desde 0): una señal que salía de él se borra y las entradas que lo abrían solo abren el espacio. */
export function quitarPunto(d: DatosPlano, e: EspacioPlano, k: number): void {
  const lista = [...(e.puntos || [])];
  if (k < 0 || k >= lista.length) return;
  lista.splice(k, 1);
  const mapa = new Map<number, number>();
  for (let viejo = 1; viejo <= lista.length + 1; viejo++) {
    if (viejo === k + 1) continue;
    mapa.set(viejo, viejo > k + 1 ? viejo - 1 : viejo);
  }
  e.puntos = lista;
  renumerar(d, e, mapa);
}

/** Un aviso de los puntos, con los números de los puntos a los que se refiere (para resaltarlos). */
export interface AvisoPuntos {
  tipo: "sinPieza" | "fuera" | "piezaSinPunto" | "juntos" | "borde" | "muchos" | "senal";
  texto: string;
  puntos: number[];
}

/**
 * Los avisos de los puntos de un espacio (PLAN-V2 T13): pieza sin punto, punto sin pieza o con una pieza fuera del
 * kit (la página lo descarta), puntos a menos del 6 % entre sí o del 5 % del borde, y más de 6 puntos.
 */
export function avisosDePuntos(e: EspacioPlano, lineas: LineaKit[], nombreDe: (id: string) => string): AvisoPuntos[] {
  const avisos: AvisoPuntos[] = [];
  const puntos = e.puntos || [];
  const enKit = new Set(lineas.map((l) => l.productoId));
  const sinPieza = puntos.map((p, k) => (!p.productoId ? k + 1 : 0)).filter(Boolean);
  if (sinPieza.length) {
    avisos.push({
      tipo: "sinPieza",
      texto: `${sinPieza.length === 1 ? `El punto ${sinPieza[0]} no tiene` : `Los puntos ${lista(sinPieza)} no tienen`} pieza: no ${sinPieza.length === 1 ? "sale" : "salen"} en la página.`,
      puntos: sinPieza,
    });
  }
  const fuera = puntos.map((p, k) => (p.productoId && lineas.length && !enKit.has(p.productoId) ? k + 1 : 0)).filter(Boolean);
  if (fuera.length) {
    avisos.push({
      tipo: "fuera",
      texto: `${fuera.length === 1 ? `El punto ${fuera[0]} lleva` : `Los puntos ${lista(fuera)} llevan`} una pieza que no está en el kit: la página ${fuera.length === 1 ? "lo descarta" : "los descarta"} y numera de nuevo los demás.`,
      puntos: fuera,
    });
  }
  const conPunto = new Set(puntos.map((p) => p.productoId).filter(Boolean) as string[]);
  const sinPunto = lineas.filter((l) => !conPunto.has(l.productoId));
  if (sinPunto.length && puntos.length) {
    avisos.push({
      tipo: "piezaSinPunto",
      texto:
        sinPunto.length === 1
          ? `«${nombreDe(sinPunto[0].productoId)}» está en el kit pero no tiene punto en el plano.`
          : `${sinPunto.length} piezas del kit no tienen punto en el plano: ${sinPunto.map((l) => `«${nombreDe(l.productoId)}»`).join(", ")}.`,
      puntos: [],
    });
  }
  const juntos: number[][] = [];
  for (let i = 0; i < puntos.length; i++) {
    for (let j = i + 1; j < puntos.length; j++) {
      if (distancia(puntos[i], puntos[j], e.proporcion) < TOPES_PLANO.separacion) juntos.push([i + 1, j + 1]);
    }
  }
  for (const [a, b] of juntos) {
    avisos.push({ tipo: "juntos", texto: `Los puntos ${a} y ${b} están muy juntos: en el celular se tapan. Sepáralos un poco.`, puntos: [a, b] });
  }
  const borde = puntos
    .map((p, k) => (p.x < TOPES_PLANO.borde || p.x > 100 - TOPES_PLANO.borde || p.y < TOPES_PLANO.borde || p.y > 100 - TOPES_PLANO.borde ? k + 1 : 0))
    .filter(Boolean);
  if (borde.length) {
    avisos.push({
      tipo: "borde",
      texto: `${borde.length === 1 ? `El punto ${borde[0]} está pegado` : `Los puntos ${lista(borde)} están pegados`} al borde del plano: el disco puede quedar cortado.`,
      puntos: borde,
    });
  }
  if (puntos.length > TOPES_PLANO.puntosComodos) {
    avisos.push({
      tipo: "muchos",
      texto: `Tiene ${puntos.length} puntos. Con más de ${TOPES_PLANO.puntosComodos} el plano se lee con dificultad, sobre todo en el celular.`,
      puntos: [],
    });
  }
  const malas = puntos.map((p, k) => (p.senal && (p.senal === k + 1 || p.senal > puntos.length) ? k + 1 : 0)).filter(Boolean);
  if (malas.length) {
    avisos.push({ tipo: "senal", texto: `La señal del punto ${malas[0]} no sale de otro punto: la línea no se dibuja.`, puntos: malas });
  }
  return avisos;
}

/** «1, 2 y 3». */
function lista(nums: number[]): string {
  if (nums.length <= 1) return nums.join("");
  return `${nums.slice(0, -1).join(", ")} y ${nums[nums.length - 1]}`;
}

// ── Foto del plano ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Qué decir de la foto del plano por su tamaño y su forma. "" si sirve o si no se sabe su tamaño. */
export function avisoDeFoto(ancho: number, alto: number, proporcion: Proporcion | undefined, esVectorial: boolean): string {
  if (!(ancho > 0) || !(alto > 0)) return "";
  const avisos: string[] = [];
  if (!esVectorial && ancho < TOPES_PLANO.fotoAncho) {
    avisos.push(`Mide ${ancho}×${alto} px: en computador el plano se ve de unos 870 px de ancho y en pantallas nítidas se verá borroso. Usa una de ${TOPES_PLANO.fotoAncho} px de ancho o más.`);
  }
  const { rx, ry } = relacionDe(proporcion);
  const marco = rx / ry;
  const foto = ancho / alto;
  if (Math.abs(foto - marco) / marco > 0.06) {
    const otra = PROPORCIONES.find((p) => Math.abs(foto - p.rx / p.ry) / (p.rx / p.ry) <= 0.06);
    avisos.push(
      `Su forma no es ${rx}:${ry}: el marco la recorta ${foto > marco ? "a los lados" : "arriba y abajo"}.${otra ? ` Elige el marco ${otra.rx}:${otra.ry}.` : " Recórtala o elige otro marco."}`
    );
  }
  return avisos.join(" ");
}

/** El marco que mejor le sirve a una foto (para el botón «Usar el marco 4:3»), o null si ya sirve el elegido. */
export function marcoSugerido(ancho: number, alto: number, proporcion: Proporcion | undefined): Proporcion | null {
  if (!(ancho > 0) || !(alto > 0)) return null;
  const { rx, ry } = relacionDe(proporcion);
  const foto = ancho / alto;
  if (Math.abs(foto - rx / ry) / (rx / ry) <= 0.06) return null;
  const otra = PROPORCIONES.find((p) => Math.abs(foto - p.rx / p.ry) / (p.rx / p.ry) <= 0.06);
  return otra ? otra.valor : null;
}

// ── Resumen para la vista editable ─────────────────────────────────────────────────────────────────────────────────

/** La línea de la ficha del espejo: «3 espacios: Apartamento, Casa, Local · 18 puntos». */
export function resumenPlano(d: DatosPlano | null | undefined): string {
  const pintados = espaciosPintados(d);
  if (!pintados.length) return "Todavía sin un espacio con nombre y kit: no sale en la página.";
  const nombres = pintados.map(({ e }) => sinMarcador(e.nombre)).join(", ");
  const puntos = pintados.reduce((t, { e }) => t + (e.puntos || []).filter((p) => p && p.productoId).length, 0);
  const n = pintados.length;
  return `${n} ${n === 1 ? "espacio" : "espacios"}: ${nombres} · ${puntos} ${puntos === 1 ? "punto" : "puntos"}`;
}

/** Precio como en la página del diseño nuevo («$1.763.100», sin espacio: decisión E2). */
export function precioTexto(valor: number): string {
  const n = Math.round(Number(valor) || 0);
  return `$${n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`;
}
