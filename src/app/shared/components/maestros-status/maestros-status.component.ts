import { Component, OnInit, OnDestroy } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { PedidosUtilService } from '../../../components/ventas/service/pedidos.util.service';

interface MaestrosState {
  loading: boolean;
  loaded: boolean;
  error: boolean;
  lastUpdate: Date | null;
  data: any | null;
}

@Component({
  selector: 'app-maestros-status',
  template: `
    <div class="maestros-status" *ngIf="showStatus">
      <div class="status-indicator" [ngClass]="getStatusClass()">
        <i [class]="getStatusIcon()"></i>
        <span class="status-text">{{ getStatusText() }}</span>
        <small *ngIf="state?.lastUpdate" class="last-update">
          Última actualización: {{ state.lastUpdate | date:'short' }}
        </small>
      </div>
    </div>
  `,
  styles: [`
    .maestros-status {
      position: fixed;
      top: 60px;
      right: 20px;
      z-index: 1000;
      max-width: 300px;
    }

    .status-indicator {
      padding: 8px 12px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      font-size: 12px;
      transition: all 0.3s ease;
    }

    .status-loading {
      background-color: #fff3cd;
      border: 1px solid #ffeaa7;
      color: #856404;
    }

    .status-loaded {
      background-color: #d1f2eb;
      border: 1px solid #00b894;
      color: #155724;
    }

    .status-error {
      background-color: #f8d7da;
      border: 1px solid #e74c3c;
      color: #721c24;
    }

    .status-text {
      font-weight: 500;
    }

    .last-update {
      display: block;
      opacity: 0.8;
      font-size: 10px;
    }

    i {
      font-size: 14px;
    }

    .fa-spin {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class MaestrosStatusComponent implements OnInit, OnDestroy {
  state: MaestrosState | null = null;
  showStatus = false;
  private subscription: Subscription = new Subscription();

  constructor(private pedidosUtilService: PedidosUtilService) {}

  ngOnInit(): void {
    // Suscribirse al estado de los maestros
    this.subscription.add(
      this.pedidosUtilService.getMaestrosState().subscribe(state => {
        this.state = state;
        this.updateVisibility();
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  private updateVisibility(): void {
    if (!this.state) {
      this.showStatus = false;
      return;
    }

    // Mostrar solo durante la carga o si hay error
    this.showStatus = this.state.loading || this.state.error;

    // Ocultar automáticamente después de 3 segundos si se cargó exitosamente
    if (this.state.loaded && !this.state.error && !this.state.loading) {
      setTimeout(() => {
        this.showStatus = false;
      }, 3000);
    }
  }

  getStatusClass(): string {
    if (!this.state) return '';
    
    if (this.state.loading) return 'status-loading';
    if (this.state.error) return 'status-error';
    if (this.state.loaded) return 'status-loaded';
    
    return '';
  }

  getStatusIcon(): string {
    if (!this.state) return 'fa fa-question';
    
    if (this.state.loading) return 'fa fa-spinner fa-spin';
    if (this.state.error) return 'fa fa-exclamation-triangle';
    if (this.state.loaded) return 'fa fa-check-circle';
    
    return 'fa fa-question';
  }

  getStatusText(): string {
    if (!this.state) return 'Estado desconocido';
    
    if (this.state.loading) return 'Cargando datos maestros...';
    if (this.state.error) return 'Error cargando datos';
    if (this.state.loaded) return 'Datos maestros cargados';
    
    return 'Estado desconocido';
  }
} 