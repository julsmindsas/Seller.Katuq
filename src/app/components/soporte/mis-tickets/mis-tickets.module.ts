import { NgModule, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SharedModule } from '../../../shared/shared.module';
import { MisTicketsRoutingModule } from './mis-tickets-routing.module';
import { MisTicketsComponent } from './mis-tickets.component';

@NgModule({
  imports: [
    CommonModule,
    SharedModule,
    MisTicketsRoutingModule
  ],
  declarations: [ MisTicketsComponent]
})
export class MisTicketsModule {
    
 }
