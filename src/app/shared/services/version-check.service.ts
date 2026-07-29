import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

/** Forma del archivo estático que escribe update-version.js en cada build. */
export interface VersionPublicada {
  version: string;
  publicada?: string;
  notas?: NotaVersion[];
}

export interface NotaVersion {
  /** NUEVO | MEJORA | CORRIGE */
  tipo?: string;
  texto: string;
}

/**
 * Detecta que hay una versión nueva publicada.
 *
 * Cómo funciona: la app compilada lleva su versión quemada en el bundle
 * (`environment.version`). El build también deja `assets/version.json` con esa
 * misma versión. Cuando se publica un deploy nuevo, el JSON del servidor cambia
 * pero el bundle que el usuario tiene cargado NO: comparar los dos es lo que
 * delata que quedó corriendo una versión vieja.
 *
 * No se usa Service Worker porque en este proyecto está desactivado
 * (ver app.module.ts).
 */
@Injectable({ providedIn: 'root' })
export class VersionCheckService implements OnDestroy {

  /** Cada cuánto se pregunta por la versión publicada. */
  private readonly INTERVALO_MS = 15 * 60 * 1000; // 15 minutos

  /** Espera mínima entre consultas disparadas por foco de ventana. */
  private readonly MIN_ENTRE_CONSULTAS_MS = 60 * 1000;

  private readonly disponible$ = new BehaviorSubject<VersionPublicada | null>(null);

  private timer: any = null;
  private ultimaConsulta = 0;
  private onFocus = () => this.consultarSiCorresponde();

  constructor(private zone: NgZone) {}

  /** Versión con la que se compiló el bundle que el usuario tiene cargado. */
  get versionActual(): string {
    return environment.version || '';
  }

  /** Emite la versión publicada cuando es distinta a la cargada. */
  get actualizacionDisponible$(): Observable<VersionPublicada | null> {
    return this.disponible$.asObservable();
  }

  /**
   * Arranca el sondeo. Fuera de la zona de Angular para no disparar detección
   * de cambios cada 15 minutos sin necesidad.
   */
  iniciar(): void {
    if (this.timer) return;

    this.consultar();

    this.zone.runOutsideAngular(() => {
      this.timer = setInterval(() => this.consultar(), this.INTERVALO_MS);
      // Al volver a la pestaña es cuando más vale la pena mirar.
      window.addEventListener('focus', this.onFocus);
    });
  }

  detener(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
    window.removeEventListener('focus', this.onFocus);
  }

  ngOnDestroy(): void {
    this.detener();
  }

  private consultarSiCorresponde(): void {
    if (Date.now() - this.ultimaConsulta < this.MIN_ENTRE_CONSULTAS_MS) return;
    this.consultar();
  }

  private consultar(): void {
    // Ya se detectó una actualización: no hace falta seguir preguntando.
    if (this.disponible$.getValue()) return;

    this.ultimaConsulta = Date.now();

    // Cache-busting explícito: si el navegador entrega el JSON cacheado, el
    // chequeo no sirve para nada.
    fetch(`assets/version.json?t=${Date.now()}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((data: VersionPublicada | null) => {
        if (!data || !data.version) return;
        if (!this.esDistinta(data.version, this.versionActual)) return;

        // Volver a la zona: de esto depende que el aviso se pinte.
        this.zone.run(() => this.disponible$.next(data));
      })
      .catch(() => {
        // Sin red o archivo ausente: se reintenta en el siguiente ciclo.
      });
  }

  /**
   * Compara solo la parte numérica (`2026.07.28.9`), ignorando la fecha en
   * texto y el sufijo "(Beta)" que también viajan en environment.version.
   */
  private esDistinta(publicada: string, actual: string): boolean {
    const num = (v: string) => (v.match(/\d{4}\.\d{2}\.\d{2}\.\d+/) || [''])[0];
    const a = num(publicada);
    const b = num(actual);
    if (!a || !b) return false;
    return a !== b;
  }

  /**
   * Aplica la actualización: borra las cachés del navegador y recarga para que
   * el servidor entregue los bundles nuevos.
   *
   * No toca localStorage ni sessionStorage — ahí viven la sesión, la empresa
   * activa y el carrito; borrarlos sacaría al usuario de la aplicación.
   */
  async aplicarActualizacion(): Promise<void> {
    try {
      if ('caches' in window) {
        const claves = await caches.keys();
        await Promise.all(claves.map((k) => caches.delete(k)));
      }
    } catch (e) {
      // Si el navegador no deja limpiar cachés, la recarga igual trae el
      // index.html nuevo y con él los bundles con hash nuevo.
    }

    try {
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map((r) => r.unregister()));
      }
    } catch (e) {
      // Idem.
    }

    window.location.reload();
  }
}
