import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { KatuqCommerceContextService } from '../../../shared/services/security/katuq-commerce-context.service';
import { OpcionesCanal, SalidaCanal } from './en-vivo.modelos';
import { EnVivoService } from './en-vivo.service';
import { ConexionEnVivo } from './en-vivo-conexion';

/**
 * Canal en vivo de la pantalla (diseño 5): lee el SSE del backend con `fetch` +
 * `getReader()` y los encabezados de `KatuqCommerceContext` (mismo molde que
 * `OpttiaChatService`). NUNCA `EventSource`: no manda `Authorization` y recibiría 401.
 *
 * `abrir()` devuelve un Observable FRÍO: cada suscripción abre su propia conexión y
 * al desuscribirse se cierra el lector y se sueltan los temporizadores. La lógica de la
 * conexión vive en `ConexionEnVivo` (`en-vivo-conexion.ts`):
 *
 * - Reconexión con espera creciente 1, 2, 5, 10, 20 y 30 s, con azar.
 * - `reconectar` del servidor: espera lo que diga `esperaMs` (`vida_maxima` 0, `medianoche` 500 ms,
 *   `apagado` 1 s, `error` 5 s). Con `error` y `apagado` el servidor se reinició: se muestra
 *   "reconectando" y la foto siguiente llega con `trasCorte` ("Te pusimos al día").
 * - Descarta ids de evento repetidos (últimos 300).
 * - Vigila la conexión: sin ningún byte (ni latido) por 60 s, o más de 31 min de vida,
 *   la corta y reconecta.
 * - Respaldo a sondeo de foto cada 30 s cuando el servidor manda `modo: sondeo` o
 *   cuando el stream falla 3 veces seguidas con red; mientras tanto sigue intentando
 *   volver al stream. La foto del sondeo va por `EnVivoService` (BaseService).
 * - Sin acceso (rol sin el menú, 401 o 403): lo avisa y termina, sin reintentar.
 * - Con la pestaña oculta más de 5 minutos se pausa; al volver se reconecta.
 *
 * Solo lectura: no escribe nada, ni siquiera en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class EnVivoCanalService {
  constructor(
    private readonly zona: NgZone,
    private readonly contexto: KatuqCommerceContextService,
    private readonly http: EnVivoService
  ) {}

  abrir(opciones: OpcionesCanal): Observable<SalidaCanal> {
    return new Observable<SalidaCanal>((suscriptor) => {
      const conexion = new ConexionEnVivo({
        opciones,
        urlBase: environment.urlApi,
        zona: this.zona,
        sesion: () => this.contexto.resolve(),
        foto: () => (opciones.vista === 'katuq' ? this.http.fotoGlobal() : this.http.foto(opciones.empresa)),
        // Hacia la pantalla se entra siempre dentro de la zona de Angular.
        emitir: (salida) => this.zona.run(() => suscriptor.next(salida)),
        terminar: () => this.zona.run(() => suscriptor.complete()),
      });
      conexion.iniciar();
      return () => conexion.detener();
    });
  }
}
