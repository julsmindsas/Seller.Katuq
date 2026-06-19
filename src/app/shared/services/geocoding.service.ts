import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, of } from 'rxjs';
import { catchError, timeout, retry } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
import { AngularFirestore } from '@angular/fire/compat/firestore';
import firebase from 'firebase/compat/app';

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
  GEO_BLR = 'geo_blr',
  FIREBASE = 'firebase',
  GOOGLE_MAPS = 'google_maps',
  OPEN_ROUTE = 'open_route',
  NOMINATIM = 'nominatim'
}

interface GeocodingCacheDoc {
  direccionKey: string;
  direccion: string;
  ciudad: string;
  pais: string;
  latitud: string;
  longitud: string;
  coordDestino: string;
  quality: number;
  source: string;
  rawResponse: any;
  createdAt: firebase.firestore.Timestamp;
  lastUsedAt: firebase.firestore.Timestamp;
  hitCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class GeocodingService {
  private firebaseApiUrl = 'https://us-central1-bluerp-107bd.cloudfunctions.net/api/v1/addresses/geocoder';
  private providerStats = new Map<GeocodingProvider, { success: number, errors: number }>();
  private lastProviderUsed: GeocodingProvider | null = null;

  // Cache para evitar geocodificar la misma dirección múltiples veces
  private geocodingCache = new Map<string, { result: GeocodingResponse, timestamp: number }>();
  private readonly CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 horas

  private readonly FIRESTORE_COLLECTION = 'geocoding_cache';

  constructor(
    private http: HttpClient,
    private afs: AngularFirestore
  ) {
    Object.values(GeocodingProvider).forEach(provider => {
      this.providerStats.set(provider, { success: 0, errors: 0 });
    });
  }

  // ─── Caché Firestore ───────────────────────────────────────────────────────

  private buildCacheKey(direccion: string, ciudad: string): string {
    return `${direccion}_${ciudad}`
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // quitar tildes
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 200);
  }

  private async buscarEnCacheFirestore(key: string): Promise<GeocodingResponse | null> {
    try {
      const doc = await this.afs
        .collection<GeocodingCacheDoc>(this.FIRESTORE_COLLECTION)
        .doc(key)
        .get()
        .toPromise();

      if (!doc?.exists) return null;

      const data = doc.data() as GeocodingCacheDoc;

      // Actualizar métricas de uso sin bloquear
      this.afs.collection(this.FIRESTORE_COLLECTION).doc(key).update({
        hitCount: firebase.firestore.FieldValue.increment(1),
        lastUsedAt: firebase.firestore.Timestamp.now()
      }).catch(() => {});

      console.log(`📦 Coordinadas desde caché Firestore: ${data.latitud}, ${data.longitud}`);
      return {
        id: doc.id,
        direccion: data.direccion,
        ciudad: data.ciudad,
        pais: data.pais,
        latitud: data.latitud,
        longitud: data.longitud,
        coordDestino: data.coordDestino,
        quality: data.quality
      };
    } catch (err) {
      console.warn('Error consultando caché Firestore:', err);
      return null;
    }
  }

