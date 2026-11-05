import { Component, DoCheck } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import Swal from "sweetalert2";
import { SitiosService } from "../../../sitios.service";
import { PanelSitioBase } from "../panel-sitio-base";
import { primeraImagen } from "../fichas/fichas-datos";
import {
  PestanaVitrina,
  SIN_FUENTE_DE_VENTAS,
  TOPES_VITRINA,
  afirmaVentas,
  avisosDeCabecera,
  columnasDelTema,
  idsDePestana,
  pestanaLista,
  seVenEnComputador,
  tieneMarcador,
} from "./vitrina-datos";

/** Columnas de la rejilla en tableta (768 a 1023 px), como en la página. */
const COLUMNAS_TABLETA = 2;

/** Lo que el panel muestra de un producto de la vitrina (nombre y foto, de referencia; no se guarda). */
interface ProductoDeVitrina {
  titulo: string;
  imagen: string | null;
}

/**
 * Pestañas de la vitrina del diseño nuevo (PLAN-V2 T15). Va debajo de los campos de siempre del bloque «Productos»
 * (título y productos elegidos), solo con el diseño nuevo encendido.
 *
 * Los productos se siguen eligiendo arriba, como siempre (son los que se venden desde la página). Aquí solo se reparten
 * en hasta 3 pestañas de hasta 8 cada una: cada pestaña marca cuáles de ESOS productos lleva. Edita en su lugar
 * `bloque.datos.pestanas` y `bloque.datos.accionSecundaria`; el servidor normaliza al guardar (topes, y que cada id sea
 * de la vitrina). Nunca toca los productos ni la tienda.
 *
 * Para quitar las pestañas deja la lista vacía (el servidor no guarda una lista vacía).
 */
@Component({
  selector: "app-panel-vitrina",
  templateUrl: "./vitrina-panel.component.html",
  styleUrls: ["./vitrina-panel.component.scss"],
})
export class VitrinaPanelComponent extends PanelSitioBase implements DoCheck {
  readonly topes = TOPES_VITRINA;
  readonly destacados = SIN_FUENTE_DE_VENTAS;

  /** Nombre y foto de los productos de la vitrina (de referencia). */
  productos: { [id: string]: ProductoDeVitrina } = {};
  cargando = false;
  private claveCargada = "";

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  /** Los productos de la vitrina cambian arriba (en el editor): se piden sus nombres cuando cambia la lista. */
  ngDoCheck(): void {
    const clave = this.idsVitrina.join(",");
    if (clave !== this.claveCargada) {
      this.claveCargada = clave;
      this.cargarProductos();
    }
  }

  // ── Lectura ─────────────────────────────────────────────────────────────────────────────────────────────────────

  get datos(): any {
    if (!this.bloque) return {};
    if (!this.bloque.datos) this.bloque.datos = {};
    return this.bloque.datos;
  }

  /** Los productos elegidos en la vitrina, en su orden (los únicos que pueden ir en una pestaña). */
  get idsVitrina(): string[] {
    const ids = this.datos.productoIds;
    return Array.isArray(ids) ? ids.filter((id: any) => typeof id === "string" && id) : [];
  }

  get pestanas(): PestanaVitrina[] {
    return Array.isArray(this.datos.pestanas) ? this.datos.pestanas : [];
  }

  get conPestanas(): boolean {
    return this.pestanas.length > 0;
  }

  /** Las pestañas que salen en la página (con un nombre que se publica y con productos de la vitrina). */
  get listas(): PestanaVitrina[] {
    return this.pestanas.filter((p) => pestanaLista(p, this.idsVitrina));
  }

  /** Las columnas de computador de la página: las del tema o 4. */
  get columnas(): number {
    const c: any = this.contenido;
    return columnasDelTema(c && c.tema);
  }

  /** ¿La página tiene la guía de la propuesta (T17)? Solo entonces «Agregar a mi propuesta» hace algo. */
  get hayGuia(): boolean {
    const c: any = this.contenido;
    if (!c) return false;
    const bloques: any[] = [...(c.bloques || []), ...((c.paginas || []) as any[]).reduce((acc: any[], p: any) => acc.concat(p.bloques || []), [])];
    return bloques.some((b) => b && b.tipo === "guia" && b.visible !== false);
  }

