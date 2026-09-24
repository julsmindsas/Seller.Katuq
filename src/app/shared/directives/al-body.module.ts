import { NgModule } from "@angular/core";
import { AlBodyDirective } from "./al-body.directive";

/**
 * `appAlBody` en su propio módulo: lo usan el editor de sitios y el selector
 * de productos, que ahora también vive en Marketing (campañas de correo,
 * D-318). Sin arrastrar el SharedModule completo.
 */
@NgModule({
  declarations: [AlBodyDirective],
  exports: [AlBodyDirective],
})
export class AlBodyModule {}
