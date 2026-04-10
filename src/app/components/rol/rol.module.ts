import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { RolRoutingModule } from './rol-routing.module';
import { RolComponent } from './rol.component';
import { RolesModule } from './roles/roles.module';
import { TableModule } from 'primeng/table';
import { InputTextModule } from 'primeng/inputtext';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    RolesModule,
    RolRoutingModule,
    NgxDatatableModule,
    TableModule,
    InputTextModule
  ],
  declarations: [RolComponent]
})
export class RolModule { }

