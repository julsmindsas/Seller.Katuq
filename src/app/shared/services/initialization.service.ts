import { Injectable, Injector } from '@angular/core';
import { Observable, timer, of } from 'rxjs';
import { switchMap, catchError, retry, shareReplay } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class InitializationService {
  private initializationInProgress = false;
  private initializationCompleted = false;

  constructor(private injector: Injector) {}

  /**
   * Inicializa todos los servicios necesarios después del login
   */
  public initializeAppServices(): Observable<boolean> {
    if (this.initializationInProgress || this.initializationCompleted) {
      return of(true);
    }

    this.initializationInProgress = true;
    console.log('🚀 Iniciando carga de servicios en segundo plano...');

    return timer(100).pipe(
      switchMap(() => this.loadMaestrosService()),
      retry(2),
      shareReplay(1),
      catchError(error => {
        console.error('❌ Error en inicialización de servicios:', error);
        this.initializationInProgress = false;
        return of(false);
      })
    );
  }

  /**
   * Carga el servicio de maestros
   */
  private loadMaestrosService(): Observable<boolean> {
    return new Observable(observer => {
      try {
        import('../../components/ventas/service/pedidos.util.service').then(module => {
          const PedidosUtilService = module.PedidosUtilService;
          
          try {
            const pedidosUtilService = this.injector.get(PedidosUtilService);
            
            if (pedidosUtilService && typeof pedidosUtilService.initializeMaestros === 'function') {
              pedidosUtilService.initializeMaestros();
              console.log('✅ Maestros inicializados correctamente');
              this.initializationCompleted = true;
              this.initializationInProgress = false;
              observer.next(true);
              observer.complete();
            } else {
              throw new Error('Servicio PedidosUtilService no disponible');
            }
          } catch (injectionError) {
            console.warn('⚠️ Error obteniendo PedidosUtilService del injector:', injectionError);
            // Fallback: intentar más tarde
            setTimeout(() => {
              try {
                const service = this.injector.get(PedidosUtilService);
                if (service && typeof service.initializeMaestros === 'function') {
                  service.initializeMaestros();
                  console.log('✅ Maestros inicializados correctamente (fallback)');
                  this.initializationCompleted = true;
                }
              } catch (fallbackError) {
                console.error('❌ Error en fallback de inicialización:', fallbackError);
              }
            }, 2000);
            
            this.initializationInProgress = false;
            observer.next(false);
            observer.complete();
          }
        }).catch(importError => {
          console.error('❌ Error importando PedidosUtilService:', importError);
          this.initializationInProgress = false;
          observer.error(importError);
        });
      } catch (error) {
        console.error('❌ Error en loadMaestrosService:', error);
        this.initializationInProgress = false;
        observer.error(error);
      }
    });
  }

  /**
   * Reinicia la inicialización (útil para logout/login)
   */
  public resetInitialization(): void {
    this.initializationInProgress = false;
    this.initializationCompleted = false;
    console.log('🔄 Inicialización reseteada');
  }

  /**
   * Verifica si la inicialización está completa
   */
  public isInitializationCompleted(): boolean {
    return this.initializationCompleted;
  }

  /**
   * Verifica si la inicialización está en progreso
   */
  public isInitializationInProgress(): boolean {
    return this.initializationInProgress;
  }
} 