import { Injectable } from '@angular/core';

/**
 * Interfaz para coordenadas geográficas
 */
export interface GeoCoordinates {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

/**
 * Interfaz para dirección formateada
 */
export interface GeoAddress {
  formatted: string;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  coordinates: GeoCoordinates;
}

/**
 * Servicio de Geolocalización
 * Obtiene la ubicación del usuario usando Geolocation API
 * y reverse geocoding con Nominatim (OpenStreetMap)
 */
@Injectable({
  providedIn: 'root'
})
export class GeolocationService {
  private readonly NOMINATIM_URL = 'https://nominatim.openstreetmap.org/reverse';
  private readonly TIMEOUT = 10000; // 10 segundos
  private readonly MAX_AGE = 300000; // 5 minutos

  constructor() {
    console.log('🌍 GeolocationService initialized');
  }

  /**
   * Obtiene la posición actual del usuario
   */
  async getCurrentPosition(): Promise<GeoCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not supported by this browser'));
        return;
      }

      const options: PositionOptions = {
        enableHighAccuracy: true,
        timeout: this.TIMEOUT,
        maximumAge: this.MAX_AGE
      };

      navigator.geolocation.getCurrentPosition(
        (position: GeolocationPosition) => {
          const coords: GeoCoordinates = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp
          };

          console.log('📍 Position obtained:', coords);
          resolve(coords);
        },
        (error: GeolocationPositionError) => {
          console.error('❌ Geolocation error:', error.message);
          reject(this.handleGeolocationError(error));
        },
        options
      );
    });
  }

  /**
   * Obtiene la dirección formateada a partir de coordenadas
   * Usa Nominatim (OpenStreetMap) para reverse geocoding
   */
  async getAddressFromCoordinates(coords: GeoCoordinates): Promise<GeoAddress> {
    try {
      const url = `${this.NOMINATIM_URL}?lat=${coords.latitude}&lon=${coords.longitude}&format=json&addressdetails=1&accept-language=es`;

      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Katuq-VideoAgent/1.0' // Nominatim requiere User-Agent
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Extraer información de dirección
      const address = data.address || {};

      const geoAddress: GeoAddress = {
        formatted: data.display_name || 'Dirección no disponible',
        street: address.road || address.street,
        neighborhood: address.neighbourhood || address.suburb,
        city: address.city || address.town || address.village,
        state: address.state,
        country: address.country,
        postalCode: address.postcode,
        coordinates: coords
      };

      console.log('🏠 Address obtained:', geoAddress);
      return geoAddress;
    } catch (error) {
      console.error('❌ Error getting address:', error);
      throw new Error('No se pudo obtener la dirección');
    }
  }

  /**
   * Obtiene ubicación completa (coordenadas + dirección)
   */
  async getCurrentLocation(): Promise<GeoAddress> {
    try {
      const coords = await this.getCurrentPosition();
      const address = await this.getAddressFromCoordinates(coords);
      return address;
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      throw error;
    }
  }

  /**
   * Verifica si el navegador soporta geolocalización
   */
  isGeolocationSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Solicita permiso de geolocalización
   */
  async requestPermission(): Promise<boolean> {
    try {
      await this.getCurrentPosition();
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Maneja errores de geolocalización
   */
  private handleGeolocationError(error: GeolocationPositionError): Error {
    switch (error.code) {
      case error.PERMISSION_DENIED:
        return new Error('Permiso de ubicación denegado. Por favor habilítalo en la configuración de tu navegador.');
      case error.POSITION_UNAVAILABLE:
        return new Error('Ubicación no disponible. Verifica que tengas GPS activo.');
      case error.TIMEOUT:
        return new Error('Tiempo de espera agotado. Intenta nuevamente.');
      default:
        return new Error('Error desconocido al obtener ubicación.');
    }
  }

  /**
   * Calcula distancia entre dos puntos (fórmula Haversine)
   * Devuelve distancia en kilómetros
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) *
        Math.cos(this.toRadians(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return Math.round(distance * 100) / 100; // Redondear a 2 decimales
  }

  /**
   * Convierte grados a radianes
   */
  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}
