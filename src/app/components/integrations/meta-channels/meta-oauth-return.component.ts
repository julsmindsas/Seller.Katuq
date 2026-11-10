import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

/** Canal del mismo origen por el que la página de retorno avisa a la pestaña de Katuq cuando no tiene ventana de origen. */
export const CANAL_RETORNO_OAUTH = 'katuq_meta_oauth';

/**
 * El `state` que el servidor firmó para el intento de conexión de TikTok. La pestaña de Katuq lo guarda aquí
 * antes de abrir la ventana: así la página de retorno (mismo origen) reconoce que el regreso es de TikTok,
 * porque ese `state` no lleva ningún prefijo que lo diga.
 */
export const CLAVE_STATE_TIKTOK = 'katuq_tiktok_state';

/**
 * Página de retorno del diálogo de Meta (y, con `state=tiktok`, de TikTok, D-709).
 *
 * Vive en una ventana emergente: toma el código de autorización de la URL, se
 * lo pasa a la ventana que la abrió y se cierra. El token NUNCA se maneja aquí
 * — el intercambio lo hace el backend.
 *
 * TikTok devuelve el código como `auth_code` o como `code` según el producto; se aceptan los dos. Además, la
 * página de TikTok puede cortar el vínculo con la ventana que la abrió (su política de apertura): sin
 * `window.opener`, el código le llega a la pestaña de Katuq por un canal del mismo origen.
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
    const parametros = this.route.snapshot.queryParamMap;
    const state = parametros.get('state');
    const code = parametros.get('code') || parametros.get('auth_code');
    const error = parametros.get('error');
    const red = this.esRetornoDeTiktok(state, parametros.has('auth_code')) ? 'TikTok' : 'Meta';
    this.mensaje = `Conectando con ${red}…`;

    if (window.opener) {
      window.opener.postMessage(
        { tipo: 'meta_oauth', code: code || null, error: error || null, state: state || null },
        window.location.origin,
      );
      this.mensaje = code
        ? 'Listo. Puedes cerrar esta ventana.'
        : 'No se completó la conexión. Puedes cerrar esta ventana.';
      setTimeout(() => window.close(), 800);
      return;
    }

    // Sin ventana de origen: solo TikTok tiene aquí un camino alterno (la pestaña de Katuq escucha el canal).
    if (red === 'TikTok' && code && this.entregarPorCanal({ tipo: 'meta_oauth', code, error: error || null, state })) {
      this.mensaje = 'Listo. Puedes cerrar esta ventana.';
      setTimeout(() => window.close(), 800);
      return;
    }

    this.mensaje = code
      ? 'Conexión autorizada. Vuelve a la pestaña de Katuq.'
      : `No se completó la conexión con ${red}.`;
  }

  /**
   * ¿El regreso es del intento de TikTok? Sí si su `state` es el que la pestaña de Katuq guardó, si viene
   * con el prefijo `tiktok` o si el código llega como `auth_code` (así lo llama TikTok).
   */
  private esRetornoDeTiktok(state: string | null, traeAuthCode: boolean): boolean {
    if (traeAuthCode) return true;
    if (!state) return false;
    if (state.startsWith('tiktok')) return true;
    try {
      return state === localStorage.getItem(CLAVE_STATE_TIKTOK);
    } catch {
      return false;
    }
  }

  /** Entrega el resultado a la pestaña de Katuq por un canal del mismo origen. Falso si el navegador no lo permite. */
  private entregarPorCanal(datos: unknown): boolean {
    try {
      if (typeof BroadcastChannel === 'undefined') return false;
      const canal = new BroadcastChannel(CANAL_RETORNO_OAUTH);
      canal.postMessage(datos);
      canal.close();
      return true;
    } catch {
      return false;
    }
  }
}
