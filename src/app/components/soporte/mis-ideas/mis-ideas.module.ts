import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { MisIdeasRoutingModule } from './mis-ideas-routing.module';
import { MisIdeasComponent } from './mis-ideas.component';
import { MisIdeasMaestroComponent } from './mis-ideas-maestro.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    MisIdeasRoutingModule
  ],
  declarations: [MisIdeasComponent, MisIdeasMaestroComponent]
})
export class MisIdeasModule { }
