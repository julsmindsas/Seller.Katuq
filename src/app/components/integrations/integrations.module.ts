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

// WhatsApp (Kapso) Components
import { WhatsappKapsoConfigComponent } from './whatsapp-kapso-config/whatsapp-kapso-config.component';

const routes: Routes = [
  // Vista principal de listado
  { path: '', component: IntegrationsListComponent, pathMatch: 'full' },
  // Alias opcional: /integrations/list
  { path: 'list', redirectTo: '', pathMatch: 'full' },
  // Formulario de configuración / edición
  { path: 'configure', component: IntegrationsComponent },
  // Siigo configuration
  { path: 'siigo', component: SiigoConfigComponent },
  // Dashboard genérico por proveedor (lazy). DEBE ir antes del catch-all '**'.
  // Ej: /integrations/osmosis/dashboard, /integrations/shopify/dashboard
  // El componente lee :provider y resuelve config con provider-registry.
  {
    path: ':provider/dashboard',
    loadChildren: () =>
      import('../provider-dashboard/provider-dashboard.module').then(
        (m) => m.ProviderDashboardModule,
      ),
    data: { title: 'Dashboard de integración' },
  },
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
    WhatsappKapsoConfigComponent
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
    IntegrationsListComponent,
    WhatsappKapsoConfigComponent
  ]
})
export class IntegrationsModule {}
