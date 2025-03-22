import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { RolesComponent } from './roles.component';
import { PickListModule } from 'primeng/picklist';

@NgModule({
  declarations: [RolesComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    PickListModule
  ],
  exports: [RolesComponent]
})
export class RolesModule { }