  tituloDe(id: string): string {
    const p = this.productos[id];
    return (p && p.titulo) || (this.cargando ? "Cargando…" : "Producto sin nombre en el catálogo");
  }

  imagenDe(id: string): string | null {
    const p = this.productos[id];
    return (p && p.imagen) || null;
  }

  lleva(p: PestanaVitrina, id: string): boolean {
    return (p.productoIds || []).includes(id);
  }

  /** Cuántos productos de la vitrina lleva la pestaña (uno que se quitó de la vitrina ya no cuenta). */
  cuenta(p: PestanaVitrina): number {
    return idsDePestana(p, this.idsVitrina).length;
  }

  /** ¿Se puede marcar otro producto en esta pestaña? (tope de 8, contando solo los que siguen en la vitrina) */
  llena(p: PestanaVitrina): boolean {
    return this.cuenta(p) >= this.topes.porPestana;
  }

  // ── Avisos (las mismas reglas que la página) ──────────────────────────────────────────────────────────────────

  /**
   * Avisos de la cabecera, siempre con el diseño nuevo (este panel solo sale con él): con pestañas, lo que la página
   * cambia; sin pestañas, lo que conviene cambiar (la vitrina sale con el texto tal cual).
   */
  get avisosCabecera(): string[] {
    return avisosDeCabecera(this.datos, this.listas.length > 0);
  }

  /** Los productos de la vitrina que no están en ninguna pestaña: con pestañas no se ven. */
  get sinPestana(): string[] {
    const usados = new Set(this.pestanas.reduce((acc: string[], p) => acc.concat(p.productoIds || []), []));
    return this.idsVitrina.filter((id) => !usados.has(id));
  }

  avisosDe(p: PestanaVitrina, i: number): string[] {
    const avisos: string[] = [];
    const n = this.cuenta(p);
    const nombre = String(p.etiqueta || "").trim();
    if (!nombre) avisos.push(`La pestaña ${i + 1} no sale hasta que tenga nombre.`);
    else if (tieneMarcador(nombre)) avisos.push("El nombre tiene algo por llenar entre corchetes: esta pestaña no sale.");
    else if (afirmaVentas(nombre)) avisos.push(`«${nombre}» dice que son los más vendidos, y todavía no hay ventas reales que lo respalden: esta pestaña no sale hasta que le cambies el nombre.`);
    else if (this.pestanas.some((q, k) => k !== i && String(q.etiqueta || "").trim().toLowerCase() === nombre.toLowerCase())) {
      avisos.push("Otra pestaña se llama igual: tus clientes no sabrán cuál es cuál.");
    }
    if (!n) avisos.push("Marca al menos un producto: sin productos la pestaña no sale.");
    const computador = seVenEnComputador(n, this.columnas);
    const tableta = seVenEnComputador(n, COLUMNAS_TABLETA);
    if (computador < n || tableta < n) {
      const donde = [computador < n ? `${computador} en computador` : "", tableta < n ? `${tableta} en tableta` : ""].filter(Boolean).join(" y ");
      const enTodas = this.cantidadesSinRecorte;
      const consejo = enTodas.length ? ` Con ${enTodas.length > 1 ? enTodas.slice(0, -1).join(", ") + " u " + enTodas[enTodas.length - 1] : enTodas[0]} se ven todos en cualquier pantalla.` : "";
      avisos.push(`Tiene ${n}: se ven ${donde}, para que la última fila no quede a medias; en el celular se ven todos.${consejo}`);
    }
    return avisos;
  }

  /** Cantidades (de 3 a 8) que se ven completas en computador y en tableta: 4 u 8 con 4 columnas. */
  get cantidadesSinRecorte(): number[] {
    const salida: number[] = [];
    for (let n = 3; n <= this.topes.porPestana; n++) {
      if (seVenEnComputador(n, this.columnas) === n && seVenEnComputador(n, COLUMNAS_TABLETA) === n) salida.push(n);
    }
    return salida;
  }

