import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { query } from '@angular/animations';

@Injectable({
    providedIn: 'root'
})
export class KatuqintelligenceService extends BaseService {

    constructor(public http: HttpClient) {
        super(http);
    }

    invokeKatuqIntelligence(propmt: any) {
        return this.post<any>('/v1/katuqintelligence/ia', propmt);
    }

    invokeKatuqAdvandceIntelligenceForProductRetriver(propmt: any) {
        const body = {
            query: propmt
        }
        return this.post<any>('/v1/katuqintelligence/ia/product/retriver', body);
    }

    getKatuqPrompt() {
        return this.get<any>('/v1/katuqintelligence/ia/product/getprompt');
    }
}