import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/**
 * Página de retorno del diálogo de Meta.
 *
 * Vive en una ventana emergente: toma el código de autorización de la URL, se
 * lo pasa a la ventana que la abrió y se cierra. El token NUNCA se maneja aquí
 * — el intercambio lo hace el backend.
 */
@Component({
  selector: 'app-meta-oauth-return',
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
  styleUrls: ['./meta-oauth-return.component.scss'],
})
export class MetaOauthReturnComponent implements OnInit {
  mensaje = 'Conectando con Meta…';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    const code = this.route.snapshot.queryParamMap.get('code');
    const error = this.route.snapshot.queryParamMap.get('error');

    if (window.opener) {
      window.opener.postMessage(
        { tipo: 'meta_oauth', code: code || null, error: error || null },
        window.location.origin,
      );
      this.mensaje = code
        ? 'Listo. Puedes cerrar esta ventana.'
        : 'No se completó la conexión. Puedes cerrar esta ventana.';
      setTimeout(() => window.close(), 800);
      return;
    }

    this.mensaje = code
      ? 'Conexión autorizada. Vuelve a la pestaña de Katuq.'
      : 'No se completó la conexión con Meta.';
  }
}
