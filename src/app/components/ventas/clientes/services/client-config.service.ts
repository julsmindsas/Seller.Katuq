import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { MaestroService } from '../../../../shared/services/maestros/maestro.service';

export interface ClientTag {
  name: string;
  color: string; // 'violet' | 'green' | 'blue' | 'amber' | 'red' | 'gray'
}

const TAG_COLORS = ['violet', 'green', 'blue', 'amber', 'red', 'gray'];

@Injectable({ providedIn: 'root' })
export class ClientConfigService {

  private cachedTags: ClientTag[] | null = null;

  constructor(private maestroService: MaestroService) {}

  getColors(): string[] {
    return TAG_COLORS;
  }

  // Devuelve el cache local (para uso sincrónico en el template)
  getClientTags(): ClientTag[] {
    return this.cachedTags || [];
  }

  // Carga las etiquetas desde el backend y actualiza el cache
  loadClientTags(): Observable<ClientTag[]> {
    return (this.maestroService.getClientTags() as Observable<any>).pipe(
      map((tags: any) => Array.isArray(tags) ? tags as ClientTag[] : []),
      tap((tags: ClientTag[]) => { this.cachedTags = tags; }),
      catchError(() => {
        this.cachedTags = this.cachedTags || [];
        return of(this.cachedTags as ClientTag[]);
      })
    ) as Observable<ClientTag[]>;
  }

  removeTagFromClients(tagName: string): Observable<any> {
    return this.maestroService.removeTagFromClients(tagName).pipe(
      catchError((err) => {
        console.error('[ClientConfig] removeTagFromClients error:', err?.status, err?.message, err?.error);
        return of({ updated: 0, error: true });
      })
    );
  }

  saveClientTags(tags: ClientTag[]): Observable<any> {
    this.cachedTags = [...tags];
    return this.maestroService.saveClientTags(tags).pipe(
      catchError(() => of({ msg: 'error' }))
    );
  }
}
