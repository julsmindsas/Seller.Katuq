import { Component } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import Swal from 'sweetalert2';
import { Pedido } from '../../../modelo/pedido';
import { ReporteCierreComponent } from './reporte-cierre/reporte-cierre.component';

interface CierreData {
  efectivoInicial: number;
  efectivoFinal: number;
  observaciones: string;
}

interface FormaPago {
  nombre: string;
  total: number;
}

interface ProductoVenta {
  nombre: string;
  cantidad: number;
  precioUnitario: number;
  total: number;
  numeroPedido: string;
}

@Component({
  selector: 'app-cash-closing',
  templateUrl: './cash-closing.component.html',
  styleUrls: ['./cash-closing.component.scss']
})
export class CashClosingComponent {
  fechaCierre: string = new Date().toISOString().split('T')[0];
  fechaFin: string = new Date().toISOString().split('T')[0];
  efectivoInicial: number = 0;
  efectivoFinal: number = 0;
  observaciones: string = '';
  formasPago: FormaPago[] = [];
  productosVendidos: ProductoVenta[] = [];
  pedidos: Pedido[] = [];
  informe: any = {
    totalVentas: 0,
    diferencia: 0,
    totalProductos: 0
  };
  mostrarBotonCompletar: boolean = false;
  cierreFinalizado: boolean = false;
  empresa: string = '';

  constructor(
    private ventasService: VentasService,
    public modal: NgbModal
  ) {
    const companyData = localStorage.getItem("currentCompany");
    if (companyData) {
      const company = JSON.parse(companyData);
      this.empresa = company.nomComercial || '';
    }
  }

