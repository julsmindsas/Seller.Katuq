import { Injectable } from '@angular/core';
import { BaseService } from '../base.service';
import { HttpClient } from '@angular/common/http';
import { query } from '@angular/animations';
import { Observable, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';
import { AILimitsService } from '../ai-limits.service';
import { SubscriptionService } from '../subscription.service';

@Injectable({
    providedIn: 'root'
})
export class KatuqintelligenceService extends BaseService {

    constructor(
        public http: HttpClient,
        private aiLimitsService: AILimitsService,
        private subscriptionService: SubscriptionService
    ) {
        super(http);
    }

    invokeKatuqIntelligence(propmt: any) {
        // Validación sincrónica antes de llamar al backend
        const canUse = this.aiLimitsService.canUseAIFeature('products');

        if (!canUse) {
            this.aiLimitsService.showUpgradeModal('products');
            return throwError(() => new Error('Feature bloqueada en plan Freemium'));
        }

        return this.post<any>('/v1/katuqintelligence/ia', propmt).pipe(
            tap(() => {
                // Refrescar estadísticas de uso después de generación exitosa
                // Agregar delay de 2 segundos para asegurar que backend terminó de guardar
                setTimeout(() => {
                    this.subscriptionService.refresh();
                }, 2000);
            }),
            catchError(error => {
                if (error.error?.error === 'AI_PRODUCTS_LIMIT_REACHED') {
                    this.aiLimitsService.showUpgradeModal('products', error.error.message);
                }
                return throwError(() => error);
            })
        );
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
        const canUse = this.aiLimitsService.canUseAIFeature('products');

        if (!canUse) {
            this.aiLimitsService.showUpgradeModal('products');
            return throwError(() => new Error('Feature bloqueada en plan Freemium'));
        }

        return this.post<any>('/v1/katuqintelligence/kai/analitycs', body).pipe(
            tap(() => {
                // Refrescar estadísticas de uso después de generación exitosa
                this.subscriptionService.refresh();
            }),
            catchError(error => {
                if (error.error?.error === 'AI_PRODUCTS_LIMIT_REACHED') {
                    this.aiLimitsService.showUpgradeModal('products', error.error.message);
                }
                return throwError(() => error);
            })
        );
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