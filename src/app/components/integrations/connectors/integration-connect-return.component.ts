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
      <div class="pub-card conexion-regreso__tarjeta">
        <div class="pub-estado pub-estado--info" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 17H7A5 5 0 0 1 7 7h2"></path><path d="M15 7h2a5 5 0 1 1 0 10h-2"></path><path d="M8 12h8"></path>
          </svg>
        </div>
        <p class="pub-lead conexion-regreso__texto" role="status">{{ mensaje }}</p>
      </div>
    </div>
  `,
  // Ventana emergente del regreso: piezas pub-* de las pantallas públicas (D-398), sin el marco.
  styleUrls: ['./integration-connect-return.component.scss'],
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
