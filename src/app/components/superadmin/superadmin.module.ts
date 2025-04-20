import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
// Importar módulos de PrimeNG
import { AccordionModule } from 'primeng/accordion';
import { TooltipModule } from 'primeng/tooltip';
import { DropdownModule } from 'primeng/dropdown';

import { SuperadminClientesComponent } from './superadmin-clientes/superadmin-clientes.component';
import { SuperadminRoutingModule } from './superadmin-routing.module';
import { UserService } from '../../services/user.service';
import { AnalyticsService } from '../../services/analytics.service';

// Podrías importar aquí módulos compartidos si los necesitas (ej: SharedModule)

@NgModule({
  declarations: [
    SuperadminClientesComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterModule,
    SuperadminRoutingModule,
    // Módulos PrimeNG
    AccordionModule,
    TooltipModule,
    DropdownModule
    // Importar SharedModule si es necesario
  ],
  providers: [
    UserService,
    AnalyticsService
  ],
  exports: [
    SuperadminClientesComponent
  ]
})
export class SuperadminModule { }
