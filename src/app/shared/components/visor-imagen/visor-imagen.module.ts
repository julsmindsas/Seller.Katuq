import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';
import { VisorImagenComponent } from './visor-imagen.component';

/**
 * Visor de imágenes compartido (zoom, giro, varias fotos). Reemplaza los
 * visores copiados en despachos y producción para que el arreglo de tamaño
 * del ticket 1153 viva en un solo lugar.
 *
 * Solo importa `TranslateModule` (sin forRoot/forChild): el TranslateService
 * es el único de AppModule, igual que en `AppTranslateModule`.
 */
@NgModule({
  declarations: [VisorImagenComponent],
  imports: [CommonModule, TranslateModule],
  exports: [VisorImagenComponent],
})
export class VisorImagenModule {}
