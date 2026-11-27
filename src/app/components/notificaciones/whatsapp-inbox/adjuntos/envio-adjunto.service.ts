import { HttpErrorResponse, HttpEventType } from "@angular/common/http";
import { Injectable, OnDestroy } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { ToastrService } from "ngx-toastr";
import { Subject, Subscription } from "rxjs";

import { MediaKind } from "../models/whatsapp-thread.model";
import { WhatsappInboxService } from "../whatsapp-inbox.service";
import { claveDeErrorChat } from "../errores-envio";

/**
 * Etapas de un envío de archivo:
 *  - `subiendo`: el archivo va del navegador a Katuq («Subiendo X %»); se puede cancelar.
 *  - `enviando`: Katuq ya lo tiene y lo está mandando a WhatsApp; ya no se cancela.
 *  - `fallo`: no salió (o no se sabe); se puede reintentar con el mismo id o quitar.
 */
export type EtapaEnvioAdjunto = "subiendo" | "enviando" | "fallo";

export interface EnvioAdjunto {
  clave: string;
  phoneHash: string;
  lineId: string | null;
  clientMessageId: string;
  archivo: Blob;
  nombre: string;
  kind: MediaKind;
  voz: boolean;
  texto: string;
  durationSec: number | null;
  etapa: EtapaEnvioAdjunto;
  progreso: number;
  /** Clave de traducción del error (solo en `fallo`). */
  errorClave: string | null;
  /** Se cortó después de subir: puede que sí haya salido. Se refresca el chat antes de reintentar. */
  quizaEnviado: boolean;
}

export interface EventoEnvioAdjunto {
  clave: string;
  tipo: "listo" | "fallo" | "revisar";
  /** `voz_pesada`: la nota salió, pero en el celular puede verse como archivo para descargar. */
  aviso?: string | null;
  /** Error HTTP del fallo (para 409 CHAT_CON_DUENO). */
  error?: unknown;
}

/** Errores después de subir que SÍ dicen que el mensaje salió: no se reintenta. */
const SALIO_IGUAL = new Set(["debit_failed_after_send"]);

/**
 * Envíos de archivos del chat de WhatsApp (bandeja única). Vive en root para que cambiar de chat no corte la
 * subida ni deje una suscripción colgada: al volver, el chat pinta el envío en curso, y si termina mientras se
 * mira otro chat sale un aviso. Un envío por chat a la vez.
 *
 * El envío NO usa el `sending` del texto: el sondeo de respaldo y la señal del canal en vivo siguen corriendo.
 * El servidor revisa en orden tipo y tamaño, ventana de 24 h, saldo, dueño y envío repetido (`clientMessageId`)
 * antes de subir a WhatsApp; aquí no se decide nada de eso.
 */
@Injectable({ providedIn: "root" })
export class EnvioAdjuntoService implements OnDestroy {
  private readonly envios = new Map<string, EnvioAdjunto>();
  private readonly subs = new Map<string, Subscription>();
  readonly eventos$ = new Subject<EventoEnvioAdjunto>();
  /** Chat que se está mirando: si un envío de otro termina, se avisa con un toast. */
  chatVisible: string | null = null;

  constructor(
    private readonly inbox: WhatsappInboxService,
    private readonly toastr: ToastrService,
    private readonly translate: TranslateService,
  ) {}

  ngOnDestroy(): void {
    this.subs.forEach((s) => s.unsubscribe());
    this.subs.clear();
  }

  de(clave: string | null | undefined): EnvioAdjunto | null {
    return clave ? this.envios.get(clave) || null : null;
  }

  /** ¿Hay un envío en curso o pendiente de decidir en este chat? */
  ocupado(clave: string | null | undefined): boolean {
    return !!this.de(clave);
  }

  enviar(datos: Omit<EnvioAdjunto, "etapa" | "progreso" | "errorClave" | "quizaEnviado">): boolean {
    if (this.envios.has(datos.clave)) return false;
    this.envios.set(datos.clave, { ...datos, etapa: "subiendo", progreso: 0, errorClave: null, quizaEnviado: false });
    this.lanzar(datos.clave);
    return true;
  }

