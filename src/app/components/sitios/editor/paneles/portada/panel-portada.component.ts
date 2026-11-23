import { Component, DoCheck } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { SitiosService } from "../../../sitios.service";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { PanelSitioBase } from "../panel-sitio-base";

/** Un espacio de la portada, como lo guarda el servidor (`utils/sitioModulos/portada.js`). */
interface EspacioPortada {
  id?: string;
  imagen?: string;
  imagenMovil?: string;
  alt?: string;
  titulo?: string;
  texto?: string;
  enlaceTexto?: string;
  url?: string;
  plano?: string;
  icono?: string;
}

/**
 * Lo que una foto del carrusel dice distinto del texto común de la portada (`diapositivas` del servidor, DISENO §3.8).
 * Se liga a su foto por la URL (`imagen`): si el comercio quita una foto o la cambia de lugar, su texto la sigue.
 * Lo que queda vacío lo toma de la portada.
 */
interface DiapositivaPortada {
  imagen: string;
  alt?: string;
  titulo?: string;
  subtitulo?: string;
  ctaTexto?: string;
  ctaUrl?: string;
  alineacion?: string;
  foco?: string;
  /** Banners de marca (D-693): la etiqueta sobre el título, la parte del título en el color de acento y la foto de celular. */
  antetitulo?: string;
  resaltado?: string;
  imagenMovil?: string;
}

/** Un peldaño de la portada «Escalera» (D-693), como lo guarda el servidor (`peldanos`). */
interface PeldanoPortada {
  etiqueta?: string;
  titulo?: string;
  texto?: string;
  icono?: string;
  iconoImagen?: string;
  url?: string;
  emblemas?: string[];
}

/** Una foto del carrusel con su texto, para pintar su tarjeta. */
interface FotoCarrusel {
  url: string;
  d: DiapositivaPortada;
}

/** Un paso de «Cómo funciona» o un sello con ícono. */
interface SelloPortada {
  titulo?: string;
  texto?: string;
  icono?: string;
}

/** Un espacio de un plano de la página, para elegir a cuál lleva la tarjeta (`plano: "<ancla>:<espacioId>"`). */
interface DestinoPlano {
  valor: string;
  etiqueta: string;
}

/**
 * Panel de la portada «Espacios» del diseño nuevo (PLAN-V2 T07). Va debajo de los campos de siempre de la portada
 * (título, subtítulo y botón), solo con el diseño nuevo encendido: con el de siempre, nada de esto se ve en la página.
 *
 * Edita en su lugar `bloque.datos`: `composicion`, `antetitulo`, `resaltado`, `cta2Texto`, `cta2Url`, `sellosForma`,
 * `sellos`, `espacios` y, con «Foto a lo ancho» y dos o más fotos en el carrusel, el botón secundario y el texto de cada
 * foto (`diapositivas`: texto alternativo, título, apoyo, botón, alineación y foco). El servidor los normaliza al
 * guardar (topes, íconos y destinos); aquí se ayuda y se avisa.
 * Las fotos se suben con el mismo servicio del editor y se avisa si se quedan cortas para la tarjeta (460 px de alto en
 * computador). Nunca toca los productos ni la tienda.
 */
@Component({
  selector: "app-panel-portada",
  templateUrl: "./panel-portada.component.html",
  styleUrls: ["./panel-portada.component.scss"],
})
export class PanelPortadaComponent extends PanelSitioBase implements DoCheck {
  static readonly MAX_ESPACIOS = 3;
  static readonly MAX_SELLOS = 4;
  static readonly MAX_PELDANOS = 5;
  static readonly MAX_EMBLEMAS = 6;
  /** Topes del servidor: el nombre cabe en dos líneas de la tarjeta más angosta (DISENO D2). */
  static readonly MAX_TITULO = 22;
  static readonly MAX_ENLACE = 20;
  /** La tarjeta mide hasta 460 px de alto y unos 240 de ancho: a doble densidad, una foto de 900×600 o más. */
  static readonly FOTO_ALTO_MINIMO = 900;
  static readonly FOTO_ANCHO_MINIMO = 600;

  readonly iconos = ICONOS_SITIO;
  readonly maxEspacios = PanelPortadaComponent.MAX_ESPACIOS;
  readonly maxSellos = PanelPortadaComponent.MAX_SELLOS;
  readonly maxPeldanos = PanelPortadaComponent.MAX_PELDANOS;
  readonly maxEmblemas = PanelPortadaComponent.MAX_EMBLEMAS;
  /** Qué imagen de la escalera o de un banner se está subiendo ("" = ninguna). */
  subiendoMarca = "";
  readonly maxTitulo = PanelPortadaComponent.MAX_TITULO;
  readonly maxEnlace = PanelPortadaComponent.MAX_ENLACE;

