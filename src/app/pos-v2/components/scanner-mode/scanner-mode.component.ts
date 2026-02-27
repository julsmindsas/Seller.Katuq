import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
  AfterViewInit,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { PosV2ScannerService } from '../../services/pos-v2-scanner.service';
import { PosV2CartService } from '../../services/pos-v2-cart.service';
import { PosV2ScanResult } from '../../models/pos-v2.models';

interface ScanHistoryEntry {
  barcode: string;
  productName: string;
  success: boolean;
  timestamp: Date;
}

@Component({
  selector: 'app-pos-v2-scanner-mode',
  templateUrl: './scanner-mode.component.html',
  styleUrls: ['./scanner-mode.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ScannerModeComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('barcodeInput') barcodeInput!: ElementRef<HTMLInputElement>;

  barcode = '';
  scanning = false;
  lastResult: PosV2ScanResult | null = null;
  flashState: 'none' | 'success' | 'error' = 'none';
  scanHistory: ScanHistoryEntry[] = [];

  private destroy$ = new Subject<void>();
  private readonly MAX_HISTORY = 5;

  constructor(
    private scannerService: PosV2ScannerService,
    private cartService: PosV2CartService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.scannerService.scanResult$
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (!result) return;
        this.handleScanResult(result);
      });
  }

  ngAfterViewInit(): void {
    this.focusInput();
  }

  onScan(): void {
    const code = this.barcode.trim();
    if (!code) return;

    this.scanning = true;
    this.flashState = 'none';
    this.lastResult = null;
    this.cdr.markForCheck();

    this.scannerService.processScan(code);
  }

  private handleScanResult(result: PosV2ScanResult): void {
    this.lastResult = result;
    this.scanning = false;

    if (result.found && result.product) {
      this.cartService.addItem(result.product, 1);
      this.flashState = 'success';
      this.addToHistory(this.barcode.trim(), result.product?.crearProducto?.titulo || 'Producto', true);
    } else {
      this.flashState = 'error';
      this.addToHistory(this.barcode.trim(), result.message || 'No encontrado', false);
    }

    this.barcode = '';
    this.cdr.markForCheck();

    setTimeout(() => {
      this.flashState = 'none';
      this.cdr.markForCheck();
      this.focusInput();
    }, 800);
  }

  private addToHistory(barcode: string, productName: string, success: boolean): void {
    this.scanHistory.unshift({
      barcode,
      productName,
      success,
      timestamp: new Date(),
    });
    if (this.scanHistory.length > this.MAX_HISTORY) {
      this.scanHistory = this.scanHistory.slice(0, this.MAX_HISTORY);
    }
  }

  focusInput(): void {
    this.barcodeInput?.nativeElement?.focus();
  }

  clearHistory(): void {
    this.scanHistory = [];
    this.cdr.markForCheck();
  }

  trackByTimestamp(_index: number, entry: ScanHistoryEntry): number {
    return entry.timestamp.getTime();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