  calcularInforme() {
    // Crear fechas sin conversión de zona horaria UTC
    const fechaInicio = new Date(this.fechaCierre + 'T00:00:00');
    const fechaFin = new Date(this.fechaFin + 'T23:59:59.999');
    
    const filter = {
      fechaInicial: this.fechaCierre + 'T00:00:00.000Z',
      fechaFinal: this.fechaFin + 'T23:59:59.999Z',
      fechaFin: this.fechaFin + 'T23:59:59.999Z',
      company: this.empresa,
      estadoProceso: ['Todos'],
      origenConsulta: 'POS'
    };

    this.ventasService.getOrdersPOSByFilter(filter).subscribe(
      (ventas: Pedido[]) => {
        if (ventas.length > 0) {
          this.pedidos = ventas;
          
          // Agrupar ventas por forma de pago
          const ventasPorFormaPago = ventas.reduce((acc: { [key: string]: number }, venta) => {
            const formaPago = venta.formaDePago || 'Sin especificar';
            acc[formaPago] = (acc[formaPago] || 0) + (venta.totalPedididoConDescuento || 0);
            return acc;
          }, {});

          // Convertir a array de FormaPago
          this.formasPago = Object.entries(ventasPorFormaPago).map(([nombre, total]) => ({
            nombre,
            total: Number(total)
          }));

          // Procesar productos vendidos
          this.productosVendidos = ventas.reduce((acc: ProductoVenta[], pedido) => {
            if (pedido.carrito) {
              pedido.carrito.forEach(item => {
                if (item.producto && item.cantidad) {
                  acc.push({
                    nombre: item.producto.crearProducto?.titulo || 'Producto sin nombre',
                    cantidad: item.cantidad,
                    precioUnitario: (item.producto.precio?.precioUnitarioConIva || 0),
                    total: (item.producto.precio?.precioUnitarioConIva || 0) * item.cantidad,
                    numeroPedido: pedido.nroPedido || 'Sin número'
                  });
                }
              });
            }
            return acc;
          }, []);

          // Calcular totales
          this.informe.totalVentas = this.formasPago.reduce((sum, fp) => sum + fp.total, 0);
          this.informe.totalProductos = this.productosVendidos.reduce((sum, p) => sum + p.cantidad, 0);
          this.mostrarBotonCompletar = true;
        } else {
          Swal.fire({
            title: 'Error',
            text: 'No se encontraron ventas en el período seleccionado',
            icon: 'error'
          });
        }
      },
      (error) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al obtener las ventas del período',
          icon: 'error'
        });
      }
    );
  }

  calcularDiferencia(): number {
    const ventasEfectivo = this.formasPago.find(fp => fp.nombre === 'Efectivo')?.total || 0;
    this.informe.diferencia = this.efectivoFinal - (this.efectivoInicial + ventasEfectivo);
    return this.informe.diferencia;
  }

  calcularTotalProductos(): number {
    return this.productosVendidos.reduce((sum, p) => sum + p.total, 0);
  }

  /**
   * Abre el modal de reporte para imprimir
   */
  imprimir(): void {
    this.abrirModalReporte();
  }

  /**
   * Abre el modal de reporte en modo POS
   */
  imprimirPOS(): void {
    this.abrirModalReporte(true);
  }

  /**
   * Abre el modal del reporte de cierre
   */
  private abrirModalReporte(modoPos: boolean = false): void {
    const datosCierre = {
      fechaCierre: this.fechaCierre,
      fechaFin: this.fechaFin,
      efectivoInicial: this.efectivoInicial,
      efectivoFinal: this.efectivoFinal,
      observaciones: this.observaciones,
      formasPago: this.formasPago,
      productosVendidos: this.productosVendidos,
      informe: this.informe,
      empresa: this.empresa
    };

    const modalRef = this.modal.open(ReporteCierreComponent, {
      centered: true,
      size: 'xl',
      backdrop: 'static',
      keyboard: false
    });

    modalRef.componentInstance.datosCierre = datosCierre;

    // Si es modo POS, aplicar estilos específicos
    if (modoPos) {
      modalRef.componentInstance.ngAfterViewInit = () => {
        document.body.classList.add('pos-print-mode');
        setTimeout(() => {
          window.print();
          setTimeout(() => {
            document.body.classList.remove('pos-print-mode');
          }, 1000);
        }, 500);
      };
    }
  }

  /**
   * Obtiene la fecha y hora actual formateada para el reporte
   */
  fechaHoraReporte(): string {
    const ahora = new Date();
    return ahora.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  /**
   * Obtiene el total de ventas en efectivo
   */
  get totalEfectivo(): number {
    return this.formasPago.find(fp => fp.nombre === 'Efectivo')?.total || 0;
  }

  /**
   * Obtiene el resumen del período
   */
  get resumenPeriodo(): string {
    const inicio = this.fechaFormateada(this.fechaCierre);
    const fin = this.fechaFormateada(this.fechaFin);
    return inicio === fin ? inicio : `${inicio} al ${fin}`;
  }

  fechaFormateada(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  fechaActualFormateada(): string {
    const hoy = new Date();
    return hoy.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  completarCierre() {
    if (!this.efectivoFinal) {
      Swal.fire({
        title: 'Error',
        text: 'Debe ingresar el saldo final',
        icon: 'error'
      });
      return;
    }

    // Calcular diferencia
    this.calcularDiferencia();

    const cierreDataToSave = {
      fechaCierre: this.fechaCierre,
      fechaFin: this.fechaFin,
      efectivoInicial: this.efectivoInicial,
      efectivoFinal: this.efectivoFinal,
      observaciones: this.observaciones,
      informe: {
        ...this.informe,
        formasPago: this.formasPago,
        productosVendidos: this.productosVendidos
      },
      company: this.empresa
    };

    this.ventasService.realizarCierreCaja(cierreDataToSave).subscribe(
      (response) => {
        this.cierreFinalizado = true;
        
        Swal.fire({
          title: 'Cierre de Caja Exitoso',
          text: 'El cierre de caja se ha realizado exitosamente',
          icon: 'success',
          showConfirmButton: true,
          confirmButtonText: 'Imprimir',
          showDenyButton: true,
          denyButtonText: 'Imprimir POS',
          showCancelButton: true,
          cancelButtonText: 'Cerrar'
        }).then((result) => {
          if (result.isConfirmed) {
            this.imprimir();
          } else if (result.isDenied) {
            this.imprimirPOS();
          }
          // No cerrar el modal principal automáticamente, 
          // dejar que el usuario decida desde el reporte
        });
      },
      (error) => {
        Swal.fire({
          title: 'Error',
          text: 'Error al realizar el cierre de caja',
          icon: 'error'
        });
      }
    );
  }
} 