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

@Injectable()
export class HttpInterceptor2 implements HttpInterceptor {

  constructor(private service: ServiciosService,
    private authService: AuthService,
    private router: Router) {
    console.log('HttpInterceptor2 inicializado');
    console.log('URL API configurada:', environment.urlApi);
  }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    // Log detallado para depuración
    console.log('🔍 Interceptor captó petición a:', request.url);
    console.log('🔍 Método HTTP:', request.method);
    console.log('🔍 Headers actuales:', JSON.stringify(request.headers.keys()));
    
    // Verificamos si es una petición al API
    const isApiRequest = request.url.includes(environment.urlApi) || 
                         request.url.startsWith('/v1/');
    
    // Verificar si es una ruta pública (diagnóstico/encuesta)
    const isPublicRoute = request.url.includes('/diagnostics/saveSurveyResponse') ||
                         request.url.includes('/diagnostico') ||
                         window.location.pathname.includes('/nuevo-registro');
    
    console.log('🔍 ¿Es petición a API?', isApiRequest);
    console.log('🔍 ¿Es ruta pública?', isPublicRoute);
    
    // Siempre interceptamos, sin importar la URL
    return this.handleAccess(request, next)
      .pipe(
        catchError((err: Response) => {
          console.error('🔴 Error en petición interceptada:', err);
          // No redirigir al login si es una ruta pública
          if ([401, 403].indexOf(err.status) !== -1 && !isPublicRoute) {
            // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
            this.service.signOut();
            this.router.navigate(['/login']);
          }
          return throwError(err);
        }));
  }

  private handleAccess(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Aseguramos tener información de usuario
    const userString = localStorage.getItem('user');
    console.log('🔍 ¿Existe usuario en localStorage?', !!userString);
    
    if (userString) {
      try {
        const user = JSON.parse(userString);
        const token = user.token;
        const company = user.company;
        
        console.log('🔍 Token disponible:', !!token);
        console.log('🔍 Company disponible:', !!company);

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
        
        console.log('🔍 Headers a aplicar:', JSON.stringify(headers));
        
        const newReq = request.clone({
          setHeaders: headers
        });
        
        console.log('🔍 Petición modificada - URL final:', newReq.url);
        return next.handle(newReq);
      } catch (error) {
        console.error('🔴 Error al procesar usuario:', error);
      }
    }
    
    console.log('🔍 No hay usuario, petición sin modificar:', request.url);
    return next.handle(request);
  }
}
