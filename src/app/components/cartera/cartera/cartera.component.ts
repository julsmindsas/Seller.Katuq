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
import { CompanyFeaturesService } from '../../../shared/services/company-features.service';
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

  /** 0 = Cartera por cliente, 1 = Aging, 2 = Cartera interna (ticket 1461), 3 = Cartera castigada (ticket 1463); las dos últimas solo con su bandera. */
  activeIndex = 0;
  /** Ticket 1463: bandera `carteraCastigo` (reporte «Cartera castigada») y rol de la familia Administrador. */
  castigoActivo = false;
  esAdmin = false;

  /** Ticket 1461: la vista «Cartera interna» (solo empleados, socios y empresa propia); se pide cuando se abre. */
  dataInterna: CarteraResponse | null = null;
  loadingInterna = false;
  errorInterna = false;
  /** Los filtros de la vista interna son propios (no viajan en la dirección ni se mezclan con los de Cartera). */
  filtrosInterna: CarteraFiltros = filtrosVacios();

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
    private features: CompanyFeaturesService,
  ) {
    this.castigoActivo = this.features.isEnabled('carteraCastigo');
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      const rol = String(u.rol || u.role || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      this.esAdmin = /(^|[^a-z0-9])administrador([^a-z0-9]|$)/.test(rol);
    } catch {
      this.esAdmin = false;
    }
  }

  ngOnInit(): void {
    const dir = this.route.snapshot.queryParamMap;
    this.filtros = filtrosDesdeUrl(dir);
    this.activeIndex = this.indiceDeVista(dir.get('vista'));
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
          // Ticket 1461: sin cartera interna en el servidor (bandera apagada) no hay tercera vista.
          if (!res.internos && this.activeIndex === 2) {
            this.activeIndex = 0;
            this.escribirUrl$.next();
          }
          this.cdr.markForCheck();
          this.cargarEvolucion();
          if (this.activeIndex === 2 && res.internos) this.cargarInterna();
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
    if (event.index === 2 && !this.dataInterna) this.cargarInterna();
  }

  private indiceDeVista(vista: string | null): number {
    if (vista === 'castigada') return this.castigoActivo ? 3 : 0;
    return vista === 'aging' ? 1 : vista === 'interna' ? 2 : 0;
  }

  private vistaDeIndice(indice: number): string | null {
    return indice === 1 ? 'aging' : indice === 2 ? 'interna' : indice === 3 ? 'castigada' : null;
  }

  /** Ticket 1461: la cartera de empleados, socios y empresa propia (el servidor la manda aparte). */
  cargarInterna(): void {
    this.loadingInterna = true;
    this.errorInterna = false;
    this.cdr.markForCheck();
    this.cartera
      .getCartera(false, true)
      .pipe(timeout(15000), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.dataInterna = res;
          this.loadingInterna = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.errorInterna = true;
          this.loadingInterna = false;
          this.cdr.markForCheck();
        },
      });
  }

  cambiarFiltrosInterna(nuevos: CarteraFiltros): void {
    this.filtrosInterna = { ...nuevos, incluirInternos: false };
    this.cdr.markForCheck();
  }

  /** Tesorería marcó el tipo de relación de un cliente: todo se vuelve a pedir (la lista cambia de lugar). */
  alCambiarRelacion(): void {
    this.dataInterna = null;
    this.load();
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
    const indice = this.indiceDeVista(m.get('vista'));
    let cambio = false;
    if (indice !== this.activeIndex) {
      this.activeIndex = indice;
      cambio = true;
      if (indice === 2 && this.data?.internos && !this.dataInterna) this.cargarInterna();
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
    const params = { ...filtrosAUrl(this.filtros), vista: this.vistaDeIndice(this.activeIndex) };
    this.escribiendoUrl = true;
    const terminar = () => { this.escribiendoUrl = false; };
    this.router
      .navigate([], { relativeTo: this.route, queryParams: params, queryParamsHandling: 'merge', replaceUrl: true })
      .then(terminar, terminar);
  }
}
