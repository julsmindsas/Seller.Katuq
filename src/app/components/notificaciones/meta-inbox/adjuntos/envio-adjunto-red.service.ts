import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, OnDestroy } from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';

import { META_CANAL_LABEL, MetaAdjunto } from '../models/meta-thread.model';
import { MetaInboxService } from '../meta-inbox.service';
import { CanalConArchivos, kindDeAdjunto } from './adjuntos-red.util';
import { claveDeErrorArchivoRed, codigoDeError } from './errores-envio-red';

/**
 * Etapas de un envío de archivo por Instagram o Facebook:
 *  - `subiendo`: el archivo va del navegador a Katuq («Subiendo X %»); se puede cancelar.
 *  - `enviando`: Katuq ya lo tiene y lo está mandando a la red; ya no se cancela.
 *  - `fallo`: no salió (o no se sabe); se puede reintentar con el mismo id o quitar.
 */
export type EtapaEnvioRed = 'subiendo' | 'enviando' | 'fallo';

export type KindEnvioRed = 'image' | 'audio' | 'video' | 'document';

export interface EnvioAdjuntoRed {
  /** `canal|hash`: un envío por chat a la vez. */
  clave: string;
  canal: CanalConArchivos;
  hash: string;
  clientMessageId: string;
  /** null si ya no está en memoria: hay que volver a adjuntarlo. */
  archivo: Blob | null;
  nombre: string;
  kind: KindEnvioRed;
  voz: boolean;
  /** Texto que sale como segundo mensaje, después del archivo. */
  texto: string;
  etapa: EtapaEnvioRed;
  progreso: number;
  /** Clave de traducción del error (solo en `fallo`). Acepta el parámetro `canal`. */
  errorClave: string | null;
  /** Se cortó después de subir: puede que sí haya salido. Se refresca el chat antes de reintentar. */
  quizaEnviado: boolean;
}

export interface EventoEnvioRed {
  clave: string;
  tipo: 'listo' | 'fallo' | 'revisar';
  /** El archivo salió pero el texto no: el texto vuelve al cuadro. */
  parcial?: boolean;
  /** El servidor ya lo había enviado antes con el mismo id: no salió otro. */
  duplicado?: boolean;
  texto?: string;
  /** Error HTTP del fallo (para 409 CHAT_CON_DUENO). */
  error?: unknown;
}

/** Archivo enviado en esta sesión que se guarda en memoria para su vista previa (Meta no deja volver a bajarlo). */
interface Reciente {
  kind: KindEnvioRed;
  bytes: number;
  archivo: Blob;
}

const MAX_RECIENTES_POR_CHAT = 3;
const MAX_CHATS_CON_RECIENTES = 10;
const TOPE_RECIENTE = 8 * 1024 * 1024;

/**
 * Envíos de archivos del chat de Instagram y Facebook (bandeja única). Vive en root para que cambiar de chat no
 * corte la subida ni deje una suscripción colgada: al volver, el chat pinta el envío en curso, y si termina
 * mientras se mira otro chat sale un aviso. Un envío por chat a la vez.
 *
 * No usa el `enviando` del texto ni entra en `ocupado`: el sondeo de respaldo y la señal del canal en vivo siguen
 * corriendo. El servidor revisa la ventana de 24 h, el dueño del chat, el tipo y el tamaño, y el envío repetido
 * (`clientMessageId`) antes de mandarlo a Meta; aquí no se decide nada de eso.
 */
@Injectable({ providedIn: 'root' })
export class EnvioAdjuntoRedService implements OnDestroy {
  private readonly envios = new Map<string, EnvioAdjuntoRed>();
  private readonly subs = new Map<string, Subscription>();
  private readonly recientes = new Map<string, Reciente[]>();
  readonly eventos$ = new Subject<EventoEnvioRed>();
  /** Chat que se está mirando: si un envío de otro termina, se avisa con un toast. */
  chatVisible: string | null = null;

  constructor(
    private readonly inbox: MetaInboxService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs.clear();
  }

  de(clave: string | null | undefined): EnvioAdjuntoRed | null {
    return clave ? this.envios.get(clave) || null : null;
  }

  enviar(datos: Omit<EnvioAdjuntoRed, 'etapa' | 'progreso' | 'errorClave' | 'quizaEnviado'>): boolean {
    if (this.envios.has(datos.clave) || !datos.archivo) return false;
    this.envios.set(datos.clave, { ...datos, etapa: 'subiendo', progreso: 0, errorClave: null, quizaEnviado: false });
    this.lanzar(datos.clave);
    return true;
  }