  private guardarEnCacheFirestore(
    key: string,
    result: GeocodingResponse,
    source: string,
    rawResponse: any = null
  ): void {
    const doc: GeocodingCacheDoc = {
      direccionKey: key,
      direccion: result.direccion,
      ciudad: result.ciudad,
      pais: result.pais,
      latitud: result.latitud,
      longitud: result.longitud,
      coordDestino: result.coordDestino,
      quality: result.quality,
      source,
      rawResponse: rawResponse || null,
      createdAt: firebase.firestore.Timestamp.now(),
      lastUsedAt: firebase.firestore.Timestamp.now(),
      hitCount: 0
    };

    this.afs.collection(this.FIRESTORE_COLLECTION).doc(key).set(doc)
      .then(() => console.log(`💾 Guardado en caché Firestore: ${key}`))
      .catch(err => console.warn('Error guardando en caché Firestore:', err));
  }

  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Geocodifica una dirección usando el sistema de fallback optimizado
   *
   * ORDEN DE FALLBACK SIMPLIFICADO (Enero 2026):
   * 1. GeoBlr API (Latinoamérica) - Calidad 98 - PRIORIDAD MÁXIMA ⭐
   * 2. Google Maps API (directa) - Calidad 95
   * 3. Geocodificación aproximada - Calidad 50 (último recurso)
   *
   * Sistema optimizado: Solo 2 proveedores premium + fallback local
   *
   * @param direccion La dirección a geocodificar
   * @param ciudad La ciudad de la dirección
   * @returns Un Observable con la respuesta de geocodificación
   *
   * @example
   * this.geocodingService.geocodeDireccion('Calle 10 #15-20', 'Medellín')
   *   .subscribe(response => {
   *     console.log(`Coords: ${response.latitud}, ${response.longitud}`);
   *     console.log(`Quality: ${response.quality}`);
   *   });
   */
  geocodeDireccion(direccion: string, ciudad: string): Observable<GeocodingResponse> {
    // Normalizar antes de consultar cualquier API
    const direccionNormalizada = this.normalizarDireccion(direccion, ciudad);
    console.log(`🌍 Iniciando geocodificación: ${direccionNormalizada}`);

    // Verificar caché primero (clave basada en la dirección normalizada)
    const cacheKey = direccionNormalizada.toLowerCase();
    const cached = this.geocodingCache.get(cacheKey);

    if (cached && (Date.now() - cached.timestamp) < this.CACHE_DURATION) {
      console.log(`💾 Resultado desde caché: ${direccionNormalizada}`);
      return of(cached.result);
    }

    return new Observable(observer => {
      const direccionExpandida = this.expandirAbreviaturas(direccion);
      this.geocodeWithFallback(direccionExpandida, ciudad).then(result => {
        this.geocodingCache.set(cacheKey, { result, timestamp: Date.now() });
        observer.next(result);
        observer.complete();
      }).catch(error => {
        observer.error(error);
      });
    });
  }

  /**
   * Expande abreviaturas colombianas en la dirección para mejorar la geocodificación.
   * Ej: "cr 41A #30C-56" → "Carrera 41A #30C-56"
   */
  private expandirAbreviaturas(direccion: string): string {
    const abreviaturas: [RegExp, string][] = [
      [/\bcra?\b/gi, 'Carrera'],
      [/\bcll?\b/gi, 'Calle'],
      [/\bav\b/gi, 'Avenida'],
      [/\btv\b/gi, 'Transversal'],
      [/\bdg\b/gi, 'Diagonal'],
      [/\bac\b/gi, 'Avenida Calle'],
      [/\bak\b/gi, 'Avenida Carrera'],
      [/\bcir\b/gi, 'Circular'],
      [/\bkm\b/gi, 'Kilometro'],
      [/\bno\.\s*/gi, '#'],
    ];

    let dir = direccion.trim().replace(/\s+/g, ' ');
    for (const [pattern, replacement] of abreviaturas) {
      dir = dir.replace(pattern, replacement);
    }
    return dir;
  }

  /**
   * Produce la clave de caché y el string de logging: dirección + ciudad + país.
   */
  private normalizarDireccion(direccion: string, ciudad: string): string {
    return `${this.expandirAbreviaturas(direccion)}, ${ciudad.trim()}, Colombia`;
  }

