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
    <div style="padding:40px;text-align:center;font-family:inherit">
      <p style="font-size:14px;color:#211f3a">{{ mensaje }}</p>
    </div>
  `,
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
