import { Component, Input, AfterViewInit, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

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

interface DatosCierre {
  fechaCierre: string;
  fechaFin: string;
  efectivoInicial: number;
  efectivoFinal: number;
  observaciones: string;
  formasPago: FormaPago[];
  productosVendidos: ProductoVenta[];
  informe: {
    totalVentas: number;
    diferencia: number;
    totalProductos: number;
  };
  empresa: string;
}

@Component({
  selector: 'app-reporte-cierre',
  templateUrl: './reporte-cierre.component.html',
  styleUrls: ['./reporte-cierre.component.scss']
})
export class ReporteCierreComponent implements OnInit, AfterViewInit {
  @Input() datosCierre: DatosCierre;
  
  // Datos de la empresa
  empresaActual: any = {};
  
  // Fecha y hora actuales
  fechaEmision: Date = new Date();
  horaEmision: string = '';

  constructor(
    private modal: NgbModal
  ) {}

  ngOnInit(): void {
    // Cargar datos de la empresa actual
    this.cargarDatosEmpresa();
    
    // Establecer hora de emisión
    this.horaEmision = this.fechaEmision.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  }

  ngAfterViewInit(): void {
    // El auto-print se maneja desde el componente padre según el tipo
    // No imprimir automáticamente para permitir previsualización
  }

  /**
   * Carga los datos de la empresa desde sessionStorage
   */
  private cargarDatosEmpresa(): void {
    const empresaStr = sessionStorage.getItem('currentCompany');
    if (empresaStr) {
      try {
        this.empresaActual = JSON.parse(empresaStr);
      } catch (error) {
        console.error('Error al parsear datos de empresa:', error);
        this.empresaActual = {};
      }
    }
  }

  /**
   * Obtiene el NIT formateado de la empresa
   */
  get nitEmpresaFormateado(): string {
    return this.empresaActual?.nit || 'No disponible';
  }

  /**
   * Obtiene la dirección completa de la empresa
   */
  get direccionCompleta(): string {
    const direccion = this.empresaActual?.direccion || '';
    const ciudad = this.empresaActual?.ciudad || '';
    const departamento = this.empresaActual?.departamento || '';
    
    return [direccion, ciudad, departamento].filter(Boolean).join(', ') || 'No disponible';
  }

  /**
   * Obtiene el teléfono de la empresa
   */
  get telefonoEmpresa(): string {
    return this.empresaActual?.telefono || this.empresaActual?.celular || 'No disponible';
  }

  /**
   * Obtiene el email de la empresa
   */
  get emailEmpresa(): string {
    return this.empresaActual?.email || this.empresaActual?.correo || 'No disponible';
  }

  /**
   * Método para imprimir el reporte
   */
  print(): void {
    window.print();
  }

  /**
   * Método para imprimir en formato POS
   */
  printPOS(): void {
    // Agregar clase temporal para formato POS
    document.body.classList.add('pos-print-mode');
    
    setTimeout(() => {
      window.print();
      // Remover la clase después de imprimir
      setTimeout(() => {
        document.body.classList.remove('pos-print-mode');
      }, 1000);
    }, 250);
  }

  /**
   * Método para regresar y cerrar el modal
   */
  goBack(): void {
    this.modal.dismissAll();
  }

  /**
   * Formatea fecha para mostrar
   */
  fechaFormateada(fecha: string): string {
    if (!fecha) return '';
    
    const fechaObj = new Date(fecha);
    return fechaObj.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  /**
   * Obtiene el período del cierre
   */
  get resumenPeriodo(): string {
    const inicio = this.fechaFormateada(this.datosCierre.fechaCierre);
    const fin = this.fechaFormateada(this.datosCierre.fechaFin);
    return inicio === fin ? inicio : `${inicio} al ${fin}`;
  }

  /**
   * Obtiene el total de ventas en efectivo
   */
  get totalEfectivo(): number {
    return this.datosCierre.formasPago.find(fp => fp.nombre === 'Efectivo')?.total || 0;
  }

  /**
   * Obtiene la fecha y hora actual formateada
   */
  get fechaHoraReporte(): string {
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
   * Calcula la diferencia de efectivo
   */
  get diferenciaCaja(): number {
    return this.datosCierre.efectivoFinal - (this.datosCierre.efectivoInicial + this.totalEfectivo);
  }

  /**
   * Determina si la diferencia es positiva
   */
  get esDiferenciaPositiva(): boolean {
    return this.diferenciaCaja >= 0;
  }
} 