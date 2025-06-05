export interface ColumnDefinition {
  field: string;
  header: string;
  visible: boolean;
  type?: 'text' | 'date' | 'currency' | 'boolean' | 'actions' | 'status';
  width?: string;
  sortable?: boolean;
  filterable?: boolean;
}