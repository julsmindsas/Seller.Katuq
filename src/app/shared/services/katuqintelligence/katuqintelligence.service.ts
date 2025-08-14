import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { query } from '@angular/animations';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

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

    getAnalitycsGraphs(body: any){
        return this.post<any>('/v1/katuqintelligence/kai/analitycs', body);
    }

    /**
     * Streaming de respuesta (SSE). Intenta conectarse a un endpoint de stream.
     * Si el backend no soporta SSE en esa ruta, el consumidor debe hacer fallback.
     */
    streamProductRetriver(queryText: string) {
        const url = environment.urlApi + '/v1/katuqintelligence/ia/product/retriver/stream?query=' + encodeURIComponent(queryText);

        return new Observable<string>((observer) => {
            let eventSource: EventSource | null = null;
            try {
                eventSource = new EventSource(url);
            } catch (err) {
                observer.error(err);
                return;
            }

            const onMessage = (event: MessageEvent) => {
                try {
                    const data = event.data;
                    if (data === '[DONE]') {
                        observer.complete();
                        return;
                    }
                    observer.next(data);
                } catch (e) {
                    observer.error(e);
                }
            };

            const onError = (err: any) => {
                observer.error(err);
            };

            const onOpen = () => {
                // Conexión abierta
            };

            eventSource.addEventListener('open', onOpen as any);
            eventSource.addEventListener('message', onMessage as any);
            eventSource.addEventListener('error', onError as any);

            return () => {
                if (eventSource) {
                    eventSource.removeEventListener('open', onOpen as any);
                    eventSource.removeEventListener('message', onMessage as any);
                    eventSource.removeEventListener('error', onError as any);
                    eventSource.close();
                }
            };
        });
    }
}