  /** Solo mientras sube: corta la subida (el servidor no recibió el archivo completo) y deja el chat libre. */
  cancelar(clave: string): boolean {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== "subiendo") return false;
    this.cortar(clave);
    this.envios.delete(clave);
    return true;
  }

  /** Reintenta con el MISMO id: si el primero sí salió, el servidor responde «repetido» y no envía otro. */
  reintentar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== "fallo") return;
    e.etapa = "subiendo";
    e.progreso = 0;
    e.errorClave = null;
    e.quizaEnviado = false;
    this.lanzar(clave);
  }

  /** Quita un envío que falló (no hace nada mientras va en camino). */
  quitar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e || e.etapa !== "fallo") return;
    this.envios.delete(clave);
  }

  private cortar(clave: string): void {
    const s = this.subs.get(clave);
    if (s) s.unsubscribe();
    this.subs.delete(clave);
  }

  private lanzar(clave: string): void {
    const e = this.envios.get(clave);
    if (!e) return;
    this.cortar(clave);
    const form = new FormData();
    form.append("clientMessageId", e.clientMessageId);
    form.append("kind", e.voz ? "voice" : "auto");
    if (e.durationSec && e.durationSec > 0) form.append("durationSec", String(Math.round(e.durationSec)));
    if (e.texto && !e.voz) form.append("text", e.texto);
    // El archivo va al final: así el servidor ya tiene los campos cuando empieza a leerlo.
    form.append("file", e.archivo, e.nombre);

    const sub = this.inbox.enviarAdjunto(e.phoneHash, form, e.lineId).subscribe({
      next: (ev) => {
        const actual = this.envios.get(clave);
        if (!actual) return;
        if (ev.type === HttpEventType.UploadProgress) {
          const total = ev.total || e.archivo.size || 0;
          actual.progreso = total ? Math.min(100, Math.round((100 * ev.loaded) / total)) : actual.progreso;
          if (total && ev.loaded >= total) actual.etapa = "enviando";
        } else if (ev.type === HttpEventType.Response) {
          this.subs.delete(clave);
          this.envios.delete(clave);
          const cuerpo: any = ev.body || {};
          this.terminar({ clave, tipo: "listo", aviso: typeof cuerpo.aviso === "string" ? cuerpo.aviso : null });
        }
      },
      error: (err: unknown) => {
        this.subs.delete(clave);
        const actual = this.envios.get(clave);
        if (!actual) return;
        const http = err instanceof HttpErrorResponse ? err : null;
        const cuerpo: any = http && http.error && typeof http.error === "object" ? http.error : {};
        const codigo = String(cuerpo.code || cuerpo.error || "");
        // Salió, pero falló el cobro: no se ofrece reintentar (sería un segundo mensaje real).
        if (SALIO_IGUAL.has(codigo)) {
          this.envios.delete(clave);
          this.terminar({ clave, tipo: "listo", error: err });
          this.toastr.error(this.translate.instant(claveDeErrorChat(err)));
          return;
        }
        const yaSubio = actual.etapa === "enviando";
        const status = http ? http.status : 0;
        const incierto = yaSubio && (status === 0 || (status >= 500 && !codigo));
        actual.etapa = "fallo";
        actual.quizaEnviado = incierto;
        actual.errorClave = incierto
          ? "notificaciones.wa2.adjuntos.quizaEnviado"
          : claveDeErrorChat(err, "notificaciones.wa2.adjuntos.errores.generico");
        this.terminar({ clave, tipo: incierto ? "revisar" : "fallo", error: err });
      },
    });
    if (!sub.closed) this.subs.set(clave, sub);
  }

  private terminar(ev: EventoEnvioAdjunto): void {
    this.eventos$.next(ev);
    if (ev.clave === this.chatVisible) return;
    // Terminó mientras se miraba otro chat (o ninguno): se avisa aparte.
    if (ev.tipo === "listo" && !ev.error) {
      this.toastr.success(this.translate.instant("notificaciones.wa2.adjuntos.enviadoOtroChat"));
    } else if (ev.tipo !== "listo") {
      this.toastr.warning(this.translate.instant("notificaciones.wa2.adjuntos.falloOtroChat"));
    }
  }
}
