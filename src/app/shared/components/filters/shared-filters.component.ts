import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';

export interface FilterOptions {
  searchQuery: string;
  fechaInicial: Date | null;
  fechaFinal: Date | null;
  estadoPago: string;
  estadoProceso: string;
  selectedDatePreset?: string;
}

export interface DatePreset {
  label: string;
  value: string;
}

export interface FilterOption {
  label: string;
  value: string;
}

export interface ColumnDefinition {
  field: string;
  header: string;
  visible?: boolean;
}

@Component({
  selector: 'app-shared-filters',
  templateUrl: './shared-filters.component.html',
  styleUrls: ['./shared-filters.component.scss'],
  animations: [
    trigger('slideInOut', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)', maxHeight: '0' }),
        animate('300ms ease-out', style({ opacity: 1, transform: 'translateY(0)', maxHeight: '500px' }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ opacity: 0, transform: 'translateY(-10px)', maxHeight: '0' }))
      ])
    ])
  ]
})
export class SharedFiltersComponent implements OnInit {
  @Input() estadosPagoOptions: FilterOption[] = [];
  @Input() estadosProcesoOptions: FilterOption[] = [];
  @Input() displayedColumns: ColumnDefinition[] = [];
  @Input() selectedColumns: ColumnDefinition[] = [];
  @Input() showColumnSelector: boolean = true;
  @Input() showDateFilters: boolean = true;
  @Input() showStatusFilters: boolean = true;
  @Input() showExportButton: boolean = true;
  @Input() exportDisabled: boolean = false;
  @Input() searchPlaceholder: string = 'Buscar pedido...';
  @Input() filterButtonLabel: string = 'Filtrar';
  @Input() exportButtonTooltip: string = 'Exportar Excel';
  @Input() initialDateFrom: Date | null = null;
  @Input() initialDateTo: Date | null = null;

  @Output() searchQueryChange = new EventEmitter<string>();
  @Output() dateFromChange = new EventEmitter<Date | null>();
  @Output() dateToChange = new EventEmitter<Date | null>();
  @Output() estadoPagoChange = new EventEmitter<string>();
  @Output() estadoProcesoChange = new EventEmitter<string>();
  @Output() datePresetChange = new EventEmitter<string>();
  @Output() columnSelectionChange = new EventEmitter<ColumnDefinition[]>();
  @Output() filterAction = new EventEmitter<void>();
  @Output() exportAction = new EventEmitter<void>();
  @Output() clearAllFilters = new EventEmitter<void>();
  @Output() clearSpecificFilter = new EventEmitter<{type: string, value?: string}>();
  @Output() resetColumns = new EventEmitter<void>();

  searchQuery: string = '';
  fechaInicialDate: Date | null = null;
  fechaFinalDate: Date | null = null;
  selectedDatePreset: string = '';
  showAdvancedFilters: boolean = false;

  quickFilters = {
    estadoPago: 'all',
    estadoProceso: 'all'
  };

  datePresets: DatePreset[] = [
    { label: 'Hoy', value: 'today' },
    { label: 'Ayer', value: 'yesterday' },
    { label: 'Últimos 7 días', value: 'last7days' },
    { label: 'Últimos 30 días', value: 'last30days' },
    { label: 'Este mes', value: 'thisMonth' },
    { label: 'Mes pasado', value: 'lastMonth' }
  ];

  es: any = {
    firstDayOfWeek: 1,
    dayNames: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
    dayNamesShort: ['dom', 'lun', 'mar', 'mié', 'jue', 'vie', 'sáb'],
    dayNamesMin: ['D', 'L', 'M', 'X', 'J', 'V', 'S'],
    monthNames: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
    monthNamesShort: ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'],
    today: 'Hoy',
    clear: 'Limpiar'
  };

  ngOnInit(): void {
    this.initializeFilters();
    // Initialize dates from Input properties if provided
    if (this.initialDateFrom) {
      this.fechaInicialDate = this.initialDateFrom;
    }
    if (this.initialDateTo) {
      this.fechaFinalDate = this.initialDateTo;
    }
  }

  private initializeFilters(): void {
    if (this.estadosPagoOptions.length === 0) {
      this.estadosPagoOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Pendiente', value: 'Pendiente' },
        { label: 'Aprobado', value: 'Aprobado' },
        { label: 'Rechazado', value: 'Rechazado' }
      ];
    }

