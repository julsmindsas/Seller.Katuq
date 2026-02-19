import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModalModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { PasswordModule } from 'primeng/password';
import { InputSwitchModule } from 'primeng/inputswitch';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { CheckboxModule } from 'primeng/checkbox';
import { ProgressBarModule } from 'primeng/progressbar';
import { ToastModule } from 'primeng/toast';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { TimelineModule } from 'primeng/timeline';
import { DialogModule } from 'primeng/dialog';
import { TabViewModule } from 'primeng/tabview';
import { TreeModule } from 'primeng/tree';
import { CalendarModule } from 'primeng/calendar';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SharedModule } from '../../shared/shared.module';

import { IntegrationsComponent } from './integrations.component';
import { IntegrationsListComponent } from './integrations-list.component';
import { IntegrationNotificationsComponent } from './integration-notifications.component';
import { CredentialStrengthIndicatorComponent } from './credential-strength-indicator.component';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationCacheService } from './integration-cache.service';
import { IntegrationManualControlService } from './integration-manual-control.service';

// Siigo Components
import { SiigoConfigComponent } from './siigo-config/siigo-config.component';
import { SiigoMappingComponent } from './siigo-config/siigo-mapping/siigo-mapping.component';

// Shopify Dashboard Components
import { ShopifyDashboardComponent } from './shopify-dashboard/shopify-dashboard.component';
import { SyncLogsComponent } from './shopify-dashboard/sync-logs.component';
import { FieldMappingComponent } from './shopify-dashboard/field-mapping.component';
import { WebhookConfigComponent } from './shopify-dashboard/webhook-config.component';

const routes: Routes = [
  // Vista principal de listado
  { path: '', component: IntegrationsListComponent, pathMatch: 'full' },
  // Alias opcional: /integrations/list
  { path: 'list', redirectTo: '', pathMatch: 'full' },
  // Formulario de configuración / edición
  { path: 'configure', component: IntegrationsComponent },
  // Siigo configuration
  { path: 'siigo', component: SiigoConfigComponent },
  // Shopify Dashboard
  { path: 'shopify', component: ShopifyDashboardComponent },
  { path: 'shopify/logs', component: SyncLogsComponent },
  { path: 'shopify/mapping', component: FieldMappingComponent },
  { path: 'shopify/webhooks', component: WebhookConfigComponent },
  // Fallback: redirigir rutas desconocidas de este módulo al listado
  { path: '**', redirectTo: '' }
];

@NgModule({
  declarations: [
    IntegrationsComponent,
    IntegrationsListComponent,
    IntegrationNotificationsComponent,
    CredentialStrengthIndicatorComponent,
    SiigoConfigComponent,
    SiigoMappingComponent,
    ShopifyDashboardComponent,
    SyncLogsComponent,
    FieldMappingComponent,
    WebhookConfigComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgbModalModule,
    NgbDropdownModule,
    InputTextModule,
    DropdownModule,
    PasswordModule,
    InputSwitchModule,
    ButtonModule,
    CardModule,
    CheckboxModule,
    ProgressBarModule,
    ToastModule,
    TableModule,
    TagModule,
    TimelineModule,
    DialogModule,
    TabViewModule,
    TreeModule,
    CalendarModule,
    TooltipModule,
    ConfirmDialogModule,
    RouterModule.forChild(routes),
    NgbModule,
    SharedModule
  ],
  providers: [
    IntegrationStateService,
    IntegrationCacheService,
    IntegrationManualControlService
  ],
  exports: [
    IntegrationsComponent,
    IntegrationsListComponent
  ]
})
export class IntegrationsModule {}
