import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Subject } from 'rxjs';
import { takeUntil, timeout } from 'rxjs/operators';
import { CarteraService } from '../../../shared/services/cartera/cartera.service';
import { CarteraResponse } from '../../../shared/services/cartera/cartera.models';

/**
 * Spec 014 — Finanzas MVP (CxC / Cartera). Pantalla principal.
 * Hace UNA sola llamada a GET /v1/treasury/cartera (todo viene agregado
 * server-side) y reparte la respuesta a los dos tabs por @Input; los filtros
 * de cada tab son client-side sobre esos datos.
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

  activeIndex = 0;

  private destroy$ = new Subject<void>();

  constructor(private cartera: CarteraService, private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.load();
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
      .getCartera()
      .pipe(timeout(15000), takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.data = res;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.forbidden = err instanceof HttpErrorResponse && err.status === 403;
          this.error = !this.forbidden;
          this.loading = false;
          this.cdr.markForCheck();
        },
      });
  }

  onTabChange(event: { index: number }): void {
    this.activeIndex = event.index;
  }
}
