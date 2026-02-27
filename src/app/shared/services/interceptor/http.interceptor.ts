import { Injectable } from '@angular/core';
import {
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpInterceptor
} from '@angular/common/http';
import { Observable, catchError, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Router } from '@angular/router';
import { AuthService } from '../firebase/auth.service';
import { ServiciosService } from '../servicios.service';
import { ToastrService } from 'ngx-toastr';

@Injectable()
export class HttpInterceptor2 implements HttpInterceptor {

  // Throttling para notificaciones de conexión - máximo 1 cada 30 segundos
  private static lastConnectionErrorTime: number = 0;
  private static readonly CONNECTION_ERROR_THROTTLE_MS = 30000;

  constructor(
    private service: ServiciosService,
    private authService: AuthService,
    private router: Router,
    private toastr: ToastrService
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Verificar si es una ruta pública (diagnóstico/encuesta/video-agent/agendamiento)
    const isPublicRoute = request.url.includes('/diagnostics/saveSurveyResponse') ||
                         request.url.includes('/diagnostico') ||
                         window.location.pathname.includes('/nuevo-registro') ||
                         window.location.pathname.includes('/video-agent') ||
                         window.location.pathname.includes('/servicios/agendamiento') ||
                         window.location.pathname.includes('/pos-v2');

    return this.handleAccess(request, next)
      .pipe(
        catchError((err: any) => {
          // Detectar errores de conexión a internet
          const isConnectionError = err.status === 0 ||
                                   err.error instanceof ProgressEvent ||
                                   err.name === 'TimeoutError';

          if (isConnectionError) {
            this.showConnectionError();
          } else {
            console.error('Error en petición HTTP:', err);
          }

          // No redirigir al login si es una ruta pública
          if ([401, 403].indexOf(err.status) !== -1 && !isPublicRoute) {
            console.error('🚨 [INTERCEPTOR] SIGN OUT triggered by:', err.status, request.url, '| isPublicRoute:', isPublicRoute, '| pathname:', window.location.pathname);
            this.service.signOut();
            this.router.navigate(['/login']);
          } else if ([401, 403].indexOf(err.status) !== -1) {
            console.warn('🛡️ [INTERCEPTOR] 401/403 but NOT signing out (public route):', request.url);
          }

          return throwError(err);
        }));
  }

  /**
   * Muestra un mensaje discreto cuando no hay conexión a internet
   * Implementa throttling para no ser invasivo
   */
  private showConnectionError(): void {
    const now = Date.now();
    const timeSinceLastError = now - HttpInterceptor2.lastConnectionErrorTime;

    // Solo mostrar si han pasado más de 30 segundos desde el último mensaje
    if (timeSinceLastError >= HttpInterceptor2.CONNECTION_ERROR_THROTTLE_MS) {
      this.toastr.warning(
        'Por favor verifica tu conexión.',
        'Sin conexión a internet',
        {
          timeOut: 3000,
          closeButton: false,
          progressBar: true,
          positionClass: 'toast-bottom-right'
        }
      );
      HttpInterceptor2.lastConnectionErrorTime = now;
    }
  }

  private handleAccess(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const userString = localStorage.getItem('user');

    // Lista de URLs del backend de Katuq que necesitan los headers personalizados
    const katuqBackendUrls = [
      'back.katuq.com',
      'api.katuq.com',
      'localhost:3300',
      '100.27.36.49:3300',
      'us-central1-katuq-new.cloudfunctions.net',
      'us-central1-bluerp-107bd.cloudfunctions.net'
    ];

    // Verificar si la request va al backend de Katuq
    const isKatuqBackend = katuqBackendUrls.some(url => request.url.includes(url));

    // DEBUG: Log para requests POS
    if (request.url.includes('/v1/pos/')) {
      console.warn('🔍 [INTERCEPTOR] POS request:', request.method, request.url,
        '| userExists:', !!userString,
        '| isKatuqBackend:', isKatuqBackend,
        '| tokenPrefix:', userString ? JSON.parse(userString)?.token?.substring(0, 20) : 'NO_USER');
    }

    if (userString && isKatuqBackend) {
      try {
        const user = JSON.parse(userString);
        const token = user.token;
        const company = user.company;

        let headers = {};

        if (company) {
          headers = {
            "Authorization": 'Bearer ' + token,
            "company": user?.company,
            'user': user?.nit,
            'usage-code': user?.authorizationCode,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'email': user.email,
            'Access-Control-Allow-Origin': environment.urlPermitidas
          };
        } else {
          headers = {
            "Authorization": 'Bearer ' + token,
            'user': user?.nit,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'email': user.email,
            'Access-Control-Allow-Origin': environment.urlPermitidas
          };
        }

        const newReq = request.clone({
          setHeaders: headers
        });

        return next.handle(newReq);
      } catch (error) {
        console.error('Error al procesar información de usuario:', error);
      }
    }

    return next.handle(request);
  }
}
