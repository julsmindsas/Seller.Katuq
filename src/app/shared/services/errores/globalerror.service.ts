// src/app/services/global-error-handler.service.ts
import { ErrorHandler, Injectable, Injector } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { ErrorHandlerService } from './error-handler.service';

@Injectable({
  providedIn: 'root'
})
export class GlobalErrorHandlerService implements ErrorHandler {
  private errorQueue: any[] = []; // Cola para almacenar los errores
  private errorThreshold = 10; // Límite de errores para el envío

  constructor(private injector: Injector) {} // Usamos Injector para evitar una dependencia cíclica

  handleError(error: any) {
    const errorHandlerService = this.injector.get(ErrorHandlerService);
    
    let message = '';

    if (error instanceof HttpErrorResponse) {
      // Errores HTTP
      message = `HTTP Error: ${error.status} ${error.message}`;
    } else {
      // Otros errores, como de lógica o del navegador
      message = error.message ? error.message : error.toString();
    }

    console.error('Error global capturado:', message);
    
    // Agregar el error a la cola
    this.errorQueue.push({ message, timestamp: new Date() });

    // Verifica si se ha alcanzado el límite de errores
    if (this.errorQueue.length >= this.errorThreshold) {
      this.sendErrorsToApi(errorHandlerService); // Envía los errores acumulados a la API
    }
  }

  private sendErrorsToApi(errorHandlerService: ErrorHandlerService) {
    // Crea una copia de los errores acumulados
    const errorsToSend = [...this.errorQueue];
    
    // Llama al método logError de ErrorHandlerService para enviar los errores
    errorHandlerService.logError(errorsToSend);
    this.errorQueue = [];
     
  }
}
