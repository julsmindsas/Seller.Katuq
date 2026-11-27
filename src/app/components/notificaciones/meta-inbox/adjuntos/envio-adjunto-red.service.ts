import { HttpErrorResponse, HttpEventType } from '@angular/common/http';
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { ToastrService } from 'ngx-toastr';
import { Subject, Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

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
  /** Cuándo se guardó (ms). */
  guardado: number;
}

const MB = 1024 * 1024;
const MAX_RECIENTES_POR_CHAT = 3;
const MAX_CHATS_CON_RECIENTES = 3;
/** Tope de un archivo para guardar su copia local. */
const TOPE_RECIENTE = 8 * MB;
/** Tope de todas las copias locales juntas. */
const TOPE_TOTAL_RECIENTES = 24 * MB;
/** Una copia local vale media hora; después la burbuja muestra la tarjeta «Enviado». */
const VIGENCIA_RECIENTE_MS = 30 * 60 * 1000;
/**
 * Un envío fallido que nadie reintenta ni quita suelta su archivo (hasta 25 MB) a los 15 minutos: el aviso sigue
 * y «Reintentar» pide volver a adjuntarlo.
 */
const VIGENCIA_ARCHIVO_FALLIDO_MS = 15 * 60 * 1000;

/** Quién tiene la sesión abierta (empresa y correo), para no dejarle a otro lo de la sesión anterior. */
function duenoDeSesion(): string {
  try {
    const u = JSON.parse(localStorage.getItem('user') || 'null');
    return u ? `${u.company || ''}|${u.email || ''}` : '';
  } catch {
    return '';
  }
}

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
  /** Desde cuándo está fallido cada envío (ms), para soltar su archivo si nadie lo reintenta. */
  private readonly falloDesde = new Map<string, number>();
  /** Sesión dueña de lo guardado: si cambia (se cerró sesión o entró otra persona), se vacía todo. */
  private dueno = duenoDeSesion();
  private readonly navSub: Subscription;
  /** Revisión de lo vencido (cada minuto, fuera de Angular, solo mientras haya algo guardado). */
  private relojLimpieza: ReturnType<typeof setInterval> | null = null;
  readonly eventos$ = new Subject<EventoEnvioRed>();
  /** Chat que se está mirando: si un envío de otro termina, se avisa con un toast. */
  chatVisible: string | null = null;

  constructor(
    private readonly inbox: MetaInboxService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
    router: Router,
    private readonly zona: NgZone,
  ) {
    // Al cerrar sesión la app va a /login sin recargar: lo de la sesión (envíos y copias) se suelta ahí.
    this.navSub = router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd))
      .subscribe((e) => {
        if (/^\/login(\/|\?|#|$)/.test(e.urlAfterRedirects || e.url || '')) this.vaciar();
      });
  }

  ngOnDestroy(): void {
    this.navSub.unsubscribe();
    this.vaciar();
  }

  /**
   * Revisa lo vencido cada minuto mientras haya copias locales o envíos fallidos. Corre fuera de Angular: no
   * repinta la app; lo que suelte se ve en la siguiente vuelta de la pantalla.
   */
  private programarLimpieza(): void {
    if (this.relojLimpieza || (!this.recientes.size && !this.falloDesde.size)) return;
    this.zona.runOutsideAngular(() => {
      this.relojLimpieza = setInterval(() => this.limpiarVencidos(), 60 * 1000);
    });
  }

  private pararLimpieza(): void {
    if (this.relojLimpieza) clearInterval(this.relojLimpieza);
    this.relojLimpieza = null;
  }

  de(clave: string | null | undefined): EnvioAdjuntoRed | null {
    return clave ? this.envios.get(clave) || null : null;
  }

  enviar(datos: Omit<EnvioAdjuntoRed, 'etapa' | 'progreso' | 'errorClave' | 'quizaEnviado'>): boolean {
    this.limpiarVencidos();
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
    this.falloDesde.delete(clave);
    this.lanzar(clave);
  }

  /** Quita un envío que falló (no hace nada mientras va en camino). */
  quitar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== 'fallo') return;
    this.envios.delete(clave);
    this.falloDesde.delete(clave);
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
    lista.push({ kind: e.kind, bytes: e.archivo.size, archivo: e.archivo, guardado: Date.now() });
    while (lista.length > MAX_RECIENTES_POR_CHAT) lista.shift();
    this.recientes.delete(e.clave);
    this.recientes.set(e.clave, lista);
    // Los chats más viejos salen primero (el Map guarda el orden de llegada).
    while (this.recientes.size > MAX_CHATS_CON_RECIENTES) {
      const primero = this.recientes.keys().next().value as string;
      this.recientes.delete(primero);
    }
    // Y si entre todos pasan del tope, sale lo más viejo (del chat más viejo primero).
    let total = 0;
    this.recientes.forEach((l) => l.forEach((x) => (total += x.bytes)));
    while (total > TOPE_TOTAL_RECIENTES && this.recientes.size) {
      const primero = this.recientes.keys().next().value as string;
      const l = this.recientes.get(primero)!;
      const sale = l.shift();
      if (sale) total -= sale.bytes;
      if (!l.length) this.recientes.delete(primero);
    }
    this.programarLimpieza();
  }

  /**
   * Suelta lo vencido: copias locales de más de media hora, el archivo de un envío fallido que lleva 15 minutos
   * sin reintentarse y, si cambió la sesión, todo.
   */
  private limpiarVencidos(): void {
    const dueno = duenoDeSesion();
    if (dueno !== this.dueno) {
      this.vaciar();
      this.dueno = dueno;
      return;
    }
    const ahora = Date.now();
    this.recientes.forEach((l, clave) => {
      const vigentes = l.filter((x) => ahora - x.guardado < VIGENCIA_RECIENTE_MS);
      if (!vigentes.length) this.recientes.delete(clave);
      else if (vigentes.length !== l.length) this.recientes.set(clave, vigentes);
    });
    this.falloDesde.forEach((desde, clave) => {
      if (ahora - desde < VIGENCIA_ARCHIVO_FALLIDO_MS) return;
      const e = this.envios.get(clave);
      if (e && e.etapa === 'fallo') e.archivo = null;
      this.falloDesde.delete(clave);
    });
    if (!this.recientes.size && !this.falloDesde.size) this.pararLimpieza();
  }

  /** Corta los envíos en camino y suelta envíos y copias locales (al cerrar sesión o cambiar de persona). */
  private vaciar(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs.clear();
    this.envios.clear();
    this.recientes.clear();
    this.falloDesde.clear();
    this.chatVisible = null;
    this.pararLimpieza();
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
    // `voice` para la nota grabada: el servidor revisa que sea un audio que la red acepte (M4A con AAC o WAV) y la
    // guarda como nota de voz; cualquier otro archivo va con `auto` y el servidor decide por la firma.
    form.append('kind', e.voz ? 'voice' : 'auto');
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
            this.falloDesde.set(clave, Date.now());
            this.programarLimpieza();
            this.terminar({ clave, tipo: 'fallo' });
            return;
          }
          if (cuerpo.duplicate === true && cuerpo.enCurso === true) {
            // El primer intento con este id sigue en camino y todavía puede fallar: no se da por entregado. Se
            // relee el chat y, si hace falta, se reintenta con el mismo id (el servidor no lo manda dos veces).
            actual.etapa = 'fallo';
            actual.quizaEnviado = true;
            actual.errorClave = 'notificaciones.redes3.adjuntos.quizaEnviado';
            this.falloDesde.set(clave, Date.now());
            this.programarLimpieza();
            this.terminar({ clave, tipo: 'revisar' });
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
        this.falloDesde.set(clave, Date.now());
        this.programarLimpieza();
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
