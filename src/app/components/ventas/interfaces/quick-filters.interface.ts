export interface QuickFilters {
  estadoPago: 'all' | 'Aprobado' | 'Pendiente' | 'PreAprobado' | 'Rechazado' | 'Cancelado' | 'Precancelado';
  estadoProceso: 'all' | 'SinProducir' | 'Producido' | 'ProducidoTotalmente' | 'ProducidoParcialmente' | 'Empacado' | 'Despachado' | 'ParaDespachar' | 'Entregado' | 'Rechazado';
}

export interface DateRange {
  start: string;
  end: string;
}

export type DateRangeType = 'today' | 'week' | 'month' | 'lastWeek' | 'lastMonth' | 'custom';

export interface FilterState {
  fechaInicial: string;
  fechaFinal: string;
  nroPedido: any;
  quickFilters: QuickFilters;
  dateRangeType?: DateRangeType;
}

export interface FilterOption {
  value: string;
  label: string;
  icon?: string;
  color?: string;
  active?: boolean;
}

export interface FilterGroup {
  key: string;
  label: string;
  icon: string;
  options: FilterOption[];
}