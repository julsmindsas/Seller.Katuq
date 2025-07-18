import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, timeout } from 'rxjs/operators';
import { SecurityService } from '../services/security/security.service';
import { AuthService } from '../services/firebase/auth.service';
import { InitializationService } from '../services/initialization.service';

@Injectable({
  providedIn: 'root'
})
export class InitializationGuard implements CanActivate {

  constructor(
    private securityService: SecurityService,
    private authService: AuthService,
    private initializationService: InitializationService,
    private router: Router
  ) {}

  canActivate(): Observable<boolean> {
    // Verificar si el usuario está logueado
    if (!this.authService.isLoggedIn) {
      this.router.navigate(['/login']);
      return of(false);
    }

    // Verificar si los datos críticos están disponibles
    return this.ensureCriticalDataAvailable().pipe(
      timeout(10000), // 10 segundos timeout
      map(() => true),
      catchError((error) => {
        console.error('Error en InitializationGuard:', error);
        // En caso de error, permitir continuar pero logear el problema
        return of(true);
      })
    );
  }

  private ensureCriticalDataAvailable(): Observable<boolean> {
    return new Observable(observer => {
      try {
        // Verificar datos de usuario
        const userDataString = localStorage.getItem('user');
        if (!userDataString) {
          throw new Error('No hay datos de usuario disponibles');
        }

        let userData: any;
        try {
          userData = JSON.parse(userDataString);
        } catch (parseError) {
          throw new Error('Error parseando datos de usuario');
        }

        // Verificar información de empresa
        let companyInfo = this.securityService.getCompanyInformationLogged();
        if (!companyInfo && userData.company) {
          // Restaurar información de empresa desde datos de usuario
          companyInfo = {
            nombreComercio: userData.company,
            imgUrlLogo: undefined,
            razonSocial: userData.company
          };
          this.securityService.setCompanyInformationLogged(companyInfo);
        }

        // Verificar menú autorizado
        const authorizedMenuItems = localStorage.getItem('authorizedMenuItems');
        if (!authorizedMenuItems && userData.menu) {
          localStorage.setItem('authorizedMenuItems', JSON.stringify(userData.menu));
        }

        // Inicializar servicios maestros si no están inicializados
        if (!this.initializationService.isInitializationCompleted() && 
            !this.initializationService.isInitializationInProgress()) {
          
          this.initializationService.initializeAppServices().subscribe({
            next: (success) => {
              console.log('Servicios maestros inicializados:', success);
              observer.next(true);
              observer.complete();
            },
            error: (error) => {
              console.warn('Error inicializando servicios maestros:', error);
              // Permitir continuar aunque los servicios maestros fallen
              observer.next(true);
              observer.complete();
            }
          });
        } else {
          observer.next(true);
          observer.complete();
        }

      } catch (error) {
        console.error('Error crítico en InitializationGuard:', error);
        observer.error(error);
      }
    });
  }
}