  /**
   * Lógica principal de fallback entre proveedores
   *
   * ORDEN DE FALLBACK OPTIMIZADO (Enero 2026):
   * 1. GeoBlr (Latinoamérica) - Calidad 98 - PRIORIDAD MÁXIMA ⭐
   * 2. Google Maps API (directa) - Calidad 95
   * 3. Geocodificación aproximada - Calidad 50 (último recurso)
   *
   * ELIMINADOS:
   * - Firebase Backend Proxy (redundante con GeoBlr)
   * - Nominatim OpenStreetMap (baja precisión)
   */
  private async geocodeWithFallback(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const providers = [
      GeocodingProvider.GEO_BLR,
      GeocodingProvider.GOOGLE_MAPS,
      GeocodingProvider.NOMINATIM
    ];

    console.log(`🗺️ Geocodificando: "${direccion}", ciudad: "${ciudad}"`);

    const firestoreKey = this.buildCacheKey(direccion, ciudad);

    for (const provider of providers) {
      // Antes de llamar a Google Maps, consultar caché Firestore
      if (provider === GeocodingProvider.GOOGLE_MAPS) {
        const cached = await this.buscarEnCacheFirestore(firestoreKey);
        if (cached) {
          this.lastProviderUsed = GeocodingProvider.FIREBASE;
          return cached;
        }
      }

      try {
        console.log(`🔄 Intentando con ${provider}...`);
        const result = await this.geocodeWithProvider(provider, direccion, ciudad);

        const stats = this.providerStats.get(provider)!;
        stats.success++;
        this.lastProviderUsed = provider;

        // Guardar en Firestore solo si vino de Google Maps (el que tiene costo)
        if (provider === GeocodingProvider.GOOGLE_MAPS) {
          this.guardarEnCacheFirestore(firestoreKey, result, 'google_maps');
        }

        console.log(`✅ Geocodificación exitosa con ${provider}`);
        return result;
      } catch (error) {
        console.warn(`❌ Error con ${provider}:`, error);
        const stats = this.providerStats.get(provider)!;
        stats.errors++;
        continue;
      }
    }

    console.log(`⚠️ Todos los proveedores fallaron, usando geocodificación aproximada`);
    return this.geocodificacionAproximada(direccion, ciudad);
  }

  /**
   * Geocodifica usando un proveedor específico
   */
  private async geocodeWithProvider(provider: GeocodingProvider, direccion: string, ciudad: string): Promise<GeocodingResponse> {
    switch (provider) {
      case GeocodingProvider.GEO_BLR:
        return this.geocodeWithGeoBlr(direccion, ciudad);

      case GeocodingProvider.FIREBASE:
        return this.geocodeWithFirebase(direccion, ciudad);

      case GeocodingProvider.GOOGLE_MAPS:
        // Intenta REST primero (más confiable), si falla usa el JS SDK
        try {
          return await this.geocodeWithGoogleMapsRest(direccion, ciudad);
        } catch {
          return this.geocodeWithGoogleMaps(direccion, ciudad);
        }

      case GeocodingProvider.OPEN_ROUTE:
        return this.geocodeWithOpenRoute(direccion, ciudad);

      case GeocodingProvider.NOMINATIM:
        return this.geocodeWithNominatim(direccion, ciudad);

      default:
        throw new Error(`Proveedor no soportado: ${provider}`);
    }
  }

