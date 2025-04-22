import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cash-closing',
  templateUrl: './cash-closing.component.html',
  styleUrls: ['./cash-closing.component.scss']
})
export class CashClosingComponent {
  fechaCierre: string = new Date().toISOString().split('T')[0];
  efectivoInicial: number = 0;
  efectivoFinal: number = 0;
  observaciones: string = '';
  informe: any = {
    ventasEfectivo: 0,
    ventasTarjeta: 0,
    ventasEwallet: 0,
    totalVentas: 0,
    diferencia: 0
  };

  constructor(
    private ventasService: VentasService,
    public modal: NgbModal
  ) { }

  calcularInforme() {
    if (!this.efectivoFinal) {
      Swal.fire({
        title: 'Error',
        text: 'Debe ingresar el monto final en efectivo',
        icon: 'error'
      });
      return;
    }

    // Obtener las ventas del día
    const fechaCierreDate  = new Date(this.fechaCierre);
    fechaCierreDate.setDate(fechaCierreDate.getDate() + 1);
    const fechaInicio = new Date(fechaCierreDate);
    fechaInicio.setHours(0, 0, 0, 0);
    const fechaFin = new Date(fechaCierreDate);
    fechaFin.setHours(23, 59, 59, 999);
    const filter = {
      fechaInicial: fechaInicio.toISOString(),
      fechaFinal: fechaFin.toISOString(),
      company: JSON.parse(sessionStorage.getItem("currentCompany") ?? '{}').nomComercial,
      estadoProceso: ['Todos'],
      origenConsulta: 'POS'
    };

    this.ventasService.getOrdersPOSByFilter(filter).subscribe(
      (ventas: any[]) => {
        if (ventas.length > 0) {
          this.informe.ventasEfectivo = ventas
            .filter(v => v.formaDePago === 'Efectivo')
            .reduce((sum, v) => sum + v.totalPedididoConDescuento, 0);

          this.informe.ventasTarjeta = ventas
            .filter(v => v.formaDePago === 'Tarjeta')
            .reduce((sum, v) => sum + v.totalPedididoConDescuento, 0);

          this.informe.ventasEwallet = ventas
            .filter(v => v.formaDePago === 'E-Wallet')
            .reduce((sum, v) => sum + v.totalPedididoConDescuento, 0);

          this.informe.totalVentas = this.informe.ventasEfectivo +
            this.informe.ventasTarjeta +
            this.informe.ventasEwallet;

          this.informe.diferencia = this.efectivoFinal -
            (this.efectivoInicial + this.informe.ventasEfectivo);

          const cierreData = {
            fechaCierre: this.fechaCierre,
            efectivoInicial: this.efectivoInicial,
            efectivoFinal: this.efectivoFinal,
            observaciones: this.observaciones,
            informe: this.informe,
            company: JSON.parse(sessionStorage.getItem("currentCompany") ?? '{}').nomComercial
          };

          this.ventasService.realizarCierreCaja(cierreData).subscribe(
            (response) => {
              Swal.fire({
                title: 'Éxito',
                html: `
                <h4>Resumen de Cierre</h4>
                <p>Ventas en Efectivo: $${this.informe.ventasEfectivo.toFixed(2)}</p>
                <p>Ventas con Tarjeta: $${this.informe.ventasTarjeta.toFixed(2)}</p>
                <p>Ventas E-Wallet: $${this.informe.ventasEwallet.toFixed(2)}</p>
                <p>Total Ventas: $${this.informe.totalVentas.toFixed(2)}</p>
                <p>Diferencia en Efectivo: $${this.informe.diferencia.toFixed(2)}</p>
              `,
                icon: 'success'
              });
              this.modal.dismissAll();
            },
            (error) => {
              Swal.fire({
                title: 'Error',
                text: 'Error al realizar el cierre de caja',
                icon: 'error'
              });
            }
          );
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se encontraron ventas del día',
            icon: 'error'
          });
        }
      },
      (error) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al obtener las ventas del día',
          icon: 'error'
        });
      }
    );
  }
} 