  static readonly MAX_ALT = 120;
  static readonly MAX_TITULO_FOTO = 120;
  static readonly MAX_APOYO_FOTO = 240;
  static readonly MAX_BOTON_FOTO = 40;

  readonly maxAlt = PanelPortadaComponent.MAX_ALT;
  readonly maxTituloFoto = PanelPortadaComponent.MAX_TITULO_FOTO;
  readonly maxApoyoFoto = PanelPortadaComponent.MAX_APOYO_FOTO;
  readonly maxBotonFoto = PanelPortadaComponent.MAX_BOTON_FOTO;
  /** Alineación de una foto: vacío = la de la portada. */
  readonly alineaciones: Array<{ valor: string; etiqueta: string }> = [
    { valor: "", etiqueta: "Como la portada" },
    { valor: "izquierda", etiqueta: "Izquierda" },
    { valor: "centro", etiqueta: "Centro" },
    { valor: "derecha", etiqueta: "Derecha" },
  ];
  /** Qué parte de la foto se conserva al recortar: vacío = la de la portada. */
  readonly focos: Array<{ valor: string; etiqueta: string }> = [
    { valor: "", etiqueta: "Como la portada" },
    { valor: "centro", etiqueta: "Centro" },
    { valor: "arriba", etiqueta: "Arriba" },
    { valor: "abajo", etiqueta: "Abajo" },
    { valor: "izquierda", etiqueta: "Izquierda" },
    { valor: "derecha", etiqueta: "Derecha" },
  ];

  /** Las fotos del carrusel con su texto (se rehace cuando el editor agrega, quita o mueve una foto). */
  fotos: FotoCarrusel[] = [];
  private firmaFotos = "";

  /** Índice del espacio cuya foto se está subiendo (-1 = ninguna). */
  subiendo = -1;
  /** Aviso de tamaño por espacio (se borra al subir otra foto). */
  avisoFoto: { [indice: number]: string } = {};

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  get datos(): any {
    if (!this.bloque) return {};
    if (!this.bloque.datos) this.bloque.datos = {};
    return this.bloque.datos;
  }

  get conEspacios(): boolean {
    return this.datos.composicion === "espacios";
  }

  /** Portada «Escalera» (D-693): el título a la izquierda y hasta cinco tarjetas que suben como peldaños. */
  get conEscalera(): boolean {
    return this.datos.composicion === "escalera";
  }

  /** «Foto a lo ancho»: la portada de siempre (ni espacios ni escalera). */
  get conAncho(): boolean {
    return !this.conEspacios && !this.conEscalera;
  }

  get peldanos(): PeldanoPortada[] {
    return Array.isArray(this.datos.peldanos) ? this.datos.peldanos : [];
  }

  /**
   * Las fotos del carrusel las agrega, quita y mueve el editor (campo «Carrusel», arriba); aquí se detecta el cambio y
   * cada foto se empareja con su texto por la URL. Una foto nueva nace sin texto (usa el de la portada) y el texto de
   * una foto que ya no está se descarta.
   */
  ngDoCheck(): void {
    const urls = this.urlsCarrusel();
    const firma = `${this.bloque ? (this.bloque as any).id || "" : ""}|${urls.join("\n")}`;
    if (firma === this.firmaFotos) return;
    this.firmaFotos = firma;
    const previas: DiapositivaPortada[] = (Array.isArray(this.datos.diapositivas) ? this.datos.diapositivas : []).filter(
      (x: any) => x && typeof x === "object"
    );
    const usadas = new Set<DiapositivaPortada>();
    this.fotos = urls.map((url) => {
      let d = previas.find((x) => x.imagen === url && !usadas.has(x));
      if (!d) d = { imagen: url };
      usadas.add(d);
      return { url, d };
    });
    if (urls.length) this.datos.diapositivas = this.fotos.map((f) => f.d);
  }

  /** Las URLs de las fotos del carrusel (el editor guarda cada una como texto; se acepta también { url }). */
  private urlsCarrusel(): string[] {
    const lista = Array.isArray(this.datos.imagenes) ? this.datos.imagenes : [];
    return lista.map((x: any) => (typeof x === "string" ? x : x && x.url ? String(x.url) : "")).filter(Boolean);
  }

