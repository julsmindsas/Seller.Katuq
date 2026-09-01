import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from "@angular/core";

/** Un bloque tal como lo entrega el backend: tipo + datos ya saneados. */
export interface BloqueSitio {
  id: string;
  tipo: string;
  visible?: boolean;
  datos: any;
  /** Elementos sueltos que van dentro de la sección, después de su contenido. */
  elementos?: any[];
  /** Si está, los elementos van donde los soltaron y no apilados. */
  lienzo?: { alto: number };
}

export interface TemaSitio {
  colorPrimario: string;
  colorSecundario: string;
  colorTexto: string;
  /** Fuente heredada. Sigue siendo el valor por defecto de las dos de abajo. */
  tipografia: string;
  fuenteTitulo?: string;
  fuenteCuerpo?: string;
  /** Estilo de página completo: clasico | editorial | boutique | minimal | audaz. */
  estilo?: string;
  animaciones?: boolean;
}

/**
 * ⚠️ ESPEJO DE `functions/utils/siteHtml.js` (repo katuq_admin_back_firebase).
 *
 * La página que ve el cliente NO la dibuja este componente: la arma el backend
 * como HTML plano. Este render es la vista previa del editor. Si las dos tablas
 * se desfasan, la previa le miente al comerciante sobre lo que va a publicar,
 * y eso no falla en ninguna parte: simplemente ve una cosa y publica otra.
 *
 * Al tocar aquí, tocar allá — y al revés. Los ids los valida el backend en
 * `siteBlocks.normalizarTema`; uno que no exista allá se descarta al guardar.
 */
const FAMILIAS: { [id: string]: string } = {
  sistema: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  serif: 'Georgia, "Times New Roman", serif',
  sans: 'Inter, "Helvetica Neue", Arial, sans-serif',
  mono: "ui-monospace, SFMono-Regular, Menlo, monospace",
  playfair: '"Playfair Display", Georgia, serif',
  cormorant: '"Cormorant Garamond", Georgia, serif',
  fraunces: '"Fraunces", Georgia, serif',
  dmserif: '"DM Serif Display", Georgia, serif',
  syne: '"Syne", system-ui, sans-serif',
  outfit: '"Outfit", system-ui, sans-serif',
  sora: '"Sora", system-ui, sans-serif',
  jakarta: '"Plus Jakarta Sans", system-ui, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
};

/** Espejo de `ESTILOS` en siteHtml.js. Mismos valores, mismas claves. */
const ESTILOS: { [id: string]: { [variable: string]: string } } = {
  clasico: {
    "--sitio-radio": "12px",
    "--sitio-radio-sm": "8px",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.08)",
    "--sitio-aire": "2.5rem",
    "--sitio-aire-ancho": "3.5rem",
    "--sitio-titulo-peso": "700",
    "--sitio-titulo-track": "0",
    "--sitio-titulo-escala": "1",
    "--sitio-titulo-altura": "1.15",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": "0",
    "--sitio-ancho": "1100px",
  },
  editorial: {
    "--sitio-radio": "0",
    "--sitio-radio-sm": "0",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.12)",
    "--sitio-aire": "3.5rem",
    "--sitio-aire-ancho": "5.5rem",
    "--sitio-titulo-peso": "400",
    "--sitio-titulo-track": "-.01em",
    "--sitio-titulo-escala": "1.15",
    "--sitio-titulo-altura": "1.1",
    "--sitio-etiqueta-caja": "uppercase",
    "--sitio-etiqueta-track": ".12em",
    "--sitio-ancho": "1040px",
  },
  boutique: {
    "--sitio-radio": "0",
    "--sitio-radio-sm": "0",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.14)",
    "--sitio-aire": "4rem",
    "--sitio-aire-ancho": "6.5rem",
    "--sitio-titulo-peso": "300",
    "--sitio-titulo-track": ".01em",
    "--sitio-titulo-escala": "1.2",
    "--sitio-titulo-altura": "1.18",
    "--sitio-etiqueta-caja": "uppercase",
    "--sitio-etiqueta-track": ".2em",
    "--sitio-ancho": "980px",
  },
  minimal: {
    "--sitio-radio": "4px",
    "--sitio-radio-sm": "3px",
    "--sitio-sombra": "none",
    "--sitio-borde": "rgba(0,0,0,.1)",
    "--sitio-aire": "3rem",
    "--sitio-aire-ancho": "4.5rem",
    "--sitio-titulo-peso": "600",
    "--sitio-titulo-track": "-.02em",
    "--sitio-titulo-escala": "1",
    "--sitio-titulo-altura": "1.12",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": ".01em",
    "--sitio-ancho": "960px",
  },
  audaz: {
    "--sitio-radio": "22px",
    "--sitio-radio-sm": "14px",
    "--sitio-sombra": "0 10px 30px -12px rgba(0,0,0,.28)",
    "--sitio-borde": "rgba(0,0,0,.06)",
    "--sitio-aire": "3rem",
    "--sitio-aire-ancho": "4rem",
    "--sitio-titulo-peso": "800",
    "--sitio-titulo-track": "-.03em",
    "--sitio-titulo-escala": "1.2",
    "--sitio-titulo-altura": "1.05",
    "--sitio-etiqueta-caja": "none",
    "--sitio-etiqueta-track": "0",
    "--sitio-ancho": "1140px",
  },
};

