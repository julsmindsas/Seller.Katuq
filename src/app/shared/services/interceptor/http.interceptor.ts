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
    private router: Router) { }

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    
    // const urlPermitidas =  environment.urlPermitidas;
    if (request.url.includes('katuq') || request.url.includes('localhost') ||
      request.url.includes('api-shwp4sc4vq-uc.a.run.app') || request.url.includes('https://api.katuq.com')) {
      return this.handleAccess(request, next)
        .pipe(
          catchError((err: Response) => {
            if ([401, 403].indexOf(err.status) !== -1) {
              // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
              this.service.signOut();
              this.router.navigate(['/login']);
            }
            return throwError(err);
          }));
    } else {
      return next.handle(request)
        .pipe(
          catchError((err: Response) => {
            if ([401, 403].indexOf(err.status) !== -1) {
              // auto logout if 401 Unauthorized or 403 Forbidden response returned from api
              this.service.signOut();
              this.router.navigate(['/login']);
            }
            return throwError(err);
          }));
    }
  }

  private handleAccess(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    // const token = await this.service.getToken();
    if (localStorage.getItem('user') !== null) {
      const user = JSON.parse(localStorage.getItem('user') ?? '{}');
      const token = user.token;
      const company = user.company;

      if (user.company) {
        const newReq = request.clone({
          setHeaders: {
            "Authorization": 'Bearer ' + token,
            "company": user?.company,
            'user': user?.nit,
            'usage-code': user?.authorizationCode,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'email': user.email,
            'Access-Control-Allow-Origin': environment.urlPermitidas
          }
        });
        return next.handle(newReq);

      }

      const newReq = request.clone({
        setHeaders: {
          "Authorization": 'Bearer ' + token,
          'user': user?.nit,
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'email': user.email,
          'Access-Control-Allow-Origin': environment.urlPermitidas
        }
      });
      return next.handle(newReq);



    }
    else {
      const newReq = request.clone({
        setHeaders: {
          // user: user,
          // terminal: term
        }
      });
      return next.handle(newReq);
    }
  }
}
