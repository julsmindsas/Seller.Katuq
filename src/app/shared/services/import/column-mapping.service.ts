import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ColumnMappingRequest, ColumnMappingResult } from '../../models/column-mapping.model';

@Injectable({
  providedIn: 'root'
})
export class ColumnMappingService {
  private apiUrl = environment.urlApi;

  constructor(private http: HttpClient) {}

  /**
   * Llama al endpoint de KAI para obtener sugerencias de mapeo de columnas
   * @param request Datos de las columnas y filas de ejemplo
   * @param company Nombre de la empresa (del localStorage)
   * @returns Observable con el resultado del mapeo
   */
  suggestColumnMapping(request: ColumnMappingRequest, company: string): Observable<ColumnMappingResult> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'company': company
    });

    return this.http.post<ColumnMappingResult>(
      `${this.apiUrl}/v1/katuqintelligence/kai/column-mapping`,
      request,
      { headers }
    );
  }

  /**
   * Extrae las columnas de un array de objetos (datos Excel/JSON parseados)
   * @param data Array de objetos con los datos
   * @returns Array de nombres de columnas
   */
  extractColumns(data: any[]): string[] {
    if (!data || data.length === 0) {
      return [];
    }

    return Object.keys(data[0]);
  }

  /**
   * Obtiene las primeras N filas de muestra
   * @param data Array de datos
   * @param maxRows Numero maximo de filas (default: 3)
   * @returns Array con las primeras N filas
   */
  getSampleRows(data: any[], maxRows: number = 3): any[] {
    if (!data || data.length === 0) {
      return [];
    }

    return data.slice(0, maxRows);
  }
}
