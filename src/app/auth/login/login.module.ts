import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { NgbModule } from "@ng-bootstrap/ng-bootstrap";
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { SharedModule } from '../../shared/shared.module';
import { LoginRoutingModule } from './login-routing.module';
import { LoginComponent } from './login.component';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule } from '@angular/common/http';
import { CodigoCorreoModule } from '../../shared/components/codigo-correo/codigo-correo.module';


@NgModule({
  declarations:[
    LoginComponent
  ],
  imports: [
    BrowserModule,
    CommonModule,
    SharedModule,
    HttpClientModule,
    NgbModule,
    FormsModule,
    ReactiveFormsModule,
    CommonModule,
    FormsModule,
    NgbModule,
    LoginRoutingModule,
    CodigoCorreoModule
  ]
})
export class LoginModule { }
