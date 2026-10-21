import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { RouterModule } from "@angular/router";
import { TableModule } from "primeng/table";
import { SelectorProductosModule } from "../../sitios/selector-productos/selector-productos.module";
import { CatalogosLinkRoutingModule } from "./catalogos-link-routing.module";
import { CatalogosLinkListaComponent } from "./lista/catalogos-link-lista.component";
import { CatalogoLinkDetalleComponent } from "./detalle/catalogo-link-detalle.component";
import { AlBodyModule } from "../../../shared/directives/al-body.module";
import { FotosUniformesComponent } from "../../productos/fotos-uniformes/fotos-uniformes.component";

/**
 * Catálogos por link en la web (D-416): lo que la app iOS ya hacía con `/v1/catalogos`.
 * Va aparte del módulo de cotizaciones para no engordar su chunk.
 */
@NgModule({
  declarations: [CatalogosLinkListaComponent, CatalogoLinkDetalleComponent],
  // FotosUniformesComponent (standalone): «Uniformar fotos de este catálogo» (TX-37 · 7.12).
  imports: [CommonModule, FormsModule, RouterModule, TableModule, SelectorProductosModule, CatalogosLinkRoutingModule, AlBodyModule, FotosUniformesComponent],
})
export class CatalogosLinkModule {}
