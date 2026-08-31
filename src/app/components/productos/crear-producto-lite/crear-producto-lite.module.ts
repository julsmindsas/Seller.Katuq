import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { ReactiveFormsModule } from "@angular/forms";

import { SharedModule } from "../../../shared/shared.module";
import { CrearProductoLiteRoutingModule } from "./crear-producto-lite-routing.module";
import { CrearProductoLiteComponent } from "./crear-producto-lite.component";

/**
 * NO se importa HttpClientModule directamente, y hay que entender por qué antes
 * de tocar estos imports.
 *
 * Declararlo en un módulo lazy hace que Angular registre en ESE injector un
 * `HTTP_INTERCEPTORS` propio (el de XSRF) que TAPA el del root — los
 * multi-provider no se fusionan entre injectores. Lo que se resuelva desde el
 * injector lazy recibe un HttpClient que nunca pasa por `HttpInterceptor2`, así
 * que sus peticiones salen sin `Authorization` y el backend responde 401. Es
 * exactamente lo que rompió el importador de clientes (D-251).
 *
 * `SharedModule` SÍ importa HttpClientModule, así que entra por la puerta de
 * atrás. Se acepta porque hace falta para `app-katuqintelligence` (K.A.I.), que
 * solo SharedModule declara y exporta, y porque acá no dispara el bug:
 *
 *  - Este módulo no declara `providers` propios.
 *  - Ningún componente de acá inyecta `HttpClient` directamente.
 *  - Todos los servicios que se usan —`MaestroService`, `ImagenService`,
 *    `LoaderService`, `KatuqintelligenceService` y `SubscriptionService`, estos
 *    dos últimos los que inyecta el componente de KAI— son `providedIn: 'root'`,
 *    o sea que se instancian en el injector raíz con el HttpClient del root.
 *
 * Es el mismo arreglo que ya usa `crear-productos` (ProductosModule) en
 * producción. Si algún día se agrega acá un servicio en `providers` o un
 * componente que inyecte `HttpClient`, vuelve el 401: en ese caso hay que sacar
 * `KatuqIntelligenceComponent` a su propio módulo sin HttpClientModule.
 */
@NgModule({
  declarations: [CrearProductoLiteComponent],
  imports: [CommonModule, ReactiveFormsModule, SharedModule, CrearProductoLiteRoutingModule],
})
export class CrearProductoLiteModule {}
