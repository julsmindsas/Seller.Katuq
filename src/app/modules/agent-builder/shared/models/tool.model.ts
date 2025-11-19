import { DepartmentType } from './agent.model';

export interface Tool {
  name: string;
  description: string;
  department: DepartmentType | 'general';
  icon?: string;
  category?: ToolCategory;
  isEnabled?: boolean;
  parameters?: string[]; // Changed from ToolParameter[] to string[] to match backend response
}

export type ToolCategory = 'data-access' | 'analytics' | 'automation' | 'communication' | 'collaboration' | 'utility';

export interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  description: string;
  required: boolean;
  defaultValue?: any;
}

export interface ToolCatalog {
  sales: Tool[];
  logistics: Tool[];
  inventory: Tool[];
  collaboration?: Tool[];
  general: Tool[];
}

export interface DepartmentOption {
  label: string;
  value: DepartmentType;
  icon: string;
  color: string;
}
