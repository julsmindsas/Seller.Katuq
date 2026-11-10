import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { environment } from 'src/environments/environment';
import { BaseService } from 'src/app/shared/services/base.service';
import {
  MetaCanal,
  MetaConexiones,
  MetaErrorServidor,
  MetaHilo,
  MetaImagenAdjunta,
  MetaMensaje,
  MetaPerfilContacto,
  MetaVentana,
  MetaVentanaEstado,
} from './models/meta-thread.model';

const VENTANA_SIN_DATOS: MetaVentana = { abierta: false, minutosRestantes: 0, expiraEn: null };

/**
 * Lleva la ventana de TikTok (D-709: `estado`, `restantes`, `venceEn`) a la forma que usa el resto de la
 * pantalla (`abierta`, `minutosRestantes`, `expiraEn`) sin perder los datos propios de TikTok. La de
 * Instagram y Facebook ya viene en esa forma y pasa tal cual.
 *
 * Sin mensajes que enviar (`restantes` en 0 fuera de la ventana abierta) cuenta como cerrada: el servidor
 * rechazaría el envío igual, y así el botón Enviar ya sale desactivado.
 */
export function normalizarVentana(cruda: any): MetaVentana {
  if (!cruda || typeof cruda !== 'object') return { ...VENTANA_SIN_DATOS };
  if (typeof cruda.estado !== 'string') return cruda as MetaVentana;

  const estadoServidor = cruda.estado as MetaVentanaEstado;
  const restantes = typeof cruda.restantes === 'number' ? cruda.restantes : null;
  const venceEn = typeof cruda.venceEn === 'string' && cruda.venceEn ? cruda.venceEn : null;
  const sinMensajes = estadoServidor !== 'abierta' && restantes === 0;
  const estado: MetaVentanaEstado = sinMensajes ? 'cerrada' : estadoServidor;
  const ms = venceEn ? Date.parse(venceEn) - Date.now() : NaN;

  return {
    abierta: estado !== 'cerrada',
    minutosRestantes: Number.isFinite(ms) ? Math.max(0, Math.ceil(ms / 60000)) : 0,
    expiraEn: venceEn,
    estado,
    restantes,
    venceEn,
  };
}

/** TikTok llega como `{estado, cuenta}`; el resto de la pantalla lee `cuentaNombre`, como Instagram y Facebook. */
function normalizarConexiones(datos: any): MetaConexiones | null {
  if (!datos || typeof datos !== 'object') return null;
  const t = datos.tiktok;
  if (!t || typeof t !== 'object') return datos as MetaConexiones;
  return {
    ...datos,
    tiktok: {
      estado: t.estado || 'sin_conectar',
      cuentaNombre: t.cuentaNombre ?? t.cuenta ?? null,
      cuentaId: t.cuentaId ?? null,
      conectadoEn: t.conectadoEn ?? null,
      motivo: t.motivo ?? null,
    },
  } as MetaConexiones;
}

/** Código y mensaje con que el servidor rechazó una petición (`400 {code, message}`), si los trae. */
function errorDelServidor(err: any): MetaErrorServidor {
  const cuerpo = err && err.error && typeof err.error === 'object' ? err.error : {};
  const fuente =
    typeof cuerpo.code === 'string' || typeof cuerpo.message === 'string'
      ? cuerpo
      : cuerpo.data && typeof cuerpo.data === 'object'
        ? cuerpo.data
        : {};
  return {
    code: typeof fuente.code === 'string' ? fuente.code : undefined,
    message: typeof fuente.message === 'string' && fuente.message.trim() ? fuente.message : undefined,
    parcial: fuente.parcial === true ? true : undefined,
  };
}

/**
 * Servicio de los buzones de Meta.
 *
 * Extiende BaseService para que el interceptor adjunte auth y `company`
 * (regla del proyecto: nunca HttpClient directo en componentes).
 *
 * Endpoints (backend `routers/meta.js`):
 *   GET    /v1/meta/connections
 *   POST   /v1/meta/connections/:canal
 *   DELETE /v1/meta/connections/:canal
 *   GET    /v1/meta/conversations/:canal
 *   GET    /v1/meta/conversations/:canal/:hash
 *   GET    /v1/meta/conversations/:canal/:hash/perfil
 *   POST   /v1/meta/conversations/:canal/:hash/vincular
 *   DELETE /v1/meta/conversations/:canal/:hash/vincular
 *   POST   /v1/meta/conversations/:canal/:hash/reply
 *
 * TikTok (D-709), detrás de la bandera `tiktokMensajes`, usa los mismos y además:
 *   GET    /v1/meta/connections/tiktok/autorizar?redirectUri=   → {url, state} de la autorización de TikTok
 *   GET    {mediaUrl}   imagen que escribió el cliente: ruta del propio servidor que pide la sesión (blob)
 */
