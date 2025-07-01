import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModalModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { SharedModule } from '../../shared/shared.module';

import { IntegrationsComponent } from './integrations.component';
import { IntegrationsListComponent } from './integrations-list.component';
import { IntegrationNotificationsComponent } from './integration-notifications.component';
import { CredentialStrengthIndicatorComponent } from './credential-strength-indicator.component';
import { IntegrationStateService } from './integration-state.service';
import { IntegrationCacheService } from './integration-cache.service';

const routes: Routes = [
  { path: '', component: IntegrationsListComponent },
  { path: 'configure', component: IntegrationsComponent }
];

@NgModule({
  declarations: [
    IntegrationsComponent,
    IntegrationsListComponent,
    IntegrationNotificationsComponent,
    CredentialStrengthIndicatorComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgbModalModule,
    NgbDropdownModule,
    RouterModule.forChild(routes),
    NgbModule,
    SharedModule
  ],
  providers: [
    IntegrationStateService,
    IntegrationCacheService
  ],
  entryComponents: [
    IntegrationsComponent
  ],
  exports: [
    IntegrationsComponent,
    IntegrationsListComponent
  ]
})
export class IntegrationsModule {}
