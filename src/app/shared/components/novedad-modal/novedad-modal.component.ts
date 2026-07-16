import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter, takeUntil } from 'rxjs/operators';
import { Subject } from 'rxjs';
import { NovedadesService, Novedad } from '../../services/novedades.service';
import { AuthService } from '../../services/firebase/auth.service';

/**
 * Modal "¿Qué hay de nuevo?". Se muestra UNA sola vez (por usuario/navegador)
 * cuando hay una novedad pendiente y el usuario ya entró al app. No es molesto:
 * autoplay silenciado, cierre claro, y al cerrarse queda marcada como vista.
 */
@Component({
  selector: 'app-novedad-modal',
  templateUrl: './novedad-modal.component.html',
  styleUrls: ['./novedad-modal.component.scss'],
})
export class NovedadModalComponent implements OnInit, OnDestroy {
  visible = false;
  novedad: Novedad | null = null;

  private destroy$ = new Subject<void>();
  private yaEvaluado = false;
  private readonly RUTAS_PUBLICAS = [
    '/login', '/authentication', '/registrarse', '/nuevo-registro',
    '/change-password', '/terms-conditions', '/privacy-policy',
    '/video-agent', '/live-audio',
  ];

  constructor(
    private novedades: NovedadesService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.evaluar();
    this.router.events
      .pipe(filter((e) => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe(() => this.evaluar());
  }

  /** Decide si corresponde mostrar la novedad pendiente (una sola vez por sesión de UI). */
  private evaluar(): void {
    if (this.yaEvaluado || this.visible) return;

    const url = this.router.url || '';
    const esPublica = this.RUTAS_PUBLICAS.some((p) => url.startsWith(p));
    if (esPublica || !this.auth?.isLoggedIn) return;

    const pendiente = this.novedades.getPendiente();
    if (!pendiente) {
      this.yaEvaluado = true; // no hay nada pendiente: no re-evaluar
      return;
    }

    this.novedad = pendiente;
    this.yaEvaluado = true;
    // pequeño respiro para no chocar con la carga inicial (UX, no sincronización)
    setTimeout(() => (this.visible = true), 1200);
  }

  /** Reabrir manualmente (p. ej. desde un botón "Novedades" en el header). */
  reabrir(id: string): void {
    const nov = this.novedades.getPorId(id);
    if (nov) {
      this.novedad = nov;
      this.visible = true;
    }
  }

  cerrar(): void {
    if (this.novedad) this.novedades.marcarVista(this.novedad.id);
    this.visible = false;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
