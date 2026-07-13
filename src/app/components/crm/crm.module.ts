import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { CrmRoutingModule } from './crm-routing.module';

import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { TabViewModule } from 'primeng/tabview';
import { DialogModule } from 'primeng/dialog';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { InputTextareaModule } from 'primeng/inputtextarea';
import { InputNumberModule } from 'primeng/inputnumber';
import { CardModule } from 'primeng/card';
import { ToolbarModule } from 'primeng/toolbar';
import { TooltipModule } from 'primeng/tooltip';
import { SkeletonModule } from 'primeng/skeleton';
import { BadgeModule } from 'primeng/badge';
import { MenuModule } from 'primeng/menu';
import { DragulaModule } from 'ng2-dragula';
import { InputSwitchModule } from 'primeng/inputswitch';

import { CrmListComponent } from './components/crm-list/crm-list.component';
import { LeadFormModalComponent } from './components/lead-form-modal/lead-form-modal.component';
import { CrmDetailComponent } from './components/crm-detail/crm-detail.component';
import { CrmSeguimientoComponent } from './components/crm-seguimiento/crm-seguimiento.component';

import { MessageService, ConfirmationService } from 'primeng/api';

@NgModule({
  declarations: [CrmListComponent, CrmDetailComponent, CrmSeguimientoComponent],
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule,
    SharedModule, CrmRoutingModule,
    TableModule, DropdownModule, CalendarModule, TagModule, TabViewModule,
    DialogModule, ToastModule, ConfirmDialogModule, ButtonModule,
    InputTextModule, InputTextareaModule, InputNumberModule,
    CardModule, ToolbarModule, TooltipModule, SkeletonModule,
    BadgeModule, MenuModule, DragulaModule, InputSwitchModule,
    LeadFormModalComponent,
  ],
  providers: [MessageService, ConfirmationService],
})
export class CrmModule {}