  /**
   * Geocodificación con GeoBlr - Proveedor prioritario para Latinoamérica
   *
   * GeoBlr (GEO + Booster Lightning Results) es un servicio de geocodificación
   * especializado en direcciones latinoamericanas con IA avanzada.
   *
   * Características:
   * - Optimizado para Colombia y Latinoamérica
   * - Powered by Google Gemini AI
   * - Alta precisión (calidad 98)
   * - Baja latencia
   */
  private async geocodeWithGeoBlr(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const geoBlrConfig = environment.geocoding.geoBlr;

    if (!geoBlrConfig || !geoBlrConfig.apiKey) {
      console.warn('GeoBlr no configurado correctamente en environment');
      throw new Error('GeoBlr API not configured');
    }

    const url = `${geoBlrConfig.baseUrl}/${geoBlrConfig.endpoint}`;

    console.log(`🌎 Geocodificando con GeoBlr: ${direccion}, ${ciudad}`);

    try {
      const response = await this.http.post<any>(url, {
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        pais: 'Colombia'
      }, {
        headers: {
          'X-API-Key': geoBlrConfig.apiKey,
          'Content-Type': 'application/json'
        }
      }).pipe(
        timeout(8000), // 8 segundos timeout
        catchError(error => {
          console.warn('GeoBlr geocoding failed:', error);
          if (error.status === 400) {
            throw new Error('GeoBlr API error: Bad Request - Invalid address format');
          }
          if (error.status === 401) {
            throw new Error('GeoBlr API error: Invalid API Key');
          }
          if (error.status === 403) {
            throw new Error('GeoBlr API error: ORIGIN not authorized');
          }
          if (error.status === 429) {
            throw new Error('GeoBlr API error: Rate limit exceeded');
          }
          throw new Error(`GeoBlr API error: ${error.message || 'Service unavailable'}`);
        })
      ).toPromise();

      if (!response) {
        throw new Error('GeoBlr API error: Empty response');
      }

      const lat = parseFloat(response.latitud);
      const lng = parseFloat(response.longitud);

      if (!lat || !lng || lat === 0 || lng === 0) {
        throw new Error('GeoBlr API error: Coordinates not found (0,0) — falling back');
      }

      console.log(`✅ GeoBlr geocoding exitoso: ${lat}, ${lng}`);

      // Normalizar la respuesta al formato GeocodingResponse
      return {
        id: `geoblr_${Date.now()}`,
        direccion: response.direccion || direccion,
        ciudad: response.ciudad || ciudad,
        pais: response.pais || 'Colombia',
        latitud: lat.toString(),
        longitud: lng.toString(),
        coordDestino: `${lat},${lng}`,
        quality: 98 // Alta calidad para GeoBlr
      };
    } catch (error) {
      console.warn('GeoBlr geocoding error:', error);
      throw error;
    }
  }

  /**
   * Geocodificación con el servicio Firebase original
   */
  private async geocodeWithFirebase(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    try {
      const response = await this.http.post<GeocodingResponse>(this.firebaseApiUrl, {
        direccion: direccion.trim(),
        ciudad: ciudad.trim(),
        pais: 'Colombia'
      }).pipe(
        timeout(8000), // 8 segundos timeout
        catchError(error => {
          console.warn('Firebase geocoding failed:', error);
          if (error.status === 400) {
            throw new Error('Firebase API error: Bad Request - Invalid address format');
          }
          throw new Error(`Firebase API error: ${error.message || 'Service unavailable'}`);
        })
      ).toPromise();

      if (!response) {
        throw new Error('Firebase API error: Empty response');
      }

      return response;
    } catch (error) {
      console.warn('Firebase geocoding error:', error);
      throw error;
    }
  }