  // ── Cambios ─────────────────────────────────────────────────────────────────────────────────────────────────────

  cambiar(): void {
    this.avisar();
  }

  /** Enciende las pestañas: la primera nace con los primeros 8 productos de la vitrina y sin nombre (se pide aquí). */
  activar(): void {
    if (this.conPestanas) return;
    this.datos.pestanas = [{ etiqueta: "", productoIds: this.idsVitrina.slice(0, this.topes.porPestana) }];
    this.avisar();
  }

  async desactivar(): Promise<void> {
    if (!this.conPestanas) return;
    const conAlgo = this.pestanas.some((p) => String(p.etiqueta || "").trim() || (p.productoIds || []).length);
    if (conAlgo) {
      const r = await Swal.fire({
        title: "¿Quitar las pestañas?",
        text: "La vitrina vuelve a mostrar todos sus productos seguidos. Los productos no cambian.",
        showCancelButton: true,
        confirmButtonText: "Sí, quitarlas",
        cancelButtonText: "Conservarlas",
        confirmButtonColor: "#5F3FE0",
      });
      if (!r.isConfirmed) return;
    }
    this.datos.pestanas = [];
    this.avisar();
  }

  agregarPestana(): void {
    if (this.pestanas.length >= this.topes.pestanas) return;
    this.datos.pestanas = [...this.pestanas, { etiqueta: "", productoIds: [] }];
    this.avisar();
  }

  quitarPestana(i: number): void {
    const lista = this.pestanas.slice();
    lista.splice(i, 1);
    this.datos.pestanas = lista;
    this.avisar();
  }

  moverPestana(i: number, paso: number): void {
    const j = i + paso;
    const lista = this.pestanas.slice();
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.datos.pestanas = lista;
    this.avisar();
  }

  /** Marca o desmarca un producto en una pestaña. Quedan en el orden de la vitrina (el que se arrastra arriba). */
  alternar(p: PestanaVitrina, id: string): void {
    const marcados = new Set(p.productoIds || []);
    if (marcados.has(id)) marcados.delete(id);
    else {
      if (this.llena(p)) return;
      marcados.add(id);
    }
    p.productoIds = this.idsVitrina.filter((x) => marcados.has(x));
    this.avisar();
  }

  /** Pone en la primera pestaña los productos que no están en ninguna (hasta llenarla). */
  agregarSueltos(): void {
    const primera = this.pestanas[0];
    if (!primera) return;
    const marcados = new Set([...(primera.productoIds || []), ...this.sinPestana]);
    primera.productoIds = this.idsVitrina.filter((x) => marcados.has(x)).slice(0, this.topes.porPestana);
    this.avisar();
  }

  alternarPropuesta(): void {
    this.datos.accionSecundaria = this.datos.accionSecundaria === "propuesta" ? "" : "propuesta";
    this.avisar();
  }

  porIndice(i: number): number {
    return i;
  }

  // ── Productos ─────────────────────────────────────────────────────────────────────────────────────────────────

  private cargarProductos(): void {
    const faltan = this.idsVitrina.filter((id) => !this.productos[id]).slice(0, 24);
    if (!faltan.length || this.cargando) return;
    this.cargando = true;
    this.service.productosPorIds(faltan).subscribe({
      next: (res) => {
        this.cargando = false;
        for (const p of (res && res.products) || []) {
          const crear: any = p.crearProducto || {};
          this.productos[p.cd] = { titulo: crear.titulo || "Sin nombre", imagen: primeraImagen(crear) };
        }
        // Un id que ya no existe en el catálogo no se vuelve a pedir.
        for (const id of faltan) if (!this.productos[id]) this.productos[id] = { titulo: "", imagen: null };
        // Lo que se agregó a la vitrina mientras esta tanda volvía.
        this.cargarProductos();
      },
      error: () => {
        this.cargando = false;
        this.toastr.error("No pudimos cargar los nombres de los productos de la vitrina.");
      },
    });
  }
}
