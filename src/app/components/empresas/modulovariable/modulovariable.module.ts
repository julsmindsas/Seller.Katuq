import { NgModule } from '@angular/core';

import { CentrotrabajosComponent } from './produccion/centrotrabajos/centrotrabajos.component';
import { ModuloVariableRoutingModule } from './modulovariable-routing.module';
import { SharedModule } from 'src/app/shared/shared.module';
import { CommonModule } from '@angular/common';
import { ModuloVariableComponent } from './modulovariable.component';
import { ProcesosComponent } from './produccion/procesos/procesos.component';
import { DropshippingConfigComponent } from './dropshipping/dropshipping-config.component';
import { CamposPersonalizadosComponent } from './campos-personalizados/campos-personalizados.component';
import { OrganizationChartModule } from 'primeng/organizationchart';
import { PickListModule } from 'primeng/picklist';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { CheckboxModule } from 'primeng/checkbox';
import { InputSwitchModule } from 'primeng/inputswitch';
@NgModule({
    imports: [
        ModuloVariableRoutingModule,
        OrganizationChartModule,
        CommonModule,
        PickListModule,
        SharedModule,
        ReactiveFormsModule,
        FormsModule,
        CardModule,
        ButtonModule,
        InputTextModule,
        InputNumberModule,
        CheckboxModule,
        InputSwitchModule],
    exports: [
        CentrotrabajosComponent,
        ModuloVariableComponent],
    declarations: [
        CentrotrabajosComponent,
        ModuloVariableComponent,
        ProcesosComponent,
        DropshippingConfigComponent,
        CamposPersonalizadosComponent
    ],
    providers: [],
})
export class ModulosVariablesModule { }
