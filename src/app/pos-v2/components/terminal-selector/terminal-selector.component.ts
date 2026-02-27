import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  OnInit,
  OnDestroy,
  Output,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';

@Component({
  selector: 'app-pos-v2-terminal-selector',
  templateUrl: './terminal-selector.component.html',
  styleUrls: ['./terminal-selector.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TerminalSelectorComponent implements OnInit, OnDestroy {

  @Output() terminalSelected = new EventEmitter<void>();

  bodegas: any[] = [];
  loading = false;
  loadError = false;

  private destroy$ = new Subject<void>();

  constructor(
    private bodegaService: BodegaService,
    private terminalService: PosV2TerminalService,
    private cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.loadBodegas();
  }

  loadBodegas(): void {
    this.loading = true;
    this.loadError = false;
    this.cdr.markForCheck();

    this.bodegaService.getBodegas()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (bodegas) => {
          this.bodegas = Array.isArray(bodegas) ? bodegas : [];
        },
        error: (err) => {
          console.warn('📟 [POS] Error loading bodegas:', err?.status);
          this.bodegas = [];
          this.loadError = true;
        },
      });
  }

  selectBodega(bodega: any): void {
    // Ensure idBodega is set
    if (!bodega.idBodega && bodega.id) {
      bodega.idBodega = bodega.id;
    }

    // Save to warehousePOS (same key as existing POS for compatibility)
    localStorage.setItem('warehousePOS', JSON.stringify(bodega));

    // Save as terminal in POS V2 service
    this.terminalService.setTerminal({
      id: bodega.idBodega || bodega.id,
      company: '',
      name: bodega.nombre || bodega.name || 'Bodega',
      branch: bodega.direccion || bodega.ubicacion || '',
      status: 'active',
    });

    this.terminalSelected.emit();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
