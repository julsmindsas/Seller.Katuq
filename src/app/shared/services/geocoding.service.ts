import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';

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

// Interfaces para respuestas de diferentes APIs
interface GoogleMapsResponse {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: {
        lat: number;
        lng: number;
      };
    };
  }>;
  status: string;
}

interface OpenRouteResponse {
  features: Array<{
    properties: {
      label: string;
    };
    geometry: {
      coordinates: [number, number]; // [lng, lat]
    };
  }>;
}

interface NominatimResponse {
  display_name: string;
  lat: string;
  lon: string;
}

enum GeocodingProvider {
  FIREBASE = 'firebase',
  GOOGLE_MAPS = 'google_maps',
  OPEN_ROUTE = 'open_route',
  NOMINATIM = 'nominatim'
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private firebaseApiUrl = 'https://us-central1-bluerp-107bd.cloudfunctions.net/api/v1/addresses/geocoder';
  private providerStats = new Map<GeocodingProvider, { success: number, errors: number }>();
  private lastProviderUsed: GeocodingProvider | null = null;

  constructor(private http: HttpClient) {
    // Inicializar estadísticas
    Object.values(GeocodingProvider).forEach(provider => {
      this.providerStats.set(provider, { success: 0, errors: 0 });
    });
  }

  /**
   * Geocodifica una dirección usando el sistema de fallback
   * @param direccion La dirección a geocodificar
   * @param ciudad La ciudad de la dirección
   * @returns Un Observable con la respuesta de geocodificación
   */
  geocodeDireccion(direccion: string, ciudad: string): Observable<GeocodingResponse> {
    console.log(`🌍 Iniciando geocodificación: ${direccion}, ${ciudad}`);
    
    return new Observable(observer => {
      this.geocodeWithFallback(direccion, ciudad).then(result => {
        observer.next(result);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Lógica principal de fallback entre proveedores
   */
  private async geocodeWithFallback(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const providers = [
      GeocodingProvider.GOOGLE_MAPS,
      GeocodingProvider.FIREBASE,
      GeocodingProvider.OPEN_ROUTE,
      GeocodingProvider.NOMINATIM
    ];

    let lastError: any = null;

    for (const provider of providers) {
      try {
        console.log(`🔄 Intentando geocodificación con ${provider}...`);
        const result = await this.geocodeWithProvider(provider, direccion, ciudad);
        
        // Actualizar estadísticas de éxito
        const stats = this.providerStats.get(provider)!;
        stats.success++;
        this.lastProviderUsed = provider;
        
        console.log(`✅ Geocodificación exitosa con ${provider}:`, result);
        return result;
        
      } catch (error) {
        console.warn(`❌ Error con ${provider}:`, error);
        
        // Actualizar estadísticas de error
        const stats = this.providerStats.get(provider)!;
        stats.errors++;
        lastError = error;
        
        // Continuar con el siguiente proveedor
        continue;
      }
    }

    // Si llegamos aquí, todos los proveedores fallaron
    console.error('❌ Todos los proveedores de geocodificación fallaron');
    throw new Error(`Geocodificación falló con todos los proveedores. Último error: ${lastError?.message || 'Desconocido'}`);
  }

  /**
   * Geocodifica usando un proveedor específico
   */
  private async geocodeWithProvider(provider: GeocodingProvider, direccion: string, ciudad: string): Promise<GeocodingResponse> {
    switch (provider) {
      case GeocodingProvider.FIREBASE:
        return this.geocodeWithFirebase(direccion, ciudad);
      
      case GeocodingProvider.GOOGLE_MAPS:
        return this.geocodeWithGoogleMaps(direccion, ciudad);
      
      case GeocodingProvider.OPEN_ROUTE:
        return this.geocodeWithOpenRoute(direccion, ciudad);
      
      case GeocodingProvider.NOMINATIM:
        return this.geocodeWithNominatim(direccion, ciudad);
      
      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  /**
   * Geocodificación con el servicio Firebase original
   */
  private async geocodeWithFirebase(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    return this.http.post<GeocodingResponse>(this.firebaseApiUrl, {
      direccion,
      ciudad
    }).pipe(
      timeout(5000), // 5 segundos timeout
      retry(1) // 1 retry
    ).toPromise();
  }

  /**
   * Geocodificación con Google Maps API via proxy
   */
  private async geocodeWithGoogleMaps(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json`;
    
    const response = await this.http.get<GoogleMapsResponse>(url, {
      params: {
        address: query,
        key: environment.geocoding.googleMaps.apiKey,
        region: 'CO' // Bias hacia Colombia
      }
    }).pipe(
      timeout(7000) // 7 segundos timeout
    ).toPromise();

    if (!response || response.status !== 'OK' || !response.results || response.results.length === 0) {
      throw new Error(`Google Maps API error: ${response?.status || 'No results'}`);
    }

    const result = response.results[0];
    return this.normalizeGoogleMapsResponse(result, direccion, ciudad);
  }

  /**
   * Geocodificación con OpenRouteService via proxy
   */
  private async geocodeWithOpenRoute(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;
    const url = `https://api.openrouteservice.org/geocode/search`;
    
    const response = await this.http.get<OpenRouteResponse>(url, {
      params: {
        text: query,
        api_key: environment.geocoding.openRouteService.apiKey,
        boundary_country: 'CO', // Limite a Colombia
        size: '1' // Solo el primer resultado
      }
    }).pipe(
      timeout(8000) // 8 segundos timeout
    ).toPromise();

    if (!response || !response.features || response.features.length === 0) {
      throw new Error('OpenRouteService API error: No results');
    }

    const result = response.features[0];
    return this.normalizeOpenRouteResponse(result, direccion, ciudad);
  }

  /**
   * Geocodificación con Nominatim (OpenStreetMap) - fallback gratuito
   */
  private async geocodeWithNominatim(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;
    const url = `https://nominatim.openstreetmap.org/search`;
    
    const response = await this.http.get<NominatimResponse[]>(url, {
      params: {
        q: query,
        format: 'json',
        countrycodes: 'CO', // Solo Colombia
        limit: '1',
        addressdetails: '1'
      },
      headers: {
        'User-Agent': 'KatuqSeller/1.0' // Nominatim requiere User-Agent
      }
    }).pipe(
      timeout(10000) // 10 segundos timeout
    ).toPromise();

    if (!response || response.length === 0) {
      throw new Error('Nominatim API error: No results');
    }

    const result = response[0];
    return this.normalizeNominatimResponse(result, direccion, ciudad);
  }

  // Métodos de normalización
  private normalizeGoogleMapsResponse(result: any, direccion: string, ciudad: string): GeocodingResponse {
    return {
      id: `gmaps_${Date.now()}`,
      direccion: direccion,
      ciudad: ciudad,
      pais: 'Colombia',
      latitud: result.geometry.location.lat.toString(),
      longitud: result.geometry.location.lng.toString(),
      coordDestino: `${result.geometry.location.lat},${result.geometry.location.lng}`,
      quality: 8 // Alta calidad para Google Maps
    };
  }

  private normalizeOpenRouteResponse(result: any, direccion: string, ciudad: string): GeocodingResponse {
    const [lng, lat] = result.geometry.coordinates;
    return {
      id: `openroute_${Date.now()}`,
      direccion: direccion,
      ciudad: ciudad,
      pais: 'Colombia',
      latitud: lat.toString(),
      longitud: lng.toString(),
      coordDestino: `${lat},${lng}`,
      quality: 7 // Buena calidad para OpenRoute
    };
  }

  private normalizeNominatimResponse(result: NominatimResponse, direccion: string, ciudad: string): GeocodingResponse {
    return {
      id: `nominatim_${Date.now()}`,
      direccion: direccion,
      ciudad: ciudad,
      pais: 'Colombia',
      latitud: result.lat,
      longitud: result.lon,
      coordDestino: `${result.lat},${result.lon}`,
      quality: 6 // Calidad media para Nominatim
    };
  }

  /**
   * Obtiene estadísticas de uso de los proveedores
   */
  getProviderStats() {
    const stats = {};
    this.providerStats.forEach((value, key) => {
      stats[key] = {
        ...value,
        total: value.success + value.errors,
        successRate: value.success + value.errors > 0 ? 
          Math.round((value.success / (value.success + value.errors)) * 100) : 0
      };
    });
    return {
      providers: stats,
      lastUsed: this.lastProviderUsed
    };
  }

  /**
   * Obtiene el último proveedor utilizado exitosamente
   */
  getLastProviderUsed(): string {
    return this.lastProviderUsed || 'ninguno';
  }
}