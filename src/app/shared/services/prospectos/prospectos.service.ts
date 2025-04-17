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
  
  // Métodos para gestión de tareas
  getPendingTasks(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/tasks/pending`);
  }
  
  scheduleTask(prospectId: string, taskData: any): Observable<Prospect> {
    return this.http.post<Prospect>(`${this.apiUrl}/${prospectId}/tasks`, taskData);
  }
  
  completeTask(taskId: string): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/tasks/${taskId}/complete`, {});
  }
  
  checkDueTasks(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/tasks/due-soon`);
  }
  
  // Métodos para métricas y estadísticas
  getProspectStats(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/stats`);
  }
  
  getPerformanceMetrics(): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/metrics/performance`);
  }
  
  // Métodos para filtrado avanzado
  getFilteredProspects(filters: any): Observable<Prospect[]> {
    return this.http.post<Prospect[]>(`${this.apiUrl}/filter`, filters);
  }
  
  // Métodos para comunicación
  sendEmail(prospectId: string, emailData: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${prospectId}/communication/email`, emailData);
  }
  
  // Métodos para exportación
  exportProspects(data: any, options: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/export`, { data, options });
  }
  
  // Métodos para gestión de documentos
  getProspectDocuments(prospectId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${prospectId}/documents`);
  }
  
  uploadDocument(prospectId: string, documentData: FormData): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/${prospectId}/documents`, documentData);
  }
  
  deleteDocument(prospectId: string, documentId: string): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/${prospectId}/documents/${documentId}`);
  }
}