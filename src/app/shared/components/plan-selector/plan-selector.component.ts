import { Component, EventEmitter, Output, Input } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { DataStoreService } from '../../../shared/services/dataStoreService';
import Swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';

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
      price: 'shell.planSelector.priceEarly',
      features: [
        'shell.planSelector.featIndividual',
        'shell.planSelector.featCommon',
        'shell.planSelector.featNotifIncluded',
        'shell.planSelector.featKaiIncluded',
        'shell.planSelector.featRange200',
        'shell.planSelector.featLimitedOffer'
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
      price: 'shell.planSelector.pricePlan1',
      features: [
        'shell.planSelector.featIndividual',
        'shell.planSelector.featCommon',
        'shell.planSelector.featNotifUsage',
        'shell.planSelector.featKaiUsage',
        'shell.planSelector.featRange60'
      ],
      isHighlighted: false,
      showPorcentaje: false
    },
    {
      id: 'plan2',
      name: 'PLAN #2',
      price: 'shell.planSelector.pricePlan2',
      features: [
        'shell.planSelector.featIndividual',
        'shell.planSelector.featCommon',
        'shell.planSelector.featNotifDiscount',
        'shell.planSelector.featKaiDiscount',
        'shell.planSelector.featRange60'
      ],
      isHighlighted: false,
      showPorcentaje: true
    },
    {
      id: 'plan3',
      name: 'PLAN #3',
      price: 'shell.planSelector.pricePlan3',
      features: [
        'shell.planSelector.featIndividual',
        'shell.planSelector.featCommon',
        'shell.planSelector.featNotifIncluded',
        'shell.planSelector.featKaiIncluded',
        'shell.planSelector.featRange200'
      ],
      isHighlighted: false,
      showPorcentaje: true
    },
    {
      id: 'planPOS',
      name: 'PLAN POS',
      price: 'shell.planSelector.pricePos',
      subtitle: 'shell.planSelector.subtitlePos',
      features: [
        'shell.planSelector.featIndividual',
        'shell.planSelector.featCommon',
        'shell.planSelector.featNotifUsage',
        'shell.planSelector.featKaiUsage',
        'shell.planSelector.featRange60'
      ],
      isHighlighted: false,
      showPorcentaje: false
    }
  ];

  constructor(
    private service: MaestroService,
    private dataStoreService: DataStoreService,
    private translate: TranslateService
  ) {}

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
          // Guardar la información actualizada en el dataStore
          this.dataStoreService.set('infoFormsCompany', datosActualizados).then(() => {
            // Notificar al usuario
            Swal.fire({
              title: this.translate.instant('shell.planSelector.updatedTitle'),
              text: this.translate.instant('shell.planSelector.updatedText', { plan: planSeleccionado.name }),
              icon: 'success',
              confirmButtonText: this.translate.instant('shell.planSelector.ok')
            });
            
            // Emitir el plan seleccionado
            this.planSelected.emit(datosActualizados);
          });
        },
        error => {
          // Manejar error
          Swal.fire({
            title: this.translate.instant('shell.planSelector.errorTitle'),
            text: this.translate.instant('shell.planSelector.errorText'),
            icon: 'error',
            confirmButtonText: this.translate.instant('shell.planSelector.ok')
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