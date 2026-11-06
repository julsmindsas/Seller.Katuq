import { Component, Input, AfterViewInit, OnInit } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';

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
  /** D-583: ventas de días anteriores que quedaron sin cerrar y entran aparte. */
  formasPagoAnteriores?: FormaPago[];
  totalAnteriores?: number;
  pedidosAnteriores?: { nroPedido: string; fechaCreacion: string; formaDePago: string; total: number }[];
  /** D-585: número de cierre del día (turno). */
  turno?: number;
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
    private modal: NgbModal,
    private translate: TranslateService
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
    return this.empresaActual?.nit || this.translate.instant('ventas.reporteCierre.noDisponible');
  }

  /**
   * Obtiene la dirección completa de la empresa
   */
  get direccionCompleta(): string {
    const direccion = this.empresaActual?.direccion || '';
    const ciudad = this.empresaActual?.ciudad || '';
    const departamento = this.empresaActual?.departamento || '';
    
    return [direccion, ciudad, departamento].filter(Boolean).join(', ') || this.translate.instant('ventas.reporteCierre.noDisponible');
  }

  /**
   * Obtiene el teléfono de la empresa
   */
  get telefonoEmpresa(): string {
    return this.empresaActual?.telefono || this.empresaActual?.celular || this.translate.instant('ventas.reporteCierre.noDisponible');
  }

  /**
   * Obtiene el email de la empresa
   */
  get emailEmpresa(): string {
    return this.empresaActual?.email || this.empresaActual?.correo || this.translate.instant('ventas.reporteCierre.noDisponible');
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

    // "2026-11-02" con new Date() es medianoche UTC: en Colombia salía 01/11.
    const partes = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);
    const fechaObj = partes ? new Date(+partes[1], +partes[2] - 1, +partes[3]) : new Date(fecha);
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
    return this.datosCierre.formasPago.find(fp => (fp.nombre || '').toLowerCase() === 'efectivo')?.total || 0;
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
    return this.datosCierre.efectivoFinal - (this.datosCierre.efectivoInicial + this.totalEfectivo + this.efectivoAnteriores);
  }

  /** D-583: efectivo de las ventas de días anteriores que entran en este cierre. */
  get efectivoAnteriores(): number {
    return (this.datosCierre.formasPagoAnteriores || []).find(fp => (fp.nombre || '').toLowerCase() === 'efectivo')?.total || 0;
  }

  /** Fecha y hora completas de una venta ("03/11/2026, 5:08 p. m."), en la hora del equipo. */
  horaVenta(iso: string): string {
    const d = new Date(iso);
    if (!iso || isNaN(d.getTime())) return '';
    return d.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  /**
   * Días en que se hicieron las ventas en EFECTIVO de días anteriores que entran en
   * este cierre: "03/11/2026", "01/11/2026 y 03/11/2026" o "01/11/2026, 02/11/2026 y 03/11/2026".
   */
  get fechasEfectivoAnteriores(): string {
    const dias = (this.datosCierre?.pedidosAnteriores || [])
      .filter((v) => (v.formaDePago || '').toLowerCase() === 'efectivo')
      .map((v) => {
        const d = new Date(v.fechaCreacion);
        return isNaN(d.getTime()) ? '' : d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
      })
      .filter(Boolean);
    const unicos = Array.from(new Set(dias)).sort((a, b) => a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join('')));
    if (unicos.length <= 1) return unicos[0] || '';
    return unicos.slice(0, -1).join(', ') + ' y ' + unicos[unicos.length - 1];
  }

  /** Quien hizo el cierre (antes salía siempre "Sistema": se leía de la empresa). */
  get usuarioReporte(): string {
    try {
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      return u.name || u.nombre || u.email || 'Sin registrar';
    } catch {
      return 'Sin registrar';
    }
  }

  /**
   * Determina si la diferencia es positiva
   */
  get esDiferenciaPositiva(): boolean {
    return this.diferenciaCaja >= 0;
  }
} 