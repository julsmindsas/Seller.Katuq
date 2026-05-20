import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from '../base.service';
import {
  ReportSpec,
  ReportResult,
  SavedReport,
  SourceDef,
} from '../../../components/dashboard/model/report-spec.interfaces';

@Injectable({ providedIn: 'root' })
export class ReportsService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  getSources(): Observable<SourceDef[]> {
    return this.get<SourceDef[]>('/v1/reports/sources');
  }

  runQuery(spec: ReportSpec): Observable<ReportResult> {
    return this.post<ReportResult>('/v1/reports/query', spec);
  }

  list(): Observable<SavedReport[]> {
    return this.get<SavedReport[]>('/v1/reports/list');
  }

  getById(id: string): Observable<SavedReport> {
    return this.get<SavedReport>(`/v1/reports/${id}`);
  }

  save(report: SavedReport): Observable<SavedReport> {
    if (report.id) {
      return this.put<SavedReport>(`/v1/reports/${report.id}`, report);
    }
    return this.post<SavedReport>('/v1/reports', report);
  }

  remove(id: string): Observable<void> {
    return this.delete<void>(`/v1/reports/${id}`);
  }

  getPublicReport(id: string): Observable<SavedReport> {
    return this.get<SavedReport>(`/v1/reports/public/${id}`);
  }

  runPublicQuery(id: string): Observable<ReportResult> {
    return this.post<ReportResult>(`/v1/reports/public/${id}/query`, {});
  }
}
