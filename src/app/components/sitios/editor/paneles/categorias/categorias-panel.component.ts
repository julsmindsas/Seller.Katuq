import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { ToastrService } from "ngx-toastr";
import { CategoriaSitio, SitiosService } from "../../../sitios.service";
import { PanelSitioBase } from "../panel-sitio-base";
import { ICONOS_SITIO, TRAZOS_ICONO_SITIO } from "../../../iconos-sitio";
import { NOMBRES_ICONO } from "../barras/barras-datos";
import {
  ColoresPlaca,
  InfoCategoria,
  TOPES_CATEGORIAS,
  TRAZO_PLACA_DEFECTO,
  coloresDePlaca,
  claveCategoria,
  curaAlgo,
  mayusculaInicial,
  nombreDelMaestro,
  tieneMarcador,
  vaEnMayusculas,
} from "./categorias-datos";

/** Cuántas categorías se muestran por tanda. */
const TANDA = 24;

/**
 * Cuántas categorías devuelve como máximo el servidor (`GET /v1/sites/:id/categorias`, las de más productos). Si llegan
 * todas esas, puede haber más en el catálogo: entonces un nombre curado que no está en la lista NO se toma por huérfano.
 */
const MAX_LISTA = 120;

/** Una fila del panel: la categoría del catálogo y su nombre curado, si lo tiene. */
interface FilaCategoria {
  nombre: string;
  clave: string;
  total: number;
  imagen: string;
  oculta: boolean;
}

/**
 * Tienda › Nombres de categorías (tanda N2): el nombre con que se lee cada categoría en la página, sin cambiarla en el
 * catálogo. El catálogo guarda los nombres sin tildes y en minúscula («camaras pan/tilt»); con el diseño nuevo, sin
 * nombre curado salen con mayúscula inicial («Camaras pan/tilt»). Aquí se escriben como se deben leer («Cámaras
 * pan/tilt»). Los usan las baldosas de «Categorías», el menú y la fila de categorías del encabezado.
 *
 * Guarda `contenido.tienda.categoriasInfo = [{ categoria, etiqueta, …lo demás que ya tuviera }]`. Una entrada que no cura
 * nada se quita; para borrar todo deja la lista vacía (el servidor conserva una clave que el editor no manda). El tope es
 * de 120 categorías con nombre, igual que el servidor. Cada categoría puede llevar también su ícono (la forma «Íconos» de
 * la banda Categorías: si a una de las que salen le falta, la banda va con fotos).
 */
@Component({
  selector: "app-panel-categorias",
  templateUrl: "./categorias-panel.component.html",
  styleUrls: ["./categorias-panel.component.scss"],
})
export class CategoriasPanelComponent extends PanelSitioBase implements OnInit {
  readonly topes = TOPES_CATEGORIAS;
  /** Cierre de N2: el ícono de cada categoría, del catálogo cerrado del servidor (`ICONOS`). */
  readonly iconos = ICONOS_SITIO.map((id) => ({ id, nombre: NOMBRES_ICONO[id] || id }));
  readonly trazos: { readonly [id: string]: string } = TRAZOS_ICONO_SITIO as any;

  /** El ícono por defecto de la placa (una caja). */
  readonly trazoDefecto = TRAZO_PLACA_DEFECTO;

  /** Qué foto genérica se está subiendo: "" (ninguna), "general" (la de la tienda) o la clave de la categoría. */
  subiendo = "";
  categorias: FilaCategoria[] = [];
  cargando = false;
  error = "";
  filtro = "";
  mostrando = TANDA;

  constructor(private service: SitiosService, private route: ActivatedRoute, private toastr: ToastrService) {
    super();
  }

  ngOnInit(): void {
    const id = this.idDelSitio();
    if (!id) {
      this.error = "No encontramos el sitio para leer sus categorías.";
      return;
    }
    this.cargando = true;
    this.service.categorias(id).subscribe({
      next: (r) => {
        this.cargando = false;
        const lista: CategoriaSitio[] = (r && r.success && r.data) || [];
        const ocultas = new Set(((this.tienda.categoriasOcultas as string[]) || []).map((c) => claveCategoria(c)));
        this.categorias = lista
          .filter((c) => !!String((c && c.nombre) || "").trim())
          .map((c) => ({ nombre: c.nombre, clave: claveCategoria(c.nombre), total: Number(c.total) || 0, imagen: c.imagen || "", oculta: ocultas.has(claveCategoria(c.nombre)) }));
      },
      error: () => {
        this.cargando = false;
        this.error = "No pudimos cargar las categorías de tu catálogo. Intenta de nuevo en un momento.";
      },
    });
  }

  /** El id del sitio que se está editando (la ruta del editor es `sitios/editor/:id`). */
  private idDelSitio(): string {
    let r: ActivatedRoute | null = this.route;
    while (r) {
      const id = r.snapshot && r.snapshot.paramMap.get("id");
      if (id) return id;
      r = r.parent;
    }
    return "";
  }

