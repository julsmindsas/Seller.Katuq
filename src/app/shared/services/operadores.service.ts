import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface Operador {
  id: string;
  nombre: string;
  apellido: string;
  nombreCompleto: string;
  telefono: string;
  email: string;
  especialidades: string[];
  calificacion: number; // 0-5
  ubicacion: {
    barrio: string;
    comuna: string;
    direccion: string;
    coordinates: {
      latitude: number;
      longitude: number;
    };
  };
  disponibilidad: 'disponible' | 'ocupado' | 'no_disponible';
  horasTrabajadas: number;
  serviciosCompletados: number;
  foto?: string;
  activo: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class OperadoresService {

  private operadoresSubject = new BehaviorSubject<Operador[]>([]);
  public operadores$: Observable<Operador[]> = this.operadoresSubject.asObservable();

  constructor() {
    this.initializeOperadores();
  }

  /**
   * Inicializar operadores desde localStorage o crear datos por defecto
   */
  private initializeOperadores(): void {
    const stored = localStorage.getItem('katuq_operadores');

    if (stored) {
      try {
        const operadores = JSON.parse(stored);
        this.operadoresSubject.next(operadores);
        console.log('✅ Operadores cargados desde localStorage:', operadores.length);
      } catch (error) {
        console.error('Error al cargar operadores:', error);
        this.createDefaultOperadores();
      }
    } else {
      this.createDefaultOperadores();
    }
  }

  /**
   * Crear 10 operadores por defecto con ubicaciones reales de Medellín
   */
  private createDefaultOperadores(): void {
    const operadores: Operador[] = [
      {
        id: 'OP-001',
        nombre: 'Carlos',
        apellido: 'Ramírez',
        nombreCompleto: 'Carlos Ramírez',
        telefono: '3001234567',
        email: 'carlos.ramirez@katuq.com',
        especialidades: ['iPhone', 'iPad', 'MacBook'],
        calificacion: 4.8,
        ubicacion: {
          barrio: 'El Poblado',
          comuna: 'Comuna 14',
          direccion: 'Calle 10 # 43A-30',
          coordinates: {
            latitude: 6.2088,
            longitude: -75.5675
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 1250,
        serviciosCompletados: 342,
        activo: true
      },
      {
        id: 'OP-002',
        nombre: 'María',
        apellido: 'González',
        nombreCompleto: 'María González',
        telefono: '3012345678',
        email: 'maria.gonzalez@katuq.com',
        especialidades: ['iPhone', 'Apple Watch', 'Diagnóstico'],
        calificacion: 4.9,
        ubicacion: {
          barrio: 'Laureles',
          comuna: 'Comuna 11',
          direccion: 'Carrera 73 # 40-50',
          coordinates: {
            latitude: 6.2443,
            longitude: -75.5912
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 1580,
        serviciosCompletados: 428,
        activo: true
      },
      {
        id: 'OP-003',
        nombre: 'Andrés',
        apellido: 'Cardona',
        nombreCompleto: 'Andrés Cardona',
        telefono: '3023456789',
        email: 'andres.cardona@katuq.com',
        especialidades: ['MacBook', 'iMac', 'Hardware'],
        calificacion: 4.7,
        ubicacion: {
          barrio: 'Envigado',
          comuna: 'Envigado Centro',
          direccion: 'Calle 37 Sur # 43-10',
          coordinates: {
            latitude: 6.1701,
            longitude: -75.5830
          }
        },
        disponibilidad: 'ocupado',
        horasTrabajadas: 980,
        serviciosCompletados: 256,
        activo: true
      },
      {
        id: 'OP-004',
        nombre: 'Laura',
        apellido: 'Mejía',
        nombreCompleto: 'Laura Mejía',
        telefono: '3034567890',
        email: 'laura.mejia@katuq.com',
        especialidades: ['iPhone', 'iPad', 'Baterías'],
        calificacion: 5.0,
        ubicacion: {
          barrio: 'Sabaneta',
          comuna: 'Sabaneta',
          direccion: 'Carrera 45 # 75 Sur-25',
          coordinates: {
            latitude: 6.1513,
            longitude: -75.6167
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 2100,
        serviciosCompletados: 587,
        activo: true
      },
      {
        id: 'OP-005',
        nombre: 'Diego',
        apellido: 'Zapata',
        nombreCompleto: 'Diego Zapata',
        telefono: '3045678901',
        email: 'diego.zapata@katuq.com',
        especialidades: ['iPhone', 'Pantallas', 'Cámaras'],
        calificacion: 4.6,
        ubicacion: {
          barrio: 'Belén',
          comuna: 'Comuna 16',
          direccion: 'Calle 30A # 76-40',
          coordinates: {
            latitude: 6.2325,
            longitude: -75.6050
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 750,
        serviciosCompletados: 198,
        activo: true
      },
      {
        id: 'OP-006',
        nombre: 'Valentina',
        apellido: 'Herrera',
        nombreCompleto: 'Valentina Herrera',
        telefono: '3056789012',
        email: 'valentina.herrera@katuq.com',
        especialidades: ['iPad', 'MacBook', 'Software'],
        calificacion: 4.8,
        ubicacion: {
          barrio: 'Centro',
          comuna: 'Comuna 10',
          direccion: 'Carrera 50 # 51-20',
          coordinates: {
            latitude: 6.2476,
            longitude: -75.5658
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 1320,
        serviciosCompletados: 367,
        activo: true
      },
      {
        id: 'OP-007',
        nombre: 'Santiago',
        apellido: 'Ríos',
        nombreCompleto: 'Santiago Ríos',
        telefono: '3067890123',
        email: 'santiago.rios@katuq.com',
        especialidades: ['iPhone', 'Agua', 'Emergencias'],
        calificacion: 4.5,
        ubicacion: {
          barrio: 'Bello',
          comuna: 'Bello Centro',
          direccion: 'Calle 50 # 55-30',
          coordinates: {
            latitude: 6.3368,
            longitude: -75.5597
          }
        },
        disponibilidad: 'ocupado',
        horasTrabajadas: 890,
        serviciosCompletados: 234,
        activo: true
      },
      {
        id: 'OP-008',
        nombre: 'Camila',
        apellido: 'Montoya',
        nombreCompleto: 'Camila Montoya',
        telefono: '3078901234',
        email: 'camila.montoya@katuq.com',
        especialidades: ['iPhone', 'AirPods', 'Accesorios'],
        calificacion: 4.9,
        ubicacion: {
          barrio: 'Estadio',
          comuna: 'Comuna 4',
          direccion: 'Carrera 70 # 48-25',
          coordinates: {
            latitude: 6.2571,
            longitude: -75.5859
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 1450,
        serviciosCompletados: 401,
        activo: true
      },
      {
        id: 'OP-009',
        nombre: 'Sebastián',
        apellido: 'Castro',
        nombreCompleto: 'Sebastián Castro',
        telefono: '3089012345',
        email: 'sebastian.castro@katuq.com',
        especialidades: ['MacBook', 'iMac', 'Mac mini'],
        calificacion: 4.7,
        ubicacion: {
          barrio: 'Itagüí',
          comuna: 'Itagüí Centro',
          direccion: 'Carrera 51 # 51-50',
          coordinates: {
            latitude: 6.1845,
            longitude: -75.5990
          }
        },
        disponibilidad: 'no_disponible',
        horasTrabajadas: 650,
        serviciosCompletados: 145,
        activo: true
      },
      {
        id: 'OP-010',
        nombre: 'Isabella',
        apellido: 'Vargas',
        nombreCompleto: 'Isabella Vargas',
        telefono: '3090123456',
        email: 'isabella.vargas@katuq.com',
        especialidades: ['iPhone', 'iPad', 'Pantallas', 'Baterías'],
        calificacion: 5.0,
        ubicacion: {
          barrio: 'La Estrella',
          comuna: 'La Estrella',
          direccion: 'Calle 77 Sur # 48-15',
          coordinates: {
            latitude: 6.1583,
            longitude: -75.6408
          }
        },
        disponibilidad: 'disponible',
        horasTrabajadas: 1820,
        serviciosCompletados: 512,
        activo: true
      }
    ];

    this.saveOperadores(operadores);
    console.log('✅ Operadores por defecto creados:', operadores.length);
  }

  /**
   * Guardar operadores en localStorage
   */
  private saveOperadores(operadores: Operador[]): void {
    localStorage.setItem('katuq_operadores', JSON.stringify(operadores));
    this.operadoresSubject.next(operadores);
  }

  /**
   * Obtener todos los operadores
   */
  getOperadores(): Operador[] {
    return this.operadoresSubject.value;
  }

  /**
   * Obtener operadores disponibles
   */
  getOperadoresDisponibles(): Operador[] {
    return this.operadoresSubject.value.filter(op => op.disponibilidad === 'disponible' && op.activo);
  }

  /**
   * Obtener operador por ID
   */
  getOperadorById(id: string): Operador | undefined {
    return this.operadoresSubject.value.find(op => op.id === id);
  }

  /**
   * Obtener operadores por especialidad
   */
  getOperadoresByEspecialidad(especialidad: string): Operador[] {
    return this.operadoresSubject.value.filter(
      op => op.especialidades.includes(especialidad) && op.activo
    );
  }

  /**
   * Calcular distancia entre dos puntos (Haversine)
   */
  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radio de la Tierra en km
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);

    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Obtener operadores más cercanos a una ubicación
   */
  getOperadoresCercanos(
    latitude: number,
    longitude: number,
    maxDistance: number = 10, // km
    limit: number = 5
  ): Array<Operador & { distancia: number }> {
    const operadoresConDistancia = this.operadoresSubject.value
      .filter(op => op.disponibilidad === 'disponible' && op.activo)
      .map(op => ({
        ...op,
        distancia: this.calculateDistance(
          latitude,
          longitude,
          op.ubicacion.coordinates.latitude,
          op.ubicacion.coordinates.longitude
        )
      }))
      .filter(op => op.distancia <= maxDistance)
      .sort((a, b) => a.distancia - b.distancia)
      .slice(0, limit);

    return operadoresConDistancia;
  }

  /**
   * Asignar mejor operador según criterios
   * Prioriza: 1) Distancia, 2) Calificación, 3) Especialidad
   */
  asignarMejorOperador(
    serviceType: string,
    latitude?: number,
    longitude?: number
  ): Operador | null {
    let operadores = this.getOperadoresDisponibles();

    // Filtrar por especialidad si es posible
    const especialidadMap: Record<string, string> = {
      'screen_repair': 'Pantallas',
      'battery_replacement': 'Baterías',
      'water_damage': 'Agua',
      'diagnostic': 'Diagnóstico'
    };

    const especialidad = especialidadMap[serviceType];
    if (especialidad) {
      const operadoresEspecializados = operadores.filter(
        op => op.especialidades.includes(especialidad)
      );

      if (operadoresEspecializados.length > 0) {
        operadores = operadoresEspecializados;
      }
    }

    // Si hay ubicación, priorizar por distancia
    if (latitude && longitude) {
      const cercanos = this.getOperadoresCercanos(latitude, longitude, 15, 3);
      if (cercanos.length > 0) {
        // Ordenar por calificación entre los cercanos
        cercanos.sort((a, b) => b.calificacion - a.calificacion);
        return cercanos[0];
      }
    }

    // Fallback: mejor calificación
    operadores.sort((a, b) => b.calificacion - a.calificacion);
    return operadores.length > 0 ? operadores[0] : null;
  }

  /**
   * Cambiar disponibilidad de operador
   */
  cambiarDisponibilidad(operadorId: string, disponibilidad: 'disponible' | 'ocupado' | 'no_disponible'): void {
    const operadores = this.operadoresSubject.value;
    const operador = operadores.find(op => op.id === operadorId);

    if (operador) {
      operador.disponibilidad = disponibilidad;
      this.saveOperadores(operadores);
      console.log(`✅ Disponibilidad de ${operador.nombreCompleto} cambiada a: ${disponibilidad}`);
    }
  }

  /**
   * Marcar operador como ocupado (cuando se le asigna una cita)
   */
  ocuparOperador(operadorId: string): void {
    this.cambiarDisponibilidad(operadorId, 'ocupado');
  }

  /**
   * Liberar operador (cuando completa una cita)
   */
  liberarOperador(operadorId: string): void {
    this.cambiarDisponibilidad(operadorId, 'disponible');
  }

  /**
   * Registrar servicio completado
   */
  registrarServicioCompletado(operadorId: string, horasTrabajadas: number): void {
    const operadores = this.operadoresSubject.value;
    const operador = operadores.find(op => op.id === operadorId);

    if (operador) {
      operador.serviciosCompletados++;
      operador.horasTrabajadas += horasTrabajadas;
      this.saveOperadores(operadores);
      console.log(`✅ Servicio completado registrado para ${operador.nombreCompleto}`);
    }
  }

  /**
   * Limpiar operadores (testing)
   */
  resetOperadores(): void {
    this.createDefaultOperadores();
  }
}
