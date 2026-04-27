import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Observable, Subject } from 'rxjs';
import { FlowsService } from './flows.service';

export interface RunStreamEvent {
  type: 'init' | 'run_update' | 'log' | 'done' | 'error';
  data: any;
}

/**
 * Wrapper Angular alrededor del SSE de FlowsService.streamRun.
 * Proporciona Observable + auto-cleanup al desuscribir.
 */
@Injectable()
export class RunStreamService implements OnDestroy {
  private source: EventSource | null = null;
  private events$ = new Subject<RunStreamEvent>();
  private status$ = new BehaviorSubject<'idle' | 'connecting' | 'streaming' | 'closed' | 'error'>('idle');

  constructor(private flowsService: FlowsService) {}

  ngOnDestroy(): void {
    this.close();
  }

  /**
   * Inicia stream para un runId. Devuelve Observable de eventos.
   */
  start(runId: string): Observable<RunStreamEvent> {
    this.close();
    this.status$.next('connecting');
    this.source = this.flowsService.streamRun(runId, (eventName, data) => {
      this.events$.next({ type: eventName as RunStreamEvent['type'], data });
      if (eventName === 'init' || eventName === 'run_update' || eventName === 'log') {
        this.status$.next('streaming');
      }
      if (eventName === 'done') {
        this.status$.next('closed');
        this.close();
      }
      if (eventName === 'error') {
        this.status$.next('error');
      }
    });
    return this.events$.asObservable();
  }

  status(): Observable<string> {
    return this.status$.asObservable();
  }

  close(): void {
    if (this.source) {
      this.source.close();
      this.source = null;
    }
    this.status$.next('closed');
  }
}
