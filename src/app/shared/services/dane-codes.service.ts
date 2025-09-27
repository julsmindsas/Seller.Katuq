import { Injectable } from '@angular/core';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import {
  MunicipioDane,
  MUNICIPIOS_COLOMBIA,
  buscarMunicipio,
  getMunicipioByCodigo,
  getDepartamentos,
  getMunicipiosByDepartamento,
  getPlaceCode
} from '../data/colombia-dane-codes';

@Injectable({
  providedIn: 'root'
})
export class DaneCodesService {

  // Cache de búsquedas recientes
  private searchCache = new Map<string, MunicipioDane[]>();
  private cacheTimeout = 5 * 60 * 1000; // 5 minutos

  // Municipios frecuentes (se cargan desde localStorage)
  private frecuentesSubject = new BehaviorSubject<MunicipioDane[]>([]);
  public municipiosFrecuentes$ = this.frecuentesSubject.asObservable();

  // Key para localStorage
  private readonly STORAGE_KEY = 'municipios_frecuentes';
  private readonly MAX_FRECUENTES = 10;

  constructor() {
    this.loadMunicipiosFrecuentes();
  }

  /**
   * Buscar municipios por query
   */
  searchMunicipios(query: string): Observable<MunicipioDane[]> {
    if (!query || query.length < 2) {
      return of([]);
    }

    // Verificar cache
    const cacheKey = query.toLowerCase();
    if (this.searchCache.has(cacheKey)) {
      return of(this.searchCache.get(cacheKey) || []);
    }

    // Buscar municipios
    const resultados = buscarMunicipio(query);

    // Guardar en cache
    this.searchCache.set(cacheKey, resultados);
    setTimeout(() => this.searchCache.delete(cacheKey), this.cacheTimeout);

    return of(resultados);
  }

  /**
   * Obtener municipio por código DANE
   */
  getMunicipioByCodigo(codigo: string): Observable<MunicipioDane | undefined> {
    return of(getMunicipioByCodigo(codigo));
  }

  /**
   * Obtener lista de departamentos
   */
  getDepartamentos(): Observable<string[]> {
    return of(getDepartamentos());
  }

  /**
   * Obtener municipios de un departamento
   */
  getMunicipiosByDepartamento(departamento: string): Observable<MunicipioDane[]> {
    return of(getMunicipiosByDepartamento(departamento));
  }

  /**
   * Convertir código DANE a place_code de 8 dígitos
   */
  getPlaceCode(codigoDane: string): string {
    return getPlaceCode(codigoDane);
  }

  /**
   * Formatear municipio para mostrar en select/autocomplete
   */
  formatMunicipioLabel(municipio: MunicipioDane): string {
    return `${municipio.nombre} - ${municipio.departamento}`;
  }

  /**
   * Guardar municipio como frecuente
   */
  addMunicipioFrecuente(municipio: MunicipioDane): void {
    const frecuentes = this.getMunicipiosFrecuentesLocal();

    // Remover si ya existe para agregarlo al principio
    const index = frecuentes.findIndex(m => m.codigo === municipio.codigo);
    if (index > -1) {
      frecuentes.splice(index, 1);
    }

    // Agregar al principio
    frecuentes.unshift(municipio);

    // Limitar cantidad
    const nuevaLista = frecuentes.slice(0, this.MAX_FRECUENTES);

    // Guardar en localStorage
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(nuevaLista));

    // Actualizar observable
    this.frecuentesSubject.next(nuevaLista);
  }

  /**
   * Cargar municipios frecuentes desde localStorage
   */
  private loadMunicipiosFrecuentes(): void {
    const frecuentes = this.getMunicipiosFrecuentesLocal();
    this.frecuentesSubject.next(frecuentes);
  }

  /**
   * Obtener municipios frecuentes desde localStorage
   */
  private getMunicipiosFrecuentesLocal(): MunicipioDane[] {
    try {
      const data = localStorage.getItem(this.STORAGE_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error al cargar municipios frecuentes:', error);
    }
    return [];
  }

  /**
   * Limpiar municipios frecuentes
   */
  clearMunicipiosFrecuentes(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    this.frecuentesSubject.next([]);
  }

  /**
   * Buscar municipios con sugerencias inteligentes
   * Combina municipios frecuentes con búsqueda normal
   */
  searchWithSuggestions(query: string): Observable<{
    frecuentes: MunicipioDane[];
    resultados: MunicipioDane[];
  }> {
    if (!query || query.length < 2) {
      return of({
        frecuentes: this.getMunicipiosFrecuentesLocal(),
        resultados: []
      });
    }

    const searchTerm = query.toLowerCase();
    const frecuentes = this.getMunicipiosFrecuentesLocal()
      .filter(m =>
        m.nombre.toLowerCase().includes(searchTerm) ||
        m.codigo.includes(searchTerm) ||
        m.departamento.toLowerCase().includes(searchTerm)
      );

    const resultados = buscarMunicipio(query)
      .filter(m => !frecuentes.some(f => f.codigo === m.codigo)); // No duplicar frecuentes

    return of({
      frecuentes,
      resultados
    });
  }

  /**
   * Obtener municipios principales (capitales departamentales y ciudades grandes)
   */
  getMunicipiosPrincipales(): Observable<MunicipioDane[]> {
    const principales = [
      "11001", // Bogotá
      "05001", // Medellín
      "76001", // Cali
      "08001", // Barranquilla
      "13001", // Cartagena
      "68001", // Bucaramanga
      "54001", // Cúcuta
      "66001", // Pereira
      "73001", // Ibagué
      "17001", // Manizales
      "52001", // Pasto
      "50001", // Villavicencio
      "41001", // Neiva
      "15001", // Tunja
      "23001", // Montería
      "27001", // Quibdó
      "63001", // Armenia
      "70001", // Sincelejo
      "18001", // Florencia
      "19001", // Popayán
    ];

    const municipios = principales
      .map(codigo => getMunicipioByCodigo(codigo))
      .filter(m => m !== undefined) as MunicipioDane[];

    return of(municipios);
  }

  /**
   * Validar si un código DANE existe
   */
  isValidCodigoDane(codigo: string): boolean {
    return getMunicipioByCodigo(codigo) !== undefined;
  }

  /**
   * Obtener información completa para envío
   */
  getMunicipioShippingInfo(municipio: MunicipioDane): {
    municipio: MunicipioDane;
    placeCode: string;
    codigoDane: string;
    nombreCompleto: string;
  } {
    return {
      municipio,
      placeCode: this.getPlaceCode(municipio.codigo),
      codigoDane: municipio.codigo,
      nombreCompleto: this.formatMunicipioLabel(municipio)
    };
  }
}