import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { PlanesRoutingModule } from './planes-routing.module';
import { PlanesListComponent } from './planes-list/planes-list.component';
import { PlanFormComponent } from './plan-form/plan-form.component';
import { SharedModule } from '../../../shared/shared.module';

// PrimeNG
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputNumberModule } from 'primeng/inputnumber';
import { DialogModule } from 'primeng/dialog';
import { CheckboxModule } from 'primeng/checkbox';
import { CalendarModule } from 'primeng/calendar';
import { ChipsModule } from 'primeng/chips';
import { TagModule } from 'primeng/tag';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { ConfirmDialogModule } from 'primeng/confirmdialog';

@NgModule({
  declarations: [PlanesListComponent, PlanFormComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    SharedModule,
    PlanesRoutingModule,
    // PrimeNG modules
    TableModule,
    ButtonModule,
    InputTextModule,
    InputNumberModule,
    DialogModule,
    CheckboxModule,
    CalendarModule,
    ChipsModule,
    TagModule,
    TooltipModule,
    CardModule,
    InputTextareaModule,
    ConfirmDialogModule
  ]
})
export class PlanesModule {} 