  /** Hay carrusel (dos o más fotos) y la portada es «Foto a lo ancho»: cada foto puede llevar su texto. */
  get conCarrusel(): boolean {
    return this.conAncho && this.fotos.length >= 2;
  }

  /** Cualquier foto con texto propio (título, apoyo, botón o alineación): la portada pasa a un texto por foto. */
  get conTextoPorFoto(): boolean {
    return this.conCarrusel && this.fotos.some((f) => !!(f.d.titulo || f.d.subtitulo || f.d.ctaTexto || f.d.alineacion || f.d.antetitulo));
  }

  /** Avisos de una foto, en el orden en que se resuelven (ninguno impide publicar). */
  avisosDeFoto(f: FotoCarrusel): string[] {
    const avisos: string[] = [];
    const d = f.d;
    if (!String(d.alt || "").trim()) avisos.push("Sin descripción, esta foto se considera decorativa y quien usa lector de pantalla no la oye.");
    const texto = String(d.ctaTexto || "").trim();
    const destino = String(d.ctaUrl || "").trim();
    if (texto && !destino) avisos.push("Escribe a dónde lleva el botón: sin destino, esta foto sale sin botón.");
    if (!texto && destino) avisos.push("Escribe el texto del botón: sin él, el destino no se usa.");
    return avisos;
  }

  /** El botón secundario sale solo con destino (sin él abriría una página que no existe). */
  get secundarioSinDestino(): boolean {
    return !!String(this.datos.cta2Texto || "").trim() && !String(this.datos.cta2Url || "").trim();
  }

  get espacios(): EspacioPortada[] {
    return Array.isArray(this.datos.espacios) ? this.datos.espacios : [];
  }

  get sellos(): SelloPortada[] {
    return Array.isArray(this.datos.sellos) ? this.datos.sellos : [];
  }

  // ── Composición ───────────────────────────────────────────────────────────

  elegirComposicion(valor: "" | "espacios" | "escalera"): void {
    this.datos.composicion = valor;
    // La primera vez que se elige, y solo si la página ya tiene un plano con ancla, nacen los tres pasos del artboard:
    // hablan del kit del plano, así que sin plano serían contenido falso (DISENO §1, principio 5).
    if (valor === "espacios" && !this.sellos.length && !this.datos.sellosForma && this.destinosDePlano.length) {
      this.datos.sellosForma = "pasos";
      this.datos.sellos = [{ titulo: "Eliges tu espacio" }, { titulo: "Ves qué va y dónde" }, { titulo: "Agregas el kit" }];
    }
    this.avisar();
  }

  /** Cualquier campo del panel cambió: lo mismo que un campo del editor (marca, refresca y guarda). */
  cambiar(): void {
    this.avisar();
  }

  /** La palabra resaltada tiene que estar dentro del título o el servidor la vacía. */
  get resaltadoHuerfano(): boolean {
    const r = String(this.datos.resaltado || "").trim();
    return !!r && !String(this.datos.titulo || "").includes(r);
  }

  /**
   * El botón principal va a una sección de esta página (#ancla): si no está, la página muestra «Ver productos» y oculta
   * los pasos 1-2-3 (hablan de esa sección). `#top` y `#catalogo` no cuentan: siempre llevan a algún lado.
   */
  get ctaAAncla(): boolean {
    const m = /^#([\w-]{1,60})$/.exec(String(this.datos.ctaUrl || "").trim());
    return !!m && m[1] !== "top" && m[1] !== "catalogo";
  }

  /** Los bloques de la página donde está esta portada (el inicio o una página propia). */
  private get bloquesDeSuPagina(): any[] {
    const c = this.contenido;
    if (!c || !this.bloque) return [];
    if ((c.bloques || []).includes(this.bloque)) return c.bloques || [];
    const pagina = (c.paginas || []).find((p) => (p.bloques || []).includes(this.bloque as any));
    return pagina ? pagina.bloques || [] : c.bloques || [];
  }

  /** ¿Hay en esta página una sección visible con ese ancla propia? (La misma revisión que hace el servidor al publicar.) */
  private anclaEnSuPagina(ancla: string): boolean {
    return !!ancla && this.bloquesDeSuPagina.some((b) => b && b.visible !== false && String(((b as any).estilo || {}).ancla || "") === ancla);
  }

  // ── Espacios ──────────────────────────────────────────────────────────────

