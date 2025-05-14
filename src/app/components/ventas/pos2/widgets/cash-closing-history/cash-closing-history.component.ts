import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import swal from 'sweetalert2';
import { FormBuilder, FormGroup } from '@angular/forms';

// Interfaz para un pedido individual dentro del historial
interface Pedido {
  id: string;
  nroPedido: string;
  total: number;
  formaDePago: string;
  fechaCreacion: string;
  usuario: string;
}

// Interfaz para un elemento del historial de cierre
interface HistorialItem {
  fecha: string;
  efectivoInicial: number;
  efectivoFinal: number;
  observaciones: string;
  informe: string;
  usuarioCierre: string;
  totalVentas: number;
  totalEfectivo: number;
  totalTarjeta: number;
  totalTransferencia: number;
  cantidadPedidos: number;
  cantidadProductos: number;
  totalDescuentos: number;
  totalImpuestos: number;
  pedidos: Pedido[];
  formasPago: { [key: string]: number };
}

// Interfaz principal para la respuesta del historial de cierre
interface CashClosingHistoryResponse {
  resumenGeneral: {
    totalDias: number;
    totalVentas: number;
    totalEfectivo: number;
    totalTarjeta: number;
    totalTransferencia: number;
    promedioDiario: number;
    usuariosCierre: string[];
    formasPago: { [key: string]: number };
  };
  historial: HistorialItem[];
  fechaInicio: string;
  fechaFin: string;
  company: string;
  metodoConsulta?: string;
}

// Interfaz para representar una forma de pago
interface FormaPago {
  nombre: string;
  total: number;
  icono: string;
  clase: string;
}

@Component({
  selector: 'app-cash-closing-history',
  templateUrl: './cash-closing-history.component.html',
  styleUrls: ['./cash-closing-history.component.scss']
})
export class CashClosingHistoryComponent implements OnInit {
  // Usar la nueva interfaz
  historyData: CashClosingHistoryResponse | null = null;
  loading = false;
  filtroForm: FormGroup;
  
  // Para usar con datepicker
  fechaInicioModel: NgbDateStruct;
  fechaFinModel: NgbDateStruct;

  constructor(
    public activeModal: NgbActiveModal,
    private ventasService: VentasService,
    private fb: FormBuilder
  ) { 
    // Inicializar con el mes actual
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    
    this.fechaInicioModel = {
      year: firstDay.getFullYear(),
      month: firstDay.getMonth() + 1,
      day: firstDay.getDate()
    };
    
    this.fechaFinModel = {
      year: lastDay.getFullYear(),
      month: lastDay.getMonth() + 1,
      day: lastDay.getDate()
    };
    
    this.filtroForm = this.fb.group({
      fechaInicio: [this.fechaInicioModel],
      fechaFin: [this.fechaFinModel]
    });
  }

  ngOnInit() {
    this.loadHistory();
  }
  
  // Convertir NgbDateStruct a Date
  toDate(dateStruct: NgbDateStruct): Date {
    if (!dateStruct) return new Date();
    return new Date(dateStruct.year, dateStruct.month - 1, dateStruct.day);
  }

