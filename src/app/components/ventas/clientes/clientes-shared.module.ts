import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { SharedModule } from "../../../shared/shared.module";
import { CrearClienteModalComponent } from "./crear-cliente-modal/crear-cliente-modal.component";

/**
 * Módulo compartido de clientes (spec 008 — D-CLIENTE-COTIZACION).
 *
 * Declara y EXPORTA `CrearClienteModalComponent` (crear/editar cliente) para que
 * pueda reusarse tanto desde `VentasModule` como desde `CotizacionesModule` sin
 * duplicar la UI ni acoplar cotizaciones a todo el módulo de ventas (Art. VI —
 * no acoplar UI a flujo/proveedor). Mismo patrón que `CatalogoSharedModule`.
 *
 * El modal es autocontenido: su template depende de SharedModule (translate /
 * NgbModule / Forms) + PrimeNG (Dropdown/InputText/Button). Todos los servicios
 * que inyecta son `providedIn: 'root'`, por lo que funciona al abrirse con
 * `NgbModal.open()` desde cualquier inyector.
 */
@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
  ],
  declarations: [CrearClienteModalComponent],
  exports: [CrearClienteModalComponent],
})
export class ClientesSharedModule {}
