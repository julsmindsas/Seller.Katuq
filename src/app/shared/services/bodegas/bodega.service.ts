import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, of } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { catchError, tap, map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  private apiUrl = environment.urlApi + '/v1/bodegas';
  // Bodega seleccionada actualmente
  private bodegaSeleccionadaBS = new BehaviorSubject<any>(null);

  constructor(private http: HttpClient) { }

  // Obtener todas las bodegas
  getBodegas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/all`)
      .pipe(
        map(bodegas => bodegas.map(bodega => ({
          ...bodega,
          // No necesitamos mapear cd a id ya que la API ya devuelve el id correctamente
        })))
      );
  }

  getBodegasByChannelName(channelName: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/channels/${channelName}/associated-bodegas-by-name`)
      .pipe(
        map(bodegas => bodegas.map(bodega => ({
          ...bodega,
        })))
      );
  }
  // Obtener bodegas activas
  getActiveBodegas(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/active`)
      .pipe(
        map(bodegas => bodegas.map(bodega => ({
          ...bodega,
          // No necesitamos mapear cd a id ya que la API ya devuelve el id correctamente
        })))
      );
  }

  // Obtener bodega por nombre
  getBodegaByName(nombre: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/byName`, { nombre });
  }

  // Métodos para la bodega seleccionada
  getBodegaSeleccionada(): Observable<any> {
    return this.bodegaSeleccionadaBS.asObservable();
  }

  seleccionarBodega(bodega: any): void {
    this.bodegaSeleccionadaBS.next(bodega);
  }

  // Crear bodega
  agregarBodega(bodega: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/create`, bodega);
  }

  // Editar bodega
  actualizarBodega(bodega: any): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/edit`, bodega);
  }

  // Eliminar bodega
  eliminarBodega(id: number): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/remove`, { id });
  }

  // NUEVOS MÉTODOS PARA LA ASOCIACIÓN DE CANALES Y BODEGAS

  // Obtener bodegas asociadas a un canal
  getBodegasPorCanal(canalId: string, includeDetails: boolean = true): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/channels/${canalId}/associated-bodegas${includeDetails ? '?includeDetails=true' : ''}`)
      .pipe(
        map(bodegas => bodegas.map(bodega => ({
          ...bodega,
          id: bodega.cd // Mapeamos cd a id
        }))),
        tap(response => console.log(`Bodegas asociadas al canal ${canalId}:`, response)),
        catchError(error => {
          console.error(`Error al obtener bodegas asociadas al canal ${canalId}:`, error);
          throw error;
        })
      );
  }

  // Obtener canales asociados a una bodega
  getCanalesPorBodega(bodegaId: string, includeDetails: boolean = true): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${bodegaId}/associated-channels${includeDetails ? '?includeDetails=true' : ''}`)
      .pipe(
        tap(response => console.log(`Canales asociados a la bodega ${bodegaId}:`, response)),
        catchError(error => {
          console.error(`Error al obtener canales asociados a la bodega ${bodegaId}:`, error);
          throw error;
        })
      );
  }

  // Asociar múltiples bodegas a un canal
  asociarBodegasACanal(canalId: string, bodegaIds: string[]): Observable<any> {
    console.log(`Asociando bodegas ${bodegaIds.join(', ')} al canal ${canalId}`);
    return this.http.post<any>(`${this.apiUrl}/channels/${canalId}/associate-bodegas`, { bodegaIds })
      .pipe(
        tap(response => console.log('Respuesta al asociar bodegas a canal:', response)),
        catchError(error => {
          console.error('Error al asociar bodegas a canal:', error);
          throw error;
        })
      );
  }

  // Desasociar múltiples bodegas de un canal
  desasociarBodegasDeCanal(canalId: string, bodegaIds: string[]): Observable<any> {
    console.log(`Desasociando bodegas ${bodegaIds.join(', ')} del canal ${canalId}`);
    return this.http.post<any>(`${this.apiUrl}/channels/${canalId}/disassociate-bodegas`, { bodegaIds })
      .pipe(
        tap(response => console.log('Respuesta al desasociar bodegas de canal:', response)),
        catchError(error => {
          console.error('Error al desasociar bodegas de canal:', error);
          throw error;
        })
      );
  }

  // Asociar una bodega a un canal (método individual para compatibilidad)
  asociarCanalABodega(bodegaId: string, canalId: string): Observable<any> {
    return this.asociarBodegasACanal(canalId, [bodegaId]);
  }

  // Desasociar una bodega de un canal (método individual para compatibilidad)
  desasociarCanalDeBodega(bodegaId: string, canalId: string): Observable<any> {
    return this.desasociarBodegasDeCanal(canalId, [bodegaId]);
  }

  // Método de utilidad para verificar la integración
  verificarIntegracionBodegaCanal(): void {
    console.log('=== Iniciando verificación de integración Bodega-Canal ===');
    console.log(`URL Base: ${this.apiUrl}`);
    console.log('Endpoints disponibles:');
    console.log(`- Asociar múltiples bodegas a canal: POST ${this.apiUrl}/channels/{channelId}/associate-bodegas`);
    console.log(`- Desasociar múltiples bodegas de canal: POST ${this.apiUrl}/channels/{channelId}/disassociate-bodegas`);
    console.log(`- Obtener bodegas asociadas a canal: GET ${this.apiUrl}/channels/{channelId}/associated-bodegas`);
    console.log(`- Obtener canales asociados a bodega: GET ${this.apiUrl}/{bodegaId}/associated-channels`);
    console.log('=== Fin de la verificación ===');
  }
}