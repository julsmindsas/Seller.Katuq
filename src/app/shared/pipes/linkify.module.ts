import { NgModule } from '@angular/core';
import { LinkifyPipe } from './linkify.pipe';

/**
 * Módulo mínimo que declara y exporta {@link LinkifyPipe} para reusarlo sin
 * conflicto de declaración (un pipe solo puede declararse en un NgModule).
 * Lo importan tanto `CotizacionesModule` como `CotizacionPublicaModule` sin
 * inflar el bundle del landing público con el `SharedModule` completo.
 */
@NgModule({
  declarations: [LinkifyPipe],
  exports: [LinkifyPipe],
})
export class LinkifyModule {}
