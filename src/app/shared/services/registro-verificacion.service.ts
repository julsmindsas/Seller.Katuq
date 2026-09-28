import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { BaseService } from './base.service';

/** Respuesta de confirmar: la misma sesión del login, más si hay que contar el registro en la pauta. */
export interface SesionConfirmada {
  token: string;
  firePixel?: boolean;
  [campo: string]: any;
}

/**
 * Confirmar el correo de un registro dudoso antes de entrar (D-323).
 * Públicos: quien los usa todavía no tiene sesión.
 */
@Injectable({ providedIn: 'root' })
export class RegistroVerificacionService extends BaseService {
  constructor(http: HttpClient) {
    super(http);
  }

  /** Manda un código nuevo. Responde lo mismo exista o no el correo. */
  pedirCodigo(email: string): Observable<{ success: boolean; message: string }> {
    return this.post('/v1/registro/codigo', { email });
  }

  /** Valida el código y devuelve la sesión. */
  confirmar(email: string, codigo: string): Observable<SesionConfirmada> {
    return this.post<SesionConfirmada>('/v1/registro/confirmar', { email, codigo });
  }
}
