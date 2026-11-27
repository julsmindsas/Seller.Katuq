import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';

import { MetaAdjunto } from '../models/meta-thread.model';
import { esRutaDeMediaRed, kindDeAdjunto, mimeSeguroRed } from './adjuntos-red.util';

/** Por qué no se pudo bajar un archivo: 410 ya venció, 404 no está, lo demás se puede reintentar. */
export type MotivoFalloAdjuntoRed = 'vencido' | 'noDisponible' | 'reintentar';

export type EstadoAdjuntoRed =
  | { estado: 'cargando' }
  | { estado: 'listo'; url: SafeUrl; cruda: string; mime: string }
  | { estado: 'error'; motivo: MotivoFalloAdjuntoRed };

export function motivoDeFalloRed(err: unknown): MotivoFalloAdjuntoRed {
  const status = err instanceof HttpErrorResponse ? err.status : Number((err as any)?.status);
  if (status === 410) return 'vencido';
  if (status === 404 || status === 403 || status === 422) return 'noDisponible';
  return 'reintentar';
}

/**
 * Archivos ya bajados del chat abierto de Instagram o Facebook (ruta del archivo → dirección `blob:` local). La
 * crea y la suelta el detalle del chat: al cambiar de chat o al salir, `soltar()` revoca todas las direcciones y
 * sube la generación, así una descarga que llegue tarde (del chat anterior) se descarta.
 *
 * Solo se marca como segura la dirección que acaba de crear este navegador con el archivo que entregó nuestro
 * servidor (o con el que el asesor acaba de enviar), y el `Blob` se crea con un formato de la lista blanca (si
 * no, `application/octet-stream`, que solo se descarga). Angular 14 no deja pasar `blob:` en `[src]` sin marcarla.
 */
export class CacheAdjuntosRed {
  private readonly mapa = new Map<string, EstadoAdjuntoRed>();
  private readonly enCurso = new Map<string, Subscription>();
  private generacion = 0;

  /**
   * @param descargar pide el archivo con la sesión (el servicio del buzón).
   * @param local archivo que el asesor envió en esta sesión y sigue en memoria (Meta no deja volver a bajar lo
   *   enviado): su vista previa local. null si no hay.
   */
  constructor(
    private readonly descargar: (ruta: string) => Observable<Blob>,
    private readonly sanitizer: DomSanitizer,
    private readonly local: (a: MetaAdjunto) => Blob | null = () => null,
  ) {}

  private clave(a: MetaAdjunto): string | null {
    if (esRutaDeMediaRed(a.url)) return a.url;
    return a.id ? `local:${a.id}` : null;
  }

  estado(a: MetaAdjunto | null | undefined): EstadoAdjuntoRed | null {
    const c = a ? this.clave(a) : null;
    return c ? this.mapa.get(c) || null : null;
  }

  /** ¿Se puede ver o bajar? Con ruta del servidor, o con la copia local de lo que se envió en esta sesión. */
  sePuedePedir(a: MetaAdjunto | null | undefined): boolean {
    if (!a || !kindDeAdjunto(a)) return false;
    if (esRutaDeMediaRed(a.url)) return a.disponible !== false;
    return !!this.clave(a) && !!this.local(a);
  }

  /** Pide el archivo si no está, no va en camino o falló con algo que se puede reintentar (`forzar`). */
  pedir(a: MetaAdjunto, forzar = false): void {
    const kind = kindDeAdjunto(a);
    const clave = this.clave(a);
    if (!kind || !clave || !this.sePuedePedir(a)) return;
    const previo = this.mapa.get(clave);
    if (previo && !(forzar && previo.estado === 'error')) return;

    if (!esRutaDeMediaRed(a.url)) {
      const blob = this.local(a);
      if (blob) this.ponerListo(clave, kind, blob, a.mime);
      return;
    }

    const generacion = this.generacion;
    const ruta = a.url;
    this.mapa.set(clave, { estado: 'cargando' });
    const sub = this.descargar(ruta).subscribe({
      next: (blob) => {
        this.enCurso.delete(clave);
        if (generacion !== this.generacion) return;
        if (!(blob instanceof Blob) || blob.size === 0) {
          this.mapa.set(clave, { estado: 'error', motivo: 'reintentar' });
          return;
        }
        this.ponerListo(clave, kind, blob, a.mime);
      },
      error: (err) => {
        this.enCurso.delete(clave);
        if (generacion !== this.generacion) return;
        this.mapa.set(clave, { estado: 'error', motivo: motivoDeFalloRed(err) });
      },
    });
    if (!sub.closed) this.enCurso.set(clave, sub);
  }

  private ponerListo(clave: string, kind: ReturnType<typeof kindDeAdjunto>, blob: Blob, mimeDicho?: string | null): void {
    const mime = !kind || kind === 'document' ? 'application/octet-stream' : mimeSeguroRed(kind, blob.type, mimeDicho);
    const cruda = URL.createObjectURL(new Blob([blob], { type: mime }));
    this.mapa.set(clave, { estado: 'listo', cruda, mime, url: this.sanitizer.bypassSecurityTrustUrl(cruda) });
  }

  /** Guarda el archivo ya bajado con su nombre (sin abrir pestañas con el blob). */
  guardarComo(a: MetaAdjunto, nombre: string): boolean {
    const e = this.estado(a);
    if (!e || e.estado !== 'listo') return false;
    const enlace = document.createElement('a');
    enlace.href = e.cruda;
    enlace.download = nombre || 'archivo';
    enlace.rel = 'noopener';
    enlace.style.display = 'none';
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
      if (e.estado === 'listo') URL.revokeObjectURL(e.cruda);
    });
    this.mapa.clear();
  }
}
