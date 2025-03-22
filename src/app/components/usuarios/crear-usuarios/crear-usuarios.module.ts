import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { NgxDatatableModule } from '@swimlane/ngx-datatable';
import { CrearUsuariosRoutingModule } from './crear-usuarios-rounting.module';
import { CrearUsuariosComponent } from './crear-usuarios.component';



@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    CrearUsuariosRoutingModule,
    NgxDatatableModule
    
  ],
  declarations: [CrearUsuariosComponent]
})
export class CrearUsuariosModule { }
