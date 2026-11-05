/**
 * Datos de las barras del diseño nuevo (PLAN-V2 T06) en el editor: los mismos topes y reglas del módulo del servidor
 * (`functions/utils/sitioModulos/barras.js`). El servidor normaliza al guardar; aquí solo se ayuda y se avisa.
 */

export interface EnlaceMenu {
  etiqueta: string;
  url: string;
  hijos?: { etiqueta: string; url: string }[];
}

export interface MensajeBarra {
  texto: string;
  url: string;
  icono: string;
}

export interface HorarioAtencion {
  activo: boolean;
  dias: number[];
  desde: string;
  hasta: string;
}

export interface AtencionTienda {
  horario?: HorarioAtencion | null;
  tiempoRespuesta?: string;
  fueraDeHorario?: string;
}

export const TOPES = Object.freeze({ menu: 7, hijos: 8, mensajes: 3, enlacesBarra: 3 });

export const DIAS_SEMANA: readonly { valor: number; corto: string }[] = [
  { valor: 1, corto: "Lun" },
  { valor: 2, corto: "Mar" },
  { valor: 3, corto: "Mié" },
  { valor: 4, corto: "Jue" },
  { valor: 5, corto: "Vie" },
  { valor: 6, corto: "Sáb" },
  { valor: 0, corto: "Dom" },
];

/** Nombre en español de cada ícono del catálogo cerrado (`ICONOS_SITIO`). */
export const NOMBRES_ICONO: { readonly [id: string]: string } = {
  envio: "Envío", garantia: "Garantía", pago: "Pago", reloj: "Reloj", estrella: "Estrella", corazon: "Corazón",
  chat: "Chat", ubicacion: "Ubicación", regalo: "Regalo", hoja: "Hoja", escudo: "Escudo", rayo: "Rayo", wifi: "WiFi",
  router: "Router", camara: "Cámara", casa: "Casa", portatil: "Portátil", celular: "Celular", audifonos: "Audífonos",
  parlante: "Parlante", tv: "Televisor", auto: "Carro", enchufe: "Enchufe", bateria: "Batería", bombillo: "Bombillo",
  cerradura: "Cerradura", servidor: "Servidor", edificio: "Edificio", tienda: "Tienda", camion: "Camión",
  herramienta: "Herramienta", cuadricula: "Cuadrícula", soporte: "Soporte", devolucion: "Devolución", factura: "Factura",
};

/**
 * El menú que se edita con el diseño nuevo: el guardado (`menu`) o, si no hay, una copia de los `enlaces` de siempre.
 * Siempre una lista nueva: el panel la arma y la devuelve con `conMenu`.
 */
export function menuDe(datos: any): EnlaceMenu[] {
  const fuente = Array.isArray(datos && datos.menu) && datos.menu.length ? datos.menu : (datos && datos.enlaces) || [];
  return fuente.map((e: any) => ({
    etiqueta: String((e && e.etiqueta) || ""),
    url: String((e && e.url) || ""),
    hijos: Array.isArray(e && e.hijos) ? e.hijos.map((h: any) => ({ etiqueta: String((h && h.etiqueta) || ""), url: String((h && h.url) || "") })) : [],
  }));
}

/**
 * Guarda el menú en los datos del bloque: `menu` con todo y `enlaces` con los 4 primeros sin submenú (lo que pinta el
 * diseño de siempre). El servidor compara los dos: si no coinciden, manda `enlaces`.
 */
export function conMenu(datos: any, menu: EnlaceMenu[]): void {
  const limpio = menu.slice(0, TOPES.menu).map((e) => {
    const hijos = (e.hijos || []).slice(0, TOPES.hijos);
    return hijos.length ? { etiqueta: e.etiqueta, url: e.url, hijos } : { etiqueta: e.etiqueta, url: e.url };
  });
  datos.menu = limpio;
  datos.enlaces = limpio.slice(0, 4).map((e) => ({ etiqueta: e.etiqueta, url: e.url }));
}

