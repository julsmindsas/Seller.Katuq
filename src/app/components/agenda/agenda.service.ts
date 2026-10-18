import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { BaseService } from '../../shared/services/base.service';
import {
  Cita,
  ConfigAgenda,
  Disponibilidad,
  EntradaCita,
  EstadoCita,
  ServicioAgenda,
} from './agenda.models';

/**
 * Agenda de servicios (D-488). El servidor toma la empresa del JWT y exige la
 * bandera `serviceAgenda`; aquí no se manda empresa.
 */
@Injectable({ providedIn: 'root' })
export class AgendaService extends BaseService {
  private readonly base = '/v1/appointments';

  constructor(http: HttpClient) {
    super(http);
  }

  config(): Observable<{ config: ConfigAgenda; configurada: boolean }> {
    return this.get<{ data: { config: ConfigAgenda; configurada: boolean } }>(`${this.base}/config`).pipe(map((r) => r.data));
  }

  guardarConfig(config: ConfigAgenda): Observable<ConfigAgenda> {
    return this.put<{ data: { config: ConfigAgenda } }>(`${this.base}/config`, { config }).pipe(map((r) => r.data.config));
  }

  servicios(): Observable<ServicioAgenda[]> {
    return this.get<{ data: ServicioAgenda[] }>(`${this.base}/servicios`).pipe(map((r) => r.data || []));
  }

  citas(desde: string, hasta: string): Observable<Cita[]> {
    const q = `desde=${encodeURIComponent(desde)}&hasta=${encodeURIComponent(hasta)}`;
    return this.get<{ data: Cita[] }>(`${this.base}?${q}`).pipe(map((r) => r.data || []));
  }

  cita(id: string): Observable<Cita> {
    return this.get<{ data: Cita }>(`${this.base}/${encodeURIComponent(id)}`).pipe(map((r) => r.data));
  }

  disponibilidad(p: { fecha: string; duracion?: number; servicios?: string[]; persona?: string | null }): Observable<Disponibilidad> {
    const partes = [`fecha=${encodeURIComponent(p.fecha)}`];
    if (p.duracion) partes.push(`duracion=${p.duracion}`);
    if (p.servicios?.length) partes.push(`servicios=${encodeURIComponent(p.servicios.join(','))}`);
    if (p.persona) partes.push(`persona=${encodeURIComponent(p.persona)}`);
    return this.getSinLoader<{ data: Disponibilidad }>(`${this.base}/disponibilidad?${partes.join('&')}`).pipe(map((r) => r.data));
  }

  crear(entrada: EntradaCita): Observable<Cita> {
    return this.post<{ data: Cita }>(this.base, entrada).pipe(map((r) => r.data));
  }

  mover(id: string, cambios: { date?: string; startTime?: string; window?: string; staffId?: string | null; durationMinutes?: number }): Observable<Cita> {
    return this.put<{ data: Cita }>(`${this.base}/${encodeURIComponent(id)}/mover`, cambios).pipe(map((r) => r.data));
  }

  cambiarEstado(id: string, status: EstadoCita, reason?: string): Observable<Cita> {
    return this.put<{ data: Cita }>(`${this.base}/${encodeURIComponent(id)}/estado`, { status, reason }).pipe(map((r) => r.data));
  }

  editar(id: string, cambios: { notes?: string; customer?: any; location?: any }): Observable<Cita> {
    return this.patch<{ data: Cita }>(`${this.base}/${encodeURIComponent(id)}`, cambios).pipe(map((r) => r.data));
  }

  /** Clientes de la empresa para elegir (mismo buscador del encabezado, sin pantalla de carga). */
  buscarClientes(term: string): Observable<any[]> {
    return this.postSinLoader<any[]>('/v1/clients/search', { term, limit: 8 });
  }
}
