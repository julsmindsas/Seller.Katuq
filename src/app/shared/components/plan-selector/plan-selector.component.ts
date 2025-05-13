import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-plan-selector',
  templateUrl: './plan-selector.component.html',
  styleUrls: ['./plan-selector.component.scss']
})
export class PlanSelectorComponent {
  @Output() closed = new EventEmitter<void>();
  @Output() planSelected = new EventEmitter<any>();
  @Input() empresaData: any;

  selectedPlan: string = '';
  
  plans = [
    {
      id: 'earlyAdopter',
      name: 'EARLY ADOPTER',
      price: '6 meses GRATIS + 6 meses con 60% DCTO',
      features: [
        'Integraciones Individuales: Costo bajo demanda',
        'Integraciones Comunes: Sin costo adicional',
        'Notificaciones avanzadas: Incluido en el plan',
        'KAI (Creación de producto y Asistente): Incluido en el plan',
        'Rango de ventas: 10M - 200M',
        'Oferta limitada para comercios seleccionados'
      ],
      isHighlighted: true,
      showPorcentaje: false,
      isPromo: true,
      promoDetails: {
        duration: '12 meses',
        firstPeriod: '6 meses gratis',
        secondPeriod: '6 meses con 60% de descuento',
        conditions: 'Para comercios seleccionados'
      }
    },
    {
      id: 'plan1',
      name: 'PLAN #1',
      price: '77 USD',
      features: [
        'Integraciones Individuales: Costo bajo demanda',
        'Integraciones Comunes: Sin costo adicional',
        'Notificaciones avanzadas: Costo Por consumo',
        'KAI (Creación de producto y Asistente): Costo Por consumo',
        'Rango de ventas: 10M - 60M'
      ],
      isHighlighted: false,
      showPorcentaje: false
    },
    {
      id: 'plan2',
      name: 'PLAN #2',
      price: '47 USD + 1% por transacción exitosa',
      features: [
        'Integraciones Individuales: Costo bajo demanda',
        'Integraciones Comunes: Sin costo adicional',
        'Notificaciones avanzadas: 30% de Dcto',
        'KAI (Creación de producto y Asistente): 30% de Dcto',
        'Rango de ventas: 10M - 60M'
      ],
      isHighlighted: false,
      showPorcentaje: true
    },
    {
      id: 'plan3',
      name: 'PLAN #3',
      price: '2.99% / por transacción exitosa',
      features: [
        'Integraciones Individuales: Costo bajo demanda',
        'Integraciones Comunes: Sin costo adicional',
        'Notificaciones avanzadas: Incluido en el plan',
        'KAI (Creación de producto y Asistente): Incluido en el plan',
        'Rango de ventas: 10M - 200M'
      ],
      isHighlighted: false,
      showPorcentaje: true
    },
    {
      id: 'planPOS',
      name: 'PLAN POS',
      price: '24 USD por punto de venta',
      subtitle: 'INCLUYE INVENTARIOS + KAI + GRÁFICOS ANÁLISIS DATA',
      features: [
        'Integraciones Individuales: Costo bajo demanda',
        'Integraciones Comunes: Sin costo adicional',
        'Notificaciones avanzadas: Costo Por consumo',
        'KAI (Creación de producto y Asistente): Costo Por consumo',
        'Rango de ventas: 10M - 60M'
      ],
      isHighlighted: false,
      showPorcentaje: false
    }
  ];

  constructor(private service: MaestroService) {}

  close() {
    this.closed.emit();
  }

  selectPlan(planId: string) {
    this.selectedPlan = planId;
  }

  confirmSelection() {
    if (this.selectedPlan) {
      const planSeleccionado = this.plans.find(plan => plan.id === this.selectedPlan);
      
      // Si no encontramos el plan o no tenemos datos válidos, salir
      if (!planSeleccionado) {
        return;
      }
      
      // Si no tenemos datos de empresa, solo emitimos el plan seleccionado
      if (!this.empresaData) {
        this.planSelected.emit({
          nombrePlan: planSeleccionado.name,
          planPago: this.getPlanPagoFromId(this.selectedPlan),
          tipoPrecio: planSeleccionado.showPorcentaje ? 'Porcentaje' : 'Fijo'
        });
        return;
      }
      
      // Si tenemos datos de empresa, actualizamos el plan
      const datosActualizados = {
        ...this.empresaData,
        nombrePlan: planSeleccionado.name,
        planPago: this.getPlanPagoFromId(this.selectedPlan),
        tipoPrecio: planSeleccionado.showPorcentaje ? 'Porcentaje' : 'Fijo'
      };
      
      // Llamar al servicio para actualizar la empresa
      this.service.editCompany(datosActualizados).subscribe(
        response => {
          // Guardar la información actualizada en sessionStorage
          sessionStorage.setItem('infoFormsCompany', JSON.stringify(datosActualizados));
          
          // Notificar al usuario
          Swal.fire({
            title: 'Plan actualizado',
            text: `Se ha actualizado el plan a ${planSeleccionado.name}`,
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          
          // Emitir el plan seleccionado
          this.planSelected.emit(datosActualizados);
        },
        error => {
          // Manejar error
          Swal.fire({
            title: 'Error',
            text: 'No se pudo actualizar el plan. Intente nuevamente.',
            icon: 'error',
            confirmButtonText: 'Ok'
          });
        }
      );
    }
  }
  
  getPlanPagoFromId(planId: string): string {
    switch(planId) {
      case 'earlyAdopter':
        return 'Early Adopter';
      case 'plan1':
        return 'Mensual';
      case 'plan2':
        return 'Mensual+Comisión';
      case 'plan3':
        return 'Comisión';
      case 'planPOS':
        return 'Mensual POS';
      default:
        return 'Mensual';
    }
  }
}