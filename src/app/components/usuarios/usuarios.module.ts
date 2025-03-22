import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { UsuariosRoutingModule } from './usuarios-routing.module';
import { UsuariosComponent } from './usuarios.component';
import { CrearUsuariosComponent } from './crear-usuarios/crear-usuarios.component';
import { TableModule } from 'primeng/table';
import { EditProfileComponent } from './edit-profile/edit-profile.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    UsuariosRoutingModule,
    NgxDatatableModule,
    TableModule
  ],
  declarations: [UsuariosComponent, EditProfileComponent]
})
export class UsuariosModule { }
