import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChangePasswordComponent } from './change-password.component';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslateModule } from '@ngx-translate/core';
import { PublicaModule } from '../../shared/components/publica/publica.module';

@NgModule({
  declarations: [ChangePasswordComponent],
  imports: [
    CommonModule,
    PublicaModule,
    ReactiveFormsModule,
    TranslateModule // Importar el módulo de traducción
  ],
  exports: [ChangePasswordComponent]
})
export class ChangePasswordModule { }
