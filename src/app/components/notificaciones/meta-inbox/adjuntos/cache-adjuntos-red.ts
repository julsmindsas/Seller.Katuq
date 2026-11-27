import { HttpErrorResponse } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, Subscription } from 'rxjs';

import { MetaAdjunto } from '../models/meta-thread.model';
import { esRutaDeMediaRed, kindDeAdjunto, mimeSeguroRed } from './adjuntos-red.util';

/**
 * Por qué no se pudo bajar un archivo (códigos de GET /v1/meta/conversations/:canal/:hash/media/:docId):
 * 410 MEDIA_VENCIDO ya venció; 413 MEDIA_MUY_PESADO pasa de 25 MB y no se trae; 404 no está y 403 (FUERA_DE_ALCANCE
 * o FEATURE_DISABLED) no es para esta persona; lo demás (502 MEDIA_NO_DISPONIBLE, 500, 503) se puede reintentar.
 */
export type MotivoFalloAdjuntoRed = 'vencido' | 'pesado' | 'noDisponible' | 'reintentar';

export type EstadoAdjuntoRed =
  | { estado: 'cargando' }
  | { estado: 'listo'; url: SafeUrl; cruda: string; mime: string }
  | { estado: 'error'; motivo: MotivoFalloAdjuntoRed };

export function motivoDeFalloRed(err: unknown): MotivoFalloAdjuntoRed {
  const status = err instanceof HttpErrorResponse ? err.status : Number((err as any)?.status);
  if (status === 410) return 'vencido';
  if (status === 413) return 'pesado';
  if (status === 404 || status === 403 || status === 422) return 'noDisponible';
  return 'reintentar';
}

/**
 * Descargas a la vez por chat. El servidor deja 2 por empresa (y 3 por proceso) y responde 503 `MEDIA_OCUPADO`
 * a las demás: así un chat con varias fotos a la vista no se las gana a sí mismo.
 */
export const MAX_DESCARGAS_A_LA_VEZ_RED = 2;
/** Esperas antes de volver a pedir un archivo que recibió 503 (servidor ocupado o sin poder revisar). */
export const ESPERAS_OCUPADO_RED_MS = [1000, 2000, 4000];

interface Pedido {
  clave: string;
  ruta: string;
  kind: ReturnType<typeof kindDeAdjunto>;
  mime: string | null | undefined;
  intento: number;
}

/**
 * Archivos ya bajados del chat abierto de Instagram o Facebook (ruta del archivo → dirección `blob:` local). La
 * crea y la suelta el detalle del chat: al cambiar de chat o al salir, `soltar()` revoca todas las direcciones,
 * vacía la cola, corta las esperas y sube la generación, así una descarga que llegue tarde (del chat anterior) se
 * descarta.
 *
 * Lo que envió el comercio (`saliente`) llega del servidor con su ruta, pero con `disponible:false` y
 * `motivo:'sin_archivo'`: Meta no deja volver a bajarlo. Para eso se mira primero la copia local de esta sesión.
 *
 * Solo se marca como segura la dirección que acaba de crear este navegador con el archivo que entregó nuestro
 * servidor (o con el que el asesor acaba de enviar), y el `Blob` se crea con un formato de la lista blanca (si
 * no, `application/octet-stream`, que solo se descarga). Angular 14 no deja pasar `blob:` en `[src]` sin marcarla.
 */
export class CacheAdjuntosRed {
  private readonly mapa = new Map<string, EstadoAdjuntoRed>();
  private readonly enCurso = new Map<string, Subscription>();
  private readonly cola: Pedido[] = [];
  private readonly esperas = new Set<ReturnType<typeof setTimeout>>();
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

  /** Copia local de lo que envió el comercio en esta sesión (solo para lo saliente). */
  private copiaLocal(a: MetaAdjunto, saliente: boolean): Blob | null {
    if (!saliente || !kindDeAdjunto(a)) return null;
    if (a.motivo === 'vencido') return null;
    return this.local(a);
  }

  private clave(a: MetaAdjunto, saliente: boolean): string | null {
    if (this.copiaLocal(a, saliente)) {
      const id = a.id || (esRutaDeMediaRed(a.url) ? a.url : null);
      return id ? `local:${id}` : null;
    }
    return esRutaDeMediaRed(a.url) ? a.url : null;
  }

  estado(a: MetaAdjunto | null | undefined, saliente = false): EstadoAdjuntoRed | null {
    const c = a ? this.clave(a, saliente) : null;
    return c ? this.mapa.get(c) || null : null;
  }