export interface DatosLead {
  nombre: string;
  telefono?: string;
  email?: string;
  mensaje?: string;
}

/**
 * Dibuja los bloques de un sitio.
 *
 * ⚠️ Esto NO es lo que ve el cliente. La página publicada la arma el backend
 * como HTML plano (`functions/utils/siteHtml.js`), sin Angular: se sirve desde
 * el subdominio del comercio y tiene que abrir rápido en un celular con mala
 * señal. Este componente es la vista previa del editor y el render de la ruta
 * interna, y su trabajo es parecerse todo lo posible a aquel.
 *
 * O sea que sí hay dos implementaciones, a propósito, y hay que moverlas
 * juntas: si se desfasan, el comerciante ve una página y publica otra, sin que
 * nada falle en ninguna parte. Las tablas de fuentes y estilos de arriba son el
 * espejo de las de allá.
 *
 * No hace peticiones. Emite lo que el visitante hace (`lead`, `clic`) y el
 * componente padre decide: la página pública lo manda al backend, el editor lo
 * ignora.
 */
@Component({
  selector: "app-sitio-render",
  templateUrl: "./sitio-render.component.html",
  styleUrls: ["./sitio-render.component.scss"],
})
export class SitioRenderComponent implements OnChanges {
  @Input() bloques: BloqueSitio[] = [];
  @Input() tema: TemaSitio | null = null;

  ngOnChanges(cambios: SimpleChanges): void {
    if (!cambios["tema"] || !this.tema) return;
    // Se piden las dos por separado: un tema puede tener serif de titular y
    // sans de cuerpo, y cada una es una descarga distinta.
    this.cargarFuente(this.tema.fuenteTitulo || this.tema.tipografia);
    this.cargarFuente(this.tema.fuenteCuerpo || this.tema.tipografia);
  }

  /** En vista previa los formularios y enlaces no hacen nada. */
  @Input() previsualizacion = false;
  /** Ancho simulado en la vista previa del editor. */
  @Input() dispositivo: "escritorio" | "movil" = "escritorio";

  /** Estado del envío del lead, gobernado por el padre. */
  @Input() enviandoLead = false;
  @Input() errorLead: string | null = null;
  @Input() leadEnviado = false;

  /** Id del bloque resaltado (el que se está editando). */
  @Input() bloqueActivo: string | null = null;

  /**
   * Logo y nombre comercial de la empresa, para el encabezado. Llegan desde
   * fuera porque no son del sitio sino del kit de marca: el mismo criterio que
   * usa la página publicada, donde los inyecta el servidor.
   */
  @Input() logo = "";
  @Input() negocio = "";

  @Output() lead = new EventEmitter<DatosLead>();
  @Output() clic = new EventEmitter<{ destino: string; bloqueId: string }>();
  @Output() bloqueSeleccionado = new EventEmitter<string>();

  /**
   * Un texto se editó directamente sobre la página. Emite la RUTA del campo para
   * que el editor lo escriba en su modelo — el render no muta lo que le pasan.
   *
   * La ruta tiene hasta tres niveles, y se usa el más profundo que venga:
   *  - `bloqueId` + `campo` → un campo del bloque.
   *  - `+ indice`           → una celda del bloque de columnas.
   *  - `+ elemento`         → un objeto colocado dentro de la sección.
   *  - `+ elemento` e `item`→ una tarjeta dentro de ese objeto.
   */
  @Output() textoEditado = new EventEmitter<{
    bloqueId: string;
    campo: string;
    valor: string;
    indice?: number;
    elemento?: number;
    item?: number;
    /** Lista del bloque a la que pertenece el item: "preguntas", "items", "botones", "enlaces"… */
    lista?: string;
  }>();

  /**
   * Un elemento se soltó en otro punto del lienzo. Igual que con el texto: aquí
   * solo se avisa, y el editor lo escribe en su modelo — así el arrastre entra
   * al historial de deshacer por el mismo camino que todo lo demás.
   */
  @Output() elementoMovido = new EventEmitter<{
    bloqueId: string;
    indice: number;
    x: number;
    y: number;
    w: number;
  }>();

