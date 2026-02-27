import {
  Component,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  EventEmitter,
  Input,
  OnInit,
  OnDestroy,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { PosV2ApiService } from '../../services/pos-v2-api.service';
import { PosV2TerminalService } from '../../services/pos-v2-terminal.service';
import {
  PosV2CashRegister,
  PosV2CashMovement,
  PosV2ShiftReport,
} from '../../models/pos-v2.models';

export type CashRegisterMode = 'opening' | 'closing';

@Component({
  selector: 'app-pos-v2-cash-register',
  templateUrl: './cash-register.component.html',
  styleUrls: ['./cash-register.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CashRegisterComponent implements OnInit, OnDestroy {

  @Input() mode: CashRegisterMode = 'opening';

  @Output() registerOpened = new EventEmitter<void>();
  @Output() registerClosed = new EventEmitter<void>();

  openingForm: FormGroup;
  closingForm: FormGroup;
  movementForm: FormGroup;

  loading = false;
  shiftReport: PosV2ShiftReport | null = null;
  currentRegister: PosV2CashRegister | null = null;
  showMovementForm = false;

  private destroy$ = new Subject<void>();

  constructor(
    private apiService: PosV2ApiService,
    private terminalService: PosV2TerminalService,
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef,
  ) {
    this.openingForm = this.fb.group({
      initialAmount: [0, [Validators.required, Validators.min(0)]],
    });

    this.closingForm = this.fb.group({
      actualCash: [0, [Validators.required, Validators.min(0)]],
    });

    this.movementForm = this.fb.group({
      type: ['in', Validators.required],
      amount: [null, [Validators.required, Validators.min(0.01)]],
      reason: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    this.currentRegister = this.terminalService.getCashRegisterSnapshot();

    if (this.mode === 'closing') {
      this.loadShiftReport();
    }
  }

  // --- Opening ---

  openRegister(): void {
    if (this.openingForm.invalid || this.loading) return;

    const terminal = this.terminalService.getTerminalSnapshot();
    if (!terminal?.id) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.apiService.openCashRegister({
      terminalId: terminal.id,
      initialAmount: this.openingForm.value.initialAmount,
    })
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (res: any) => {
          const register = res.cashRegister || res;
          if (register._id) {
            register.id = register._id;
          }
          this.terminalService.setCashRegister(register);
          this.registerOpened.emit();
        },
        error: (err) => {
          // 409 = already open register for this terminal
          if (err.status === 409 && err.error?.cashRegisterId) {
            this.resumeExistingRegister(err.error.cashRegisterId, terminal.id);
          } else {
            console.error('Error opening register:', err);
          }
        },
      });
  }

  private resumeExistingRegister(cashRegisterId: string, terminalId: string): void {
    // Use status endpoint to get current register data, or build a minimal one
    this.apiService.getCashRegisterStatus(terminalId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res: any) => {
          const register = res.cashRegister || res;
          if (register._id) {
            register.id = register._id;
          }
          register.status = 'open';
          this.terminalService.setCashRegister(register);
          this.registerOpened.emit();
        },
        error: () => {
          // Fallback: create minimal register object to proceed
          this.terminalService.setCashRegister({
            id: cashRegisterId,
            terminalId,
            status: 'open',
            initialAmount: 0,
            movements: [],
            openedAt: new Date().toISOString(),
            openedBy: '',
          } as any);
          this.registerOpened.emit();
        },
      });
  }

  // --- Closing ---

  loadShiftReport(): void {
    const terminal = this.terminalService.getTerminalSnapshot();
    if (!terminal?.id) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.apiService.getShiftReport(terminal.id)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (report) => {
          this.shiftReport = report;
        },
        error: () => {
          this.shiftReport = null;
        },
      });
  }

  closeRegister(): void {
    if (this.closingForm.invalid || this.loading) return;

    const register = this.currentRegister;
    if (!register?.id) return;

    this.loading = true;
    this.cdr.markForCheck();

    this.apiService.closeCashRegister(register.id, this.closingForm.value.actualCash)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: () => {
          this.terminalService.clearCashRegister();
          this.registerClosed.emit();
        },
      });
  }

  // --- Cash Movement ---

  toggleMovementForm(): void {
    this.showMovementForm = !this.showMovementForm;
    if (!this.showMovementForm) {
      this.movementForm.reset({ type: 'in' });
    }
    this.cdr.markForCheck();
  }

  addMovement(): void {
    if (this.movementForm.invalid || this.loading) return;

    const register = this.currentRegister;
    if (!register?.id) return;

    this.loading = true;
    this.cdr.markForCheck();

    const movement: PosV2CashMovement = {
      type: this.movementForm.value.type,
      amount: this.movementForm.value.amount,
      reason: this.movementForm.value.reason.trim(),
      timestamp: new Date().toISOString(),
      userId: '',
    };

    this.apiService.addCashMovement(register.id, movement)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.loading = false;
          this.cdr.markForCheck();
        }),
      )
      .subscribe({
        next: (updatedRegister) => {
          this.currentRegister = updatedRegister;
          this.terminalService.setCashRegister(updatedRegister);
          this.showMovementForm = false;
          this.movementForm.reset({ type: 'in' });
        },
      });
  }

  get expectedCash(): number {
    if (!this.currentRegister) return 0;
    const initial = this.currentRegister.initialAmount || 0;
    const movements = this.currentRegister.movements || [];
    return movements.reduce((sum, m) => {
      return sum + (m.type === 'in' ? m.amount : -m.amount);
    }, initial);
  }

  get cashDifference(): number {
    return (this.closingForm.value.actualCash || 0) - this.expectedCash;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
