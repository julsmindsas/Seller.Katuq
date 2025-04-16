import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { ProspectManagerComponent } from './prospect-manager.component';
import { ProspectManagerRoutingModule } from './prospect-manager-routing.module';
import { SharedModule } from '../../shared/shared.module';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { TranslateModule } from '@ngx-translate/core';
import { TreeTableModule } from 'primeng/treetable';

@NgModule({
  declarations: [
    ProspectManagerComponent
  ],
  imports: [
    CommonModule,
    RouterModule,
    ProspectManagerRoutingModule,
    SharedModule,
    FormsModule,
    ReactiveFormsModule,
    TranslateModule,
    TreeTableModule,
    NgbModule,

  ]
})
export class ProspectManagerModule { } 