  /**
   * Un botón de la barra flotante del bloque elegido. El render no toca su
   * modelo: avisa y el editor ejecuta la operación (mover, duplicar, ocultar,
   * quitar, abrir el estilo), que así entra al historial de deshacer.
   */
  @Output() accionBloque = new EventEmitter<{
    bloqueId: string;
    accion: "subir" | "bajar" | "duplicar" | "visibilidad" | "estilo" | "eliminar";
  }>();

  nombre = "";
  telefono = "";
  email = "";
  mensaje = "";

  get estiloTema(): { [clave: string]: string } {
    const t = this.tema || ({} as TemaSitio);
    const base = t.tipografia || "sistema";
    return {
      ...(ESTILOS[t.estilo || "clasico"] || ESTILOS.clasico),
      "--sitio-primario": t.colorPrimario || "#111111",
      "--sitio-secundario": t.colorSecundario || "#ffffff",
      "--sitio-texto": t.colorTexto || "#222222",
      "--sitio-fuente": this.familiaTipografica(t.fuenteCuerpo || base),
      "--sitio-fuente-titulo": this.familiaTipografica(t.fuenteTitulo || base),
    };
  }

  private familiaTipografica(clave: string): string {
    return FAMILIAS[clave] || FAMILIAS.sistema;
  }

  /**
   * Las fuentes de Google que necesita la previa, para inyectar el <link> una
   * sola vez. La página publicada las pide en su propio <head>; aquí hay que
   * meterlas en el index del panel o la previa se vería con la letra del
   * sistema y el comerciante creería que su elección no funcionó.
   */
  private static readonly DESCARGABLES: { [id: string]: string } = {
    playfair: "Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400",
    cormorant: "Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300",
    fraunces: "Fraunces:ital,opsz,wght@0,9..144,300..700;1,9..144,300",
    dmserif: "DM+Serif+Display:ital@0;1",
    syne: "Syne:wght@400;600;700;800",
    outfit: "Outfit:wght@300;400;500;600;700",
    sora: "Sora:wght@300;400;500;600;700",
    jakarta: "Plus+Jakarta+Sans:wght@300;400;500;600;700;800",
    inter: "Inter:wght@300;400;500;600;700",
  };

  /** Ids ya pedidos, para no repetir el <link> en cada cambio del tema. */
  private static readonly yaCargadas = new Set<string>();

  private cargarFuente(id: string): void {
    const spec = SitioRenderComponent.DESCARGABLES[id];
    if (!spec || SitioRenderComponent.yaCargadas.has(id)) return;
    SitioRenderComponent.yaCargadas.add(id);

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${spec}&display=swap`;
    document.head.appendChild(link);
  }

  /** Alto del velo de la portada, en la misma escala que el backend (0–85%). */
  opacidadVelo(datos: any): number {
    if (!datos || !datos.imagen) return 0;
    const v = datos.velo === undefined || datos.velo === null ? 45 : Number(datos.velo);
    if (!isFinite(v)) return 0;
    return Math.min(85, Math.max(0, v)) / 100;
  }

  get bloquesVisibles(): BloqueSitio[] {
    // En el editor se muestran también los ocultos, atenuados, para poder
    // volver a encenderlos; el público solo ve los visibles.
    if (this.previsualizacion) return this.bloques || [];
    return (this.bloques || []).filter((b) => b.visible !== false);
  }

  enlaceWhatsapp(datos: any): string {
    const telefono = (datos && datos.telefono) || "";
    const texto = encodeURIComponent((datos && datos.mensaje) || "");
    return `https://wa.me/${telefono}${texto ? `?text=${texto}` : ""}`;
  }

