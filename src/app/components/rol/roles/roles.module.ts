import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { NgbModalModule } from '@ng-bootstrap/ng-bootstrap';
import { RolesComponent } from './roles.component';
import { PickListModule } from 'primeng/picklist';

@NgModule({
  declarations: [RolesComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    NgbModalModule,
    PickListModule
  ],
  exports: [RolesComponent]
})
export class RolesModule { }
