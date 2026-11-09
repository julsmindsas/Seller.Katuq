import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule } from "@angular/router";
import { FormsModule, ReactiveFormsModule } from "@angular/forms";
import { DropdownModule } from "primeng/dropdown";
import { InputTextModule } from "primeng/inputtext";
import { ButtonModule } from "primeng/button";
import { TabViewModule } from "primeng/tabview";
import { InputTextareaModule } from "primeng/inputtextarea";
import { SharedModule } from "../../../shared/shared.module";
import { CrearClienteModalComponent } from "./crear-cliente-modal/crear-cliente-modal.component";
import { ClientesDuplicadosComponent } from "./duplicados/clientes-duplicados.component";

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
    RouterModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    DropdownModule,
    InputTextModule,
    ButtonModule,
    // D-406: pestañas Contacto/Entrega/Facturación/Notas y notas del cliente
    TabViewModule,
    InputTextareaModule,
  ],
  // Ticket 1462 (D-667): «Posibles duplicados» vive aquí para que la lista de Clientes lo use sin acoplarse a más.
  declarations: [CrearClienteModalComponent, ClientesDuplicadosComponent],
  exports: [CrearClienteModalComponent, ClientesDuplicadosComponent],
})
export class ClientesSharedModule {}
