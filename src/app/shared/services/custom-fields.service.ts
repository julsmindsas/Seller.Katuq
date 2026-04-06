import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

export interface CustomFieldConfig {
  id: string;
  etiqueta: string;
  tipo: 'text' | 'number' | 'select' | 'checkbox' | 'date' | 'textarea';
  requerido: boolean;
  grupo?: string;
  orden: number;
  validacion?: {
    min?: number;
    max?: number;
    step?: number;
    maxLength?: number;
    pattern?: string;
  };
  opciones?: { valor: string; etiqueta: string }[];
}

export interface CustomFieldGroup {
  id: string;
  nombre: string;
  descripcion?: string;
  contexto: 'carrito' | 'pedido' | 'producto';
  campos: CustomFieldConfig[];
  activo: boolean;
  orden: number;
}

@Injectable({
  providedIn: 'root'
})
export class CustomFieldsService {
  private apiUrl = `${environment.urlApi}/v1/custom-fields`;
  private cache: CustomFieldGroup[] | null = null;

  constructor(private http: HttpClient) {}

  /**
   * Obtiene los grupos activos para un contexto (cacheado).
   * Uso en venta asistida: getActiveGroups('carrito')
   */
  getActiveGroups(contexto?: string): Observable<CustomFieldGroup[]> {
    if (this.cache) {
      const filtered = contexto
        ? this.cache.filter(g => g.contexto === contexto)
        : this.cache;
      return of(filtered);
    }

    return this.http.get<{ success: boolean; data: CustomFieldGroup[] }>(
      `${this.apiUrl}/config/active`
    ).pipe(
      map(res => res.data || []),
      tap(groups => { this.cache = groups; }),
      map(groups => contexto ? groups.filter(g => g.contexto === contexto) : groups),
      catchError(() => of([]))
    );
  }

  /**
   * Obtiene todos los grupos (para admin).
   */
  getAllGroups(): Observable<CustomFieldGroup[]> {
    return this.http.get<{ success: boolean; data: CustomFieldGroup[] }>(
      `${this.apiUrl}/config`,
      {}
    ).pipe(
      map(res => res.data || []),
      catchError(() => of([]))
    );
  }

  /**
   * Crear grupo de campos.
   */
  createGroup(group: Partial<CustomFieldGroup>): Observable<any> {
    return this.http.post(`${this.apiUrl}/config`, group, {}).pipe(
      tap(() => { this.cache = null; })
    );
  }

  /**
   * Actualizar grupo.
   */
  updateGroup(groupId: string, group: Partial<CustomFieldGroup>): Observable<any> {
    return this.http.put(`${this.apiUrl}/config/${groupId}`, group, {}).pipe(
      tap(() => { this.cache = null; })
    );
  }

  /**
   * Eliminar grupo.
   */
  deleteGroup(groupId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/config/${groupId}`, {}).pipe(
      tap(() => { this.cache = null; })
    );
  }

  /**
   * Invalida el cache (ej: cuando se cambia de empresa).
   */
  clearCache(): void {
    this.cache = null;
  }

  /**
   * Obtiene los sub-grupos unicos de un grupo de campos.
   */
  getSubgroups(group: CustomFieldGroup): string[] {
    const subgroups = new Set<string>();
    (group.campos || []).forEach(c => {
      if (c.grupo) subgroups.add(c.grupo);
    });
    return Array.from(subgroups);
  }

  /**
   * Filtra campos por sub-grupo.
   */
  getFieldsBySubgroup(group: CustomFieldGroup, subgroup: string): CustomFieldConfig[] {
    return (group.campos || [])
      .filter(c => c.grupo === subgroup)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }

  /**
   * Obtiene campos sin sub-grupo.
   */
  getFieldsWithoutSubgroup(group: CustomFieldGroup): CustomFieldConfig[] {
    return (group.campos || [])
      .filter(c => !c.grupo)
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
  }
}