    if (this.estadosProcesoOptions.length === 0) {
      this.estadosProcesoOptions = [
        { label: 'Todos', value: 'all' },
        { label: 'Sin Producir', value: 'SinProducir' },
        { label: 'En Producción', value: 'EnProduccion' },
        { label: 'Producido', value: 'ProducidoTotalmente' },
        { label: 'Empacado', value: 'Empacado' },
        { label: 'Despachado', value: 'Despachado' },
        { label: 'Entregado', value: 'Entregado' }
      ];
    }
  }

  onSearchQueryChange(value: string): void {
    this.searchQuery = value;
    this.searchQueryChange.emit(value);
  }

  onDateFromChange(date: Date | null): void {
    this.fechaInicialDate = date;
    this.dateFromChange.emit(date);
  }

  onDateToChange(date: Date | null): void {
    this.fechaFinalDate = date;
    this.dateToChange.emit(date);
  }

  onEstadoPagoChange(): void {
    this.estadoPagoChange.emit(this.quickFilters.estadoPago);
  }

  onEstadoProcesoChange(): void {
    this.estadoProcesoChange.emit(this.quickFilters.estadoProceso);
  }

  onDatePresetChange(value: string): void {
    this.selectedDatePreset = value;
    const dates = this.calculateDatesFromPreset(value);
    if (dates) {
      this.fechaInicialDate = dates.from;
      this.fechaFinalDate = dates.to;
      this.dateFromChange.emit(dates.from);
      this.dateToChange.emit(dates.to);
    }
    this.datePresetChange.emit(value);
  }

  private calculateDatesFromPreset(preset: string): { from: Date; to: Date } | null {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (preset) {
      case 'today':
        return { from: new Date(today), to: new Date(today) };

      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return { from: yesterday, to: yesterday };

      case 'last7days':
        const last7 = new Date(today);
        last7.setDate(last7.getDate() - 7);
        return { from: last7, to: new Date(today) };

      case 'last30days':
        const last30 = new Date(today);
        last30.setDate(last30.getDate() - 30);
        return { from: last30, to: new Date(today) };

      case 'thisMonth':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return { from: thisMonthStart, to: new Date(today) };

      case 'lastMonth':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return { from: lastMonthStart, to: lastMonthEnd };

      default:
        return null;
    }
  }

  onColumnSelectionChange(): void {
    this.columnSelectionChange.emit(this.selectedColumns);
  }

  toggleAdvancedFilters(): void {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }

  hasActiveFilters(): boolean {
    return !!(
      this.searchQuery ||
      this.fechaInicialDate ||
      this.fechaFinalDate ||
      (this.quickFilters.estadoPago !== 'all') ||
      (this.quickFilters.estadoProceso !== 'all')
    );
  }

  getActiveFiltersCount(): number {
    let count = 0;
    if (this.searchQuery) count++;
    if (this.fechaInicialDate) count++;
    if (this.fechaFinalDate) count++;
    if (this.quickFilters.estadoPago !== 'all') count++;
    if (this.quickFilters.estadoProceso !== 'all') count++;
    return count;
  }

  clearSearchFilter(): void {
    this.searchQuery = '';
    this.searchQueryChange.emit('');
    this.clearSpecificFilter.emit({ type: 'search' });
  }

  clearDateFilter(type: 'inicial' | 'final'): void {
    if (type === 'inicial') {
      this.fechaInicialDate = null;
      this.dateFromChange.emit(null);
    } else {
      this.fechaFinalDate = null;
      this.dateToChange.emit(null);
    }
    this.clearSpecificFilter.emit({ type: 'date', value: type });
  }

  clearQuickFilter(type: 'estadoPago' | 'estadoProceso'): void {
    this.quickFilters[type] = 'all';
    if (type === 'estadoPago') {
      this.estadoPagoChange.emit('all');
    } else {
      this.estadoProcesoChange.emit('all');
    }
    this.clearSpecificFilter.emit({ type, value: 'all' });
  }

  clearAllFiltersHandler(): void {
    this.searchQuery = '';
    this.fechaInicialDate = null;
    this.fechaFinalDate = null;
    this.quickFilters.estadoPago = 'all';
    this.quickFilters.estadoProceso = 'all';
    this.selectedDatePreset = '';
    this.clearAllFilters.emit();
  }

  resetColumnConfig(): void {
    this.resetColumns.emit();
  }

  applyFilters(): void {
    this.filterAction.emit();
  }

  exportData(): void {
    this.exportAction.emit();
  }

  formatDateForDisplay(date: Date | null): string {
    if (!date) return '';
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  getStatusClass(status: string, type: 'pago' | 'proceso'): string {
    if (type === 'pago') {
      switch (status) {
        case 'Pendiente': return 'status-pending';
        case 'Aprobado': return 'status-approved';
        case 'Rechazado': return 'status-rejected';
        default: return '';
      }
    } else {
      switch (status) {
        case 'SinProducir': return 'status-pending';
        case 'EnProduccion': return 'status-in-progress';
        case 'ProducidoTotalmente': return 'status-produced';
        case 'Empacado': return 'status-packed';
        case 'Despachado': return 'status-shipped';
        case 'Entregado': return 'status-delivered';
        default: return '';
      }
    }
  }
}