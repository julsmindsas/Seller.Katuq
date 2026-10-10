import { HttpClient, HttpContext } from '@angular/common/http';
import { SKIP_LOADER } from './interceptor/loader.interceptor';
import { Injectable } from '@angular/core';
import { HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';


@Injectable({
    providedIn: 'root'
})
export class BaseService {
    protected http: HttpClient;
    private urlBase = environment.urlApi;
    constructor(http: HttpClient) {
        this.http = http;
    }


    protected get<T>(url: string, options?: HttpParams): Observable<T> {
        const urlComplete = this.urlBase + url;
        return this.http.get<T>(urlComplete);
    }

    protected post<T>(url: string, body: any, options?: HttpParams): Observable<T> {
        const urlComplete = this.urlBase + url;
        return this.http.post<T>(urlComplete, body);
    }

    /**
     * POST sin la pantalla de carga global: para pantallas que muestran su propio avance (por ejemplo
     * el chat "Con IA" del editor, que dice "Mirando tu imagen…" mientras la IA trabaja).
     */
    protected postSinLoader<T>(url: string, body: any): Observable<T> {
        const urlComplete = this.urlBase + url;
        return this.http.post<T>(urlComplete, body, { context: new HttpContext().set(SKIP_LOADER, true) });
    }

    protected put<T>(url: string, body: any, options?: HttpParams): Observable<T> {
        const urlComplete = this.urlBase + url;
        return this.http.put<T>(urlComplete, body);
    }

    protected delete<T>(url: string, options?: HttpParams): Observable<T> {
        const urlComplete = this.urlBase + url;
        return this.http.delete<T>(urlComplete);
    }

}
