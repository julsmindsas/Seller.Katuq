import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class KatuqIntelligenceService {


    private urlBase: string = environment.urlApi;
    private httpOptions: any;
    constructor(private http: HttpClient) {

    }
    /**
     * Procesa un archivo de ventas
     * @param data Los datos del archivo
     * @param fileType El tipo de archivo ('json' o 'excel')
     * @returns Observable con la respuesta del servidor
     */
    processFile(data: any[], fileType: 'json' | 'excel'): Observable<any> {
        return this.http.post(`${this.urlBase}/v1/orders/loadSales`, {
            data: data,
            fileType: fileType
        }, this.httpOptions);
    }

    /**
     * Procesa un archivo de ventas con KAI
     * @param data Los datos del archivo
     * @param fileType El tipo de archivo ('json' o 'excel')
     * @returns Observable con la respuesta del servidor
     */
    processWithKAI(data: any[], fileType: 'json' | 'excel'): Observable<any> {
        // Validar los datos de entrada
        if (!data || !Array.isArray(data) || data.length === 0) {
            throw new Error('Los datos proporcionados no son válidos.');
        }

        // Crear encabezados
        let headers = new HttpHeaders().set('Content-Type', 'application/json');
        const userJson = localStorage.getItem('user');
        if (userJson) {
            try {
                const user = JSON.parse(userJson);
                if (user?.company) {
                    headers = headers.set('company', user.company);
                }
            } catch (error) {
                console.error('Error al analizar el usuario desde localStorage:', error);
            }
        }

        // Opciones HTTP locales
        const httpOptions = {
            headers: headers,
        };

        // Realizar la solicitud HTTP
        return this.http.post(`${this.urlBase}/v1/katuqintelligence/kai/loadSales`, {
            data: data,
            fileType: fileType
        }, httpOptions);
    }
}
