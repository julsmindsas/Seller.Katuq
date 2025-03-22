
import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AnaliticaService extends BaseService {
 
    constructor(public http: HttpClient) {
        super(http);
    }

    //TODO: Por ahora con Ejemplo
    getData(data:any): Observable<any> {
        return this.post('/v1/analiticas/data', {data});
    }



}