  agregarEspacio(): void {
    if (this.espacios.length >= this.maxEspacios) return;
    this.datos.espacios = [...this.espacios, { id: this.idNuevo(), titulo: "", texto: "", alt: "" }];
    this.avisar();
  }

  quitarEspacio(i: number): void {
    const lista = [...this.espacios];
    lista.splice(i, 1);
    this.datos.espacios = lista;
    this.avisoFoto = {};
    this.avisar();
  }

  moverEspacio(i: number, paso: -1 | 1): void {
    const j = i + paso;
    const lista = [...this.espacios];
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.datos.espacios = lista;
    this.avisoFoto = {};
    this.avisar();
  }

  /** Un id corto y único dentro de la portada (el plano lo usa para abrir ese espacio). */
  private idNuevo(): string {
    const usados = new Set(this.espacios.map((e) => e.id));
    for (let k = this.espacios.length + 1; k < 50; k++) {
      const id = `espacio-${k}`;
      if (!usados.has(id)) return id;
    }
    return `espacio-${Date.now() % 1000}`;
  }

  subirFoto(evento: Event, i: number, campo: "imagen" | "imagenMovil"): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendo = i;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = -1;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        const espacio = this.espacios[i];
        if (!espacio) return;
        espacio[campo] = res.url;
        this.avisoFoto[i] = campo === "imagen" ? this.avisoDeTamano(Number(res.ancho), Number(res.alto)) : "";
        this.avisar();
      },
      error: () => {
        this.subiendo = -1;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  /** Qué decir si la foto se queda corta para la tarjeta. "" si sirve o si el servidor no mandó las medidas. */
  avisoDeTamano(ancho: number, alto: number): string {
    if (!(ancho > 0) || !(alto > 0)) return "";
    if (alto >= PanelPortadaComponent.FOTO_ALTO_MINIMO && ancho >= PanelPortadaComponent.FOTO_ANCHO_MINIMO) return "";
    return `Esta foto mide ${ancho}×${alto} px. La tarjeta mide hasta 460 px de alto en computador: usa una vertical de al menos ${PanelPortadaComponent.FOTO_ANCHO_MINIMO}×${PanelPortadaComponent.FOTO_ALTO_MINIMO} px para que no se vea borrosa.`;
  }

  quitarFoto(i: number, campo: "imagen" | "imagenMovil"): void {
    const espacio = this.espacios[i];
    if (!espacio) return;
    espacio[campo] = "";
    if (campo === "imagen") this.avisoFoto[i] = "";
    this.avisar();
  }

  /**
   * Avisos de un espacio, en el orden en que el comercio los resuelve. Los que dicen «no se puede publicar» son los
   * mismos que revisa el servidor al publicar (`utils/sitioModulos/portada.js`, `pendientesDePublicar`).
   */
  avisosDe(e: EspacioPortada): string[] {
    const avisos: string[] = [];
    const tieneAlgo = !!(e.imagen || String(e.texto || "").trim() || String(e.url || "").trim() || String(e.plano || "").trim());
    if (!String(e.titulo || "").trim()) {
      avisos.push(tieneAlgo ? "Ponle un nombre: sin nombre no se puede publicar." : "Ponle un nombre: sin nombre, el espacio no sale en la página.");
    }
    if (e.imagen && !String(e.alt || "").trim()) avisos.push("Describe la foto en una frase: sin la descripción no se puede publicar.");
    const url = String(e.url || "").trim();
    const ancla = String(e.plano || "").split(":")[0].trim();
    if (!url && !ancla) avisos.push("Elige a dónde lleva: sin destino, la tarjeta no se puede tocar.");
    else if (!url && !this.anclaEnSuPagina(ancla)) {
      avisos.push(`Solo lleva al plano y en esta página no hay una sección visible con el ancla «${ancla}»: así no se puede publicar. Ponle también un destino.`);
    }
    return avisos;
  }

  /** Si algún espacio no tiene foto, todos salen en filas con ícono. */
  get todosConFoto(): boolean {
    return this.espacios.length > 0 && this.espacios.every((e) => !!e.imagen);
  }

  /** Los espacios de los planos de esta página que tienen ancla propia (el plano llega con PLAN-V2 T11). */
  get destinosDePlano(): DestinoPlano[] {
    const salida: DestinoPlano[] = [];
    for (const b of this.bloquesDeSuPagina) {
      const ancla = String(((b as any).estilo || {}).ancla || "");
      if (b.tipo !== "plano" || !ancla) continue;
      const espacios = Array.isArray(b.datos && b.datos.espacios) ? b.datos.espacios : [];
      for (const e of espacios) {
        if (e && e.id) salida.push({ valor: `${ancla}:${e.id}`, etiqueta: `${(b.datos && b.datos.titulo) || "Plano"} · ${e.nombre || e.id}` });
      }
    }
    return salida;
  }

  trazoIcono(nombre: string | undefined): string {
    return (nombre && TRAZOS_ICONO_SITIO[nombre]) || "";
  }

  // ── Escalera (D-693) ──────────────────────────────────────────────────────

  agregarPeldano(): void {
    if (this.peldanos.length >= this.maxPeldanos) return;
    this.datos.peldanos = [...this.peldanos, { etiqueta: "", titulo: "", texto: "" }];
    this.avisar();
  }

  quitarPeldano(i: number): void {
    const lista = [...this.peldanos];
    lista.splice(i, 1);
    this.datos.peldanos = lista;
    this.avisar();
  }

  moverPeldano(i: number, paso: -1 | 1): void {
    const j = i + paso;
    const lista = [...this.peldanos];
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.datos.peldanos = lista;
    this.avisar();
  }

  /**
   * Sube una imagen de la escalera o de un banner y la deja donde toca: el logo de la portada (`marca`), el ícono
   * propio de un peldaño (`icono:<i>`), un emblema más (`emblema:<i>`) o la foto de celular de un banner (`movil:<i>`).
   */
  subirDeMarca(evento: Event, destino: string): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendoMarca = destino;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendoMarca = "";
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        const [que, indice] = destino.split(":");
        const i = Number(indice);
        if (que === "marca") this.datos.marcaImagen = res.url;
        else if (que === "icono" && this.peldanos[i]) this.peldanos[i].iconoImagen = res.url;
        else if (que === "emblema" && this.peldanos[i]) {
          const actuales = this.peldanos[i].emblemas || [];
          if (actuales.length < this.maxEmblemas) this.peldanos[i].emblemas = [...actuales, res.url];
        } else if (que === "movil" && this.fotos[i]) this.fotos[i].d.imagenMovil = res.url;
        this.avisar();
      },
      error: () => {
        this.subiendoMarca = "";
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  quitarMarca(): void {
    delete this.datos.marcaImagen;
    this.avisar();
  }

  quitarIconoPropio(i: number): void {
    if (!this.peldanos[i]) return;
    delete this.peldanos[i].iconoImagen;
    this.avisar();
  }

  quitarEmblema(i: number, k: number): void {
    const p = this.peldanos[i];
    if (!p) return;
    const lista = [...(p.emblemas || [])];
    lista.splice(k, 1);
    if (lista.length) p.emblemas = lista;
    else delete p.emblemas;
    this.avisar();
  }

  quitarFotoMovil(i: number): void {
    if (!this.fotos[i]) return;
    delete this.fotos[i].d.imagenMovil;
    this.avisar();
  }

  /** El peldaño sale en la página solo con etiqueta o nombre. */
  peldanoVacio(p: PeldanoPortada): boolean {
    return !String(p.etiqueta || "").trim() && !String(p.titulo || "").trim();
  }

  // ── Banners (D-693) ───────────────────────────────────────────────────────

  /** Portada secundaria: va debajo de la portada principal de la página y sus títulos no son el título principal. */
  alternarSecundaria(): void {
    if (this.datos.secundaria === true) delete this.datos.secundaria;
    else this.datos.secundaria = true;
    this.avisar();
  }

  /** La parte resaltada de una foto tiene que estar dentro de su título (o del de la portada). */
  resaltadoDeFotoHuerfano(f: FotoCarrusel): boolean {
    const r = String(f.d.resaltado || "").trim();
    return !!r && !String(f.d.titulo || this.datos.titulo || "").includes(r);
  }

  // ── Sellos («Cómo funciona») ──────────────────────────────────────────────

  elegirFormaSellos(forma: "" | "pasos"): void {
    this.datos.sellosForma = forma;
    this.avisar();
  }

  agregarSello(): void {
    if (this.sellos.length >= this.maxSellos) return;
    this.datos.sellos = [...this.sellos, { titulo: "", texto: "" }];
    this.avisar();
  }

  quitarSello(i: number): void {
    const lista = [...this.sellos];
    lista.splice(i, 1);
    this.datos.sellos = lista;
    this.avisar();
  }

  porIndice(i: number): number {
    return i;
  }
}
