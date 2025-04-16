import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Prospect, ProspectTimelineEvent } from '../../models/prospect.model';

@Injectable({
  providedIn: 'root'
})
export class ProspectosService {
  private apiUrl = `${environment.urlApi}/v1/prospectos`;

  constructor(private http: HttpClient) {}

  getProspectos(): Observable<Prospect[]> {
    return this.http.get<Prospect[]>(this.apiUrl);
  }

  getProspectoById(id: string): Observable<Prospect> {
    return this.http.get<Prospect>(`${this.apiUrl}/${id}`);
  }

  createProspecto(prospectoData: Partial<Prospect>): Observable<Prospect> {
    return this.http.post<Prospect>(this.apiUrl, { prospect: prospectoData });
  }

  updateProspecto(id: string, prospectoData: Partial<Prospect>): Observable<Prospect> {
    return this.http.put<Prospect>(`${this.apiUrl}/${id}`, { prospect: prospectoData });
  }

  updateProspectoStatus(id: string, status: Prospect['status']): Observable<Prospect> {
    return this.http.patch<Prospect>(`${this.apiUrl}/${id}/status`, { status });
  }

  addProspectoNote(id: string, note: Partial<ProspectTimelineEvent>): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.apiUrl}/${id}/notes`, note);
  }

  getProspectoNotes(id: string): Observable<ProspectTimelineEvent[]> {
    return this.http.get<ProspectTimelineEvent[]>(`${this.apiUrl}/${id}/notes`);
  }

  convertToClient(id: string): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.apiUrl}/${id}/convert-to-client`, {});
  }
} 