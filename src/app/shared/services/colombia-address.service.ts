import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';

export interface BarrioInfo {
  nombre: string;
  codigoPostal?: string;
  estrato?: number[];
}

export interface CiudadInfo {
  nombre: string;
  departamento: string;
  codigoDivipola: string;
  barrios: BarrioInfo[];
}

@Injectable({
  providedIn: 'root'
})
export class ColombiaAddressService {

  // Datos extendidos de barrios por ciudades principales
  private datosCiudades: { [ciudad: string]: CiudadInfo } = {
    'Bogotá': {
      nombre: 'Bogotá',
      departamento: 'Cundinamarca',
      codigoDivipola: '11001',
      barrios: [
        { nombre: 'Chapinero', codigoPostal: '110221', estrato: [4, 5, 6] },
        { nombre: 'Zona Rosa', codigoPostal: '110221', estrato: [5, 6] },
        { nombre: 'Centro', codigoPostal: '110311', estrato: [2, 3] },
        { nombre: 'Suba', codigoPostal: '111121', estrato: [2, 3, 4] },
        { nombre: 'Engativá', codigoPostal: '111071', estrato: [2, 3, 4] },
        { nombre: 'Kennedy', codigoPostal: '110831', estrato: [1, 2, 3] },
        { nombre: 'Fontibón', codigoPostal: '111051', estrato: [2, 3, 4] },
        { nombre: 'Usaquén', codigoPostal: '110111', estrato: [4, 5, 6] },
        { nombre: 'Barrios Unidos', codigoPostal: '110231', estrato: [3, 4] },
        { nombre: 'La Candelaria', codigoPostal: '110311', estrato: [1, 2] },
        { nombre: 'Teusaquillo', codigoPostal: '110321', estrato: [4, 5] },
        { nombre: 'Santa Fe', codigoPostal: '110311', estrato: [1, 2, 3] },
        { nombre: 'San Cristóbal', codigoPostal: '110421', estrato: [1, 2] },
        { nombre: 'Usme', codigoPostal: '110051', estrato: [1, 2] },
        { nombre: 'Tunjuelito', codigoPostal: '110621', estrato: [1, 2, 3] }
      ]
    },
    'Medellín': {
      nombre: 'Medellín',
      departamento: 'Antioquia',
      codigoDivipola: '05001',
      barrios: [
        { nombre: 'El Poblado', codigoPostal: '050021', estrato: [5, 6] },
        { nombre: 'Laureles', codigoPostal: '050034', estrato: [4, 5] },
        { nombre: 'Centro', codigoPostal: '050012', estrato: [2, 3] },
        { nombre: 'Belén', codigoPostal: '050052', estrato: [3, 4] },
        { nombre: 'Envigado', codigoPostal: '055440', estrato: [4, 5, 6] },
        { nombre: 'Sabaneta', codigoPostal: '055270', estrato: [3, 4, 5] },
        { nombre: 'La América', codigoPostal: '050033', estrato: [2, 3] },
        { nombre: 'Guayabal', codigoPostal: '050015', estrato: [3, 4] },
        { nombre: 'Buenos Aires', codigoPostal: '050025', estrato: [2, 3] },
        { nombre: 'Villa Hermosa', codigoPostal: '050043', estrato: [1, 2] }
      ]
    },
    'Cali': {
      nombre: 'Cali',
      departamento: 'Valle del Cauca',
      codigoDivipola: '76001',
      barrios: [
        { nombre: 'Granada', codigoPostal: '760043', estrato: [5, 6] },
        { nombre: 'San Fernando', codigoPostal: '760031', estrato: [4, 5] },
        { nombre: 'Centro', codigoPostal: '760001', estrato: [2, 3] },
        { nombre: 'Ciudad Jardín', codigoPostal: '760032', estrato: [4, 5, 6] },
        { nombre: 'El Peñón', codigoPostal: '760042', estrato: [3, 4] },
        { nombre: 'Tequendama', codigoPostal: '760021', estrato: [2, 3] },
        { nombre: 'Santa Rita', codigoPostal: '760044', estrato: [4, 5] },
        { nombre: 'El Refugio', codigoPostal: '760045', estrato: [5, 6] },
        { nombre: 'Normandía', codigoPostal: '760046', estrato: [4, 5] }
      ]
    },
    'Barranquilla': {
      nombre: 'Barranquilla',
      departamento: 'Atlántico',
      codigoDivipola: '08001',
      barrios: [
        { nombre: 'El Prado', codigoPostal: '080020', estrato: [4, 5] },
        { nombre: 'Centro', codigoPostal: '080001', estrato: [2, 3] },
        { nombre: 'Riomar', codigoPostal: '080020', estrato: [5, 6] },
        { nombre: 'Villa Country', codigoPostal: '080020', estrato: [5, 6] },
        { nombre: 'Boston', codigoPostal: '080020', estrato: [4, 5] },
        { nombre: 'Alto Prado', codigoPostal: '080020', estrato: [4, 5, 6] },
        { nombre: 'Granadillo', codigoPostal: '080020', estrato: [3, 4] },
        { nombre: 'La Cumbre', codigoPostal: '080020', estrato: [4, 5] }
      ]
    },
    'Cartagena': {
      nombre: 'Cartagena',
      departamento: 'Bolívar',
      codigoDivipola: '13001',
      barrios: [
        { nombre: 'Bocagrande', codigoPostal: '130001', estrato: [5, 6] },
        { nombre: 'Centro Histórico', codigoPostal: '130001', estrato: [3, 4, 5] },
        { nombre: 'Getsemaní', codigoPostal: '130001', estrato: [2, 3] },
        { nombre: 'Castillogrande', codigoPostal: '130001', estrato: [5, 6] },
        { nombre: 'Manga', codigoPostal: '130001', estrato: [3, 4] },
        { nombre: 'Crespo', codigoPostal: '130001', estrato: [4, 5] },
        { nombre: 'El Laguito', codigoPostal: '130001', estrato: [5, 6] }
      ]
    }
  };

