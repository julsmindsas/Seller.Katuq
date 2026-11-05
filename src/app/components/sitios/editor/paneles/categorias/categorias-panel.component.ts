import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";
import { CategoriaSitio, SitiosService } from "../../../sitios.service";
import { PanelSitioBase } from "../panel-sitio-base";
import {
  InfoCategoria,
  TOPES_CATEGORIAS,
  claveCategoria,
  curaAlgo,
  mayusculaInicial,
  nombreDelMaestro,
  tieneMarcador,
  vaEnMayusculas,
} from "./categorias-datos";

/** Cuántas categorías se muestran por tanda. */
const TANDA = 24;

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
 * de 40 categorías con nombre, igual que el servidor.
 */
@Component({
  selector: "app-panel-categorias",
  templateUrl: "./categorias-panel.component.html",
  styleUrls: ["./categorias-panel.component.scss"],
})
export class CategoriasPanelComponent extends PanelSitioBase implements OnInit {
  readonly topes = TOPES_CATEGORIAS;

  categorias: FilaCategoria[] = [];
  cargando = false;
  error = "";
  filtro = "";
  mostrando = TANDA;

  constructor(private service: SitiosService, private route: ActivatedRoute) {
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

  /** Lo curado que ya no corresponde a ninguna categoría del catálogo (cambió de nombre o se quedó sin productos). */
  get huerfanas(): InfoCategoria[] {
    if (!this.categorias.length) return [];
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
