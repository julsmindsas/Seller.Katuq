import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoDespachosComponent } from './en-vivo-despachos.component';
import { EnVivoFueraDelPlanComponent } from './fuera-del-plan/fuera-del-plan.component';
import { EnVivoGrupoDespachoComponent } from './grupo-despacho/grupo-despacho.component';

/**
 * Piezas del plan de despachos de Opttia (D-410): la tarjeta de un grupo (`grupo-despacho`) y lo
 * que no entra al plan (`fuera-del-plan`). Desde D-421 las usa la hoja "Ajustar" de la tarjeta de
 * Opttia en la escena (`propuestas/`), que es la que aprueba. La vista completa "Despachos" ya no
 * está en el selector de En vivo; se borra cuando la fase 1 de D-421 esté verificada en producción.
 */
@NgModule({
  imports: [CommonModule, FormsModule, EnVivoCompartidoModule],
  declarations: [EnVivoDespachosComponent, EnVivoGrupoDespachoComponent, EnVivoFueraDelPlanComponent],
  exports: [EnVivoDespachosComponent, EnVivoGrupoDespachoComponent, EnVivoFueraDelPlanComponent],
})
export class EnVivoDespachosModule {}