  get tienda(): any {
    return (this.contenido && (this.contenido as any).tienda) || {};
  }

  /** Lo curado hoy, tal como está en el sitio. */
  get info(): InfoCategoria[] {
    const lista = this.tienda.categoriasInfo;
    return Array.isArray(lista) ? lista : [];
  }

  get conNombre(): number {
    return this.info.filter((c) => !!String(c.etiqueta || "").trim()).length;
  }

  get filtradas(): FilaCategoria[] {
    const f = claveCategoria(this.filtro);
    if (!f) return this.categorias;
    return this.categorias.filter((c) => c.clave.includes(f) || claveCategoria(this.etiqueta(c)).includes(f));
  }

  get visibles(): FilaCategoria[] {
    return this.filtradas.slice(0, this.mostrando);
  }

  /** Las categorías visibles en la tienda que siguen sin nombre curado (las ocultas no salen en la página). */
  get sinNombre(): number {
    return this.categorias.filter((c) => !c.oculta && !String(this.etiqueta(c)).trim()).length;
  }

  /** Las categorías que salen en la tienda (las ocultas no). */
  get visiblesEnTienda(): number {
    return this.categorias.filter((c) => !c.oculta).length;
  }

  /** ¿Alguna categoría ya tiene ícono? (Solo entonces se avisa de las que faltan.) */
  get conIcono(): boolean {
    return this.info.some((c) => !!c && !!c.icono);
  }

  /** Las categorías visibles que siguen sin ícono. */
  get sinIcono(): number {
    return this.categorias.filter((c) => !c.oculta && !this.iconoDe(c)).length;
  }

  iconoDe(c: FilaCategoria): string {
    const e = this.entrada(c);
    return (e && e.icono) || "";
  }

  /** Cambia el ícono de una categoría y conserva lo demás que tenga curado. Sin ícono ni nada más, la entrada se quita. */
  cambiarIcono(c: FilaCategoria, valor: string): void {
    const t: any = this.contenido && (this.contenido as any).tienda;
    if (!t) return;
    const icono = ICONOS_SITIO.includes(valor) ? valor : "";
    const lista = this.info.slice();
    const k = lista.findIndex((x) => claveCategoria(x && x.categoria) === c.clave);
    if (k >= 0) {
      const nueva: InfoCategoria = { ...lista[k], icono };
      if (!icono) delete nueva.icono;
      if (curaAlgo(nueva)) lista[k] = nueva;
      else lista.splice(k, 1);
    } else if (icono) {
      if (lista.length >= this.topes.entradas) return;
      lista.push({ categoria: c.nombre, icono });
    }
    t.categoriasInfo = lista;
    this.avisar();
  }

  // ── Foto genérica: lo que se ve donde un producto no tiene foto ────────────────────────────────────────────────────

  /** La foto genérica de toda la tienda (`tienda.fotoGenerica`); "" si no hay. */
  get fotoGenerica(): string {
    return String(this.tienda.fotoGenerica || "");
  }

  /** Los colores de la página, para dibujar «cómo queda». */
  get colores(): ColoresPlaca {
    return coloresDePlaca(this.contenido && (this.contenido as any).tema);
  }

  /** La foto genérica de una categoría (`categoriasInfo[].imagen`); "" si no tiene. */
  fotoDe(c: FilaCategoria): string {
    const e = this.entrada(c);
    return (e && e.imagen) || "";
  }

  /**
   * Cómo se ve un producto sin foto de esta categoría (o de ninguna, con `null`): la foto de su categoría, la de la tienda
   * o, si no hay, la placa con el ícono de la categoría. La misma regla que aplica la página.
   */
  vistaDe(c: FilaCategoria | null): { foto: string; trazo: string } {
    const e = c ? this.entrada(c) : undefined;
    const icono = (e && e.icono) || "";
    return { foto: (e && e.imagen) || this.fotoGenerica, trazo: (icono && this.trazos[icono]) || TRAZO_PLACA_DEFECTO };
  }

  /** La categoría con la que se dibuja la vista de la foto de la tienda: la primera que ya tiene ícono, o ninguna. */
  get categoriaDeMuestra(): FilaCategoria | null {
    return this.categorias.find((c) => !c.oculta && !!this.iconoDe(c) && !this.fotoDe(c)) || null;
  }

  /** La foto con que se dibuja la vista de la tienda (primitivas: un objeto nuevo en cada revisión rompería el enlace en dev). */
  get muestraFoto(): string {
    return this.vistaDe(this.categoriaDeMuestra).foto;
  }

  get muestraTrazo(): string {
    return this.vistaDe(this.categoriaDeMuestra).trazo;
  }

  subirFotoGeneral(evento: Event): void {
    this.subirFoto(evento, "general", (url) => {
      const t: any = this.contenido && (this.contenido as any).tienda;
      if (!t) return;
      t.fotoGenerica = url;
      this.avisar();
    });
  }

