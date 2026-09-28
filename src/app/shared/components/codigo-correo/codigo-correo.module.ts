import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CodigoCorreoComponent } from './codigo-correo.component';

/** La pantalla del código que confirma el correo (D-323): registro e inicio de sesión. */
@NgModule({
  declarations: [CodigoCorreoComponent],
  imports: [CommonModule, FormsModule],
  exports: [CodigoCorreoComponent],
})
export class CodigoCorreoModule {}