  // Patrones de validación específicos para Colombia
  private patronesDireccion = {
    numeroVia: /^\d+$/,
    numeroCruce: /^\d+$/,
    numeroCasa: /^\d+$/,
    letra: /^[A-Z]$/,
    codigoPostal: /^\d{6}$/,
    estrato: /^[1-6]$/
  };

  constructor() { }

  /**
   * Obtiene información de barrios para una ciudad específica
   */
  getBarriosPorCiudad(ciudad: string): Observable<BarrioInfo[]> {
    const ciudadInfo = this.datosCiudades[ciudad];
    return of(ciudadInfo ? ciudadInfo.barrios : []);
  }

  /**
   * Obtiene información completa de una ciudad
   */
  getInfoCiudad(ciudad: string): Observable<CiudadInfo | null> {
    return of(this.datosCiudades[ciudad] || null);
  }

  /**
   * Valida un código postal colombiano (DIVIPOLA)
   */
  validarCodigoPostal(codigo: string): boolean {
    return this.patronesDireccion.codigoPostal.test(codigo);
  }

  /**
   * Valida un estrato socioeconómico
   */
  validarEstrato(estrato: number): boolean {
    return estrato >= 1 && estrato <= 6;
  }

  /**
   * Obtiene el estrato sugerido para un barrio específico
   */
  getEstratoSugerido(ciudad: string, barrio: string): Observable<number[]> {
    const ciudadInfo = this.datosCiudades[ciudad];
    if (ciudadInfo) {
      const barrioInfo = ciudadInfo.barrios.find(b => b.nombre === barrio);
      return of(barrioInfo?.estrato || []);
    }
    return of([]);
  }

  /**
   * Obtiene el código postal para un barrio específico
   */
  getCodigoPostalBarrio(ciudad: string, barrio: string): Observable<string | null> {
    const ciudadInfo = this.datosCiudades[ciudad];
    if (ciudadInfo) {
      const barrioInfo = ciudadInfo.barrios.find(b => b.nombre === barrio);
      return of(barrioInfo?.codigoPostal || null);
    }
    return of(null);
  }

