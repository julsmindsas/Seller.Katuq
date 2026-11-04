import { Component, OnInit } from '@angular/core';
import { NgbActiveModal, NgbDateStruct } from '@ng-bootstrap/ng-bootstrap';
import { VentasService } from '../../../../../shared/services/ventas/ventas.service';
import swal from 'sweetalert2';
import { FormBuilder, FormGroup } from '@angular/forms';
import { formasPagoComoNumeros, normalizarHistorialCierres } from './historial-cierres.normalizar';

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
  /** D-583: diferencia guardada al cerrar (null en cierres viejos). */
  diferencia?: number | null;
  /** D-583: ventas de días anteriores que recogió este cierre. */
  ventasDiasAnteriores?: { total: number; cantidadPedidos: number } | null;
  /** D-585: número de cierre del día (turno); null en cierres viejos. */
  turno?: number | null;
  /** D-587: id del cierre (cashClosings) y sus ajustes de administrador. */
  id?: string;
  ajustes?: { valor: number; motivo: string; usuarioEmail: string | null; fecha: string }[];
  diferenciaAjustada?: number | null;
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
    
    // Construir fechas en formato ISO sin conversión UTC
    const fechaInicioStr = `${fechaInicioValue.year}-${fechaInicioValue.month.toString().padStart(2, '0')}-${fechaInicioValue.day.toString().padStart(2, '0')}`;
    const fechaFinStr = `${fechaFinValue.year}-${fechaFinValue.month.toString().padStart(2, '0')}-${fechaFinValue.day.toString().padStart(2, '0')}`;

    // Crear objeto de filtro
    const filter = {
      company: JSON.parse(sessionStorage.getItem('currentCompany') || '{}').nomComercial,
      origenConsulta: 'POS',
      fechaInicio: fechaInicioStr + 'T00:00:00.000Z',
      fechaFin: fechaFinStr + 'T23:59:59.999Z',
      fechaFinal: fechaFinStr + 'T23:59:59.999Z',
      // Ticket 1173: el servidor pagina de a 10; el resumen del período debe sumar todos.
      limit: 500
    };

    // Realizar la consulta
    this.ventasService.getCashClosingHistory(filter).subscribe({
      next: (data: CashClosingHistoryResponse) => {
        this.historyData = this.procesarRespuestaHistorial(data, { fechaInicio: fechaInicioStr, fechaFin: fechaFinStr });
        this.soloDescuadre = false; // D-588: cada búsqueda arranca mostrando todos
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
  procesarRespuestaHistorial(data: CashClosingHistoryResponse, periodo: { fechaInicio: string; fechaFin: string }): CashClosingHistoryResponse {
    // Formato viejo: las formas de pago se calculan con los pedidos del cierre.
    (data?.historial || []).forEach(item => {
      if (Array.isArray(item.pedidos) && item.pedidos.length) {
        item.formasPago = { ...formasPagoComoNumeros(item.formasPago), ...this.obtenerFormasPagoPorCierre(item.pedidos) };
      }
    });
    // Ticket 1173: el formato nuevo (cashClosings) trae otra forma; se normalizan ambos.
    return normalizarHistorialCierres(data, periodo);
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
      const formaPago = (pedido.formaDePago || 'Sin especificar').toLowerCase();
      if (!formasPago[formaPago]) {
        formasPago[formaPago] = 0;
      }
      formasPago[formaPago] += Number(pedido.total) || 0;
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

  /** Ventas en efectivo del cierre: el total guardado o, si no viene, la forma de pago. */
  efectivoDeCierre(item: HistorialItem): number {
    if (typeof item.totalEfectivo === 'number') return item.totalEfectivo;
    return item.formasPago?.['efectivo'] || 0;
  }

  /**
   * Diferencia del cuadre con la MISMA fórmula de la pantalla de cierre
   * (calcularDiferencia) y del reporte impreso (diferenciaCaja):
   * contado − (saldo inicial + ventas en efectivo).
   * El historial mostraba final − inicial con el mismo rótulo, así que un mismo
   * cierre daba una diferencia al cerrarlo y otra al consultarlo.
   */
  diferenciaCierre(item: HistorialItem): number {
    // D-583: la que vio el cajero al cerrar (incluye el efectivo de ventas de días
    // anteriores). Los cierres viejos no la traen: se recalcula como antes.
    if (typeof item.diferencia === 'number') return item.diferencia;
    return (item.efectivoFinal || 0) - ((item.efectivoInicial || 0) + this.efectivoDeCierre(item));
  }

  /** Texto corto para la cajera: Cuadra / Sobra $X / Falta $X. */
  estadoCuadre(item: HistorialItem): string {
    return this.textoDiferencia(this.diferenciaCierre(item));
  }

  textoDiferencia(d: number): string {
    if (!d) return 'Cuadra';
    return (d > 0 ? 'Sobra ' : 'Falta ') + this.formatCurrency(Math.abs(d));
  }

  /** D-587: diferencia vigente: después de los ajustes del administrador, si los hay. */
  diferenciaActual(item: HistorialItem): number {
    return typeof item.diferenciaAjustada === 'number' ? item.diferenciaAjustada : this.diferenciaCierre(item);
  }

  /** D-587: suma de los descuadres del periodo (con ajustes). */
  get diferenciaPeriodo(): number {
    const lista: HistorialItem[] = this.historyData?.historial || [];
    return Math.round(lista.reduce((suma, item) => suma + this.diferenciaActual(item), 0) * 100) / 100;
  }

  /** D-587: cuántos cierres del periodo siguen sin cuadrar (con ajustes). */
  get cierresConDescuadre(): number {
    const lista: HistorialItem[] = this.historyData?.historial || [];
    return lista.filter((item) => Math.abs(this.diferenciaActual(item)) >= 0.01).length;
  }

  /** D-588: la tarjeta "Diferencia de caja" filtra la lista a los cierres que no cuadran. */
  soloDescuadre = false;

  get historialVisible(): HistorialItem[] {
    const lista: HistorialItem[] = this.historyData?.historial || [];
    return this.soloDescuadre ? lista.filter((item) => Math.abs(this.diferenciaActual(item)) >= 0.01) : lista;
  }

  alternarSoloDescuadre(): void {
    // Si todo cuadra no hay nada que filtrar; si estaba activo, siempre se puede quitar.
    if (!this.soloDescuadre && this.cierresConDescuadre === 0) return;
    this.soloDescuadre = !this.soloDescuadre;
    if (this.soloDescuadre) {
      setTimeout(() => document.getElementById('lista-cierres')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }

  abs(valor: number): number {
    return Math.abs(Number(valor) || 0);
  }

  /** D-587: solo el Administrador ve el botón (el backend también lo exige). */
  get esAdministrador(): boolean {
    try {
      const rol = JSON.parse(localStorage.getItem('user') || '{}').rol;
      return rol === 'Administrador' || rol === 'Super Administrador';
    } catch {
      return false;
    }
  }

  /**
   * D-587: agrega un ajuste al cierre (valor + motivo). El cierre original no cambia;
   * el valor sugerido es lo que falta para que cuadre.
   */
  registrarAjuste(item: HistorialItem): void {
    const actual = this.diferenciaActual(item);
    const sugerido = Math.round(-actual * 100) / 100;
    swal.fire({
      title: 'Registrar ajuste',
      html:
        `<div style="text-align:left">Hoy este cierre está en <strong>${this.textoDiferencia(actual)}</strong>. `
        + 'El cierre no se cambia: el ajuste queda guardado aparte, con tu nombre y la fecha.<br><br>'
        + '<label style="font-weight:600">Valor del ajuste</label>'
        + `<input id="ajuste-valor" type="number" step="0.01" class="swal2-input" style="margin:6px 0 4px 0;width:100%" value="${sugerido}">`
        + '<small style="color:#6b6880">Positivo si apareció plata; negativo si falta más. Con el valor sugerido el cierre cuadra.</small><br><br>'
        + '<label style="font-weight:600">Motivo</label>'
        + '<textarea id="ajuste-motivo" class="swal2-textarea" style="margin:6px 0 0 0;width:100%" placeholder="Ej.: apareció el billete debajo de la caja"></textarea></div>',
      showCancelButton: true,
      confirmButtonText: 'Guardar ajuste',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#5F3FE0',
      reverseButtons: true,
      focusConfirm: false,
      preConfirm: () => {
        const valor = Number((document.getElementById('ajuste-valor') as HTMLInputElement)?.value);
        const motivo = ((document.getElementById('ajuste-motivo') as HTMLTextAreaElement)?.value || '').trim();
        if (!Number.isFinite(valor) || valor === 0) {
          swal.showValidationMessage('El valor debe ser distinto de $0');
          return false;
        }
        if (!motivo) {
          swal.showValidationMessage('Escribe el motivo del ajuste');
          return false;
        }
        return { valor, motivo };
      }
    }).then((resultado) => {
      if (!resultado.isConfirmed || !resultado.value || !item.id) return;
      this.ventasService.registrarAjusteCierre({ cierreId: item.id, ...resultado.value }).subscribe(
        (respuesta: any) => {
          item.ajustes = respuesta?.ajustes || item.ajustes;
          item.diferenciaAjustada = respuesta?.diferenciaAjustada;
          swal.fire({
            title: 'Ajuste guardado',
            text: `El cierre quedó en: ${this.textoDiferencia(this.diferenciaActual(item))}.`,
            icon: 'success',
            confirmButtonColor: '#5F3FE0'
          });
        },
        (error) => {
          swal.fire({
            title: error?.status === 403 ? 'Sin permiso' : 'No se pudo guardar',
            text: error?.status === 403
              ? 'Solo un Administrador puede registrar ajustes.'
              : (error?.error?.error || 'Intenta de nuevo.'),
            icon: 'error',
            confirmButtonColor: '#5F3FE0'
          });
        }
      );
    });
  }

  // Funciones de formato (mantener las que aún se necesiten)
  // Ticket 1173: pesos colombianos (antes salía en formato de Chile) y nunca "$NaN".
  formatCurrency(value: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      maximumFractionDigits: 0
    }).format(Number(value) || 0);
  }

  formatNumber(value: number): string {
    return new Intl.NumberFormat('es-CO').format(Number(value) || 0);
  }

  /** "2026-10-14" es un día, no una hora UTC: se lee en hora local (si no, sale el 13). */
  private aFecha(dateString: string): Date {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateString || ''));
    return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(dateString);
  }

  formatDate(dateString: string | undefined): string {
    if (!dateString) return 'N/A';
    try {
      const date = this.aFecha(dateString);
      return date.toLocaleDateString('es-CO', {
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
      const date = this.aFecha(dateString);
      return date.toLocaleDateString('es-CO', {
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