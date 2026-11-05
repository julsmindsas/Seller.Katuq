import { Component } from "@angular/core";
import { PanelSitioBase } from "../panel-sitio-base";
import { CANTIDADES_INICIO, TOPES_CATALOGO_INICIO, cantidadInicio, conMarcador } from "./catalogo-inicio-datos";

/**
 * La sección del catálogo en el inicio del diseño nuevo (módulo `catalogoInicio` del servidor). Sale debajo de los campos
 * de siempre del bloque «Catálogo completo», solo con el diseño nuevo encendido.
 *
 * Con «El catálogo va en su propia página» el inicio deja de ser una banda que solo invita a entrar y pasa a ser una
 * sección: título, las categorías con más productos (enlaces), una rejilla de 4, 8 o 12 productos reales y el botón «Ver
 * los N productos». Aquí se elige cuántos productos y cómo se titula. Edita en su lugar `bloque.datos.inicioCantidad`,
 * `inicioTitulo`, `inicioEtiqueta` e `inicioSubtitulo`; el servidor guarda solo los que traen algo. Nunca toca los
 * productos ni la tienda.
 */
@Component({
  selector: "app-panel-catalogo-inicio",
  templateUrl: "./catalogo-inicio-panel.component.html",
  styleUrls: ["./catalogo-inicio-panel.component.scss"],
})
export class CatalogoInicioPanelComponent extends PanelSitioBase {
  readonly cantidades = CANTIDADES_INICIO;
  readonly topes = TOPES_CATALOGO_INICIO;

  get datos(): any {
    if (!this.bloque) return {};
    if (!this.bloque.datos) this.bloque.datos = {};
    return this.bloque.datos;
  }

  /** ¿El catálogo va en su propia página? Solo entonces el inicio lleva esta sección. */
  get enPagina(): boolean {
    return this.datos.enPagina === true;
  }

  get cantidad(): number {
    return cantidadInicio(this.datos);
  }

  /** Las celdas del dibujo de «así se ve» (una por producto). */
  get celdas(): number[] {
    return Array.from({ length: this.cantidad }, (_, i) => i);
  }

  /** Cuántas filas de 4 ocupa en computador. */
  get filas(): number {
    return Math.ceil(this.cantidad / 4);
  }

  get tituloMarcador(): boolean {
    return conMarcador(this.datos.inicioTitulo) || conMarcador(this.datos.inicioEtiqueta) || conMarcador(this.datos.inicioSubtitulo);
  }

  /** El título con que sale la sección: el escrito aquí, el del bloque o el de la casa. */
  get tituloQueSale(): string {
    return String(this.datos.inicioTitulo || "").trim() || String(this.datos.titulo || "").trim() || "Toda la tienda";
  }

  elegirCantidad(n: number): void {
    this.datos.inicioCantidad = n === 8 ? undefined : n;
    this.avisar();
  }

  cambiarTexto(campo: "inicioTitulo" | "inicioEtiqueta" | "inicioSubtitulo", valor: string): void {
    const maximo = campo === "inicioTitulo" ? this.topes.titulo : campo === "inicioEtiqueta" ? this.topes.etiqueta : this.topes.subtitulo;
    const limpio = String(valor || "").slice(0, maximo);
    if (limpio.trim()) this.datos[campo] = limpio;
    else this.datos[campo] = "";
    this.avisar();
  }

  /** Enciende «El catálogo va en su propia página» desde aquí (es el campo de arriba). */
  encenderEnPagina(): void {
    this.datos.enPagina = true;
    this.avisar();
  }
}