  /**
   * ¿Se puede ver o bajar? Con la copia local de lo que se envió en esta sesión (primero), o con la ruta del
   * servidor si el servidor dice que hay de dónde bajarlo.
   */
  sePuedePedir(a: MetaAdjunto | null | undefined, saliente = false): boolean {
    if (!a || !kindDeAdjunto(a)) return false;
    if (this.copiaLocal(a, saliente)) return !!this.clave(a, saliente);
    return esRutaDeMediaRed(a.url) && a.disponible !== false;
  }

  /** Pide el archivo si no está, no va en camino o falló con algo que se puede reintentar (`forzar`). */
  pedir(a: MetaAdjunto, forzar = false, saliente = false): void {
    const kind = kindDeAdjunto(a);
    const clave = this.clave(a, saliente);
    if (!kind || !clave || !this.sePuedePedir(a, saliente)) return;
    const previo = this.mapa.get(clave);
    if (previo && !(forzar && previo.estado === 'error')) return;

    const blob = this.copiaLocal(a, saliente);
    if (blob) {
      this.ponerListo(clave, kind, blob, a.mime);
      return;
    }

    this.mapa.set(clave, { estado: 'cargando' });
    this.cola.push({ clave, ruta: a.url as string, kind, mime: a.mime, intento: 0 });
    this.bombear();
  }

  /** Lanza lo que haya en la cola sin pasar de `MAX_DESCARGAS_A_LA_VEZ_RED`. */
  private bombear(): void {
    while (this.enCurso.size < MAX_DESCARGAS_A_LA_VEZ_RED && this.cola.length) {
      const p = this.cola.shift()!;
      if (this.enCurso.has(p.clave)) continue;
      this.lanzar(p);
    }
  }

  private lanzar(p: Pedido): void {
    const generacion = this.generacion;
    let terminado = false;
    const terminar = () => {
      terminado = true;
      this.enCurso.delete(p.clave);
    };
    const sub = this.descargar(p.ruta).subscribe({
      next: (blob) => {
        terminar();
        if (generacion !== this.generacion) return;
        if (!(blob instanceof Blob) || blob.size === 0) {
          this.mapa.set(p.clave, { estado: 'error', motivo: 'reintentar' });
        } else {
          this.ponerListo(p.clave, p.kind, blob, p.mime);
        }
        this.bombear();
      },
      error: (err) => {
        terminar();
        if (generacion !== this.generacion) return;
        const status = err instanceof HttpErrorResponse ? err.status : Number((err as any)?.status);
        // 503: el servidor tiene sus cupos llenos (MEDIA_OCUPADO) o no pudo revisar el permiso. Se espera un poco
        // más cada vez antes de mostrar el error.
        if (status === 503 && p.intento < ESPERAS_OCUPADO_RED_MS.length) {
          this.esperar(p, generacion);
        } else {
          this.mapa.set(p.clave, { estado: 'error', motivo: motivoDeFalloRed(err) });
        }
        this.bombear();
      },
    });
    if (!terminado && !sub.closed) this.enCurso.set(p.clave, sub);
  }

  private esperar(p: Pedido, generacion: number): void {
    const t = setTimeout(() => {
      this.esperas.delete(t);
      if (generacion !== this.generacion) return;
      this.cola.push({ ...p, intento: p.intento + 1 });
      this.bombear();
    }, ESPERAS_OCUPADO_RED_MS[p.intento]);
    this.esperas.add(t);
  }

  private ponerListo(clave: string, kind: ReturnType<typeof kindDeAdjunto>, blob: Blob, mimeDicho?: string | null): void {
    const mime = !kind || kind === 'document' ? 'application/octet-stream' : mimeSeguroRed(kind, blob.type, mimeDicho);
    const cruda = URL.createObjectURL(new Blob([blob], { type: mime }));
    this.mapa.set(clave, { estado: 'listo', cruda, mime, url: this.sanitizer.bypassSecurityTrustUrl(cruda) });
  }

  /** Guarda el archivo ya bajado con su nombre (sin abrir pestañas con el blob). */
  guardarComo(a: MetaAdjunto, nombre: string, saliente = false): boolean {
    const e = this.estado(a, saliente);
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

  /**
   * Suelta todo (al cambiar de chat o al salir): revoca las direcciones, corta las descargas en camino, vacía la
   * cola y corta las esperas.
   */
  soltar(): void {
    this.generacion += 1;
    this.enCurso.forEach((s) => s.unsubscribe());
    this.enCurso.clear();
    this.cola.length = 0;
    this.esperas.forEach((t) => clearTimeout(t));
    this.esperas.clear();
    this.mapa.forEach((e) => {
      if (e.estado === 'listo') URL.revokeObjectURL(e.cruda);
    });
    this.mapa.clear();
  }
}
