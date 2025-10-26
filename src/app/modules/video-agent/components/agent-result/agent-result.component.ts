import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { AdapterResult, AgentAction } from '../../core/models/agent-adapter.interface';
import { AdapterRegistryService } from '../../core/services/adapter-registry.service';
import { Router } from '@angular/router';

/**
 * Componente para mostrar resultados del diagnóstico
 * Adapta UI según tipo de resultado (DIY, SERVICE, INFO, ESCALATE)
 */
@Component({
  selector: 'app-agent-result',
  templateUrl: './agent-result.component.html',
  styleUrls: ['./agent-result.component.scss']
})
export class AgentResultComponent implements OnInit {
  @Input() result!: AdapterResult;
  @Output() closePanel = new EventEmitter<void>();
  @Output() scheduleService = new EventEmitter<any>();

  action: AgentAction | null = null;

  constructor(
    private adapterRegistry: AdapterRegistryService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.processResult();
  }

  /**
   * Procesa el resultado y obtiene la acción recomendada
   */
  private processResult(): void {
    const adapter = this.adapterRegistry.currentAdapter;

    if (adapter) {
      this.action = adapter.getNextAction(this.result);
    }
  }

  /**
   * Obtiene icono según tipo de resultado
   */
  getResultIcon(): string {
    switch (this.result.type) {
      case 'DIY':
        return 'pi-wrench';
      case 'SERVICE':
        return 'pi-calendar';
      case 'INFO':
        return 'pi-info-circle';
      case 'ESCALATE':
        return 'pi-phone';
      default:
        return 'pi-question-circle';
    }
  }

  /**
   * Obtiene clase CSS según tipo de resultado
   */
  getResultClass(): string {
    switch (this.result.type) {
      case 'DIY':
        return 'result-diy';
      case 'SERVICE':
        return 'result-service';
      case 'INFO':
        return 'result-info';
      case 'ESCALATE':
        return 'result-escalate';
      default:
        return 'result-default';
    }
  }

  /**
   * Obtiene badge de confianza
   */
  getConfidenceBadge(): { label: string; class: string } {
    const confidence = this.result.confidence;

    if (confidence >= 80) {
      return { label: 'Alta confianza', class: 'badge-high' };
    } else if (confidence >= 60) {
      return { label: 'Confianza media', class: 'badge-medium' };
    } else {
      return { label: 'Confianza baja', class: 'badge-low' };
    }
  }

  /**
   * Navega al módulo de agendamiento
   */
  navigateToScheduling(): void {
    if (this.action?.data) {
      // Guardar datos del servicio en sessionStorage
      sessionStorage.setItem('pendingService', JSON.stringify({
        serviceType: this.action.data.serviceType || 'Reparación',
        reason: this.action.data.reason,
        urgency: this.action.data.urgency,
        estimatedCost: this.action.data.estimatedCost,
        diagnosticResult: this.result
      }));

      // Navegar a agendamiento
      this.router.navigate(['/servicios/agendamiento']);
    }
  }

  /**
   * Cierra el panel
   */
  close(): void {
    this.closePanel.emit();
  }

  /**
   * Getters para template
   */
  get isDIY(): boolean {
    return this.result.type === 'DIY';
  }

  get isService(): boolean {
    return this.result.type === 'SERVICE';
  }

  get isEscalate(): boolean {
    return this.result.type === 'ESCALATE';
  }

  get diySteps(): string[] {
    return this.action?.data?.steps || [];
  }

  get estimatedTime(): string {
    return this.action?.data?.estimatedTime || 'N/A';
  }

  get toolsNeeded(): string[] {
    return this.action?.data?.toolsNeeded || [];
  }

  get preventiveTips(): string[] {
    return this.action?.data?.preventiveTips || [];
  }

  get serviceReason(): string {
    return this.action?.data?.reason || '';
  }

  get urgency(): string {
    return this.action?.data?.urgency || 'medio';
  }

  get estimatedCost(): string {
    return this.action?.data?.estimatedCost || 'A cotizar';
  }

  get priorityBadge(): { label: string; class: string } {
    const priority = this.action?.priority || 'low';

    switch (priority) {
      case 'critical':
        return { label: 'URGENTE', class: 'badge-critical' };
      case 'high':
        return { label: 'Alta prioridad', class: 'badge-high' };
      case 'medium':
        return { label: 'Prioridad media', class: 'badge-medium' };
      default:
        return { label: 'Prioridad baja', class: 'badge-low' };
    }
  }
}
