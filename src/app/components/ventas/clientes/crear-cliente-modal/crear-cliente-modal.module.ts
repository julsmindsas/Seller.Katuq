import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../../../shared/shared.module';

// PrimeNG used in the template
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { ButtonModule } from 'primeng/button';

import { CrearClienteModalComponent } from './crear-cliente-modal.component';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    NgbModalModule,
    SharedModule,
    InputTextModule,
    DropdownModule,
    ButtonModule,
  ],
  declarations: [
    CrearClienteModalComponent,
  ],
  exports: [
    CrearClienteModalComponent,
  ],
})
export class CrearClienteModalModule {}
