import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgbModalModule, NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

import { IntegrationsComponent } from './integrations.component';
import { IntegrationsListComponent } from './integrations-list.component';

const routes: Routes = [
  { path: '', component: IntegrationsListComponent },
  { path: 'configure', component: IntegrationsComponent }
];

@NgModule({
  declarations: [
    IntegrationsComponent,
    IntegrationsListComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgbModalModule,
    NgbDropdownModule,
    RouterModule.forChild(routes)
  ],
  entryComponents: [
    IntegrationsComponent
  ]
})
export class IntegrationsModule {}
