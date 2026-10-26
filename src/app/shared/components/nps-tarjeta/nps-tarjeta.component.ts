import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { NpsPreguntaComponent } from '../nps-pregunta/nps-pregunta.component';
import { NpsPreguntaService } from '../../services/feedback/nps-pregunta.service';
import { NovedadesService } from '../../services/novedades.service';
import { AuthService } from '../../services/firebase/auth.service';
import { esRutaPublica, rutaSinQuery } from '../../data/rutas-publicas';

import { TranslateModule } from '@ngx-translate/core';
/**
 * Pregunta NPS de Katuq a los comercios dentro del Seller (D-483, D-506). Montada una vez en
 * `app.component`, decide cuándo preguntar y cómo se ve fuera de Inicio:
 *  - la primera vez del ciclo, una ventana (el servidor la marca: sale una sola vez);
 *  - después, un botón pequeño, "Califica a Katuq", que abre la tarjeta al tocarlo.
 * En Inicio la muestra `app-nps-inicio`, dentro de la página. El estado es de `NpsPreguntaService`.
 *
 * Pide la pregunta en la primera navegación a una pantalla interna con sesión, y nunca en la
 * visita en que toca una novedad.
 */
@Component({
  selector: 'app-nps-tarjeta',
  standalone: true,
  imports: [TranslateModule, CommonModule, NpsPreguntaComponent],
  templateUrl: './nps-tarjeta.component.html',
  styleUrls: ['./nps-tarjeta.component.scss'],
})
export class NpsTarjetaComponent implements OnInit, OnDestroy {
  /** El botón flotante se abrió como tarjeta. */
  expandida = false;
  /** En Inicio la pregunta va dentro de la página, no flotando. */
  enInicio = false;

  private destroy$ = new Subject<void>();

  constructor(
    public pregunta: NpsPreguntaService,
    private novedades: NovedadesService,
    private auth: AuthService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.router.events
      .pipe(filter((e): e is NavigationEnd => e instanceof NavigationEnd), takeUntil(this.destroy$))
      .subscribe((e) => this.alNavegar(e.urlAfterRedirects));

    // Si el router ya navegó antes de que naciera el componente, se evalúa la ruta actual.
    if (this.router.navigated) this.alNavegar(this.router.url);

    this.pregunta.estado$.pipe(takeUntil(this.destroy$)).subscribe((e) => {
      if (!e) this.expandida = false;
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** La X: sin nota pospone; con nota cierra el segundo paso. */
  cerrar(): void {
    this.pregunta.cerrar();
  }

  /** Tocar el velo de la ventana es lo mismo que cerrarla. */
  cerrarDesdeVelo(evento: MouseEvent): void {
    if (evento.target === evento.currentTarget) this.cerrar();
  }

  private alNavegar(url: string): void {
    this.enInicio = rutaSinQuery(url) === '/welcome';
    if (!this.esRutaInterna(url) || !this.auth.isLoggedIn) {
      // Cerró sesión o salió a una página pública: se va sin posponer nada.
      if (this.pregunta.estado) this.pregunta.ocultar();
      return;
    }
    const usuario = this.usuarioActual();
    if (!usuario) return;
    this.pregunta.evaluar(usuario, !!this.novedades.getPendiente(), () => this.auth.isLoggedIn && this.esRutaInterna(this.router.url));
  }

  /** Pantalla con menú: ni pública, ni la raíz que redirige, ni el 404. */
  private esRutaInterna(url: string): boolean {
    if (esRutaPublica(url) || rutaSinQuery(url) === '/') return false;
    let ruta = this.router.routerState.snapshot.root;
    while (ruta.firstChild) ruta = ruta.firstChild;
    return ruta.routeConfig?.path !== '**';
  }

  private usuarioActual(): string | null {
    try {
      const u = JSON.parse(localStorage.getItem('user') || 'null');
      return u ? String(u.email || u.uid || u.id || 'sesion') : null;
    } catch {
      return null;
    }
  }
}
