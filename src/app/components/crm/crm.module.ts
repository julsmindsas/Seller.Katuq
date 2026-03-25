import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { CrmRoutingModule } from './crm-routing.module';

// PrimeNG
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
import { PaginatorModule } from 'primeng/paginator';
import { ToolbarModule } from 'primeng/toolbar';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';
import { MenuModule } from 'primeng/menu';
import { TooltipModule } from 'primeng/tooltip';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { MultiSelectModule } from 'primeng/multiselect';
import { ChipsModule } from 'primeng/chips';

// Components
import { CrmDashboardComponent } from './components/crm-dashboard/crm-dashboard.component';
import { ContactListComponent } from './components/contact-list/contact-list.component';
import { ContactDetailComponent } from './components/contact-detail/contact-detail.component';
import { ContactFormComponent } from './components/contact-form/contact-form.component';
import { ActivityTimelineComponent } from './components/activity-timeline/activity-timeline.component';
import { TaskListComponent } from './components/task-list/task-list.component';
import { PipelineViewComponent } from './components/pipeline-view/pipeline-view.component';

// Services
import { MessageService, ConfirmationService } from 'primeng/api';

@NgModule({
  declarations: [
    CrmDashboardComponent,
    ContactListComponent,
    ContactDetailComponent,
    ContactFormComponent,
    ActivityTimelineComponent,
    TaskListComponent,
    PipelineViewComponent,
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
    CrmRoutingModule,
    // PrimeNG
    TableModule, DropdownModule, CalendarModule, TagModule, TabViewModule,
    DialogModule, ToastModule, ConfirmDialogModule, ButtonModule, InputTextModule,
    InputTextareaModule, InputNumberModule, CardModule, PaginatorModule,
    ToolbarModule, BadgeModule, ChipModule, SkeletonModule, MenuModule,
    TooltipModule, OverlayPanelModule, MultiSelectModule, ChipsModule,
  ],
  providers: [MessageService, ConfirmationService],
})
export class CrmModule {}
