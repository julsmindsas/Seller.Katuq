import { Component } from "@angular/core";
import { PanelSitioBase } from "../panel-sitio-base";
import { EnlaceMenu, TOPES, anclaQueNoExiste, conMenu, menuDe } from "./barras-datos";

/**
 * Encabezado del diseño nuevo (PLAN-V2 T06, DISENO §3.7): el menú de hasta 7 enlaces con submenús, dónde van las
 * categorías, el texto de ejemplo del buscador y el botón del asesor. Va debajo de los campos de siempre del encabezado
 * (logo, nombre, fijo, buscador, carrito, botón), que siguen en el editor; con el diseño nuevo, la lista de 4 enlaces de
 * siempre se esconde y la reemplaza esta.
 *
 * Escribe en `bloque.datos`: `menu`, `enlaces` (los 4 primeros, para el diseño de siempre), `menuCategorias` y
 * `mostrarCategorias` (las categorías las resuelve el servidor solo con esa bandera), `placeholderBuscador`, `asesor` y
 * `asesorTexto`.
 */
@Component({
  selector: "app-panel-barras-encabezado",
  templateUrl: "./barras-encabezado-panel.component.html",
  styleUrls: ["./barras-encabezado-panel.component.scss"],
})
export class BarrasEncabezadoPanelComponent extends PanelSitioBase {
  readonly topes = TOPES;
  /** Qué enlace tiene abierto su submenú en el panel (-1: ninguno). */
  abierto = -1;

  get datos(): any {
    return (this.bloque && this.bloque.datos) || {};
  }

  /**
   * El menú para la plantilla. Se arma una vez por cada versión de los datos (y no en cada vuelta de Angular): una lista
   * nueva en cada lectura rompería el foco al escribir y daría «ExpressionChanged…» en desarrollo.
   */
  get menu(): EnlaceMenu[] {
    const fuente = Array.isArray(this.datos.menu) && this.datos.menu.length ? this.datos.menu : this.datos.enlaces;
    if (!this.cache || this.cache.fuente !== fuente) this.cache = { fuente, menu: menuDe(this.datos) };
    return this.cache.menu;
  }
  private cache: { fuente: any; menu: EnlaceMenu[] } | null = null;

  /** Una copia para cambiar (la de la plantilla no se toca). */
  private copia(): EnlaceMenu[] {
    return menuDe(this.datos);
  }

  private guardar(menu: EnlaceMenu[]): void {
    conMenu(this.datos, menu);
    this.avisar();
  }

  cambiarEnlace(k: number, campo: "etiqueta" | "url", valor: string): void {
    const menu = this.copia();
    if (!menu[k]) return;
    menu[k] = { ...menu[k], [campo]: valor };
    this.guardar(menu);
  }

  agregarEnlace(): void {
    const menu = this.copia();
    if (menu.length >= TOPES.menu) return;
    this.guardar([...menu, { etiqueta: "", url: "", hijos: [] }]);
  }

  quitarEnlace(k: number): void {
    const menu = this.copia();
    menu.splice(k, 1);
    if (this.abierto === k) this.abierto = -1;
    this.guardar(menu);
  }

  mover(k: number, paso: -1 | 1): void {
    const menu = this.copia();
    const j = k + paso;
    if (j < 0 || j >= menu.length) return;
    [menu[k], menu[j]] = [menu[j], menu[k]];
    if (this.abierto === k) this.abierto = j;
    this.guardar(menu);
  }

  alternarSubmenu(k: number): void {
    this.abierto = this.abierto === k ? -1 : k;
  }

  agregarHijo(k: number): void {
    const menu = this.copia();
    const hijos = menu[k].hijos || [];
    if (hijos.length >= TOPES.hijos) return;
    menu[k] = { ...menu[k], hijos: [...hijos, { etiqueta: "", url: "" }] };
    this.guardar(menu);
  }

  cambiarHijo(k: number, h: number, campo: "etiqueta" | "url", valor: string): void {
    const menu = this.copia();
    const hijos = (menu[k].hijos || []).slice();
    if (!hijos[h]) return;
    hijos[h] = { ...hijos[h], [campo]: valor };
    menu[k] = { ...menu[k], hijos };
    this.guardar(menu);
  }

  quitarHijo(k: number, h: number): void {
    const menu = this.copia();
    const hijos = (menu[k].hijos || []).slice();
    hijos.splice(h, 1);
    menu[k] = { ...menu[k], hijos };
    this.guardar(menu);
  }

  /** P0-19: un enlace a una sección que no existe no se publica. */
  sinDestino(url: string): boolean {
    return anclaQueNoExiste(url, (this.contenido && this.contenido.bloques) || []);
  }

  // ── Categorías ─────────────────────────────────────────────────────────────────────────────────────────────────

  get modoCategorias(): string {
    return this.datos.menuCategorias || (this.datos.mostrarCategorias === true ? "fila" : "no");
  }

  elegirCategorias(modo: "fila" | "desplegable" | "no"): void {
    this.datos.menuCategorias = modo;
    // El servidor resuelve las categorías solo con `mostrarCategorias`. Con «desplegable», el diseño de siempre las
    // muestra en fila (es lo que sabe hacer).
    this.datos.mostrarCategorias = modo !== "no";
    this.avisar();
  }

  /** ¿Hay un catálogo en el sitio? Sin él, las categorías y el buscador no tienen a dónde llevar. */
  get hayCatalogo(): boolean {
    return ((this.contenido && this.contenido.bloques) || []).some((b: any) => b && b.tipo === "catalogo" && b.visible !== false);
  }

  /** ¿Algún enlace lleva al catálogo? Ahí cuelgan las categorías con «desplegable» (si no, del primero). */
  get enlaceDeCategorias(): string {
    const menu = this.copia();
    const k = menu.findIndex((e) => /catalogo/.test(e.url || ""));
    const e = menu[k >= 0 ? k : 0];
    return e ? e.etiqueta || "el primer enlace" : "";
  }

  // ── Buscador y asesor ──────────────────────────────────────────────────────────────────────────────────────────

  cambiar(campo: "placeholderBuscador" | "asesorTexto", valor: string): void {
    this.datos[campo] = valor;
    this.avisar();
  }

  alternarAsesor(): void {
    this.datos.asesor = this.datos.asesor === "enlace" ? "" : "enlace";
    this.avisar();
  }

  /** ¿Hay un bloque WhatsApp con número? (Si no, el botón usa el celular de la empresa, si es un celular.) */
  get hayWhatsapp(): boolean {
    return ((this.contenido && this.contenido.bloques) || []).some((b: any) => b && b.tipo === "whatsapp" && b.visible !== false && b.datos && b.datos.telefono);
  }

  get conHorario(): boolean {
    const a: any = this.contenido && this.contenido.tienda && (this.contenido.tienda as any).atencion;
    return !!(a && a.horario && a.horario.activo);
  }

  porIndice(k: number): number {
    return k;
  }
}
