import { Injectable, NgZone } from '@angular/core';

import { DatosRegistroMeta } from './messaging.models';

/** Lo que devuelve la ventana de Meta al terminar. El servidor lo comprueba: no es confiable. */
export interface ResultadoRegistroMeta {
  code: string;
  wabaId: string;
  /** Al compartir el número del celular, Meta puede no decir cuál fue: el servidor lo busca en la cuenta. */
  phoneNumberId: string | null;
}

/** Por qué no terminó la conexión, para decirlo sin jerga. */
export type MotivoRegistroMeta = 'cancelado' | 'sin_codigo' | 'sin_numero' | 'error_meta' | 'sdk';

export class RegistroMetaError extends Error {
  constructor(public readonly motivo: MotivoRegistroMeta, mensaje: string) {
    super(mensaje);
  }
}

declare global {
  interface Window {
    FB?: any;
    fbAsyncInit?: () => void;
  }
}

const URL_SDK = 'https://connect.facebook.net/es_LA/sdk.js';
const ID_SCRIPT = 'facebook-jssdk';
const TIPO_EVENTO = 'WA_EMBEDDED_SIGNUP';
const FIN_OK = ['FINISH', 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING'];

/**
 * Registro insertado de WhatsApp de Meta (D-704). Carga el SDK de Facebook solo
 * cuando alguien pide conectar un número (no en el arranque de la app), abre la
 * ventana oficial y junta las dos piezas que devuelve Meta: el código de un solo
 * uso (`FB.login`) y los ids del número y la cuenta (evento `WA_EMBEDDED_SIGNUP`).
 *
 * El código vence a los 30 segundos: quien llama debe mandarlo al servidor de
 * inmediato. Nada de esto se guarda en el navegador.
 */
@Injectable({ providedIn: 'root' })
export class MetaEmbeddedSignupService {
  private sdk: Promise<void> | null = null;
  private appIdIniciado: string | null = null;

  constructor(private readonly zone: NgZone) {}

  /**
   * Abre la ventana de Meta. Debe llamarse directo desde el clic: los
   * navegadores bloquean la ventana si se abre después de una espera larga.
   */
  async iniciar(datos: DatosRegistroMeta): Promise<ResultadoRegistroMeta> {
    await this.cargarSdk(datos);
    return new Promise<ResultadoRegistroMeta>((resolver, rechazar) => {
      let ids: { wabaId: string; phoneNumberId: string | null } | null = null;
      let codigo: string | null = null;
      let terminado = false;

      const cerrar = (accion: () => void) => {
        if (terminado) return;
        terminado = true;
        window.removeEventListener('message', escucha);
        this.zone.run(accion);
      };
      const intentarResolver = () => {
        if (codigo && ids) cerrar(() => resolver({ code: codigo as string, ...(ids as { wabaId: string; phoneNumberId: string | null }) }));
      };

      const escucha = (e: MessageEvent) => {
        if (typeof e.origin !== 'string' || !/(^|\.)facebook\.com$/.test(new URL(e.origin).hostname)) return;
        let msg: any;
        try {
          msg = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        } catch {
          return;
        }
        if (!msg || msg.type !== TIPO_EVENTO) return;
        if (FIN_OK.includes(msg.event)) {
          const d = msg.data || {};
          const delCelular = msg.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING';
          if (!d.waba_id || (!d.phone_number_id && !delCelular)) {
            cerrar(() => rechazar(new RegistroMetaError('sin_numero', 'La conexión terminó sin escoger un número.')));
            return;
          }
          ids = { wabaId: String(d.waba_id), phoneNumberId: d.phone_number_id ? String(d.phone_number_id) : null };
          intentarResolver();
        } else if (msg.event === 'FINISH_ONLY_WABA') {
          cerrar(() => rechazar(new RegistroMetaError('sin_numero', 'La conexión terminó sin escoger un número.')));
        } else if (msg.event === 'CANCEL') {
          cerrar(() => rechazar(new RegistroMetaError('cancelado', 'Cerraste la ventana de Meta antes de terminar.')));
        } else if (msg.event === 'ERROR') {
          cerrar(() => rechazar(new RegistroMetaError('error_meta', 'Meta no pudo terminar la conexión.')));
        }
      };
      window.addEventListener('message', escucha);

      const extras: Record<string, unknown> = { setup: {}, sessionInfoVersion: '3' };
      if (datos.featureType) extras['featureType'] = datos.featureType;

      window.FB.login(
        (respuesta: any) => {
          const code = respuesta && respuesta.authResponse && respuesta.authResponse.code;
          if (!code) {
            // Sin código: la ventana se cerró sin pulsar «Terminar».
            cerrar(() => rechazar(new RegistroMetaError(ids ? 'sin_codigo' : 'cancelado', 'Cerraste la ventana de Meta antes de terminar.')));
            return;
          }
          codigo = String(code);
          intentarResolver();
          // El evento de los ids llega antes que la respuesta; si no llegó, no va a llegar.
          setTimeout(() => {
            if (!ids) cerrar(() => rechazar(new RegistroMetaError('sin_numero', 'Meta no devolvió el número conectado.')));
          }, 4000);
        },
        {
          config_id: datos.configId,
          response_type: 'code',
          override_default_response_type: true,
          extras,
        },
      );
    });
  }

  private cargarSdk(datos: DatosRegistroMeta): Promise<void> {
    const iniciar = () => {
      if (this.appIdIniciado !== datos.appId) {
        window.FB.init({ appId: datos.appId, autoLogAppEvents: false, xfbml: false, version: datos.graphVersion });
        this.appIdIniciado = datos.appId;
      }
    };
    if (window.FB) {
      iniciar();
      return Promise.resolve();
    }
    if (!this.sdk) {
      this.sdk = new Promise<void>((resolver, rechazar) => {
        window.fbAsyncInit = () => {
          iniciar();
          resolver();
        };
        if (document.getElementById(ID_SCRIPT)) return;
        const script = document.createElement('script');
        script.id = ID_SCRIPT;
        script.src = URL_SDK;
        script.async = true;
        script.defer = true;
        script.crossOrigin = 'anonymous';
        script.onerror = () => {
          this.sdk = null;
          rechazar(new RegistroMetaError('sdk', 'No pudimos abrir la ventana de Meta. Revisa tu conexión o el bloqueador de anuncios.'));
        };
        document.body.appendChild(script);
      });
    }
    return this.sdk;
  }
}