/** Los mensajes de la barra: los guardados o, si no hay, el texto de siempre como el primero. */
export function mensajesDe(datos: any): MensajeBarra[] {
  const guardados = Array.isArray(datos && datos.mensajes) ? datos.mensajes : [];
  if (guardados.length) {
    return guardados.map((m: any) => ({ texto: String((m && m.texto) || ""), url: String((m && m.url) || ""), icono: String((m && m.icono) || "") }));
  }
  return datos && datos.texto ? [{ texto: String(datos.texto), url: String(datos.url || ""), icono: "" }] : [];
}

/** Guarda los mensajes y deja el primero como el texto de siempre (lo que pinta el diseño de siempre). */
export function conMensajes(datos: any, mensajes: MensajeBarra[]): void {
  const lista = mensajes.slice(0, TOPES.mensajes);
  datos.mensajes = lista;
  datos.texto = lista.length ? lista[0].texto : "";
  datos.url = lista.length ? lista[0].url : "";
}

/** «lun a vie de 08:00 a 18:00», como lo dice la página. */
export function textoHorario(h: HorarioAtencion | null | undefined): string {
  if (!h || !h.activo || !h.dias || !h.dias.length) return "";
  const corto = ["dom", "lun", "mar", "mié", "jue", "vie", "sáb"];
  const dias = h.dias.slice().sort((a, b) => a - b);
  const seguidos = dias.length > 1 && dias.every((x, k) => k === 0 || x === dias[k - 1] + 1);
  const qDias = dias.length === 7 ? "todos los días" : seguidos ? `${corto[dias[0]]} a ${corto[dias[dias.length - 1]]}` : dias.map((x) => corto[x]).join(", ");
  return `${qDias} de ${h.desde} a ${h.hasta}`;
}

/** ¿El horario sirve? El servidor descarta uno sin días o con la hora de cierre antes de la de apertura. */
export function horarioValido(h: HorarioAtencion | null | undefined): boolean {
  return !!h && h.activo && Array.isArray(h.dias) && h.dias.length > 0 && /^\d\d:\d\d$/.test(h.desde) && /^\d\d:\d\d$/.test(h.hasta) && h.hasta > h.desde;
}

/** ¿Estaría «En línea» ahora, con la hora de Colombia? (Lo mismo que hace el script de la página.) */
export function enLineaAhora(h: HorarioAtencion | null | undefined, ahora = new Date()): boolean {
  if (!horarioValido(h)) return false;
  const co = new Date(ahora.getTime() - 5 * 3600000);
  const hm = `${String(co.getUTCHours()).padStart(2, "0")}:${String(co.getUTCMinutes()).padStart(2, "0")}`;
  const horario = h as HorarioAtencion;
  return horario.dias.includes(co.getUTCDay()) && hm >= horario.desde && hm < horario.hasta;
}

/**
 * ¿Este destino es un ancla que no existe en el inicio? (P0-19: el menú publicado no muestra un enlace a una sección
 * que no está.) Versión corta de la del editor: ids fijos, `seccion-N` y las anclas propias del diseño nuevo.
 */
export function anclaQueNoExiste(url: string, bloques: any[]): boolean {
  const m = /^#(.+)$/.exec(String(url || "").trim());
  if (!m || m[1].toLowerCase() === "top") return false;
  const fijos: { [tipo: string]: string } = {
    categorias: "categorias", destacado: "destacado", sucursales: "sucursales", agenda: "agenda", formulario: "contacto",
    catalogo: "catalogo", explorar: "catalogo", ficha: "producto", gracias: "gracias",
  };
  const ids = new Set<string>();
  let vitrinas = 0;
  (bloques || [])
    .filter((b) => b && b.visible !== false)
    .forEach((b, i) => {
      const propia = b.estilo && typeof b.estilo.ancla === "string" ? b.estilo.ancla : "";
      if (propia) ids.add(propia);
      if (b.tipo === "productos") ids.add(vitrinas++ === 0 ? "productos" : `productos-${i}`);
      else ids.add(fijos[b.tipo] || `seccion-${i}`);
    });
  return !ids.has(m[1]);
}
