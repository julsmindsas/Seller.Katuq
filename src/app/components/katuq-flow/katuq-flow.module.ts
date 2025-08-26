import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

// Routing
import { KatuqFlowRoutingModule } from './katuq-flow-routing.module';

// Shared Module
import { SharedModule } from '../../shared/shared.module';

// PrimeNG Modules
import { TableModule } from 'primeng/table';
import { DropdownModule } from 'primeng/dropdown';
import { CalendarModule } from 'primeng/calendar';
import { TagModule } from 'primeng/tag';
import { ToastModule } from 'primeng/toast';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { AccordionModule } from 'primeng/accordion';
import { SplitButtonModule } from 'primeng/splitbutton';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { PaginatorModule } from 'primeng/paginator';
import { ToolbarModule } from 'primeng/toolbar';
import { MenuModule } from 'primeng/menu';
import { OverlayPanelModule } from 'primeng/overlaypanel';
import { BadgeModule } from 'primeng/badge';
import { ChipModule } from 'primeng/chip';
import { SkeletonModule } from 'primeng/skeleton';

// PrimeNG Services
import { MessageService, ConfirmationService } from 'primeng/api';

// Components
import { LeadsListComponent } from './components/leads-list/leads-list.component';

// Services
import { KatuqFlowService } from './services/katuq-flow.service';

@NgModule({
  declarations: [
    LeadsListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,

    // Routing
    KatuqFlowRoutingModule,

    // Shared
    SharedModule,

    // PrimeNG
    TableModule,
    DropdownModule,
    CalendarModule,
    TagModule,
    ToastModule,
    ConfirmDialogModule,
    AccordionModule,
    SplitButtonModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ProgressSpinnerModule,
    PaginatorModule,
    ToolbarModule,
    MenuModule,
    OverlayPanelModule,
    BadgeModule,
    ChipModule,
    SkeletonModule
  ],
  providers: [
    KatuqFlowService,
    MessageService,
    ConfirmationService
  ],
  exports: [
    LeadsListComponent
  ]
})
export class KatuqFlowModule { }