  /**
   * Valida una dirección colombiana completa
   */
  validarDireccionCompleta(direccion: any): { valida: boolean; errores: string[] } {
    const errores: string[] = [];
    
    if (!direccion.esRural) {
      // Validar dirección urbana
      if (!this.patronesDireccion.numeroVia.test(direccion.numeroVia)) {
        errores.push('El número de vía debe ser numérico');
      }
      
      if (!this.patronesDireccion.numeroCruce.test(direccion.numero)) {
        errores.push('El número de cruce debe ser numérico');
      }
      
      if (!this.patronesDireccion.numeroCasa.test(direccion.numeroCasa)) {
        errores.push('El número de casa debe ser numérico');
      }
      
      if (direccion.letraVia && !this.patronesDireccion.letra.test(direccion.letraVia)) {
        errores.push('La letra de vía debe ser una letra mayúscula');
      }
      
      if (direccion.letraCruce && !this.patronesDireccion.letra.test(direccion.letraCruce)) {
        errores.push('La letra de cruce debe ser una letra mayúscula');
      }
    } else {
      // Validar dirección rural
      if (!direccion.tipoNomenclaturaRural || !direccion.nombreRural) {
        errores.push('Debe especificar el tipo y nombre de la ubicación rural');
      }
    }
    
    // Validaciones comunes
    if (!direccion.ciudad) {
      errores.push('La ciudad es obligatoria');
    }
    
    if (direccion.estrato && !this.validarEstrato(direccion.estrato)) {
      errores.push('El estrato debe ser un número entre 1 y 6');
    }
    
    if (direccion.codigoPostal && !this.validarCodigoPostal(direccion.codigoPostal)) {
      errores.push('El código postal debe tener 6 dígitos');
    }
    
    return {
      valida: errores.length === 0,
      errores
    };
  }

  /**
   * Formatea una dirección según las convenciones colombianas
   */
  formatearDireccion(direccion: any): string {
    if (direccion.esRural) {
      let resultado = `${direccion.tipoNomenclaturaRural} ${direccion.nombreRural}`;
      if (direccion.referencias) {
        resultado += ` - ${direccion.referencias}`;
      }
      return resultado;
    }
    
    // Formatear dirección urbana
    let resultado = `${direccion.tipoVia} ${direccion.numeroVia}`;
    
    if (direccion.letraVia) {
      resultado += ` ${direccion.letraVia}`;
    }
    
    if (direccion.complementoVia) {
      resultado += ` ${direccion.complementoVia}`;
    }
    
    resultado += ` # ${direccion.numero}`;
    
    if (direccion.letraCruce) {
      resultado += ` ${direccion.letraCruce}`;
    }
    
    if (direccion.complementoCruce) {
      resultado += ` ${direccion.complementoCruce}`;
    }
    
    resultado += ` - ${direccion.numeroCasa}`;
    
    if (direccion.tipoVivienda && direccion.numeroVivienda) {
      resultado += ` ${direccion.tipoVivienda} ${direccion.numeroVivienda}`;
    } else if (direccion.tipoVivienda) {
      resultado += ` ${direccion.tipoVivienda}`;
    }
    
    if (direccion.barrio) {
      resultado += `, ${direccion.barrio}`;
    }
    
    return resultado;
  }

  /**
   * Obtiene ciudades disponibles con información completa
   */
  getCiudadesDisponibles(): Observable<string[]> {
    return of(Object.keys(this.datosCiudades));
  }

  /**
   * Busca barrios que coincidan con un término de búsqueda
   */
  buscarBarrios(ciudad: string, termino: string): Observable<BarrioInfo[]> {
    const ciudadInfo = this.datosCiudades[ciudad];
    if (!ciudadInfo) {
      return of([]);
    }
    
    const terminoLower = termino.toLowerCase();
    const barriosFiltrados = ciudadInfo.barrios.filter(barrio =>
      barrio.nombre.toLowerCase().includes(terminoLower)
    );
    
    return of(barriosFiltrados);
  }
}
