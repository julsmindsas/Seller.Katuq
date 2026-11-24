import { Component } from "@angular/core";
import { ToastrService } from "ngx-toastr";
import { SitiosService } from "../../../sitios.service";
import { PanelSitioBase } from "../panel-sitio-base";

/** Una categoría elegida a mano (D-693), como la guarda el servidor (`propias` del módulo `bandas`). */
interface CategoriaPropia {
  nombre: string;
  url: string;
  imagen?: string;
  destacada?: boolean;
}

/**
 * La banda «Categorías» del diseño nuevo (cierre de N2, módulo `bandas` del servidor): su forma y si muestra cuántos
 * productos tiene cada categoría. Sale debajo de los campos de siempre del bloque (título, cuántas, carrusel), solo con el
 * diseño nuevo encendido.
 *
 * Edita en su lugar `bloque.datos.variante` ("" = fotos, "iconos", "tarjetas"), `bloque.datos.mostrarTotal` y
 * `bloque.datos.propias` (D-693: las categorías que el comercio elige a mano, con su foto y su destino, en lugar de las
 * del catálogo). El servidor guarda solo lo que no es lo de siempre. Los nombres y los íconos de las categorías del
 * catálogo están en Tienda › Nombres de categorías.
 */
@Component({
  selector: "app-panel-categorias-bloque",
  templateUrl: "./categorias-bloque-panel.component.html",
  styleUrls: ["./categorias-bloque-panel.component.scss"],
})
export class CategoriasBloquePanelComponent extends PanelSitioBase {
  static readonly MAX_PROPIAS = 8;
  readonly maxPropias = CategoriasBloquePanelComponent.MAX_PROPIAS;
  /** Índice de la categoría cuya foto se está subiendo (-1 = ninguna). */
  subiendo = -1;

  constructor(private service: SitiosService, private toastr: ToastrService) {
    super();
  }

  get datos(): any {
    return (this.bloque && this.bloque.datos) || null;
  }

  get forma(): "" | "iconos" | "tarjetas" {
    const v = this.datos && this.datos.variante;
    return v === "iconos" || v === "tarjetas" ? v : "";
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

  elegirForma(valor: "" | "iconos" | "tarjetas"): void {
    if (!this.datos) return;
    this.datos.variante = valor;
    this.avisar();
  }

  elegirTotal(valor: boolean): void {
    if (!this.datos) return;
    this.datos.mostrarTotal = valor;
    this.avisar();
  }

  // ── Categorías elegidas a mano (D-693) ────────────────────────────────────────────────────────────────────────

  get propias(): CategoriaPropia[] {
    return this.datos && Array.isArray(this.datos.propias) ? this.datos.propias : [];
  }

  /** Con alguna elegida a mano, la banda muestra esas y no las del catálogo. */
  get aMano(): boolean {
    return this.propias.length > 0;
  }

  agregarPropia(): void {
    if (!this.datos || this.propias.length >= this.maxPropias) return;
    this.datos.propias = [...this.propias, { nombre: "", url: "" }];
    this.avisar();
  }

  quitarPropia(i: number): void {
    const lista = [...this.propias];
    lista.splice(i, 1);
    this.datos.propias = lista;
    this.avisar();
  }

  moverPropia(i: number, paso: -1 | 1): void {
    const j = i + paso;
    const lista = [...this.propias];
    if (j < 0 || j >= lista.length) return;
    [lista[i], lista[j]] = [lista[j], lista[i]];
    this.datos.propias = lista;
    this.avisar();
  }

  cambiar(): void {
    this.avisar();
  }

  alternarDestacada(c: CategoriaPropia): void {
    if (c.destacada === true) delete c.destacada;
    else c.destacada = true;
    this.avisar();
  }

  subirFoto(evento: Event, i: number): void {
    const input = evento.target as HTMLInputElement;
    const archivo = input.files && input.files[0];
    // La categoría se toma ANTES de subir: si mientras sube se reordena o se quita otra, la foto llega a la suya.
    const destino = this.propias[i];
    if (!archivo || !destino) return;
    this.subiendo = i;
    this.service.subirImagen(archivo).subscribe({
      next: (res) => {
        this.subiendo = -1;
        input.value = "";
        if (!res || !res.success || !res.url) {
          this.toastr.error((res && res.error) || "No pudimos subir la imagen.");
          return;
        }
        if (!this.propias.includes(destino)) return;
        destino.imagen = res.url;
        this.avisar();
      },
      error: () => {
        this.subiendo = -1;
        input.value = "";
        this.toastr.error("No pudimos subir la imagen.");
      },
    });
  }

  quitarFoto(c: CategoriaPropia): void {
    delete c.imagen;
    this.avisar();
  }

  /** Sin nombre o sin destino, la categoría no sale en la página (el servidor no la guarda al publicar). */
  incompleta(c: CategoriaPropia): boolean {
    return !String(c.nombre || "").trim() || !String(c.url || "").trim();
  }

  porIndice(i: number): number {
    return i;
  }
}
