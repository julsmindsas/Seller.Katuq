import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { CorporateClientsService } from './corporate-clients.service';
import { ClientTag } from './client-config.service';

const TAG_COLORS = ['violet', 'green', 'blue', 'amber', 'red', 'gray'];

/**
 * Catálogo de etiquetas de Clientes Corporativos (CRM) — INDEPENDIENTE del de
 * clientes. Persiste en companyConfig.<company>.corporateTags vía
 * /v1/corporate-clients/tags. NO comparte storage con ClientConfigService.
 */
@Injectable({ providedIn: 'root' })
export class CorporateConfigService {

  private cachedTags: ClientTag[] | null = null;

  constructor(private corpService: CorporateClientsService) {}

  getColors(): string[] {
    return TAG_COLORS;
  }

  // Cache local para uso sincrónico en el template
  getTags(): ClientTag[] {
    return this.cachedTags || [];
  }

  loadTags(): Observable<ClientTag[]> {
    return (this.corpService.getCorporateTags() as Observable<any>).pipe(
      map((tags: any) => (Array.isArray(tags) ? tags as ClientTag[] : [])),
      tap((tags: ClientTag[]) => { this.cachedTags = tags; }),
      catchError(() => {
        this.cachedTags = this.cachedTags || [];
        return of(this.cachedTags as ClientTag[]);
      }),
    ) as Observable<ClientTag[]>;
  }

  saveTags(tags: ClientTag[]): Observable<any> {
    this.cachedTags = [...tags];
    return this.corpService.saveCorporateTags(tags).pipe(
      catchError(() => of({ msg: 'error' })),
    );
  }

  removeTag(tagName: string): Observable<any> {
    return this.corpService.removeCorporateTag(tagName).pipe(
      catchError(() => of({ updated: 0, error: true })),
    );
  }
}
