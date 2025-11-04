import { Component, OnInit, OnDestroy, Input, Output, EventEmitter } from '@angular/core';
import { Subject } from 'rxjs';
import { MessageService } from 'primeng/api';
import { Consecutivo, TIPOS_CONSECUTIVO_INFO, TipoConsecutivo } from '../../../shared/models/consecutivo';

/**
 * Step: Consecutivos Configuration
 * Configuración de consecutivos para pedidos web y POS
 */
@Component({
  selector: 'app-sequences-step',
  templateUrl: './sequences-step.component.html',
  styleUrls: ['./sequences-step.component.scss']
})
export class SequencesStepComponent implements OnInit, OnDestroy {
  @Input() initialData: any = null;
  @Input() aiSuggestion: any = null;

  @Output() dataChange = new EventEmitter<any>();
  @Output() stepComplete = new EventEmitter<any>();

  private destroy$ = new Subject<void>();

  // Estado de los consecutivos
  enableOrders = true;
  enableOrdersPOS = true;

  isSaving = false;

  // Información de tipos de consecutivo
  tiposInfo = TIPOS_CONSECUTIVO_INFO;

  constructor(
    private messageService: MessageService
  ) {}

  ngOnInit(): void {
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga datos iniciales si existen
   */
  private loadInitialData(): void {
    if (this.initialData?.data && Array.isArray(this.initialData.data)) {
      const consecutivos = this.initialData.data;

      // Verificar qué consecutivos existen
      const hasOrders = consecutivos.some((c: Consecutivo) => c.tipoConsecutivo === 'orders');
      const hasOrdersPOS = consecutivos.some((c: Consecutivo) => c.tipoConsecutivo === 'ordersPOS');

      if (hasOrders || hasOrdersPOS) {
        console.log('🔢 Cargando consecutivos existentes:', consecutivos.length);
        this.enableOrders = hasOrders;
        this.enableOrdersPOS = hasOrdersPOS;

        // Auto-completar si ya hay consecutivos configurados
        setTimeout(() => {
          this.stepComplete.emit({ consecutivos: consecutivos });
        }, 0);
      }
    }
  }

  /**
   * Obtiene vista previa del formato del consecutivo
   */
  getPreviewFormat(tipo: TipoConsecutivo): string {
    return this.tiposInfo[tipo].ejemplo;
  }

  /**
   * Valida que al menos un consecutivo esté habilitado
   */
  isValid(): boolean {
    return this.enableOrders || this.enableOrdersPOS;
  }

  /**
   * Genera mensaje de ayuda según los consecutivos seleccionados
   */
  getHelpMessage(): string {
    if (!this.isValid()) {
      return 'Debes seleccionar al menos un tipo de consecutivo';
    }

    const selected: string[] = [];
    if (this.enableOrders) selected.push('Pedidos Web');
    if (this.enableOrdersPOS) selected.push('Pedidos POS');

    return `Se crearán consecutivos para: ${selected.join(' y ')}`;
  }

  /**
   * Completa el paso y emite los consecutivos seleccionados
   */
  async onComplete(): Promise<void> {
    if (!this.isValid()) {
      this.messageService.add({
        severity: 'warn',
        summary: 'Configuración Incompleta',
        detail: 'Debes seleccionar al menos un tipo de consecutivo para continuar'
      });
      return;
    }

    this.isSaving = true;

    try {
      const company = JSON.parse(localStorage.getItem('currentCompany') || '{}');
      const companyName = company.nomComercial || company.nombre;

      if (!companyName) {
        throw new Error('No se pudo obtener el nombre de la empresa');
      }

      // Crear array de consecutivos según selección
      const consecutivos: Consecutivo[] = [];

      if (this.enableOrders) {
        consecutivos.push({
          company: companyName,
          numero: 1,
          tipoConsecutivo: 'orders'
        });
      }

      if (this.enableOrdersPOS) {
        consecutivos.push({
          company: companyName,
          numero: 1,
          tipoConsecutivo: 'ordersPOS'
        });
      }

      console.log('🔢 Consecutivos configurados:', consecutivos);

      // Emitir evento de completado con los consecutivos
      this.stepComplete.emit({ consecutivos: consecutivos });

      this.messageService.add({
        severity: 'success',
        summary: 'Configuración Completa',
        detail: `${consecutivos.length} consecutivo(s) configurado(s) correctamente`
      });

    } catch (error) {
      console.error('Error configurando consecutivos:', error);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'No se pudo completar la configuración de consecutivos'
      });
    } finally {
      this.isSaving = false;
    }
  }
}
