import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

/** Lo que Opttia ve de las rutas: solo cifras; nunca nombres, teléfonos ni direcciones de clientes. */
export interface RutaParaOpttia {
  paradas: number;
  km: number;
  minutos: number;
  porCobrar: number;
  tarde: number;
  conFranja: number;
  urgentes: number;
}

export interface OpinionOpttia {
  titular: string | null;
  puntos: string[];
  rutas: Record<string, string>;
}

/** Ajustes que Opttia entiende de una instrucción escrita; el código arma las rutas, no ella. */
export interface AjustesOpttia {
  rutas?: number;
  maxParadas?: number;
  horaSalidaMin?: number;
  regresa?: boolean;
  velocidadKmh?: number;
  minutosPorParada?: number;
  nota?: string | null;
}

@Injectable({ providedIn: 'root' })
export class RuteroService {
  private readonly url = `${environment.urlApi}/v1/logistica/rutero`;

  constructor(private http: HttpClient) {}

  opinion(datos: { rutas: RutaParaOpttia[]; sinRuta: number; sinUbicar: number; horaSalidaMin: number }): Observable<{ opinion: OpinionOpttia | null }> {
    return this.http.post<{ opinion: OpinionOpttia | null }>(`${this.url}/opinion`, datos);
  }

  instruccion(datos: { texto: string; paradas: number; actuales: AjustesOpttia }): Observable<{ ajustes: AjustesOpttia | null }> {
    return this.http.post<{ ajustes: AjustesOpttia | null }>(`${this.url}/instruccion`, datos);
  }
}
