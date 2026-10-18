import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { MultiSelectModule } from 'primeng/multiselect';
import { SidebarModule } from 'primeng/sidebar';
import { SharedModule as PrimeSharedModule } from 'primeng/api';

import { AgendaGuard } from './agenda.guard';
import { AgendaPageComponent } from './pagina/agenda-page.component';
import { AgendaConfigComponent } from './config/agenda-config.component';
import { CitaPanelComponent } from './cita-panel/cita-panel.component';
import { AgendaFormModule } from './agenda-form.module';

const routes: Routes = [
  { path: '', component: AgendaPageComponent, canActivate: [AgendaGuard], data: { title: 'Agenda' } },
  { path: 'configuracion', component: AgendaConfigComponent, canActivate: [AgendaGuard], data: { title: 'Agenda' } },
];

/** Agenda de servicios (D-488, openspec/changes/servicios-y-agenda). */
@NgModule({
  declarations: [AgendaPageComponent, AgendaConfigComponent, CitaPanelComponent],
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    DialogModule,
    MultiSelectModule,
    SidebarModule,
    PrimeSharedModule,
    AgendaFormModule,
  ],
})
export class AgendaModule {}
