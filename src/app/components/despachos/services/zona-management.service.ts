import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { SecurityService } from '../../../shared/services/security/security.service';

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface RestriccionesZona {
  horarioMinimo?: string;
  horarioMaximo?: string;
  diasNoDisponibles?: number[];
  costoAdicional?: number;
  pesoMaximo?: number;
  tipoVehiculo?: string[];
  requiereAutorizacion?: boolean;
}

export interface EstadisticasZona {
  pedidosEntregados: number;
  tiempoPromedioEntrega: number;
  porcentajeExitoso: number;
  ultimaActualizacion?: Date;
}

export interface ZonaEntrega {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  colorBorde?: string;
  opacidad?: number;
  coordenadas: Coordenada[];
  activa: boolean;
  codigosPostales?: string[];
  restricciones?: RestriccionesZona;
  estadisticas?: EstadisticasZona;
  prioridad?: number;
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
}

export interface ConfiguracionZonas {
  zonas: ZonaEntrega[];
  mostrarZonas: boolean;
  tipoVisualizacion: 'relleno' | 'borde' | 'ambos';
  modoEdicion?: boolean;
  zonaSeleccionada?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ZonaManagementService {

  private readonly STORAGE_KEY = 'katuq_delivery_zones';
  private readonly STORAGE_VERSION = '1.0';

  private zonasSubject = new BehaviorSubject<ZonaEntrega[]>([]);
  public zonas$ = this.zonasSubject.asObservable();

  private configuracionSubject = new BehaviorSubject<ConfiguracionZonas>({
    zonas: [],
    mostrarZonas: true,
    tipoVisualizacion: 'ambos'
  });
  public configuracion$ = this.configuracionSubject.asObservable();

  constructor(
    private securityService: SecurityService
  ) {
    this.loadZonas();
  }

  /**
   * Cargar zonas desde localStorage
   */
  loadZonas(): void {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);

        // Verificar versión para compatibilidad
        if (data.version === this.STORAGE_VERSION && data.zonas) {
          this.zonasSubject.next(data.zonas);
          this.updateConfiguracion({ zonas: data.zonas });
        } else {
          // Migrar o inicializar
          this.initializeDefaultZones();
        }
      } else {
        this.initializeDefaultZones();
      }
    } catch (error) {
      console.error('Error al cargar zonas desde localStorage:', error);
      this.initializeDefaultZones();
    }
  }

  /**
   * Guardar zonas en localStorage
   */
  saveZonas(zonas: ZonaEntrega[]): Observable<void> {
    try {
      const dataToStore = {
        version: this.STORAGE_VERSION,
        zonas: zonas,
        lastUpdate: new Date().toISOString(),
        deviceInfo: this.getDeviceInfo()
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(dataToStore));

      this.zonasSubject.next(zonas);
      this.updateConfiguracion({ zonas });

      return of(void 0);
    } catch (error) {
      console.error('Error al guardar zonas:', error);
      throw error;
    }
  }

  /**
   * Crear nueva zona
   */
  createZona(zona: Omit<ZonaEntrega, 'id' | 'createdAt' | 'updatedAt'>): Observable<ZonaEntrega> {
    const nuevaZona: ZonaEntrega = {
      ...zona,
      id: this.generateId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      createdBy: this.getCurrentUser()
    };

    const zonasActuales = this.zonasSubject.value;
    const zonasActualizadas = [...zonasActuales, nuevaZona];

    this.saveZonas(zonasActualizadas).subscribe();

    return of(nuevaZona);
  }

  /**
   * Actualizar zona existente
   */
  updateZona(zonaId: string, updates: Partial<ZonaEntrega>): Observable<ZonaEntrega | null> {
    const zonasActuales = this.zonasSubject.value;
    const index = zonasActuales.findIndex(z => z.id === zonaId);

    if (index === -1) {
      return of(null);
    }

    const zonaActualizada: ZonaEntrega = {
      ...zonasActuales[index],
      ...updates,
      updatedAt: new Date()
    };

    const zonasActualizadas = [...zonasActuales];
    zonasActualizadas[index] = zonaActualizada;

    this.saveZonas(zonasActualizadas).subscribe();

    return of(zonaActualizada);
  }

  /**
   * Eliminar zona
   */
  deleteZona(zonaId: string): Observable<boolean> {
    const zonasActuales = this.zonasSubject.value;
    const zonasActualizadas = zonasActuales.filter(z => z.id !== zonaId);

    if (zonasActualizadas.length === zonasActuales.length) {
      return of(false); // No se encontró la zona
    }

    this.saveZonas(zonasActualizadas).subscribe();
    return of(true);
  }

  /**
   * Obtener zona por ID
   */
  getZonaById(zonaId: string): Observable<ZonaEntrega | null> {
    const zona = this.zonasSubject.value.find(z => z.id === zonaId);
    return of(zona || null);
  }

  /**
   * Obtener zonas activas
   */
  getZonasActivas(): Observable<ZonaEntrega[]> {
    const zonasActivas = this.zonasSubject.value.filter(z => z.activa);
    return of(zonasActivas);
  }

  /**
   * Detectar si un punto está dentro de una zona
   */
  isPointInZona(punto: Coordenada, zona: ZonaEntrega): boolean {
    return this.isPointInPolygon(punto, zona.coordenadas);
  }

  /**
   * Encontrar zona que contiene un punto
   */
  findZonaForPoint(punto: Coordenada): Observable<ZonaEntrega | null> {
    const zonasActivas = this.zonasSubject.value.filter(z => z.activa);

    for (const zona of zonasActivas) {
      if (this.isPointInZona(punto, zona)) {
        return of(zona);
      }
    }

    return of(null);
  }

  /**
   * Asignar zona a un pedido basado en coordenadas o dirección
   */
  assignZonaToOrder(direccion: string, coordenadas?: Coordenada): Observable<ZonaEntrega | null> {
    if (coordenadas) {
      return this.findZonaForPoint(coordenadas);
    }

    // Si no hay coordenadas, intentar geocodificar la dirección
    // Esto se puede integrar con el servicio de geocodificación existente
    return of(null);
  }

  /**
   * Detectar superposición entre zonas
   */
  detectOverlap(nuevaZona: Coordenada[], zonasExistentes?: ZonaEntrega[]): Observable<ZonaEntrega[]> {
    const zonas = zonasExistentes || this.zonasSubject.value;
    const zonasSuperpuestas: ZonaEntrega[] = [];

    for (const zona of zonas) {
      if (this.doPolygonsOverlap(nuevaZona, zona.coordenadas)) {
        zonasSuperpuestas.push(zona);
      }
    }

    return of(zonasSuperpuestas);
  }

  /**
   * Validar polígono
   */
  validatePolygon(coordenadas: Coordenada[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (coordenadas.length < 3) {
      errors.push('El polígono debe tener al menos 3 puntos');
    }

    if (coordenadas.length > 50) {
      errors.push('El polígono no puede tener más de 50 puntos');
    }

    // Verificar que las coordenadas sean válidas
    for (const coord of coordenadas) {
      if (!this.isValidCoordinate(coord)) {
        errors.push('Coordenadas inválidas detectadas');
        break;
      }
    }

    // Verificar que el polígono no sea auto-intersectante
    if (this.isSelfIntersecting(coordenadas)) {
      errors.push('El polígono no puede intersectarse consigo mismo');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Exportar zonas a JSON
   */
  exportZonas(): Observable<string> {
    const zonas = this.zonasSubject.value;
    const exportData = {
      version: this.STORAGE_VERSION,
      exportDate: new Date().toISOString(),
      zonas: zonas
    };

    return of(JSON.stringify(exportData, null, 2));
  }

  /**
   * Importar zonas desde JSON
   */
  importZonas(jsonData: string): Observable<{ success: boolean; imported: number; errors: string[] }> {
    try {
      const data = JSON.parse(jsonData);
      const errors: string[] = [];
      let imported = 0;

      if (!data.zonas || !Array.isArray(data.zonas)) {
        return of({ success: false, imported: 0, errors: ['Formato de datos inválido'] });
      }

      const zonasActuales = this.zonasSubject.value;
      const nuevasZonas: ZonaEntrega[] = [];

      for (const zonaData of data.zonas) {
        try {
          const validacion = this.validatePolygon(zonaData.coordenadas || []);
          if (!validacion.valid) {
            errors.push(`Zona "${zonaData.nombre}": ${validacion.errors.join(', ')}`);
            continue;
          }

          const zona: ZonaEntrega = {
            ...zonaData,
            id: this.generateId(),
            createdAt: new Date(),
            updatedAt: new Date(),
            createdBy: this.getCurrentUser()
          };

          nuevasZonas.push(zona);
          imported++;
        } catch (error) {
          errors.push(`Error procesando zona "${zonaData.nombre}": ${error}`);
        }
      }

      if (nuevasZonas.length > 0) {
        const todasLasZonas = [...zonasActuales, ...nuevasZonas];
        this.saveZonas(todasLasZonas).subscribe();
      }

      return of({
        success: imported > 0,
        imported,
        errors
      });

    } catch (error) {
      return of({
        success: false,
        imported: 0,
        errors: [`Error al procesar JSON: ${error}`]
      });
    }
  }

  /**
   * Actualizar configuración de visualización
   */
  updateConfiguracion(config: Partial<ConfiguracionZonas>): void {
    const configuracionActual = this.configuracionSubject.value;
    const nuevaConfiguracion = { ...configuracionActual, ...config };
    this.configuracionSubject.next(nuevaConfiguracion);
  }

  /**
   * Métodos privados de utilidad
   */

  private initializeDefaultZones(): void {
    // Inicializar con zonas de ejemplo si es necesario
    this.zonasSubject.next([]);
    this.updateConfiguracion({ zonas: [] });
  }

  private generateId(): string {
    return 'zona_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  private getCurrentUser(): string {
    // Obtener usuario actual del servicio de seguridad o localStorage
    const currentUser = localStorage.getItem('currentUser');
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        return userData.email || userData.username || 'unknown';
      } catch {
        return 'unknown';
      }
    }
    return 'unknown';
  }

  private getDeviceInfo(): any {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      timestamp: new Date().toISOString()
    };
  }

  private isValidCoordinate(coord: Coordenada): boolean {
    return (
      typeof coord.lat === 'number' &&
      typeof coord.lng === 'number' &&
      coord.lat >= -90 &&
      coord.lat <= 90 &&
      coord.lng >= -180 &&
      coord.lng <= 180 &&
      !isNaN(coord.lat) &&
      !isNaN(coord.lng)
    );
  }

  /**
   * Algoritmo de ray casting para determinar si un punto está dentro de un polígono
   */
  private isPointInPolygon(punto: Coordenada, vertices: Coordenada[]): boolean {
    const x = punto.lng;
    const y = punto.lat;
    let inside = false;

    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lng;
      const yi = vertices[i].lat;
      const xj = vertices[j].lng;
      const yj = vertices[j].lat;

      if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
        inside = !inside;
      }
    }

    return inside;
  }

  /**
   * Verificar si dos polígonos se superponen
   */
  private doPolygonsOverlap(poly1: Coordenada[], poly2: Coordenada[]): boolean {
    // Verificar si algún vértice de poly1 está dentro de poly2
    for (const vertex of poly1) {
      if (this.isPointInPolygon(vertex, poly2)) {
        return true;
      }
    }

    // Verificar si algún vértice de poly2 está dentro de poly1
    for (const vertex of poly2) {
      if (this.isPointInPolygon(vertex, poly1)) {
        return true;
      }
    }

    // Verificar intersecciones de bordes (simplificado)
    return this.doEdgesIntersect(poly1, poly2);
  }

  /**
   * Verificar si los bordes de dos polígonos se intersectan
   */
  private doEdgesIntersect(poly1: Coordenada[], poly2: Coordenada[]): boolean {
    for (let i = 0; i < poly1.length; i++) {
      const p1Start = poly1[i];
      const p1End = poly1[(i + 1) % poly1.length];

      for (let j = 0; j < poly2.length; j++) {
        const p2Start = poly2[j];
        const p2End = poly2[(j + 1) % poly2.length];

        if (this.doLinesIntersect(p1Start, p1End, p2Start, p2End)) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Verificar si dos líneas se intersectan
   */
  private doLinesIntersect(p1: Coordenada, p2: Coordenada, p3: Coordenada, p4: Coordenada): boolean {
    const d1 = this.orientation(p1, p2, p3);
    const d2 = this.orientation(p1, p2, p4);
    const d3 = this.orientation(p3, p4, p1);
    const d4 = this.orientation(p3, p4, p2);

    if (d1 !== d2 && d3 !== d4) {
      return true;
    }

    return false;
  }

  /**
   * Calcular orientación de tres puntos
   */
  private orientation(p: Coordenada, q: Coordenada, r: Coordenada): number {
    const val = (q.lat - p.lat) * (r.lng - q.lng) - (q.lng - p.lng) * (r.lat - q.lat);
    if (val === 0) return 0;
    return val > 0 ? 1 : 2;
  }

  /**
   * Verificar si un polígono es auto-intersectante
   */
  private isSelfIntersecting(vertices: Coordenada[]): boolean {
    for (let i = 0; i < vertices.length; i++) {
      const p1Start = vertices[i];
      const p1End = vertices[(i + 1) % vertices.length];

      for (let j = i + 2; j < vertices.length; j++) {
        // No verificar segmentos adyacentes
        if (j === vertices.length - 1 && i === 0) continue;

        const p2Start = vertices[j];
        const p2End = vertices[(j + 1) % vertices.length];

        if (this.doLinesIntersect(p1Start, p1End, p2Start, p2End)) {
          return true;
        }
      }
    }

    return false;
  }
}