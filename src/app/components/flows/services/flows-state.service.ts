import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { FlowSpec, RunContext, NodeSpec, FlowTemplate } from '../interfaces/flow.interface';

/**
 * In-memory state hub for the Flows module. Mirrors
 * `IntegrationStateService` so the UI tier can subscribe without coupling
 * to the HTTP service.
 */
@Injectable({
  providedIn: 'root'
})
export class FlowsStateService {
  private flowsSubject = new BehaviorSubject<FlowSpec[]>([]);
  private selectedFlowSubject = new BehaviorSubject<FlowSpec | null>(null);
  private runsSubject = new BehaviorSubject<RunContext[]>([]);
  private selectedRunSubject = new BehaviorSubject<RunContext | null>(null);
  private catalogSubject = new BehaviorSubject<NodeSpec[]>([]);
  private templatesSubject = new BehaviorSubject<FlowTemplate[]>([]);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  // ---- Observables consumed by templates ----

  flows$: Observable<FlowSpec[]> = this.flowsSubject.asObservable();
  selectedFlow$: Observable<FlowSpec | null> = this.selectedFlowSubject.asObservable();
  runs$: Observable<RunContext[]> = this.runsSubject.asObservable();
  selectedRun$: Observable<RunContext | null> = this.selectedRunSubject.asObservable();
  catalog$: Observable<NodeSpec[]> = this.catalogSubject.asObservable();
  templates$: Observable<FlowTemplate[]> = this.templatesSubject.asObservable();
  loading$: Observable<boolean> = this.loadingSubject.asObservable();

  // ---- Setters / mutations ----

  setFlows(flows: FlowSpec[]): void {
    this.flowsSubject.next(flows || []);
  }

  upsertFlow(flow: FlowSpec): void {
    const list = [...this.flowsSubject.value];
    const idx = list.findIndex((f) => f.id === flow.id);
    if (idx === -1) list.push(flow);
    else list[idx] = flow;
    this.flowsSubject.next(list);
    if (this.selectedFlowSubject.value?.id === flow.id) {
      this.selectedFlowSubject.next(flow);
    }
  }

  removeFlow(id: string): void {
    this.flowsSubject.next(this.flowsSubject.value.filter((f) => f.id !== id));
    if (this.selectedFlowSubject.value?.id === id) {
      this.selectedFlowSubject.next(null);
    }
  }

  setSelectedFlow(flow: FlowSpec | null): void {
    this.selectedFlowSubject.next(flow);
  }

  setRuns(runs: RunContext[]): void {
    this.runsSubject.next(runs || []);
  }

  setSelectedRun(run: RunContext | null): void {
    this.selectedRunSubject.next(run);
  }

  setCatalog(catalog: NodeSpec[]): void {
    this.catalogSubject.next(catalog || []);
  }

  setTemplates(templates: FlowTemplate[]): void {
    this.templatesSubject.next(templates || []);
  }

  setLoading(loading: boolean): void {
    this.loadingSubject.next(loading);
  }

  // ---- Synchronous getters (templates only — prefer Observables) ----

  get currentFlows(): FlowSpec[] {
    return this.flowsSubject.value;
  }

  get currentSelectedFlow(): FlowSpec | null {
    return this.selectedFlowSubject.value;
  }

  get currentCatalog(): NodeSpec[] {
    return this.catalogSubject.value;
  }
}
