import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../base.service';
import {
  BookkeepingAccount,
  BookkeepingOverview,
  BookkeepingSettings,
  JournalEntry,
  JournalLine,
  TrialBalance,
} from './bookkeeping.models';

@Injectable({ providedIn: 'root' })
export class BookkeepingService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getOverview(from?: string, to?: string): Observable<BookkeepingOverview> {
    const query = [from ? `from=${encodeURIComponent(from)}` : '', to ? `to=${encodeURIComponent(to)}` : '']
      .filter(Boolean).join('&');
    return this.get<any>(`/v1/bookkeeping/overview${query ? `?${query}` : ''}`)
      .pipe(map((response) => response.data));
  }

  initialize(): Observable<any> {
    return this.post('/v1/bookkeeping/setup', {});
  }

  activate(accountMapping: { [purpose: string]: string }): Observable<any> {
    return this.post('/v1/bookkeeping/activate', { accountMapping });
  }

  updateSettings(settings: Partial<BookkeepingSettings>): Observable<any> {
    return this.put('/v1/bookkeeping/settings', settings);
  }

  listAccounts(includeInactive = true): Observable<BookkeepingAccount[]> {
    return this.get<any>(`/v1/bookkeeping/accounts?includeInactive=${includeInactive}`)
      .pipe(map((response) => response.data || []));
  }

  saveAccount(account: BookkeepingAccount): Observable<any> {
    return this.put(`/v1/bookkeeping/accounts/${encodeURIComponent(account.code)}`, account);
  }

  listJournal(status?: string): Observable<JournalEntry[]> {
    return this.get<any>(`/v1/bookkeeping/journal${status ? `?status=${encodeURIComponent(status)}` : ''}`)
      .pipe(map((response) => response.data || []));
  }

  createJournal(payload: { date: string; description: string; lines: JournalLine[] }): Observable<any> {
    return this.post('/v1/bookkeeping/journal', payload);
  }

  getTrialBalance(from?: string, to?: string): Observable<TrialBalance> {
    const query = [from ? `from=${encodeURIComponent(from)}` : '', to ? `to=${encodeURIComponent(to)}` : '']
      .filter(Boolean).join('&');
    return this.get<any>(`/v1/bookkeeping/trial-balance${query ? `?${query}` : ''}`)
      .pipe(map((response) => response.data));
  }

  syncAll(): Observable<any> {
    return this.post('/v1/bookkeeping/sync/all', {});
  }
}
