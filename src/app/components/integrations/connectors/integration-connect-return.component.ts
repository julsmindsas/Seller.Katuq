import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

import {
  MENSAJE_CONEXION,
  MensajeConexion,
  PARAM_CONEXION_PENDIENTE,
  getConnectorConfig,
} from './connector-registry';

/**
 * Página de regreso genérica de las conexiones por ventana emergente (D-437),
 * sacada de `MetaOauthReturnComponent`.
 *
 * Vive en la ventana emergente: toma los datos del regreso, se los pasa a la
 * ventana que la abrió por `postMessage` (solo a este mismo origen) y se cierra.
 * Aquí no se confirma nada: el servidor verifica con el proveedor.
 *
 * Si el navegador cortó el vínculo con la ventana de origen, vuelve a
 * `/integrations` con los mismos datos para que la tarjeta confirme allá.
 */
@Component({
  selector: 'app-integration-connect-return',
  template: `
    <div class="conexion-regreso">
      <p class="conexion-regreso__texto">{{ mensaje }}</p>
    </div>
  `,
  styles: [`
    .conexion-regreso { padding: 40px 16px; text-align: center; font-family: inherit; }
    .conexion-regreso__texto { margin: 0; font-size: 14px; line-height: 1.5; color: #211F3A; letter-spacing: normal; }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class IntegrationConnectReturnComponent implements OnInit {
  mensaje = 'Terminando la conexión…';

  constructor(private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    const provider = this.route.snapshot.paramMap.get('provider') || '';
    const config = getConnectorConfig(provider);
    if (!config) {
      this.mensaje = 'No reconocemos esta conexión. Cierra esta ventana y vuelve a intentarlo desde Integraciones.';
      return;
    }

    const params: Record<string, string> = {};
    const query = this.route.snapshot.queryParamMap;
    for (const clave of query.keys) {
      const valor = query.get(clave);
      if (valor !== null) params[clave] = valor;
    }
    const exitoso = config.esExitoso(params);

    if (window.opener && !window.opener.closed) {
      const aviso: MensajeConexion = { tipo: MENSAJE_CONEXION, provider, params };
      window.opener.postMessage(aviso, window.location.origin);
      this.mensaje = exitoso
        ? 'Listo. Puedes cerrar esta ventana.'
        : 'No se completó la conexión. Puedes cerrar esta ventana.';
      // Solo da tiempo a leer el mensaje antes de cerrar la ventana emergente.
      setTimeout(() => window.close(), 800);
      return;
    }

    this.router.navigate(['/integrations'], {
      queryParams: { ...params, [PARAM_CONEXION_PENDIENTE]: provider },
      replaceUrl: true,
    });
  }
}