  precio(valor: number): string {
    return (valor || 0).toLocaleString("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    });
  }

  // ── Edición directa sobre la página ────────────────────────────────────────

  /**
   * Escribir sobre el propio texto de la página, sin buscar el campo en el
   * panel. Es lo que hace que el editor se sienta como una página y no como un
   * formulario.
   *
   * Solo en modo edición, y solo texto: al pegar se limpia el formato, porque
   * un pegado desde Word traería etiquetas que el saneador del servidor
   * descartaría igual — mejor que el comerciante vea de una lo que va a quedar.
   */
  alTerminarEdicion(evento: Event, bloqueId: string, campo: string, indice?: number): void {
    const el = evento.target as HTMLElement;
    const valor = (el.innerText || "").replace(/\s+\n/g, "\n").trim();
    this.textoEditado.emit({ bloqueId, campo, valor, indice });
  }

  /**
   * Los dos emisores GENERALES de edición en línea. La ruta dice dónde vive el
   * texto: campo del bloque, celda de columnas (`indice`), item de una lista del
   * bloque (`lista` + `item`), objeto colocado (`elemento`) o tarjeta dentro de
   * un objeto (`elemento` + `item`).
   *
   * Existen porque la edición en línea nació solo para tres campos y creció a
   * TODA la página: un método por combinación de ruta ya no daba.
   */
  alEditarTexto(
    evento: Event,
    bloqueId: string,
    ruta: { campo: string; indice?: number; elemento?: number; item?: number; lista?: string }
  ): void {
    const el = evento.target as HTMLElement;
    const valor = (el.innerText || "").replace(/\s+\n/g, "\n").trim();
    this.textoEditado.emit({ bloqueId, valor, ...ruta });
  }

  /** Igual, para los textos CON FORMATO: lee el HTML y lo devuelve a la notación. */
  alEditarFormato(
    evento: Event,
    bloqueId: string,
    ruta: { campo: string; indice?: number; elemento?: number; item?: number; lista?: string }
  ): void {
    const el = evento.target as HTMLElement;
    const valor = this.desdeFormato(el);
    this.textoEditado.emit({ bloqueId, valor, ...ruta });
  }

  /**
   * Lo mismo, pero para el texto de un objeto colocado dentro de la sección.
   *
   * Los objetos no eran editables sobre la página: había que buscarlos en el
   * panel. Se notó al poner objetos en todas las plantillas — el comerciante
   * aprende que escribe encima de la página y al llegar a ellos el clic no hacía
   * nada.
   */
  alTerminarEdicionElemento(evento: Event, bloqueId: string, elemento: number, campo: string): void {
    const el = evento.target as HTMLElement;
    const valor = (el.innerText || "").replace(/\s+\n/g, "\n").trim();
    this.textoEditado.emit({ bloqueId, campo, valor, elemento });
  }

  /** Y para el texto de una tarjeta dentro de ese objeto. */
  alTerminarEdicionTarjeta(
    evento: Event,
    bloqueId: string,
    elemento: number,
    item: number,
    campo: string
  ): void {
    const el = evento.target as HTMLElement;
    const valor = (el.innerText || "").replace(/\s+\n/g, "\n").trim();
    this.textoEditado.emit({ bloqueId, campo, valor, elemento, item });
  }

  /**
   * Igual, pero para los textos CON FORMATO.
   *
   * Estos no se pueden leer con `innerText`: devolvería el texto pelado y al
   * guardar se perdería la negrita, la cursiva, los enlaces y las listas. Se lee
   * el HTML y se convierte de vuelta a la notación que se guarda, así que el ida
   * y vuelta no pierde nada — y de paso, la negrita que el comerciante ponga con
   * Ctrl+B queda guardada.
   */
  alTerminarEdicionFormato(
    evento: Event,
    bloqueId: string,
    elemento: number,
    campo: string,
    item?: number
  ): void {
    const el = evento.target as HTMLElement;
    const valor = this.desdeFormato(el);
    this.textoEditado.emit({ bloqueId, campo, valor, elemento, item });
  }

  /**
   * El inverso de `conFormato`. Recorre lo que dejó el navegador y lo devuelve a
   * la notación guardada. Lo que no reconoce se degrada a su texto, que es lo
   * que habría pasado de todas formas al leerlo como texto plano.
   */
  private desdeFormato(raiz: HTMLElement): string {
    const deNodo = (nodo: Node): string => {
      if (nodo.nodeType === Node.TEXT_NODE) return nodo.textContent || "";
      if (nodo.nodeType !== Node.ELEMENT_NODE) return "";

      const el = nodo as HTMLElement;
      const dentro = Array.from(el.childNodes).map(deNodo).join("");

      switch (el.tagName) {
        case "BR":
          return "\n";
        case "STRONG":
        case "B":
          return dentro.trim() ? `*${dentro}*` : dentro;
        case "EM":
        case "I":
          return dentro.trim() ? `_${dentro}_` : dentro;
        case "A": {
          const url = el.getAttribute("href") || "";
          return url && dentro.trim() ? `[${dentro}](${url})` : dentro;
        }
        case "LI":
          return `- ${dentro.trim()}\n`;
        case "P":
        case "DIV":
        case "UL":
        case "OL":
          return `${dentro}\n`;
        default:
          return dentro;
      }
    };

    return Array.from(raiz.childNodes)
      .map(deNodo)
      .join("")
      // El navegador deja saltos de sobra al envolver en <div> y <p>.
      .replace(/[ \t]+\n/g, "\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  }

  /** Enter confirma en los campos de una línea; Escape cancela. */
  alTeclearEnTexto(evento: KeyboardEvent, unaLinea: boolean): void {
    if (evento.key === "Escape") {
      (evento.target as HTMLElement).blur();
      return;
    }
    if (unaLinea && evento.key === "Enter") {
      evento.preventDefault();
      (evento.target as HTMLElement).blur();
    }
  }

  /** Pegar sin formato: lo que se ve es lo que se publica. */
  alPegar(evento: ClipboardEvent): void {
    if (!this.previsualizacion) return;
    evento.preventDefault();
    const texto = evento.clipboardData ? evento.clipboardData.getData("text/plain") : "";
    document.execCommand("insertText", false, texto);
  }

  /** Nombre del encabezado: el que escribió el comerciante, o el de su empresa. */
  nombreDeMarca(datos: any): string {
    return (datos && datos.nombre) || this.negocio || "";
  }

  /**
   * Texto con formato para la vista previa.
   *
   * Es el espejo de `textoConFormato` del servidor (`utils/siteHtml.js`): se
   * escapa TODO primero y solo después se reconocen las marcas, así escribir
   * `<script>` produce texto y no una etiqueta. Angular además sanea lo que
   * entra por `innerHTML`, o sea que hay dos redes bajo la misma cuerda.
   */
  conFormato(valor: string): string {
    const crudo = String(valor || "");
    if (!crudo.trim()) return "";

    const esc = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
    const urlOk = (u: string) => (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(u) ? u : "");

    const enLinea = (linea: string) =>
      linea
        .replace(/\[([^\]\n]{1,120})\]\(([^)\s]{1,500})\)/g, (m, t, u) => {
          const href = urlOk(u);
          return href ? `<a href="${href}">${t}</a>` : m;
        })
        .replace(/\*([^*\n]{1,300})\*/g, "<strong>$1</strong>")
        .replace(/_([^_\n]{1,300})_/g, "<em>$1</em>");

    const salida: string[] = [];
    let lista: string[] | null = null;

    for (const linea of esc(crudo).split(/\r?\n/)) {
      const limpia = linea.trim();
      if (!limpia) {
        if (lista) { salida.push(`<ul>${lista.join("")}</ul>`); lista = null; }
        continue;
      }
      const item = limpia.match(/^[-•*]\s+(.{1,300})$/);
      if (item) {
        lista = lista || [];
        lista.push(`<li>${enLinea(item[1])}</li>`);
        continue;
      }
      if (lista) { salida.push(`<ul>${lista.join("")}</ul>`); lista = null; }
      salida.push(`<p>${enLinea(limpia)}</p>`);
    }
    if (lista) salida.push(`<ul>${lista.join("")}</ul>`);
    return salida.join("");
  }

  /**
   * Estilo propio de la sección, para que la vista previa muestre las franjas
   * de color y el aire igual que la página publicada. Allá esto son reglas CSS
   * (la política de seguridad prohíbe estilos en línea); aquí, dentro del panel,
   * se pueden aplicar directo.
   */
  estiloDeBloque(bloque: any): { [k: string]: string } {
    const e = bloque && bloque.estilo;
    if (!e) return {};
    const AIRE: { [k: string]: string } = { compacto: "1.4rem", amplio: "4.5rem", enorme: "7rem" };
    const ALINEACION: { [k: string]: string } = { izquierda: "left", centro: "center", derecha: "right" };

    const estilo: { [k: string]: string } = {};
    if (e.fondo) estilo["background-color"] = e.fondo;
    if (e.fondoImagen) {
      const velo = Math.min(85, Math.max(0, Number(e.fondoVelo) || 0)) / 100;
      estilo["background-image"] = velo
        ? `linear-gradient(rgba(0,0,0,${velo}),rgba(0,0,0,${velo})),url("${e.fondoImagen}")`
        : `url("${e.fondoImagen}")`;
      estilo["background-size"] = "cover";
      estilo["background-position"] = "center";
    }
    if (e.colorTexto) estilo["color"] = e.colorTexto;
    if (AIRE[e.espaciado]) {
      estilo["padding-top"] = AIRE[e.espaciado];
      estilo["padding-bottom"] = AIRE[e.espaciado];
    }
    if (e.alineacion) estilo["text-align"] = ALINEACION[e.alineacion];
    if (e.ancho === "completo") estilo["max-width"] = "100%";
    if (e.ancho === "angosto") estilo["max-width"] = "42rem";
    return estilo;
  }

  /**
   * Trazos de los íconos de tarjeta. Son los mismos que dibuja el servidor
   * (`utils/siteHtml.js`): si divergen, la vista previa mostraría un ícono que
   * la página publicada no tiene.
   */
  private static readonly TRAZOS: { [k: string]: string } = {
    envio: "M3 7h11v8H3zM14 10h4l3 3v2h-7zM7 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM18 19a2 2 0 1 0 0-4 2 2 0 0 0 0 4z",
    garantia: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z M9 12l2 2 4-4",
    pago: "M2 7h20v10H2zM2 11h20M6 15h3",
    reloj: "M12 3a9 9 0 1 1 0 18 9 9 0 0 1 0-18zM12 7v5l3 2",
    estrella: "m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8z",
    corazon: "M12 20s-7-4.4-7-9a4 4 0 0 1 7-2.6A4 4 0 0 1 19 11c0 4.6-7 9-7 9z",
    chat: "M4 5h16v11H8l-4 3z",
    ubicacion: "M12 21s7-5.6 7-11a7 7 0 1 0-14 0c0 5.4 7 11 7 11zM12 10h.01",
    regalo: "M3 11h18v9H3zM3 7h18v4H3zM12 7v13M8 7a2.5 2.5 0 1 1 4-2c2-2 4-1 4 1 0 1-1 1-1 1z",
    hoja: "M20 4C10 4 4 9 4 17c0 1 0 2 1 3 6-9 9-10 15-11z",
    escudo: "M12 3l7 3v6c0 4-3 7-7 9-4-2-7-5-7-9V6z",
    rayo: "M13 3 5 14h6l-1 7 8-11h-6z",
  };

  trazoIcono(nombre: string): string {
    return SitioRenderComponent.TRAZOS[nombre] || "";
  }

  /** Cinco posiciones: true = estrella encendida. */
  estrellas(cuantas: number): boolean[] {
    const n = Math.min(5, Math.max(1, Number(cuantas) || 5));
    return [1, 2, 3, 4, 5].map((i) => i <= n);
  }

  direccionCompleta(datos: any): string {
    return [datos && datos.direccion, datos && datos.ciudad].filter(Boolean).join(", ");
  }

  enlaceMapa(datos: any): string {
    const q = encodeURIComponent(this.direccionCompleta(datos));
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  alineacion(valor: string): string {
    if (valor === "izquierda") return "left";
    if (valor === "derecha") return "right";
    return "center";
  }

  registrarClic(destino: string, bloqueId: string, evento?: Event): void {
    if (this.previsualizacion) {
      // En el editor un enlace no debe sacar al comerciante de la pantalla.
      if (evento) evento.preventDefault();
      this.bloqueSeleccionado.emit(bloqueId);
      return;
    }
    this.clic.emit({ destino, bloqueId });
  }

  seleccionar(bloqueId: string): void {
    if (this.previsualizacion) this.bloqueSeleccionado.emit(bloqueId);
  }

  accionar(
    bloqueId: string,
    accion: "subir" | "bajar" | "duplicar" | "visibilidad" | "estilo" | "eliminar",
    evento: Event
  ): void {
    // Sin esto el clic también "elige" el bloque y, al quitar, la selección
    // apuntaría a un bloque que ya no existe.
    evento.stopPropagation();
    this.accionBloque.emit({ bloqueId, accion });
  }

  /**
   * Nombre entendible para la etiqueta al pasar el mouse y la barra flotante.
   * Solo se ve en el editor; la página publicada no imprime nombres de bloque.
   */
  private static readonly NOMBRES_BLOQUE: { [tipo: string]: string } = {
    encabezado: "Encabezado",
    anuncio: "Barra de anuncio",
    hero: "Portada",
    texto: "Texto",
    galeria: "Galería",
    seccion: "Sección libre",
    columnas: "Columnas",
    imagen: "Imagen",
    botones: "Botones",
    separador: "Separador",
    productos: "Productos elegidos",
    whatsapp: "Botón de WhatsApp",
    formulario: "Formulario de contacto",
    faq: "Preguntas frecuentes",
    catalogo: "Catálogo completo",
    categorias: "Categorías",
    promo: "Promoción",
    destacado: "Producto destacado",
    contador: "Cuenta regresiva",
    suscripcion: "Suscripción",
    marcas: "Marcas",
    instagram: "Instagram",
    video: "Video",
    resenas: "Reseñas",
    ubicacion: "Ubicación",
    footer: "Pie de página",
  };

  nombreDeBloque(tipo: string): string {
    return SitioRenderComponent.NOMBRES_BLOQUE[tipo] || "Sección";
  }

  enviarLead(): void {
    if (this.previsualizacion || this.enviandoLead) return;
    this.lead.emit({
      nombre: this.nombre.trim(),
      telefono: this.telefono.trim(),
      email: this.email.trim(),
      mensaje: this.mensaje.trim(),
    });
  }

  /** El padre llama a esto tras un envío exitoso. */
  limpiarFormulario(): void {
    this.nombre = this.telefono = this.email = this.mensaje = "";
  }

  // ── Colocación libre: arrastrar el elemento y soltarlo donde sea ───────────

  /**
   * ¿Esta sección está en modo lienzo AHORA?
   *
   * En la vista de celular no, aunque el bloque lo tenga: ahí los elementos se
   * apilan, que es exactamente lo que va a hacer la página publicada debajo de
   * 700px. Si la previa mostrara el lienzo en modo celular, le mentiría.
   */
  /** Los que se llenan solos contra el maestro: ahí no se compone a mano. */
  private static readonly BLOQUES_CONECTADOS = [
    "catalogo",
    "productos",
    "destacado",
    "categorias",
    "encabezado",
  ];

  enLienzo(bloque: any): boolean {
    // Misma regla que el render publicado: si la previa dibujara un lienzo donde
    // la página no lo pinta, el comerciante diseñaría una cosa y publicaría otra.
    if (!bloque || !bloque.lienzo || this.dispositivo === "movil") return false;
    return !SitioRenderComponent.BLOQUES_CONECTADOS.includes(bloque.tipo);
  }

  /**
   * Lo que se está arrastrando. Mientras dura, la posición sale de aquí y NO
   * del modelo: el render no muta lo que le pasan, avisa al soltar.
   */
  arrastre: {
    bloqueId: string;
    indice: number;
    modo: "mover" | "ancho";
    marco: DOMRect;
    px: number;
    py: number;
    x: number;
    y: number;
    w: number;
    movido: boolean;
  } | null = null;

  /** La coordenada que hay que pintar: la del arrastre en curso, o la guardada. */
  coordenada(bloque: any, el: any, indice: number, campo: "x" | "y" | "w"): number | null {
    if (!this.enLienzo(bloque)) return null;
    const a = this.arrastre;
    if (a && a.bloqueId === bloque.id && a.indice === indice) return a[campo];
    const pos = el && el.pos;
    return pos && typeof pos.w === "number" ? pos[campo] : null;
  }

  /** Alto del lienzo en píxeles, o nulo cuando la sección crece con su contenido. */
  altoDeLienzo(bloque: any): number | null {
    return this.enLienzo(bloque) ? bloque.lienzo.alto : null;
  }

  /**
   * Quién tapa a quién. Nulo cuando el elemento no la fijó, para que se apile
   * por orden de lectura igual que en la página publicada — donde tampoco se
   * emite `z-index` sin el campo.
   */
  profundidad(bloque: any, el: any): number | null {
    if (!this.enLienzo(bloque)) return null;
    const pos = el && el.pos;
    return pos && typeof pos.w === "number" && typeof pos.z === "number" ? pos.z : null;
  }

  /** Alto propio del objeto, o nulo cuando crece con su contenido. */
  altoDeElemento(bloque: any, el: any): number | null {
    if (!this.enLienzo(bloque)) return null;
    const pos = el && el.pos;
    return pos && typeof pos.h === "number" ? pos.h : null;
  }

  /** El giro, listo para `transform`. Nulo cuando va derecho. */
  giroDeElemento(bloque: any, el: any): string | null {
    if (!this.enLienzo(bloque)) return null;
    const pos = el && el.pos;
    return pos && typeof pos.angulo === "number" ? `rotate(${pos.angulo}deg)` : null;
  }

  /**
   * El vestido del objeto. A diferencia de la colocación, NO depende del lienzo:
   * un título teñido lo está también en la rejilla y en el celular, igual que en
   * la página publicada.
   */
  colorDeElemento(el: any): string | null {
    return (el && el.estilo && el.estilo.colorTexto) || null;
  }

  fondoDeElemento(el: any): string | null {
    return (el && el.estilo && el.estilo.fondo) || null;
  }

  escalaDeElemento(el: any): string | null {
    const escala = el && el.estilo && el.estilo.escala;
    const TAMANOS: { [id: string]: string } = { pequeno: ".85em", grande: "1.3em", enorme: "1.7em" };
    return (escala && TAMANOS[escala]) || null;
  }

  empezarArrastre(evento: PointerEvent, bloque: any, el: any, indice: number, modo: "mover" | "ancho"): void {
    if (!this.previsualizacion || !this.enLienzo(bloque)) return;

    // Escribir gana sobre mover: si el dedo cayó en un texto editable o en un
    // campo, no se arrastra nada.
    const destino = evento.target as HTMLElement;
    if (modo === "mover" && destino && destino.closest('[contenteditable="true"], input, textarea, select')) {
      return;
    }

    const celda = (evento.target as HTMLElement).closest(".celda") as HTMLElement;
    const marco = celda && (celda.parentElement as HTMLElement);
    if (!marco) return;

    const pos = el.pos || {};
    const caja = marco.getBoundingClientRect();
    this.arrastre = {
      bloqueId: bloque.id,
      indice,
      modo,
      marco: caja,
      px: evento.clientX,
      py: evento.clientY,
      x: typeof pos.x === "number" ? pos.x : 0,
      y: typeof pos.y === "number" ? pos.y : 0,
      w: typeof pos.w === "number" ? pos.w : 100,
      movido: false,
    };

    evento.preventDefault();
    // El puntero se captura en la celda —no en el asa— porque es la celda la
    // que escucha el movimiento y el soltar: sin esto, salirse del elemento a
    // media arrastrada deja el gesto colgado.
    celda.setPointerCapture?.(evento.pointerId);
    this.bloqueSeleccionado.emit(bloque.id);
  }

  moverArrastre(evento: PointerEvent): void {
    const a = this.arrastre;
    if (!a) return;

    const dx = ((evento.clientX - a.px) / a.marco.width) * 100;
    const dy = ((evento.clientY - a.py) / a.marco.height) * 100;

    // Los bordes de los OTROS objetos también imantan: alinear dos cosas entre
    // sí es lo que más cuesta con el mouse y lo que más se nota mal hecho.
    const vecinos = this.bordesVecinos(a.bloqueId, a.indice);

    if (a.modo === "ancho") {
      a.w = this.imantar(this.encerrar(a.w + dx, 5, 100 - a.x), vecinos.horizontales, "x", a.x);
    } else {
      a.x = this.imantar(this.encerrar(a.x + dx, 0, 100 - a.w), vecinos.horizontales, "x");
      a.y = this.imantar(this.encerrar(a.y + dy, 0, 100), vecinos.verticales, "y");
    }

    // El punto de partida se mueve con el puntero: así, cuando el elemento
    // topa con un borde, el gesto no queda "debiendo" distancia y responde de
    // inmediato al devolverse.
    a.px = evento.clientX;
    a.py = evento.clientY;
    a.movido = true;
  }

  soltarArrastre(): void {
    const a = this.arrastre;
    this.arrastre = null;
    // Las guías son del gesto, no del diseño: al soltar desaparecen.
    this.guiaX = null;
    this.guiaY = null;
    if (!a || !a.movido) return;
    this.elementoMovido.emit({ bloqueId: a.bloqueId, indice: a.indice, x: a.x, y: a.y, w: a.w });
  }

  private encerrar(valor: number, min: number, max: number): number {
    return Math.round(Math.min(max, Math.max(min, valor)) * 10) / 10;
  }

  /**
   * Guía a la que está pegado el objeto AHORA mismo, para dibujarla mientras se
   * arrastra. Nula cuando va suelto: la línea solo aparece cuando de verdad se
   * imantó, o sería ruido permanente.
   */
  guiaX: number | null = null;
  guiaY: number | null = null;

  /** A qué distancia (en % de la sección) agarra el imán. */
  private static readonly IMAN = 1.2;

  /**
   * Los bordes de los demás objetos de la sección, para alinearse con ellos.
   * Se excluye el que se está arrastrando: pegarse a uno mismo no significa nada.
   */
  private bordesVecinos(bloqueId: string, indice: number): { horizontales: number[]; verticales: number[] } {
    const bloque = (this.bloques || []).find((b: any) => b.id === bloqueId) as any;
    const horizontales: number[] = [];
    const verticales: number[] = [];
    if (!bloque) return { horizontales, verticales };

    (bloque.elementos || []).forEach((el: any, i: number) => {
      if (i === indice) return;
      const p = el && el.pos;
      if (!p || typeof p.w !== "number") return;
      horizontales.push(p.x, Math.round((p.x + p.w) * 10) / 10);
      verticales.push(p.y);
    });
    return { horizontales, verticales };
  }

  /**
   * Imán a los puntos que uno quiere pegar sin pelear con el mouse: los bordes
   * de la sección, la mitad, los tercios y los bordes de los objetos vecinos.
   * Fuera del radio del imán no hace nada, así que se puede colocar libre.
   *
   * @param desplazar Cuando se estira el ancho, la guía se compara contra el
   *   borde derecho (x + w), no contra el ancho suelto.
   */
  private imantar(valor: number, vecinos: number[] = [], eje: "x" | "y" | null = null, desplazar = 0): number {
    const guias = [0, 25, 33.3, 50, 66.6, 75, 100, ...vecinos];
    for (const guia of guias) {
      if (Math.abs(valor + desplazar - guia) < SitioRenderComponent.IMAN) {
        if (eje === "x") this.guiaX = guia;
        if (eje === "y") this.guiaY = guia;
        return Math.round((guia - desplazar) * 10) / 10;
      }
    }
    if (eje === "x") this.guiaX = null;
    if (eje === "y") this.guiaY = null;
    return valor;
  }
}
