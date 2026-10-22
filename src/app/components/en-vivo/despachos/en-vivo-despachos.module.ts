import { NgModule } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoFueraDelPlanComponent } from './fuera-del-plan/fuera-del-plan.component';
import { EnVivoGrupoDespachoComponent } from './grupo-despacho/grupo-despacho.component';

/**
 * Piezas del plan de despachos de Opttia (D-410): la tarjeta de un grupo (`grupo-despacho`) y lo
 * que no entra al plan (`fuera-del-plan`). Desde D-422 las usa la hoja "Ajustar" de la tarjeta de
 * Opttia en la escena (`propuestas/`), que es la que aprueba. La vista completa "Despachos" se
 * borró con la tarea 7.5 de D-422.
 */
@NgModule({
  imports: [TranslateModule, CommonModule, FormsModule, EnVivoCompartidoModule],
  declarations: [EnVivoGrupoDespachoComponent, EnVivoFueraDelPlanComponent],
  exports: [EnVivoGrupoDespachoComponent, EnVivoFueraDelPlanComponent],
})
export class EnVivoDespachosModule {}
