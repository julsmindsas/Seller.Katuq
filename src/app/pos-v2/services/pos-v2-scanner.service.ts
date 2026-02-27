import { Injectable, OnDestroy } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { PosV2ApiService } from './pos-v2-api.service';
import { PosV2ScanResult } from '../models/pos-v2.models';

@Injectable({ providedIn: 'root' })
export class PosV2ScannerService implements OnDestroy {

  private scanResultSubject = new BehaviorSubject<PosV2ScanResult | null>(null);
  scanResult$ = this.scanResultSubject.asObservable();

  private locked = false;
  private readonly LOCK_MS = 400;

  private destroy$ = new Subject<void>();

  constructor(private apiService: PosV2ApiService) {}

  processScan(barcode: string): void {
    if (this.locked || !barcode?.trim()) return;

    this.locked = true;

    this.apiService.scanProduct(barcode.trim()).subscribe({
      next: (result) => {
        this.scanResultSubject.next(result);
        this.releaseLock();
      },
      error: () => {
        const errorResult: PosV2ScanResult = { found: false, message: 'Error al buscar producto' };
        this.scanResultSubject.next(errorResult);
        this.releaseLock();
      }
    });
  }

  private releaseLock(): void {
    setTimeout(() => { this.locked = false; }, this.LOCK_MS);
  }

  clearResult(): void {
    this.scanResultSubject.next(null);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
