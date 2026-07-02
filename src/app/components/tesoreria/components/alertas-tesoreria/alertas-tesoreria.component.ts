import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  Output,
  SimpleChanges,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';

import { TreasuryService } from '../../../../shared/services/treasury/treasury.service';
import { TreasuryAlert } from '../../../../shared/services/treasury/treasury.models';

/**
 * Spec 013 — Tesorería MVP. Tab "Alertas" (T-19, CA-11/12).
 * Lista alertas de duplicado (referencia / archivo). "Ir a revisar" lleva a la
 * cola de revisión; "Resolver" marca la alerta como gestionada.
 */
@Component({
  selector: 'app-alertas-tesoreria',
  templateUrl: './alertas-tesoreria.component.html',
  styleUrls: ['./alertas-tesoreria.component.scss'],
})
export class AlertasTesoreriaComponent implements OnChanges, OnDestroy {
  @Input() active = false;

  /** Refrescar KPIs del padre tras resolver una alerta. */
  @Output() changed = new EventEmitter<void>();
  /** Saltar a la pestaña "Por revisar". */
  @Output() goToReview = new EventEmitter<void>();

  items: TreasuryAlert[] = [];
  loading = false;
  soloActivas = true;

  private loadedOnce = false;
  private destroy$ = new Subject<void>();

  constructor(
    private treasury: TreasuryService,
    private toastr: ToastrService,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['active'] && this.active && !this.loadedOnce) {
      this.loadedOnce = true;
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  load(): void {
    this.loading = true;
    this.treasury
      .getAlerts(this.soloActivas ? false : undefined)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.items = res?.items || [];
          this.loading = false;
        },
        error: () => {
          this.items = [];
          this.loading = false;
        },
      });
  }

  toggleFiltro(): void {
    this.soloActivas = !this.soloActivas;
    this.load();
  }

  tipoLabel(alert: TreasuryAlert): string {
    return alert?.alertType === 'duplicate_file' ? 'Comprobante repetido' : 'Referencia repetida';
  }

  irARevisar(): void {
    this.goToReview.emit();
  }

  resolver(alert: TreasuryAlert): void {
    if (!alert?.id) return;
    Swal.fire({
      icon: 'question',
      title: '¿Marcar como resuelta?',
      text: 'Confirma que ya verificaste esta alerta de duplicado.',
      showCancelButton: true,
      confirmButtonText: 'Resolver',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#7c3aed',
      cancelButtonColor: '#6b7280',
    }).then((result) => {
      if (!result.isConfirmed) return;
      this.treasury
        .resolveAlert(alert.id as string)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: () => {
            this.toastr.success('Alerta resuelta.');
            this.load();
            this.changed.emit();
          },
          error: () => {
            Swal.fire({ icon: 'error', title: 'No se pudo resolver', text: 'Inténtalo de nuevo.' });
          },
        });
    });
  }

  trackByAlert(_index: number, alert: TreasuryAlert): string {
    return alert?.id || `alert-${_index}`;
  }
}
