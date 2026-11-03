import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ActivatedRoute, ParamMap, Router } from '@angular/router';
import { Subject } from 'rxjs';
import { debounceTime, takeUntil, timeout } from 'rxjs/operators';
import { CarteraService } from '../../../shared/services/cartera/cartera.service';
import { CarteraEvolucionResponse, CarteraResponse } from '../../../shared/services/cartera/cartera.models';
import {
  CarteraFiltros,
  filtrosAUrl,
  filtrosDesdeUrl,
  filtrosVacios,
  mismosFiltros,
} from '../cartera-filtros.util';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Pantalla principal.
 * Hace UNA sola llamada a GET /v1/treasury/cartera (todo viene agregado
 * server-side) y reparte la respuesta a los dos tabs por @Input; los filtros
 * son client-side sobre esos datos.
 * Ticket 1467: los filtros viven AQUÍ (no en cada tab): los dos tabs usan exactamente los mismos y se
 * guardan en la dirección de la página, así sobreviven al recargar y se pueden compartir.
 */
@Component({
  selector: 'app-cartera',
  templateUrl: './cartera.component.html',
  styleUrls: ['./cartera.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarteraComponent implements OnInit, OnDestroy {
  loading = false;
  /** Error genérico (red/500/timeout). */
  error = false;
  /** El rol del usuario no puede ver cartera (403). */
  forbidden = false;
  data: CarteraResponse | null = null;
  /** Fotos mensuales (ticket 1464). Es un extra: si no carga, la pantalla sigue sin la gráfica. */
  evolucion: CarteraEvolucionResponse | null = null;

  activeIndex = 0;

  /** Filtros de la cartera, compartidos por «Cartera por cliente» y «Aging» (ticket 1467). */
  filtros: CarteraFiltros = filtrosVacios();

  private destroy$ = new Subject<void>();
  /** Pide escribir los filtros en la dirección (se junta lo que cambie en un cuarto de segundo). */
  private escribirUrl$ = new Subject<void>();
  /** Mientras la pantalla escribe la dirección, no reacciona a ese mismo cambio. */
  private escribiendoUrl = false;

  constructor(
    private cartera: CarteraService,
    private cdr: ChangeDetectorRef,
    private route: ActivatedRoute,
    private router: Router,
  ) {}

  ngOnInit(): void {
    const dir = this.route.snapshot.queryParamMap;
    this.filtros = filtrosDesdeUrl(dir);
    this.activeIndex = dir.get('vista') === 'aging' ? 1 : 0;
    this.load();
    // Una dirección con filtros abierta estando ya en Cartera (o el botón atrás) también los aplica.
    this.route.queryParamMap.pipe(takeUntil(this.destroy$)).subscribe((m) => this.alCambiarLaDireccion(m));
    this.escribirUrl$.pipe(debounceTime(250), takeUntil(this.destroy$)).subscribe(() => this.escribirDireccion());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.error = false;
    this.forbidden = false;
    this.cartera
      .getCartera(this.filtros.incluirInternos)
      .pipe(timeout(15000), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.data = res;
          // «Incluir internos» solo existe cuando el servidor trae la cartera interna (ticket 1461).
          if (!res.internos && this.filtros.incluirInternos) {
            this.filtros = { ...this.filtros, incluirInternos: false };
            this.escribirUrl$.next();
          }
          this.loading = false;
          this.cdr.markForCheck();
          this.cargarEvolucion();
        },
        error: (err) => {
          this.forbidden = err instanceof HttpErrorResponse && err.status === 403;
          this.error = !this.forbidden;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  /** Ticket 1464: la gráfica de 12 meses se pide aparte; un error aquí nunca tumba la cartera. */
  private cargarEvolucion(): void {
    this.cartera
      .getEvolucion()
      .pipe(timeout(15000), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.evolucion = res;
          this.cdr.markForCheck();
        },
        error: () => {
          this.evolucion = null;
          this.cdr.markForCheck();
        },
      });
  }

  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
    this.escribirUrl$.next();
  }

  /** Un tab cambió un filtro: se guarda para los dos tabs y en la dirección. */
  cambiarFiltros(nuevos: CarteraFiltros): void {
    const recargar = nuevos.incluirInternos !== this.filtros.incluirInternos;
    this.filtros = nuevos;
    this.escribirUrl$.next();
    this.cdr.markForCheck();
    if (recargar) this.load();
  }

  private alCambiarLaDireccion(m: ParamMap): void {
    if (this.escribiendoUrl) return;
    const leidos = filtrosDesdeUrl(m);
    const indice = m.get('vista') === 'aging' ? 1 : 0;
    let cambio = false;
    if (indice !== this.activeIndex) {
      this.activeIndex = indice;
      cambio = true;
    }
    if (!mismosFiltros(leidos, this.filtros)) {
      const recargar = leidos.incluirInternos !== this.filtros.incluirInternos;
      this.filtros = leidos;
      cambio = true;
      if (recargar) this.load();
    }
    if (cambio) this.cdr.markForCheck();
  }

  /** Escribe los filtros y el tab en la dirección, sin llenar el historial y sin tocar otros parámetros. */
  private escribirDireccion(): void {
    const params = { ...filtrosAUrl(this.filtros), vista: this.activeIndex === 1 ? 'aging' : null };
    this.escribiendoUrl = true;
    const terminar = () => { this.escribiendoUrl = false; };
    this.router
      .navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true })
      .then(terminar, terminar);
  }
}