  quitarFotoGeneral(): void {
    const t: any = this.contenido && (this.contenido as any).tienda;
    if (!t) return;
    // Vacía, no borrada: el servidor conserva una clave que el editor no manda.
    t.fotoGenerica = "";
    this.avisar();
  }

  subirFotoCategoria(evento: Event, c: FilaCategoria): void {
    this.subirFoto(evento, c.clave, (url) => this.cambiarFoto(c, url));
  }

  quitarFotoCategoria(c: FilaCategoria): void {
    this.cambiarFoto(c, "");
  }

  /** Cambia la foto de una categoría y conserva lo demás que tenga curado. Sin foto ni nada más, la entrada se quita. */
  private cambiarFoto(c: FilaCategoria, imagen: string): void {
    const t: any = this.contenido && (this.contenido as any).tienda;
    if (!t) return;
    const lista = this.info.slice();
    const k = lista.findIndex((x) => claveCategoria(x && x.categoria) === c.clave);
    if (k >= 0) {
      const nueva: InfoCategoria = { ...lista[k], imagen };
      if (!imagen) delete nueva.imagen;
      if (curaAlgo(nueva)) lista[k] = nueva;
      else lista.splice(k, 1);
    } else if (imagen) {
      if (lista.length >= this.topes.entradas) return;
      lista.push({ categoria: c.nombre, imagen });
    }
    t.categoriasInfo = lista;
    this.avisar();
  }

  /** Sube la foto elegida a la carpeta de sitios y le pasa su URL a `guardar`. */
  private subirFoto(evento: Event, quien: string, guardar: (url: string) => void): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    if (!archivo) return;
    this.subiendo = quien;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = "";
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        guardar(res.url);
      },
      error: () => {
        this.subiendo = "";
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  /** Lo curado que ya no corresponde a ninguna categoría del catálogo (cambió de nombre o se quedó sin productos). */
  get huerfanas(): InfoCategoria[] {
    if (!this.categorias.length || this.categorias.length >= MAX_LISTA) return [];
    const claves = new Set(this.categorias.map((c) => c.clave));
    return this.info.filter((c) => !claves.has(claveCategoria(c.categoria)));
  }

  /** ¿Se llegó al tope y esta categoría no tiene entrada? */
  sinCupo(c: FilaCategoria): boolean {
    return this.info.length >= this.topes.entradas && !this.entrada(c);
  }

  private entrada(c: FilaCategoria): InfoCategoria | undefined {
    return this.info.find((x) => claveCategoria(x && x.categoria) === c.clave);
  }

  etiqueta(c: FilaCategoria): string {
    const e = this.entrada(c);
    return (e && e.etiqueta) || "";
  }

  /** Cómo se lee hoy en la página. */
  seLee(c: FilaCategoria): string {
    const propia = this.etiqueta(c).trim();
    return propia && !tieneMarcador(propia) ? propia : nombreDelMaestro(c.nombre);
  }

  comoSaleSinNombre(c: FilaCategoria): string {
    return nombreDelMaestro(c.nombre);
  }

  /** Un marcador («[NOMBRE]») ya tiene su propio aviso: no se avisa dos veces. */
  enMayusculas(c: FilaCategoria): boolean {
    const e = this.etiqueta(c);
    return vaEnMayusculas(e) && !tieneMarcador(e);
  }

  conMarcador(c: FilaCategoria): boolean {
    return tieneMarcador(this.etiqueta(c));
  }

  cambiar(c: FilaCategoria, valor: string): void {
    const t: any = this.contenido && (this.contenido as any).tienda;
    if (!t) return;
    const etiqueta = String(valor || "").slice(0, this.topes.etiqueta);
    const lista = this.info.slice();
    const k = lista.findIndex((x) => claveCategoria(x && x.categoria) === c.clave);
    if (k >= 0) {
      const nueva: InfoCategoria = { ...lista[k], etiqueta };
      if (curaAlgo(nueva)) lista[k] = nueva;
      else lista.splice(k, 1);
    } else if (etiqueta.trim()) {
      if (lista.length >= this.topes.entradas) return;
      lista.push({ categoria: c.nombre, etiqueta });
    }
    t.categoriasInfo = lista;
    this.avisar();
  }

  /** Pone como punto de partida el nombre del catálogo con mayúscula inicial (después se le agregan las tildes). */
  usarDelCatalogo(c: FilaCategoria): void {
    this.cambiar(c, nombreDelMaestro(c.nombre));
  }

  pasarAMayusculaInicial(c: FilaCategoria): void {
    this.cambiar(c, mayusculaInicial(this.etiqueta(c)));
  }

  quitarHuerfanas(): void {
    const t: any = this.contenido && (this.contenido as any).tienda;
    if (!t) return;
    const claves = new Set(this.categorias.map((c) => c.clave));
    t.categoriasInfo = this.info.filter((c) => claves.has(claveCategoria(c.categoria)));
    this.avisar();
  }

  verMas(): void {
    this.mostrando += TANDA;
  }

  porClave(_: number, c: FilaCategoria): string {
    return c.clave;
  }
}
