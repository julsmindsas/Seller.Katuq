import { HttpErrorResponse } from "@angular/common/http";
import { DomSanitizer, SafeUrl } from "@angular/platform-browser";
import { Subscription } from "rxjs";

import { MediaInfo } from "../models/whatsapp-thread.model";
import { WhatsappInboxService } from "../whatsapp-inbox.service";
import { esRutaDeMedia, mimeSeguro } from "./adjuntos.util";

/** Por qué no se pudo bajar un archivo: 410 ya venció, 404 no está disponible, lo demás se puede reintentar. */
export type MotivoFalloAdjunto = "vencido" | "noDisponible" | "reintentar";

export type EstadoAdjunto =
  | { estado: "cargando" }
  | { estado: "listo"; url: SafeUrl; cruda: string; mime: string }
  | { estado: "error"; motivo: MotivoFalloAdjunto };

export function motivoDeFallo(err: unknown): MotivoFalloAdjunto {
  const status = err instanceof HttpErrorResponse ? err.status : Number((err as any)?.status);
  if (status === 410) return "vencido";
  if (status === 404 || status === 403 || status === 422) return "noDisponible";
  return "reintentar";
}

/**
 * Archivos ya bajados del chat abierto (ruta del archivo → dirección `blob:` local). La crea y la suelta el
 * detalle del chat: al cambiar de chat o al salir, `soltar()` revoca todas las direcciones y sube la
 * generación, así una descarga que llegue tarde (del chat anterior) se descarta y se libera.
 *
 * Solo se marca como segura la dirección que acaba de crear este navegador con el archivo que entregó nuestro
 * servidor, y el `Blob` se crea con un formato de la lista blanca (si no, `application/octet-stream`, que solo
 * se descarga). Angular 14 no deja pasar `blob:` en `[src]` sin marcarla.
 */
export class CacheAdjuntos {
  private readonly mapa = new Map<string, EstadoAdjunto>();
  private readonly enCurso = new Map<string, Subscription>();
  private generacion = 0;

  constructor(private readonly inbox: WhatsappInboxService, private readonly sanitizer: DomSanitizer) {}

  estado(a: MediaInfo | null | undefined): EstadoAdjunto | null {
    return a ? this.mapa.get(a.url) || null : null;
  }

  /** Pide el archivo si no está, no va en camino o falló con algo que se puede reintentar (`forzar`). */
  pedir(a: MediaInfo, forzar = false): void {
    if (!a || !a.disponible || !esRutaDeMedia(a.url)) return;
    const previo = this.mapa.get(a.url);
    if (previo && !(forzar && previo.estado === "error")) return;
    const generacion = this.generacion;
    this.mapa.set(a.url, { estado: "cargando" });
    const sub = this.inbox.descargarAdjunto(a.url).subscribe({
      next: (blob) => {
        this.enCurso.delete(a.url);
        if (generacion !== this.generacion) return;
        if (!(blob instanceof Blob) || blob.size === 0) {
          this.mapa.set(a.url, { estado: "error", motivo: "reintentar" });
          return;
        }
        const mime = a.kind === "document" ? "application/octet-stream" : mimeSeguro(a.kind, blob.type, a.mime);
        const cruda = URL.createObjectURL(new Blob([blob], { type: mime }));
        this.mapa.set(a.url, { estado: "listo", cruda, mime, url: this.sanitizer.bypassSecurityTrustUrl(cruda) });
      },
      error: (err) => {
        this.enCurso.delete(a.url);
        if (generacion !== this.generacion) return;
        this.mapa.set(a.url, { estado: "error", motivo: motivoDeFallo(err) });
      },
    });
    if (!sub.closed) this.enCurso.set(a.url, sub);
  }

  /** Guarda el archivo ya bajado con su nombre (sin abrir pestañas con el blob). */
  guardarComo(a: MediaInfo, nombre: string): boolean {
    const e = this.mapa.get(a.url);
    if (!e || e.estado !== "listo") return false;
    const enlace = document.createElement("a");
    enlace.href = e.cruda;
    enlace.download = nombre || "archivo";
    enlace.rel = "noopener";
    enlace.style.display = "none";
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    return true;
  }

  /** Suelta todo (al cambiar de chat o al salir): revoca las direcciones y corta las descargas en camino. */
  soltar(): void {
    this.generacion += 1;
    this.enCurso.forEach((s) => s.unsubscribe());
    this.enCurso.clear();
    this.mapa.forEach((e) => {
      if (e.estado === "listo") URL.revokeObjectURL(e.cruda);
    });
    this.mapa.clear();
  }
}
