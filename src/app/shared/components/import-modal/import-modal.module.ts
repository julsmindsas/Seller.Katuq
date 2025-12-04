import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG Modules
import { DialogModule } from 'primeng/dialog';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { ProgressBarModule } from 'primeng/progressbar';
import { DividerModule } from 'primeng/divider';
import { ChipModule } from 'primeng/chip';
import { AccordionModule } from 'primeng/accordion';

// Shared Import Components Module
import { ImportComponentsModule } from '../import-components/import-components.module';

// Component
import { ImportModalComponent } from './import-modal.component';

@NgModule({
  declarations: [
    ImportModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    // PrimeNG
    DialogModule,
    ButtonModule,
    ToastModule,
    ProgressBarModule,
    DividerModule,
    ChipModule,
    AccordionModule,
    // Shared Import Components
    ImportComponentsModule
  ],
  exports: [
    ImportModalComponent
  ]
})
export class ImportModalModule { }