  /**
   * Geocodificación con Google Maps REST API — HTTP GET directo, sin cargar el JS SDK.
   * Más confiable que la versión JS en entornos con restricciones de carga dinámica.
   */
  private async geocodeWithGoogleMapsRest(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&region=CO&key=${environment.geocoding.googleMaps.apiKey}`;

    const data = await this.http.get<any>(url).pipe(
      timeout(8000),
      catchError(error => { throw new Error(`GMaps REST error: ${error.message}`); })
    ).toPromise();

    if (!data || data.status !== 'OK' || !data.results?.length) {
      throw new Error(`GMaps REST: ${data?.status || 'sin respuesta'} para "${query}"`);
    }

    const loc = data.results[0].geometry.location;
    return {
      id: `gmaps_rest_${Date.now()}`,
      direccion,
      ciudad,
      pais: 'Colombia',
      latitud: loc.lat.toString(),
      longitud: loc.lng.toString(),
      coordDestino: `${loc.lat},${loc.lng}`,
      quality: 95
    };
  }

  /**
   * Geocodificación con Google Maps API using JavaScript API directly
   */
  private async geocodeWithGoogleMaps(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;
    console.log(`🌍 Geocodificando con Google Maps: ${query}`);

    try {
      // Load Google Maps API if not already loaded
      await this.loadGoogleMapsAPI();

      // Use Google Maps Geocoding Service
      const geocoder = new (window as any).google.maps.Geocoder();

      const result = await new Promise<any>((resolve, reject) => {
        // Set timeout for geocoding request
        const timeoutId = setTimeout(() => {
          reject(new Error('Google Maps geocoding timeout (7 seconds)'));
        }, 7000);

        geocoder.geocode(
          {
            address: query,
            region: 'CO',
            componentRestrictions: {
              country: 'CO'
            }
          },
          (results: any[], status: string) => {
            clearTimeout(timeoutId);

            if (status === 'OK' && results && results.length > 0) {
              resolve(results[0]);
            } else {
              let errorMessage = `Google Maps geocoding failed: ${status}`;

              // Provide more specific error messages
              switch (status) {
                case 'ZERO_RESULTS':
                  errorMessage = 'No se encontraron resultados para la dirección especificada';
                  break;
                case 'OVER_QUERY_LIMIT':
                  errorMessage = 'Se ha excedido el límite de consultas de la API de Google Maps';
                  break;
                case 'REQUEST_DENIED':
                  errorMessage = 'La solicitud fue denegada por Google Maps API';
                  break;
                case 'INVALID_REQUEST':
                  errorMessage = 'La solicitud de geocodificación es inválida';
                  break;
                case 'UNKNOWN_ERROR':
                  errorMessage = 'Error desconocido del servidor de Google Maps';
                  break;
              }

              reject(new Error(errorMessage));
            }
          }
        );
      });

      const location = result.geometry.location;
      const lat = typeof location.lat === 'function' ? location.lat() : location.lat;
      const lng = typeof location.lng === 'function' ? location.lng() : location.lng;

      console.log(`✅ Google Maps result: ${lat}, ${lng}`);

      return {
        id: `gmaps_${Date.now()}`,
        direccion: direccion,
        ciudad: ciudad,
        pais: 'Colombia',
        latitud: lat.toString(),
        longitud: lng.toString(),
        coordDestino: `${lat},${lng}`,
        quality: 95 // Alta calidad para Google Maps directo
      };
    } catch (error) {
      console.warn('Google Maps geocoding error:', error);
      throw new Error(`Google Maps API error: ${error.message || 'Geocoding failed'}`);
    }
  }

  /**
   * Load Google Maps JavaScript API dynamically
   */
  private async loadGoogleMapsAPI(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if Google Maps API is already loaded
      if ((window as any).google && (window as any).google.maps) {
        resolve();
        return;
      }

      // Check if script is already being loaded
      if (document.querySelector('script[src*="maps.googleapis.com"]')) {
        // Wait for the script to load with timeout
        let attempts = 0;
        const maxAttempts = 50; // 5 seconds maximum wait
        const checkGoogleMaps = () => {
          attempts++;
          if ((window as any).google && (window as any).google.maps) {
            resolve();
          } else if (attempts >= maxAttempts) {
            reject(new Error('Timeout waiting for Google Maps API to load'));
          } else {
            setTimeout(checkGoogleMaps, 100);
          }
        };
        checkGoogleMaps();
        return;
      }

      // Load the Google Maps API script
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = `https://maps.googleapis.com/maps/api/js?key=${environment.geocoding.googleMaps.apiKey}&libraries=geometry`;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        console.log('✅ Google Maps API loaded successfully');
        resolve();
      };

      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps API:', error);
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });
  }

  /**
   * Geocodificación con OpenRouteService via backend proxy
   */
  private async geocodeWithOpenRoute(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    const query = `${direccion}, ${ciudad}, Colombia`;

    // Usar el endpoint backend para evitar CORS
    const response = await this.http.post<any>(`${environment.urlApi}/geocoding/openroute`, {
      text: query,
      boundary_country: 'CO'
    }).pipe(
      timeout(8000), // 8 segundos timeout
      catchError(error => {
        console.warn('OpenRouteService via backend failed:', error);
        throw new Error(`OpenRouteService API error: ${error.message || 'Backend proxy failed'}`);
      })
    ).toPromise();

    if (!response || !response.lat || !response.lng) {
      throw new Error('OpenRouteService API error: Invalid response from backend');
    }

    return {
      id: `openroute_${Date.now()}`,
      direccion: direccion,
      ciudad: ciudad,
      pais: 'Colombia',
      latitud: response.lat.toString(),
      longitud: response.lng.toString(),
      coordDestino: `${response.lat},${response.lng}`,
      quality: 80
    };
  }

  /**
   * Geocodificación con Nominatim usando múltiples estrategias
   */
  private async geocodeWithNominatim(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    // Array de diferentes formatos de búsqueda para probar
    const queryFormats = [
      `${direccion}, ${ciudad}, Colombia`,
      `${direccion}, ${ciudad}`,
      `${ciudad}, Colombia`,
      `${ciudad}, Antioquia, Colombia`,
      `${ciudad}`,
      `${direccion}`
    ];

    console.log(`🗺️ Geocodificando con Nominatim: ${direccion}, ${ciudad}`);

    // Intentar con diferentes formatos
    for (let i = 0; i < queryFormats.length; i++) {
      const query = queryFormats[i];
      console.log(`🔄 Intento ${i + 1}/${queryFormats.length}: ${query}`);

      try {
        const response = await this.http.get<NominatimResponse[]>(`https://nominatim.openstreetmap.org/search`, {
          params: {
            q: query,
            format: 'json',
            countrycodes: 'CO',
            limit: '3', // Más resultados para mayor posibilidad
            addressdetails: '1'
          }
        }).pipe(
          timeout(10000),
          catchError(error => {
            console.warn(`Nominatim attempt ${i + 1} failed:`, error);
            throw error;
          })
        ).toPromise();

        if (response && response.length > 0) {
          console.log(`✅ Resultado encontrado en intento ${i + 1}`);
          const result = response[0];
          return this.normalizeNominatimResponse(result, direccion, ciudad);
        }
      } catch (error) {
        console.warn(`❌ Intento ${i + 1} falló:`, error);
        continue;
      }
    }

    // Si todos los intentos fallaron, intentar geocodificación aproximada
    return this.geocodificacionAproximada(direccion, ciudad);
  }

  /**
   * Geocodificación aproximada para cuando falla la exacta
   */
  private async geocodificacionAproximada(direccion: string, ciudad: string): Promise<GeocodingResponse> {
    console.log(`🎯 Intentando geocodificación aproximada para ${ciudad}`);

    // Coordenadas aproximadas para ciudades principales de Colombia
    const ciudadesConocidas: { [key: string]: { lat: number, lng: number } } = {
      // Área Metropolitana de Medellín
      'medellín': { lat: 6.2442, lng: -75.5812 },
      'medellin': { lat: 6.2442, lng: -75.5812 },
      'envigado': { lat: 6.1629, lng: -75.5891 },
      'itagüí': { lat: 6.1644, lng: -75.5996 },
      'itagui': { lat: 6.1644, lng: -75.5996 },
      'bello': { lat: 6.3370, lng: -75.5559 },
      'sabaneta': { lat: 6.1515, lng: -75.6166 },
      'la estrella': { lat: 6.1581, lng: -75.6414 },
      'caldas': { lat: 6.0930, lng: -75.6339 },
      'copacabana': { lat: 6.3460, lng: -75.5076 },
      'girardota': { lat: 6.3797, lng: -75.4473 },
      'barbosa': { lat: 6.4389, lng: -75.3314 },

      // Principales ciudades de Colombia
      'bogotá': { lat: 4.6097, lng: -74.0817 },
      'bogota': { lat: 4.6097, lng: -74.0817 },
      'cali': { lat: 3.4516, lng: -76.5320 },
      'barranquilla': { lat: 10.9639, lng: -74.7964 },
      'cartagena': { lat: 10.3910, lng: -75.4794 },
      'bucaramanga': { lat: 7.1253, lng: -73.1198 },
      'pereira': { lat: 4.8133, lng: -75.6961 },
      'manizales': { lat: 5.0703, lng: -75.5138 },
      'armenia': { lat: 4.5339, lng: -75.6811 },
      'ibagué': { lat: 4.4389, lng: -75.2322 },
      'ibague': { lat: 4.4389, lng: -75.2322 },
      'santa marta': { lat: 11.2408, lng: -74.1990 },
      'villavicencio': { lat: 4.1420, lng: -73.6266 },
      'montería': { lat: 8.7479, lng: -75.8814 },
      'monteria': { lat: 8.7479, lng: -75.8814 },
      'pasto': { lat: 1.2136, lng: -77.2811 },
      'neiva': { lat: 2.9273, lng: -75.2819 },
      'popayán': { lat: 2.4448, lng: -76.6147 },
      'popayan': { lat: 2.4448, lng: -76.6147 },
      'valledupar': { lat: 10.4631, lng: -73.2532 },
      'sincelejo': { lat: 9.3047, lng: -75.3978 },
      'tunja': { lat: 5.5353, lng: -73.3678 },
      'florencia': { lat: 1.6144, lng: -75.6062 },
      'cucuta': { lat: 7.8939, lng: -72.5078 },
      'cúcuta': { lat: 7.8939, lng: -72.5078 }
    };

    const ciudadNormalizada = ciudad.toLowerCase()
      .replace(/á/g, 'a')
      .replace(/é/g, 'e')
      .replace(/í/g, 'i')
      .replace(/ó/g, 'o')
      .replace(/ú/g, 'u')
      .replace(/ñ/g, 'n')
      .trim();

    if (ciudadesConocidas[ciudadNormalizada]) {
      const coords = ciudadesConocidas[ciudadNormalizada];
      console.log(`✅ Coordenadas aproximadas encontradas para ${ciudad}: ${coords.lat}, ${coords.lng}`);

      return {
        id: `aproximada_${Date.now()}`,
        direccion: direccion,
        ciudad: ciudad,
        pais: 'Colombia',
        latitud: coords.lat.toString(),
        longitud: coords.lng.toString(),
        coordDestino: `${coords.lat},${coords.lng}`,
        quality: 50 // Calidad baja porque es aproximada
      };
    }

    // Como último recurso, usar centro de Colombia
    console.log(`⚠️ Usando coordenadas genéricas de Colombia para ${ciudad}`);
    return {
      id: `colombia_${Date.now()}`,
      direccion: direccion,
      ciudad: ciudad,
      pais: 'Colombia',
      latitud: '4.5709',
      longitud: '-74.2973',
      coordDestino: '4.5709,-74.2973',
      quality: 25 // Calidad muy baja
    };
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
      quality: 95 // Alta calidad para Google Maps
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

  /**
   * Verifica si Google Maps API está disponible
   */
  isGoogleMapsAvailable(): boolean {
    return !!(window as any).google && !!(window as any).google.maps;
  }

  /**
   * Limpiar caché de geocodificación (útil para pruebas)
   */
  clearCache(): void {
    this.geocodingCache.clear();
    console.log('🗑️ Caché de geocodificación limpiado');
  }

  /**
   * Obtener información del caché
   */
  getCacheInfo(): { size: number, entries: string[] } {
    return {
      size: this.geocodingCache.size,
      entries: Array.from(this.geocodingCache.keys())
    };
  }
}