import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EnVivoCompartidoModule } from '../compartido/en-vivo-compartido.module';
import { EnVivoDespachosComponent } from './en-vivo-despachos.component';
import { EnVivoFueraDelPlanComponent } from './fuera-del-plan/fuera-del-plan.component';
import { EnVivoGrupoDespachoComponent } from './grupo-despacho/grupo-despacho.component';

/**
 * Vista "Despachos" de En vivo (D-410): el plan de despachos de Opttia para ajustar y aprobar.
 * Módulo aparte para que el resto de En vivo siga sin escribir nada: esta es la única vista que
 * llama a una ruta que escribe, y solo cuando alguien toca Aprobar.
 */
@NgModule({
  imports: [CommonModule, FormsModule, EnVivoCompartidoModule],
  declarations: [EnVivoDespachosComponent, EnVivoGrupoDespachoComponent, EnVivoFueraDelPlanComponent],
  exports: [EnVivoDespachosComponent],
})
export class EnVivoDespachosModule {}
