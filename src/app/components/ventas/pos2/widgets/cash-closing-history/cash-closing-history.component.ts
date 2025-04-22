import { Component, OnInit } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import swal from 'sweetalert2';

// Interfaz para un pedido individual dentro del historial
interface Pedido {
  id: string;
  nroPedido: string;
  total: number;
  formaDePago: string;
  fechaCreacion: string;
}

// Interfaz para un elemento del historial de cierre
interface HistorialItem {
  fecha: string;
  efectivoInicial: number;
  efectivoFinal: number;
  observaciones: string;
  informe: string; // Puede que necesites ajustar el tipo si no es string
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
  };
  historial: HistorialItem[];
  fechaInicio: string;
  fechaFin: string;
  company: string;
}

@Component({
  selector: 'app-cash-closing-history',
  templateUrl: './cash-closing-history.component.html',
  styleUrls: ['./cash-closing-history.component.scss']
})
export class CashClosingHistoryComponent implements OnInit {
  // Usar la nueva interfaz
  historyData: CashClosingHistoryResponse | null = null;
  loading = true;

  constructor(
    public activeModal: NgbActiveModal,
    private ventasService: VentasService
  ) { }

  ngOnInit() {
    this.loadHistory();
  }

  loadHistory() {
    this.loading = true;

    // Obtener la fecha actual en UTC (00:00:00.000Z y 23:59:59.999Z)
    const today = new Date();
    const fechaInicio = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 0, 0, 0, 0));
    const fechaFina = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), 23, 59, 59, 999));

    // Crear objeto de filtro (verifica si necesitas todos estos campos)
    const filter = {
      company: JSON.parse(sessionStorage.getItem('currentCompany') || '{}').nomComercial,
      origenConsulta: 'POS', // Ajusta si es necesario
      fechaInicio: fechaInicio.toISOString(),
      fechaFin: fechaFina.toISOString()
    };

    // Asumiendo que getCashClosingHistory devuelve la nueva estructura
    this.ventasService.getCashClosingHistory(filter).subscribe({
      next: (data: CashClosingHistoryResponse) => {
        this.historyData = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading cash closing history:', error); // Loguear el error
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