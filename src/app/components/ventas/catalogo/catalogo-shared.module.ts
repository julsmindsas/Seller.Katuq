import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { GalleryModule } from "@ks89/angular-modal-gallery";
import { NgSelectModule } from "@ng-select/ng-select";
import { NgxStarRatingModule } from "ngx-star-rating";
import { SharedModule } from "../../../shared/shared.module";
import { ConfProductToCartComponent } from "./conf-product-to-cart/conf-product-to-cart.component";

/**
 * Módulo compartido de catálogo (spec 008 — T-19, decisión D-CLAR/Opción A).
 *
 * Declara y EXPORTA `ConfProductToCartComponent` (el popup de configuración de
 * producto) para que pueda reusarse tanto desde `VentasModule` (venta asistida)
 * como desde `CotizacionesModule` sin duplicar la UI ni acoplar cotizaciones a
 * todo el módulo de ventas (Art. VI — no acoplar UI a flujo/proveedor).
 *
 * El popup es autocontenido: su template solo depende de SharedModule
 * (feather-icons / katuq-intelligence / NgbModule / Forms) + GalleryModule
 * (ks-carousel), NgSelectModule (ng-select) y NgxStarRatingModule. Todos los
 * servicios que inyecta son `providedIn: 'root'`, por lo que funciona al abrirse
 * con `NgbModal.open()` desde cualquier inyector.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    GalleryModule,
    NgSelectModule,
    NgxStarRatingModule,
  ],
  declarations: [ConfProductToCartComponent],
  exports: [ConfProductToCartComponent],
})
export class CatalogoSharedModule {}
