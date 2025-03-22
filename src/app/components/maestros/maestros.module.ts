  import { NgModule } from '@angular/core';
  import { CommonModule } from '@angular/common';
  import { SharedModule } from '../../shared/shared.module';

  import { MaestrosRoutingModule } from './maestros-routing.module';
  import { MaestrosComponent } from './maestros.component';

  @NgModule({
    imports: [
      CommonModule,
      SharedModule,
      MaestrosRoutingModule
    ],
    declarations: [MaestrosComponent]
  })
  export class MaestrosModule { }

