import { Injectable, Injector } from '@angular/core';
import { Observable, interval, of, timer } from 'rxjs';
import { take, switchMap, tap, catchError, map } from 'rxjs/operators';
import { PedidosUtilService } from '../../components/ventas/service/pedidos.util.service';
import { InitializationService } from './initialization.service';
import { CacheService } from './cache/cache.service';
import { AuthService } from './firebase/auth.service';

@Injectable({
  providedIn: 'root'
})
export class MaestrosTestingService {

  constructor(
    private pedidosUtilService: PedidosUtilService,
    private initializationService: InitializationService,
    private cacheService: CacheService,
    private authService: AuthService,
    private injector: Injector
  ) {}

  /**
   * 🧪 Ejecuta una suite de pruebas para validar el comportamiento de los maestros
   */
  runMaestrosTestSuite(): Observable<any> {
    console.log('🧪 Iniciando suite de pruebas de maestros...');
    
    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [] as any[]
    };

    return of(null).pipe(
      switchMap(() => this.testCacheService()),
      tap(result => testResults.tests.push({ name: 'Cache Service', result, timestamp: new Date() })),
      switchMap(() => this.testPedidosUtilService()),
      tap(result => testResults.tests.push({ name: 'PedidosUtil Service', result, timestamp: new Date() })),
      switchMap(() => this.testInitializationService()),
      tap(result => testResults.tests.push({ name: 'Initialization Service', result, timestamp: new Date() })),
      switchMap(() => this.testAutoInitializationAfterLogin()),
      tap(result => testResults.tests.push({ name: 'Auto Initialization After Login', result, timestamp: new Date() })),
      map(() => {
        console.log('✅ Suite de pruebas completada:', testResults);
        return testResults;
      }),
      catchError(error => {
        console.error('❌ Error en suite de pruebas:', error);
        testResults.tests.push({ name: 'Error General', result: { success: false, error: error.message }, timestamp: new Date() });
        return of(testResults);
      })
    );
  }

  /**
   * 🔍 Prueba específica: ¿Se cargan los maestros automáticamente después del login?
   */
  testAutoInitializationAfterLogin(): Observable<any> {
    console.log('🔍 Probando inicialización automática después del login...');
    
    return new Observable(observer => {
      // Verificar si hay usuario logueado
      const user = localStorage.getItem('user');
      if (!user) {
        observer.next({
          success: false,
          reason: 'No hay usuario logueado',
          recommendation: 'Debe haber un usuario autenticado para probar la inicialización automática'
        });
        observer.complete();
        return;
      }

      // Verificar si InitializationService está funcionando
      const isInitializationCompleted = this.initializationService.isInitializationCompleted();
      const isInitializationInProgress = this.initializationService.isInitializationInProgress();

      // Verificar estado del PedidosUtilService
      this.pedidosUtilService.getMaestrosState().pipe(
        take(1)
      ).subscribe(maestrosState => {
        const result = {
          success: true,
          userLoggedIn: !!user,
          initializationCompleted: isInitializationCompleted,
          initializationInProgress: isInitializationInProgress,
          maestrosState: maestrosState,
          cacheData: this.getCacheInfo(),
          recommendations: [] as string[]
        };

        // Analizar resultados y generar recomendaciones
        if (!isInitializationCompleted && !isInitializationInProgress) {
          result.recommendations.push('La inicialización no se ha ejecutado. Verifique que AuthService llame a InitializationService.');
        }

        if (!maestrosState.loaded && !maestrosState.loading) {
          result.recommendations.push('Los maestros no se han cargado. Ejecute manualmente la inicialización.');
        }

        if (maestrosState.error) {
          result.recommendations.push('Hay errores en la carga de maestros. Revise la conectividad y configuración.');
        }

        console.log('🔍 Resultado prueba auto-inicialización:', result);
        observer.next(result);
        observer.complete();
      });
    });
  }

  /**
   * 🧪 Prueba el servicio de caché
   */
  private testCacheService(): Observable<any> {
    console.log('🧪 Probando CacheService...');
    
    return new Observable(observer => {
      const testKey = 'test_maestros_' + Date.now();
      const testData = { test: true, timestamp: new Date() };
      
      // Probar escritura y lectura de caché usando el método get()
      const cachedData = this.cacheService.get(testKey, () => of(testData), 5000);
      
      cachedData.pipe(take(1)).subscribe({
        next: (data) => {
          const success = !!data && (data as any).test === true;
          observer.next({
            success,
            message: success ? 'Cache funcionando correctamente' : 'Cache no funciona',
            testData: data
          });
          
          // Limpiar datos de prueba
          this.cacheService.clearCacheEntry(testKey);
          observer.complete();
        },
        error: (error) => {
          observer.next({
            success: false,
            message: 'Error en cache',
            error: error.message
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * 🧪 Prueba el PedidosUtilService
   */
  private testPedidosUtilService(): Observable<any> {
    console.log('🧪 Probando PedidosUtilService...');
    
    return this.pedidosUtilService.getMaestrosState().pipe(
      take(1),
      map(state => ({
        success: true,
        state: state,
        serviceAvailable: !!this.pedidosUtilService,
        hasInitializeMethod: typeof this.pedidosUtilService.initializeMaestros === 'function'
      })),
      catchError(error => of({
        success: false,
        error: error.message,
        serviceAvailable: !!this.pedidosUtilService
      }))
    );
  }

  /**
   * 🧪 Prueba el InitializationService
   */
  private testInitializationService(): Observable<any> {
    console.log('🧪 Probando InitializationService...');
    
    return of({
      success: true,
      isCompleted: this.initializationService.isInitializationCompleted(),
      isInProgress: this.initializationService.isInitializationInProgress(),
      serviceAvailable: !!this.initializationService
    });
  }

  /**
   * 📊 Obtiene información del caché
   */
  private getCacheInfo(): any {
    const empresaStr = sessionStorage.getItem("currentCompany");
    const empresa = empresaStr ? JSON.parse(empresaStr) : {};
    const cacheKey = `pedidos_maestros_${empresa?.nomComercial}`;
    
    // Intentar obtener datos del caché (sin activar fetch)
    return {
      cacheKey,
      empresa: empresa?.nomComercial || 'No definida',
      // Nota: No podemos verificar directamente si existe sin activar el fetch
      // Esto requeriría un método adicional en CacheService
    };
  }

  /**
   * 🔧 Simula un login y verifica la inicialización automática
   */
  simulateLoginAndTestInitialization(): Observable<any> {
    console.log('🔧 Simulando login y probando inicialización...');
    
    return new Observable(observer => {
      // Verificar si ya hay usuario
      const existingUser = localStorage.getItem('user');
      
      if (!existingUser) {
        observer.next({
          success: false,
          message: 'No se puede simular - no hay usuario en localStorage',
          recommendation: 'Haga login normalmente primero'
        });
        observer.complete();
        return;
      }

      // Resetear inicialización para simular login fresco
      this.initializationService.resetInitialization();
      
      // Llamar manualmente a la inicialización como lo haría AuthService
      this.initializationService.initializeAppServices().subscribe({
        next: (success) => {
          observer.next({
            success,
            message: success ? 'Inicialización simulada exitosa' : 'Inicialización simulada falló',
            simulationTime: new Date()
          });
          observer.complete();
        },
        error: (error) => {
          observer.next({
            success: false,
            message: 'Error en inicialización simulada',
            error: error.message
          });
          observer.complete();
        }
      });
    });
  }

  /**
   * 🎯 Verifica el estado completo del sistema de maestros
   */
  getFullSystemStatus(): Observable<any> {
    console.log('🎯 Obteniendo estado completo del sistema...');
    
    return this.pedidosUtilService.getMaestrosState().pipe(
      take(1),
      map(maestrosState => ({
        timestamp: new Date().toISOString(),
        user: {
          isLoggedIn: !!localStorage.getItem('user'),
          loginTime: localStorage.getItem('loginTime'),
          userData: this.getBasicUserInfo()
        },
        initialization: {
          completed: this.initializationService.isInitializationCompleted(),
          inProgress: this.initializationService.isInitializationInProgress()
        },
        maestros: maestrosState,
        cache: this.getCacheInfo(),
        services: {
          authService: !!this.authService,
          initializationService: !!this.initializationService,
          pedidosUtilService: !!this.pedidosUtilService,
          cacheService: !!this.cacheService
        }
      }))
    );
  }

  /**
   * 📋 Obtiene información básica del usuario sin datos sensibles
   */
  private getBasicUserInfo(): any {
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    
    try {
      const user = JSON.parse(userStr);
      return {
        hasToken: !!user.token,
        hasEmail: !!user.email,
        hasRol: !!user.rol,
        company: user.company || 'No definida'
      };
    } catch {
      return { error: 'Invalid user data in localStorage' };
    }
  }

  /**
   * 🚀 Fuerza la inicialización manual de maestros
   */
  forceInitializeMaestros(): Observable<any> {
    console.log('🚀 Forzando inicialización manual de maestros...');
    
    this.pedidosUtilService.initializeMaestros();
    
    return timer(1000).pipe(
      switchMap(() => this.pedidosUtilService.getMaestrosState()),
      take(1),
      map(state => ({
        success: true,
        message: 'Inicialización manual ejecutada',
        newState: state
      }))
    );
  }
} 