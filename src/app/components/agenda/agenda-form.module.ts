import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SharedModule as PrimeSharedModule } from 'primeng/api';
import { CitaFormComponent } from './cita-form/cita-form.component';

/**
 * El formulario "Agendar cita" (D-491) sin las rutas de la Agenda, para usarlo
 * también desde el CRM (y, más adelante, desde la venta asistida).
 */
@NgModule({
  declarations: [CitaFormComponent],
  imports: [CommonModule, FormsModule, DialogModule, MultiSelectModule, PrimeSharedModule],
  exports: [CitaFormComponent],
})
export class AgendaFormModule {}