  /** Solo mientras sube: corta la subida (el servidor no recibió el archivo completo) y deja el chat libre. */
  cancelar(clave: string): boolean {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== 'subiendo') return false;
    this.cortar(clave);
    this.envios.delete(clave);
    return true;
  }

  /**
   * Reintenta con el MISMO id: si el primero sí salió, el servidor responde «repetido» y no envía otro. Si el
   * archivo ya no está en memoria, se pide volver a adjuntarlo.
   */
  reintentar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== 'fallo') return;
    if (!e.archivo) {
      e.errorClave = 'notificaciones.redes3.adjuntos.vuelveAdjuntar';
      return;
    }
    e.etapa = 'subiendo';
    e.progreso = 0;
    e.errorClave = null;
    e.quizaEnviado = false;
    this.lanzar(clave);
  }

  /** Quita un envío que falló (no hace nada mientras va en camino). */
  quitar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== 'fallo') return;
    this.envios.delete(clave);
  }

  /**
   * Copia local de un archivo que el asesor envió en esta sesión, para mostrarlo en su burbuja (Meta no deja
   * volver a bajar lo enviado). Se reconoce por el tipo y el tamaño exacto. null si no hay.
   */
  recienteDe(clave: string, a: MetaAdjunto): Blob | null {
    const kind = kindDeAdjunto(a);
    const bytes = Number(a.bytes);
    if (!kind || !Number.isFinite(bytes) || bytes <= 0) return null;
    const lista = this.recientes.get(clave) || [];
    const r = lista.find((x) => x.kind === kind && x.bytes === bytes);
    return r ? r.archivo : null;
  }

  private guardarReciente(e: EnvioAdjuntoRed): void {
    if (!e.archivo || e.archivo.size > TOPE_RECIENTE) return;
    const lista = (this.recientes.get(e.clave) || []).filter((x) => x.bytes !== e.archivo!.size || x.kind !== e.kind);
    lista.push({ kind: e.kind, bytes: e.archivo.size, archivo: e.archivo });
    while (lista.length > MAX_RECIENTES_POR_CHAT) lista.shift();
    this.recientes.delete(e.clave);
    this.recientes.set(e.clave, lista);
    // Los chats más viejos salen primero (el Map guarda el orden de llegada).
    while (this.recientes.size > MAX_CHATS_CON_RECIENTES) {
      const primero = this.recientes.keys().next().value as string;
      this.recientes.delete(primero);
    }
  }

  private cortar(clave: string): void {
    const s = this.subs.get(clave);
    if (s) s.unsubscribe();
    this.subs.delete(clave);
  }

  private lanzar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || !e.archivo) return;
    this.cortar(clave);
    const form = new FormData();
    form.append('clientMessageId', e.clientMessageId);
    form.append('kind', 'auto');
    if (e.texto) form.append('texto', e.texto);
    // El archivo va al final: así el servidor ya tiene los campos cuando empieza a leerlo.
    form.append('file', e.archivo, e.nombre);

    const sub = this.inbox.enviarAdjunto(e.canal, e.hash, form).subscribe({
      next: (ev) => {
        const actual = this.envios.get(clave);
        if (!actual) return;
        if (ev.type === HttpEventType.UploadProgress) {
          const total = ev.total || actual.archivo?.size || 0;
          actual.progreso = total ? Math.min(100, Math.round((100 * ev.loaded) / total)) : actual.progreso;
          if (total && ev.loaded >= total) actual.etapa = 'enviando';
        } else if (ev.type === HttpEventType.Response) {
          this.subs.delete(clave);
          const cuerpo: any = ev.body || {};
          if (cuerpo.success === false) {
            // 200 con motivo (ventana cerrada): no salió nada; se explica y se puede reintentar cuando escriba.
            actual.etapa = 'fallo';
            actual.quizaEnviado = false;
            actual.errorClave = claveDeErrorArchivoRed({ status: 200, error: { code: cuerpo.motivo || '' } });
            this.terminar({ clave, tipo: 'fallo' });
            return;
          }
          this.envios.delete(clave);
          this.guardarReciente(actual);
          this.terminar({
            clave,
            tipo: 'listo',
            parcial: cuerpo.parcial === true,
            duplicado: cuerpo.duplicate === true,
            texto: actual.texto,
          });
        }
      },
      error: (err: unknown) => {
        this.subs.delete(clave);
        const actual = this.envios.get(clave);
        if (!actual) return;
        const http = err instanceof HttpErrorResponse ? err : null;
        const status = http ? http.status : 0;
        const codigo = codigoDeError(err);
        const yaSubio = actual.etapa === 'enviando';
        const incierto = yaSubio && (status === 0 || (status >= 500 && !codigo));
        actual.etapa = 'fallo';
        actual.quizaEnviado = incierto;
        actual.errorClave = incierto ? 'notificaciones.redes3.adjuntos.quizaEnviado' : claveDeErrorArchivoRed(err);
        this.terminar({ clave, tipo: incierto ? 'revisar' : 'fallo', error: err });
      },
    });
    if (!sub.closed) this.subs.set(clave, sub);
  }

  private terminar(ev: EventoEnvioRed): void {
    this.eventos$.next(ev);
    if (ev.clave === this.chatVisible) return;
    // Terminó mientras se miraba otro chat (o ninguno): se avisa aparte.
    const canal = META_CANAL_LABEL[(ev.clave.split('|')[0] as CanalConArchivos) || 'instagram'] || '';
    if (ev.tipo === 'listo') {
      this.toastr.success(this.translate.instant('notificaciones.redes3.adjuntos.enviadoOtroChat', { canal }));
    } else {
      this.toastr.warning(this.translate.instant('notificaciones.redes3.adjuntos.falloOtroChat', { canal }));
    }
  }
}