@Injectable({ providedIn: 'root' })
export class MetaInboxService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  // ─── Conexiones ────────────────────────────────────────────────────────

  obtenerConexiones(): Observable<MetaConexiones | null> {
    return this.get<any>('/v1/meta/connections').pipe(
      map((r) => (r && r.data ? normalizarConexiones(r.data) : null)),
      catchError(() => of(null)),
    );
  }

  /** Completa la conexión con el código que devuelve el diálogo de Meta. */
  conectar(
    canal: MetaCanal,
    code: string,
    redirectUri?: string,
  ): Observable<MetaConexiones | null> {
    return this.post<any>(`/v1/meta/connections/${canal}`, {
      code,
      redirectUri,
    }).pipe(
      map((r) => (r && r.data ? normalizarConexiones(r.data) : null)),
      catchError(() => of(null)),
    );
  }

  desconectar(canal: MetaCanal): Observable<MetaConexiones | null> {
    return this.delete<any>(`/v1/meta/connections/${canal}`).pipe(
      map((r) => (r && r.data ? normalizarConexiones(r.data) : null)),
      catchError(() => of(null)),
    );
  }

  /**
   * TikTok (D-709): el servidor arma la dirección de autorización (la app y sus llaves son suyas) y el
   * front solo abre esa dirección en la ventana emergente. Devuelve también el `state` firmado: hay que
   * guardarlo y mandarlo de vuelta al conectar, que es como el servidor sabe que el código es de esta
   * empresa y de este intento. Sin `url`, trae en `error` el motivo del servidor (p. ej. TikTok sin
   * configurar, `503`) para mostrarlo tal cual.
   */
  autorizarTiktok(
    redirectUri: string,
  ): Observable<{ url: string | null; state: string | null; error?: MetaErrorServidor }> {
    return this.get<any>(
      `/v1/meta/connections/tiktok/autorizar?redirectUri=${encodeURIComponent(redirectUri)}`,
    ).pipe(
      map((r) => {
        const datos = r && r.data ? r.data : r;
        const url = datos && datos.url;
        if (typeof url !== 'string' || !url) return { url: null, state: null };
        return { url, state: typeof datos.state === 'string' && datos.state ? datos.state : null };
      }),
      catchError((err) => of({ url: null, state: null, error: errorDelServidor(err) })),
    );
  }

  /**
   * TikTok (D-709): completa la conexión con el código de la autorización (y el `state` que devolvió
   * `autorizarTiktok`). Si el servidor rechaza la cuenta (`400 TIKTOK_CUENTA_NO_APTA` con su `message` en
   * palabras sencillas) el mensaje vuelve en `error` para mostrarlo tal cual. Sin `conexiones` pero con
   * `ok`, hay que volver a pedir el estado.
   */
  conectarTiktok(
    code: string,
    redirectUri: string,
    state?: string | null,
  ): Observable<{ ok: boolean; conexiones: MetaConexiones | null; error?: MetaErrorServidor }> {
    const cuerpo: { code: string; redirectUri: string; state?: string } = { code, redirectUri };
    if (state) cuerpo.state = state;
    return this.post<any>('/v1/meta/connections/tiktok', cuerpo).pipe(
      map((r) => ({
        ok: Boolean(r) && r.success !== false,
        conexiones: r && r.data ? normalizarConexiones(r.data) : null,
      })),
      catchError((err) => of({ ok: false, conexiones: null, error: errorDelServidor(err) })),
    );
  }

  // ─── Conversaciones ────────────────────────────────────────────────────

  listarHilos(canal: MetaCanal, dias = 90): Observable<MetaHilo[]> {
    return this.get<any>(`/v1/meta/conversations/${canal}?dias=${dias}`).pipe(
      map((r) =>
        r && r.data && r.data.items
          ? (r.data.items as MetaHilo[]).map((h) => ({ ...h, ventana: normalizarVentana(h.ventana) }))
          : [],
      ),
      catchError(() => of([])),
    );
  }

  mensajesDeHilo(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<{ items: MetaMensaje[]; ventana: MetaVentana; permiteImagen?: boolean }> {
    return this.get<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}`,
    ).pipe(
      map((r) =>
        r && r.data
          ? {
              ...r.data,
              items: Array.isArray(r.data.items) ? r.data.items : [],
              ventana: normalizarVentana(r.data.ventana),
            }
          : { items: [], ventana: { ...VENTANA_SIN_DATOS } },
      ),
      catchError(() =>
        of({
          items: [] as MetaMensaje[],
          ventana: { ...VENTANA_SIN_DATOS },
        }),
      ),
    );
  }

  /**
   * Imagen que escribió un cliente de TikTok. `mediaUrl` es una ruta relativa del propio servidor, no una
   * dirección pública: se pide con la sesión (el interceptor adjunta la autorización) y llega como blob;
   * un `<img src>` directo daría 401. Null si no se pudo traer.
   */
  imagenEntrante(ruta: string): Observable<Blob | null> {
    return this.http.get(`${environment.urlApi}${ruta}`, { responseType: 'blob' }).pipe(
      map((blob) => blob || null),
      catchError(() => of(null)),
    );
  }

  // ─── Panel de contacto y vinculación ───────────────────────────────────

  perfilDeHilo(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.get<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/perfil`,
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  vincularCliente(
    canal: MetaCanal,
    identidadHash: string,
    clienteId: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.post<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/vincular`,
      { clienteId },
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  desvincularCliente(
    canal: MetaCanal,
    identidadHash: string,
  ): Observable<MetaPerfilContacto | null> {
    return this.delete<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/vincular`,
    ).pipe(
      map((r) => (r && r.data ? (r.data as MetaPerfilContacto) : null)),
      catchError(() => of(null)),
    );
  }

  // ─── Envío ─────────────────────────────────────────────────────────────

  /**
   * Responde un hilo. El backend valida la ventana ANTES de llamar a Meta, así
   * que un `success:false` con motivo `ventana_cerrada` es una respuesta
   * normal, no un error de red.
   *
   * TikTok (D-709): el cuerpo es JSON, `{texto?, imagen?: {base64, mime, nombre}}`, con al menos uno de los
   * dos. Con los dos, el servidor manda dos mensajes (la imagen primero). Rechaza con un HTTP 4xx o 5xx
   * `{code, message}` cuyo `message` ya viene en palabras sencillas: `TIKTOK_VENTANA_CERRADA` es la
   * ventana cerrada y cualquier otro `TIKTOK_*` es un rechazo (cuenta que hay que reconectar, cupo que no
   * alcanza para los dos mensajes, TikTok que no aceptó…); en todos el mensaje vuelve en `mensaje`.
   * `parcial` avisa que la imagen salió y el texto no.
   */
  responder(
    canal: MetaCanal,
    identidadHash: string,
    texto: string,
    imagen?: MetaImagenAdjunta | null,
  ): Observable<{ enviado: boolean; motivo?: string; mensaje?: string; parcial?: boolean }> {
    const cuerpo: { texto?: string; imagen?: { base64: string; mime: string; nombre: string } } = {};
    if (texto) cuerpo.texto = texto;
    if (imagen) cuerpo.imagen = { base64: imagen.base64, mime: imagen.mime, nombre: imagen.nombre };

    return this.post<any>(
      `/v1/meta/conversations/${canal}/${encodeURIComponent(identidadHash)}/reply`,
      cuerpo,
    ).pipe(
      map((r) => ({
        enviado: Boolean(r && r.success),
        motivo: r && r.motivo ? r.motivo : undefined,
      })),
      catchError((err) => {
        const { code, message, parcial } = errorDelServidor(err);
        if (code === 'TIKTOK_VENTANA_CERRADA') {
          return of({ enviado: false, motivo: 'ventana_cerrada', mensaje: message });
        }
        if (code && code.startsWith('TIKTOK_')) {
          return of({ enviado: false, motivo: 'rechazado_por_meta', mensaje: message, parcial });
        }
        return of({ enviado: false, motivo: 'error_red' });
      }),
    );
  }
}
