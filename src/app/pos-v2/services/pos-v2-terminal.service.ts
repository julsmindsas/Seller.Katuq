import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';
import { PosV2Terminal, PosV2CashRegister } from '../models/pos-v2.models';

@Injectable({ providedIn: 'root' })
export class PosV2TerminalService {

  private readonly TERMINAL_KEY = 'posV2Terminal';
  private readonly REGISTER_KEY = 'posV2CashRegister';
  private readonly LAST_REGISTER_KEY = 'posV2LastClosedRegister';

  private terminalSubject = new BehaviorSubject<PosV2Terminal | null>(null);
  currentTerminal$ = this.terminalSubject.asObservable();

  private registerSubject = new BehaviorSubject<PosV2CashRegister | null>(null);
  cashRegister$ = this.registerSubject.asObservable();

  isReady$: Observable<boolean> = combineLatest([
    this.currentTerminal$,
    this.cashRegister$
  ]).pipe(
    map(([terminal, register]) => !!terminal && !!register && register.status === 'open')
  );

  constructor() {
    this.initializeFromLocalStorage();
  }

  private initializeFromLocalStorage(): void {
    try {
      const terminalStr = localStorage.getItem(this.TERMINAL_KEY);
      if (terminalStr) {
        this.terminalSubject.next(JSON.parse(terminalStr));
      }
      const registerStr = localStorage.getItem(this.REGISTER_KEY);
      if (registerStr) {
        this.registerSubject.next(JSON.parse(registerStr));
      }
    } catch {
      localStorage.removeItem(this.TERMINAL_KEY);
      localStorage.removeItem(this.REGISTER_KEY);
    }
  }

  setTerminal(terminal: PosV2Terminal): void {
    this.terminalSubject.next(terminal);
    localStorage.setItem(this.TERMINAL_KEY, JSON.stringify(terminal));
  }

  clearTerminal(): void {
    this.terminalSubject.next(null);
    localStorage.removeItem(this.TERMINAL_KEY);
    this.clearCashRegister();
  }

  setCashRegister(register: PosV2CashRegister): void {
    this.registerSubject.next(register);
    localStorage.setItem(this.REGISTER_KEY, JSON.stringify(register));
  }

  clearCashRegister(): void {
    const current = this.registerSubject.value;
    if (current?.id) {
      localStorage.setItem(this.LAST_REGISTER_KEY, current.id);
    }
    this.registerSubject.next(null);
    localStorage.removeItem(this.REGISTER_KEY);
  }

  getLastClosedRegisterId(): string | null {
    return localStorage.getItem(this.LAST_REGISTER_KEY);
  }

  getTerminalSnapshot(): PosV2Terminal | null {
    return this.terminalSubject.value;
  }

  getCashRegisterSnapshot(): PosV2CashRegister | null {
    return this.registerSubject.value;
  }
}
