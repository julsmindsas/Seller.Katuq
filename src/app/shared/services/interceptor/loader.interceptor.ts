import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent,
  HttpContextToken
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { finalize } from 'rxjs/operators';
import { LoaderService } from '../loader.service';

/**
 * Token de HttpContext para excluir una request puntual del loader global.
 * Uso en un servicio:
 *   this.http.get(url, { context: new HttpContext().set(SKIP_LOADER, true) })
 * Para eximir una PANTALLA completa, usar LoaderService.suppressGlobalLoader()
 * en ngOnInit y releaseGlobalLoader() en ngOnDestroy.
 */
export const SKIP_LOADER = new HttpContextToken<boolean>(() => false);

@Injectable()
export class LoaderInterceptor implements HttpInterceptor {

  constructor(private loaderService: LoaderService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // Requests excluidas: retorno temprano SIN finalize — antes el hide()
    // incondicional descontaba requests que nunca hicieron show() y podía
    // apagar el loader de otra pantalla en vuelo.
    if (req.context.get(SKIP_LOADER) || req.url.includes('katuqintelligence')) {
      return next.handle(req);
    }
    this.loaderService.show();
    return next.handle(req).pipe(
      finalize(() => this.loaderService.hide())
    );
  }
}
