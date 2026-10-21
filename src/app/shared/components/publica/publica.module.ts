import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { PublicaMarcoComponent } from './publica-marco.component';
import { TranslateModule } from '@ngx-translate/core';

/** Marco de las pantallas públicas (D-398). Las piezas de estilo están en `_publica.scss`. */
@NgModule({
  imports: [CommonModule, RouterModule, TranslateModule],
  declarations: [PublicaMarcoComponent],
  exports: [PublicaMarcoComponent],
})
export class PublicaModule {}
