import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms'; // Importar FormsModule para ngModel

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
    FormsModule, // Añadir FormsModule aquí
    SuperadminRoutingModule
    // Importar SharedModule si es necesario
  ],
  providers: [
    UserService,
    AnalyticsService
  ]
})
export class SuperadminModule { }
