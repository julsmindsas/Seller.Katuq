export interface CardToggleOptions {
    id: number;
    title: string;
}

export interface TableConfigs {
    columns: TableColumn[];
    row_action?: TableRows[];
    data: any[]
}

export interface TableColumn {
    title: string;
    field_value: string;
    sortable_key?: string;
    sort?: boolean;
    type?: string;
    template?: string;
    class?: string;
    decimal_number?: boolean;
    text?: string;
    icon_field?: string;
    hide_column?: boolean;
}

export interface TableRows {
  label: string;
  action_to_perform?: string;
  icon?: string;
  path?: string;
  modal?: boolean;
  model_text?: string;
  type?: string;
  class?: string;
}

export interface TableClickedAction {
    action_to_perform?: string;
    data?: any;
    value?: any;
}

export interface columnColors {
   [key: string]: string;
}
export interface Pagination {
  total_items: number;
  current_page: number;
  page_size: number;
  total_pages: number;
  start_page: number;
  end_page?: number;
  start_index: number;
  end_index: number;
  pages: number[];
}

export interface Tabs {
  id: number;
  title: string;
  value: string;
  icon?: string;
}

export interface PageSizeOptions {
  title: number;
  value: number;
  selected?: boolean;
}