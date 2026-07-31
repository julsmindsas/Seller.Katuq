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
import * as Sentry from '@sentry/angular';

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
    // Verificar si es una ruta pública (diagnóstico/encuesta/video-agent/agendamiento/login)
    const isPublicRoute = request.url.includes('/diagnostics/saveSurveyResponse') ||
                         request.url.includes('/diagnostico') ||
                         window.location.pathname.includes('/registrarse') ||
                         window.location.pathname.includes('/nuevo-registro') ||
                         window.location.pathname.includes('/video-agent') ||
                         window.location.pathname.includes('/servicios/agendamiento') ||
                         window.location.pathname.includes('/login') ||
                         window.location.pathname.includes('/authentication');

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

          // Los 5xx del backend suelen quedar "manejados" por el subscribe del
          // componente y nunca llegarían al ErrorHandler global — se capturan
          // acá explícitamente para verlos en Sentry con la URL agrupadora.
          if (err.status >= 500) {
            Sentry.captureException(err, {
              fingerprint: ['http-5xx', String(err.status), request.method, request.url.split('?')[0]],
              tags: { http_status: String(err.status), http_method: request.method },
              extra: { url: request.url, backendMessage: err.error?.message || null },
            });
          }

          if ([401, 403].indexOf(err.status) !== -1 && !isPublicRoute) {
            if (this.esSesionInvalida(err)) {
              // Sesión inservible: seguir "adentro" de la app solo produce
              // fallos sueltos en cada llamada hasta que el usuario intenta
              // guardar algo. Se saca al login.
              this.cerrarSesionPorSesionInvalida();
            } else {
              // El backend usa DOS claves distintas según el caso: `message`
              // (límites de suscripción, rol no permitido) y `error` (token
              // inválido en middleware/auth.js). Leyendo solo `message`, un 403
              // de sesión caía al texto cableado y se anunciaba como "Límite de
              // suscripción alcanzado" — mandaba a diagnosticar otra cosa.
              const mensajeBackend = err.error?.message || err.error?.error;
              this.toastr.warning(
                mensajeBackend || 'Límite de suscripción alcanzado',
                'Suscripción',
                {
                  timeOut: 8000,
                  closeButton: true,
                  progressBar: true
                }
              );
            }
          }

          return throwError(err);
        }));
  }

  /**
   * ¿El error indica que la SESIÓN no sirve (a diferencia de "no tenés permiso
   * para esto" o "se te acabó el plan")?
   *
   * Es una lista POSITIVA a propósito. No se puede sacar al usuario ante
   * cualquier 401/403, porque el backend usa 403 para tres cosas distintas:
   *
   *  1. Sesión inválida — `middleware/auth.js`: `{ error: 'Token inválido o
   *     dañado' }` cuando la firma del JWT no coincide con SECRET_TOKEN.
   *  2. Permiso insuficiente — `middleware/requireRole.js`: códigos
   *     `ROLE_NOT_ALLOWED` / `PERMISSION_DENIED` / `ROLE_NOT_FOUND`. La sesión
   *     es válida; al usuario solo le falta el rol. Sacarlo al login sería
   *     absurdo y además le borraría el trabajo en pantalla.
   *  3. Límites de plan — `middleware/subscriptionValidator.js`:
   *     `ORDER_LIMIT_REACHED`, `SUBSCRIPTION_SUSPENDED`, etc.
   *
   * Los 401 sí son todos de autenticación (falta el header, formato inválido o
   * token expirado), así que ese caso entra completo.
   */
  private esSesionInvalida(err: any): boolean {
    if (err.status === 401) {
      return true;
    }
    if (err.status !== 403) {
      return false;
    }

    const cuerpo = err.error || {};

    // requireRole con JWT sin rol: el propio mensaje del backend pide
    // "Cerrá sesión y volvé a entrar".
    if (cuerpo.code === 'NO_ROLE_IN_JWT') {
      return true;
    }

    // Firma inválida. Se compara contra `error` (no `message`) porque es la
    // clave que usa auth.js, y los códigos de suscripción/rol que viajan en esa
    // misma clave nunca mencionan el token.
    return typeof cuerpo.error === 'string' && /token/i.test(cuerpo.error);
  }

  /**
   * Cierra la sesión y manda al login. El flag es estático porque cuando el
   * token deja de servir suelen fallar varias peticiones a la vez, y sin él
   * cada una dispararía su propio toast y su propia navegación.
   */
  private static cerrandoSesion = false;

  private cerrarSesionPorSesionInvalida(): void {
    if (HttpInterceptor2.cerrandoSesion) {
      return;
    }
    HttpInterceptor2.cerrandoSesion = true;

    this.toastr.error(
      'Tu sesión ya no es válida. Volvé a iniciar sesión.',
      'Sesión finalizada',
      { timeOut: 6000, closeButton: true, progressBar: true }
    );

    // Un instante para que el mensaje se alcance a leer antes del salto.
    setTimeout(() => {
      try {
        this.authService.SignOut();
      } finally {
        HttpInterceptor2.cerrandoSesion = false;
      }
    }, 700);
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
      'us-central1-bluerp-107bd.cloudfunctions.net'
    ];

    // Verificar si la request va al backend de Katuq
    const isKatuqBackend = katuqBackendUrls.some(url => request.url.includes(url));

    if (userString && isKatuqBackend) {
      try {
        const user = JSON.parse(userString);
        const token = user.token;
        const company = user.company;

        let headers = {};

        // En un envío multipart (FormData) el Content-Type lo tiene que poner el
        // navegador porque incluye el boundary; forzar application/json rompe la
        // subida de archivos.
        const esFormData = request.body instanceof FormData;
        const contentType = esFormData ? {} : { 'Content-Type': 'application/json' };

        if (company) {
          headers = {
            "Authorization": 'Bearer ' + token,
            "company": user?.company,
            'user': user?.nit,
            'usage-code': user?.authorizationCode,
            ...contentType,
            'Accept': 'application/json',
            'email': user.email,
            'Access-Control-Allow-Origin': environment.urlPermitidas
          };
        } else {
          headers = {
            "Authorization": 'Bearer ' + token,
            'user': user?.nit,
            ...contentType,
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
