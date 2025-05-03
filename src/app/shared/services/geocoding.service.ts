import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface GeocodingResponse {
  id: string;
  direccion: string;
  ciudad: string;
  pais: string;
  latitud: string;
  longitud: string;
  coordDestino: string;
  quality: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private apiUrl = 'https://us-central1-bluerp-107bd.cloudfunctions.net/api/v1/addresses/geocoder';

  constructor(private http: HttpClient) { }

  /**
   * Geocodifica una dirección para obtener sus coordenadas
   * @param direccion La dirección a geocodificar
   * @param ciudad La ciudad de la dirección
   * @returns Un Observable con la respuesta de geocodificación
   */
  geocodeDireccion(direccion: string, ciudad: string): Observable<GeocodingResponse> {
    return this.http.post<GeocodingResponse>(this.apiUrl, {
      direccion,
      ciudad
    });
  }
} 