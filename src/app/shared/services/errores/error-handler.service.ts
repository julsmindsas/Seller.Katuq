// src/app/services/error-handler.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ErrorHandlerService {
  private apiUrl = environment.urlApi + '/v1/errorcenter/regitererror'; // Cambia esta URL por la de tu API

  constructor(private http: HttpClient) {}

  logError(error: any) {
    // Puedes enviar solo los detalles que necesites a la API
    const errorPayload = {
      message: error.message || 'Unknown error',
      stack: error.stack || 'No stack trace',
      timestamp: new Date(),
      url: window.location.href
    };

    return this.http.post(this.apiUrl, errorPayload).pipe(
      catchError(this.handleError) // Captura errores del post y evita bucles
    ).subscribe();
  }

  private handleError(error: any) {
    console.error('Error en el servicio de manejo de errores:', error);
    return throwError(error);
  }
}
