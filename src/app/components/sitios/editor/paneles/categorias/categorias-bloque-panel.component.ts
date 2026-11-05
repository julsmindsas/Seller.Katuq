import { Component } from "@angular/core";
import { PanelSitioBase } from "../panel-sitio-base";

/**
 * La banda «Categorías» del diseño nuevo (cierre de N2, módulo `bandas` del servidor): su forma y si muestra cuántos
 * productos tiene cada categoría. Sale debajo de los campos de siempre del bloque (título, cuántas, carrusel), solo con el
 * diseño nuevo encendido.
 *
 * Edita en su lugar `bloque.datos.variante` ("" = fotos, "iconos") y `bloque.datos.mostrarTotal`. El servidor guarda solo
 * lo que no es lo de siempre: «Fotos» y «No mostrar» no se guardan. Los nombres y los íconos de cada categoría están en
 * Tienda › Nombres de categorías.
 */
@Component({
  selector: "app-panel-categorias-bloque",
  templateUrl: "./categorias-bloque-panel.component.html",
  styleUrls: ["./categorias-bloque-panel.component.scss"],
})
export class CategoriasBloquePanelComponent extends PanelSitioBase {
  get datos(): any {
    return (this.bloque && this.bloque.datos) || null;
  }

  get forma(): "" | "iconos" {
    return this.datos && this.datos.variante === "iconos" ? "iconos" : "";
  }

  get conTotal(): boolean {
    return !!this.datos && this.datos.mostrarTotal === true;
  }

  /** Cuántas categorías ya tienen su ícono (Tienda › Nombres de categorías). */
  get conIcono(): number {
    const t: any = (this.contenido && (this.contenido as any).tienda) || {};
    const lista = Array.isArray(t.categoriasInfo) ? t.categoriasInfo : [];
    return lista.filter((c: any) => !!c && !!c.icono).length;
  }

  elegirForma(valor: "" | "iconos"): void {
    if (!this.datos) return;
    this.datos.variante = valor;
    this.avisar();
  }

  elegirTotal(valor: boolean): void {
    if (!this.datos) return;
    this.datos.mostrarTotal = valor;
    this.avisar();
  }
}
