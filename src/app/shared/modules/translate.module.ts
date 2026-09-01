import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    // El único forRoot vive en AppModule. Crear otro aquí generaba dos
    // TranslateService y el selector del encabezado no siempre afectaba login
    // u otros módulos lazy.
    TranslateModule
  ],
  exports: [TranslateModule]
})
export class AppTranslateModule { }
