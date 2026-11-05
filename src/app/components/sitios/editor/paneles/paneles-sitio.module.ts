import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule } from "@angular/forms";
import { SelectorProductosModule } from "../../selector-productos/selector-productos.module";
import { AlBodyModule } from "../../../../shared/directives/al-body.module";
import { PanelSitioComponent } from "./panel-sitio.component";
import { PanelPortadaComponent } from "./portada/panel-portada.component";
import { AtencionPanelComponent } from "./atencion/atencion-panel.component";
import { BarrasAnuncioPanelComponent } from "./barras/barras-anuncio-panel.component";
import { BarrasEncabezadoPanelComponent } from "./barras/barras-encabezado-panel.component";
import { FichasPanelComponent } from "./fichas/fichas-panel.component";
import { TarjetaSolucionPanelComponent } from "./tarjeta-solucion/tarjeta-solucion-panel.component";
import { VitrinaPanelComponent } from "./vitrina/vitrina-panel.component";

/**
 * Paneles del diseño nuevo del editor de sitios (PLAN-V2 T03). Cada panel nuevo se declara aquí (o se importa, si es
 * `standalone`) y se registra en `registro.ts`; el editor los monta con `<app-panel-sitio>`. Trae los formularios, el
 * selector de productos y `appAlBody` para que los paneles no tengan que importar nada más.
 *
 * Las líneas de `declarations` de cada panel las aplica el orquestador al integrar su tanda.
 */
@NgModule({
  imports: [CommonModule, FormsModule, SelectorProductosModule, AlBodyModule],
  declarations: [
    PanelSitioComponent,
    AtencionPanelComponent,
    BarrasEncabezadoPanelComponent,
    BarrasAnuncioPanelComponent,
    PanelPortadaComponent,
    FichasPanelComponent,
    TarjetaSolucionPanelComponent,
    VitrinaPanelComponent,
  ],
  // PLAN-V2 T14: la tarjeta «solución» es un panel de ELEMENTO (va dentro de cada tarjeta), así que el editor lo usa
  // directo con su selector y no por el registro de bloques.
  exports: [PanelSitioComponent, TarjetaSolucionPanelComponent],
})
export class PanelesSitioModule {}