  loadHistory() {
    this.loading = true;
    
    // Obtener las fechas del formulario
    const fechaInicioValue = this.filtroForm.get('fechaInicio')?.value || this.fechaInicioModel;
    const fechaFinValue = this.filtroForm.get('fechaFin')?.value || this.fechaFinModel;
    
    const fechaInicio = this.toDate(fechaInicioValue);
    const fechaFin = this.toDate(fechaFinValue);
    
    // Establecer las horas para incluir todo el día
    fechaInicio.setHours(0, 0, 0, 0);
    fechaFin.setHours(23, 59, 59, 999);

    // Crear objeto de filtro
    const filter = {
      company: JSON.parse(sessionStorage.getItem('currentCompany') || '{}').nomComercial,
      origenConsulta: 'POS',
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFin.toISOString()
    };

    // Realizar la consulta
    this.ventasService.getCashClosingHistory(filter).subscribe({
      next: (data: CashClosingHistoryResponse) => {
        this.historyData = this.procesarRespuestaHistorial(data);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cash closing history:', error);
        swal.fire({
          title: 'Error',
          text: 'No se pudo cargar el historial de cierres de caja. Por favor, intente de nuevo.',
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
        this.loading = false;
      }
    });
  }
  
  /**
   * Procesa la respuesta del historial para asegurar que tenga todas las propiedades necesarias
   */
  procesarRespuestaHistorial(data: CashClosingHistoryResponse): CashClosingHistoryResponse {
    // Inicializar formasPago en el resumen general si no existe
    if (!data.resumenGeneral.formasPago) {
      data.resumenGeneral.formasPago = {};
    }
    
    // Procesar cada item del historial
    if (data.historial) {
      data.historial.forEach(item => {
        // Inicializar formasPago si no existe
        if (!item.formasPago) {
          item.formasPago = {};
        }
        
        // Calcular formas de pago a partir de los pedidos
        const formasPagoCalculadas = this.obtenerFormasPagoPorCierre(item.pedidos);
        
        // Fusionar con las formas de pago existentes
        item.formasPago = { ...item.formasPago, ...formasPagoCalculadas };
      });
      
      // Calcular el resumen general de formas de pago
      const todasLasFormasPago: { [key: string]: number } = {};
      
      // Acumular totales de todas las formas de pago
      data.historial.forEach(item => {
        Object.keys(item.formasPago).forEach(formaPago => {
          if (!todasLasFormasPago[formaPago]) {
            todasLasFormasPago[formaPago] = 0;
          }
          todasLasFormasPago[formaPago] += item.formasPago[formaPago];
        });
      });
      
      // Asignar el resumen general
      data.resumenGeneral.formasPago = todasLasFormasPago;
    }
    
    return data;
  }
  
  /**
   * Obtiene un objeto que contiene todas las formas de pago y sus totales
   * a partir de una lista de pedidos.
   */
  obtenerFormasPagoPorCierre(pedidos: Pedido[]): { [key: string]: number } {
    if (!pedidos || pedidos.length === 0) {
      return {};
    }
    
    const formasPago: { [key: string]: number } = {};
    
    pedidos.forEach(pedido => {
      const formaPago = pedido.formaDePago.toLowerCase();
      if (!formasPago[formaPago]) {
        formasPago[formaPago] = 0;
      }
      formasPago[formaPago] += pedido.total;
    });
    
    return formasPago;
  }
  
  /**
   * Convierte un objeto de formas de pago en un array para facilitar su uso en templates
   */
  getFormasPagoArray(formasPago: { [key: string]: number }): FormaPago[] {
    if (!formasPago) {
      return [];
    }
    
    return Object.keys(formasPago).map(nombre => {
      return {
        nombre: this.capitalizarPrimeraLetra(nombre),
        total: formasPago[nombre],
        icono: this.getIconoFormaPago(nombre),
        clase: this.getClaseFormaPago(nombre)
      };
    });
  }
  
  /**
   * Capitaliza la primera letra de un string
   */
  capitalizarPrimeraLetra(texto: string): string {
    if (!texto) return '';
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }
  
  /**
   * Obtiene el icono correspondiente para cada forma de pago
   */
  getIconoFormaPago(formaPago: string): string {
    formaPago = formaPago.toLowerCase();
    switch (formaPago) {
      case 'efectivo':
        return 'bi-cash';
      case 'tarjeta':
        return 'bi-credit-card';
      case 'transferencia':
        return 'bi-bank';
      case 'wompi':
        return 'bi-currency-exchange';
      default:
        return 'bi-wallet2';
    }
  }
  
  /**
   * Obtiene la clase CSS correspondiente para cada forma de pago
   */
  getClaseFormaPago(formaPago: string): string {
    formaPago = formaPago.toLowerCase();
    switch (formaPago) {
      case 'efectivo':
        return 'text-success';
      case 'tarjeta':
        return 'text-primary';
      case 'transferencia':
        return 'text-info';
      case 'wompi':
        return 'text-purple';
      default:
        return 'text-secondary';
    }
  }
  
  /**
   * Identifica si una forma de pago es del tipo especificado
   */
  esFormaPago(formaPago: string, tipo: string): boolean {
    return formaPago.toLowerCase() === tipo.toLowerCase();
  }
  
  // Método para buscar con las fechas seleccionadas
  buscarHistorial() {
    // Validar que la fecha inicio no sea mayor que la fecha fin
    const fechaInicioValue = this.filtroForm.get('fechaInicio')?.value || this.fechaInicioModel;
    const fechaFinValue = this.filtroForm.get('fechaFin')?.value || this.fechaFinModel;
    
    const fechaInicio = this.toDate(fechaInicioValue);
    const fechaFin = this.toDate(fechaFinValue);
    
    if (fechaInicio > fechaFin) {
      swal.fire({
        title: 'Error',
        text: 'La fecha de inicio no puede ser mayor que la fecha de fin.',
        icon: 'error',
        confirmButtonText: 'Entendido'
      });
      return;
    }
    
    this.loadHistory();
  }

  // Función para imprimir el historial
  imprimirHistorial() {
    window.print();
  }

  // Funciones de formato (mantener las que aún se necesiten)
  formatCurrency(value: number): string {
    // Puedes ajustar la moneda si es necesario
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(value);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CL').format(value);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      // Ajusta las opciones según el formato deseado
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      console.error('Error formatting date:', dateString, e);
      return dateString; // Devuelve el string original si hay error
    }
  }

  formatShortDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('es-CL', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch (e) {
      console.error('Error formatting short date:', dateString, e);
      return dateString;
    }
  }
}