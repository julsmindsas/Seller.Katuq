import { Component, Input, OnChanges, SimpleChanges } from '@angular/core';
import { ValidationResult } from './integration-form-validator.service';

@Component({
  selector: 'app-credential-strength-indicator',
  template: `
    <div class="credential-strength-indicator" *ngIf="validationResult">
      <!-- Barra de progreso de seguridad -->
      <div class="strength-header">
        <span class="strength-label">Nivel de seguridad</span>
        <span class="strength-score">{{ validationResult.score }}/100</span>
      </div>
      
      <div class="strength-bar">
        <div class="strength-progress" 
             [style.width.%]="validationResult.score"
             [ngClass]="'strength-' + validationResult.securityLevel">
        </div>
      </div>
      
      <div class="strength-level" 
           [ngClass]="'level-' + validationResult.securityLevel">
        <i class="fas" [ngClass]="getLevelIcon()"></i>
        <span>{{ getLevelText() }}</span>
      </div>
      
      <!-- Alertas y sugerencias -->
      <div class="strength-feedback" *ngIf="hasWarningsOrSuggestions()">
        <div *ngFor="let warning of validationResult.warnings" 
             class="feedback-item feedback-warning">
          <i class="fa fa-exclamation-triangle"></i>
          <span>{{ warning }}</span>
        </div>
        
        <div *ngFor="let suggestion of validationResult.suggestions" 
             class="feedback-item feedback-suggestion">
          <i class="fa fa-lightbulb"></i>
          <span>{{ suggestion }}</span>
        </div>
      </div>
      
      <!-- Recommendations -->
      <div class="strength-recommendations" *ngIf="showRecommendations && validationResult.score < 80">
        <h6><i class="fa fa-shield-alt"></i> Recomendaciones de seguridad</h6>
        <ul>
          <li *ngIf="validationResult.score < 30">Usa credenciales más largas y complejas</li>
          <li *ngIf="validationResult.score < 50">Configura webhooks para monitoreo en tiempo real</li>
          <li *ngIf="validationResult.score < 70">Verifica que las credenciales coincidan con el ambiente</li>
          <li *ngIf="validationResult.score < 80">Añade claves de integridad cuando estén disponibles</li>
        </ul>
      </div>
    </div>
  `,
  styles: [`
    .credential-strength-indicator {
      margin: 16px 0;
      padding: 16px;
      border-radius: 8px;
      background: #f8f9fa;
      border: 1px solid #e9ecef;
    }

    .strength-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .strength-label {
      font-weight: 600;
      color: #495057;
      font-size: 14px;
    }

    .strength-score {
      font-weight: 700;
      font-size: 14px;
      color: #6c757d;
    }

    .strength-bar {
      height: 8px;
      background: #e9ecef;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 12px;
    }

    .strength-progress {
      height: 100%;
      transition: width 0.5s ease, background-color 0.3s ease;
      border-radius: 4px;
    }

    .strength-low { background: linear-gradient(90deg, #dc3545, #fd7e83); }
    .strength-medium { background: linear-gradient(90deg, #ffc107, #ffda6a); }
    .strength-high { background: linear-gradient(90deg, #28a745, #71dd8a); }

    .strength-level {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      font-size: 14px;
      margin-bottom: 12px;
    }

    .level-low { color: #dc3545; }
    .level-medium { color: #ffc107; }
    .level-high { color: #28a745; }

    .strength-feedback {
      margin: 12px 0;
    }

    .feedback-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 13px;
      line-height: 1.4;
    }

    .feedback-warning {
      color: #856404;
    }

    .feedback-warning i {
      color: #ffc107;
      margin-top: 2px;
    }

    .feedback-suggestion {
      color: #0c5460;
    }

    .feedback-suggestion i {
      color: #17a2b8;
      margin-top: 2px;
    }

    .strength-recommendations {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #dee2e6;
    }

    .strength-recommendations h6 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 12px;
      color: #495057;
      font-size: 14px;
    }

    .strength-recommendations ul {
      margin: 0;
      padding-left: 20px;
    }

    .strength-recommendations li {
      margin-bottom: 6px;
      font-size: 13px;
      color: #6c757d;
      line-height: 1.4;
    }

    @media (max-width: 575.98px) {
      .credential-strength-indicator {
        padding: 12px;
      }
      .strength-label, .strength-score, .strength-level, .strength-recommendations h6 {
        font-size: 13px;
      }
      .feedback-item, .strength-recommendations li {
        font-size: 12px;
      }
    }
  `]
})
export class CredentialStrengthIndicatorComponent implements OnChanges {
  @Input() validationResult: ValidationResult | null = null;
  @Input() showRecommendations: boolean = true;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['validationResult'] && this.validationResult) {
      // Aquí podrías agregar lógica adicional cuando cambia el resultado
    }
  }

  getLevelIcon(): string {
    if (!this.validationResult) return 'fa-shield-alt';
    
    switch (this.validationResult.securityLevel) {
      case 'high': return 'fa-shield-check';
      case 'medium': return 'fa-shield-halved';
      case 'low': return 'fa-shield-xmark';
      default: return 'fa-shield-alt';
    }
  }

  getLevelText(): string {
    if (!this.validationResult) return 'Sin evaluar';
    
    switch (this.validationResult.securityLevel) {
      case 'high': return 'Alto - Excelente configuración';
      case 'medium': return 'Medio - Configuración aceptable';
      case 'low': return 'Bajo - Requiere mejoras';
      default: return 'Sin evaluar';
    }
  }

  hasWarningsOrSuggestions(): boolean {
    return !!(this.validationResult?.warnings?.length || this.validationResult?.suggestions?.length);
  }
} 