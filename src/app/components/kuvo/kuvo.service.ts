import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { BaseService } from '../../shared/services/base.service';
import { KuvoBankConfiguration, KuvoBankDestination, KuvoBankDraft, KuvoEnvelope, KuvoPublication, KuvoStatement } from './kuvo.models';

@Injectable({providedIn: 'root'})
export class KuvoService extends BaseService {
  constructor(http: HttpClient) { super(http); }
  private unwrap<T>(response: KuvoEnvelope<T>): T {
    if (!response.success || response.data === undefined) throw {error: {code: response.code, message: response.message || 'No pudimos completar la consulta de Kuvo.'}};
    return response.data;
  }
  publication(): Observable<KuvoPublication> {
    return this.get<KuvoEnvelope<KuvoPublication>>('/v1/sites/kuvo/comercio').pipe(map(response => this.unwrap(response)));
  }
  updatePublication(patch: object): Observable<KuvoPublication> {
    return this.put<KuvoEnvelope<KuvoPublication>>('/v1/sites/kuvo/comercio', patch).pipe(map(response => this.unwrap(response)));
  }
  statement(): Observable<KuvoStatement> {
    return this.get<KuvoEnvelope<KuvoStatement>>('/v1/sites/kuvo/saldo?environment=production').pipe(map(response => this.unwrap(response)));
  }
  bankConfiguration(): Observable<KuvoBankConfiguration> {
    return this.get<KuvoEnvelope<KuvoBankConfiguration>>('/v1/sites/kuvo/cuenta-liquidacion').pipe(map(response => this.unwrap(response)));
  }
  requestBank(input: KuvoBankDraft): Observable<KuvoBankDestination> {
    return this.put<KuvoEnvelope<KuvoBankDestination>>('/v1/sites/kuvo/cuenta-liquidacion', input).pipe(map(response => this.unwrap(response)));
  }
}
