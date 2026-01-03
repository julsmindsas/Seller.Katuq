/**
 * KatuqTable Component
 *
 * Displays data in a table with optional pagination and search.
 */

import {
  Component,
  Input,
  OnChanges,
  SimpleChanges,
  ChangeDetectionStrategy
} from '@angular/core';
import { KatuqTableProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

interface TableColumn {
  key: string;
  label: string;
  sortable?: boolean;
}

@Component({
  selector: 'app-katuq-table',
  template: `
    <div class="katuq-table">
      <div class="table-header" *ngIf="searchable">
        <div class="search-box">
          <i class="pi pi-search"></i>
          <input type="text"
                 placeholder="Buscar..."
                 [(ngModel)]="searchTerm"
                 (input)="onSearch()">
        </div>
      </div>

      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th *ngFor="let col of columns"
                  [class.sortable]="col.sortable"
                  (click)="col.sortable && onSort(col.key)">
                {{ col.label }}
                <i *ngIf="col.sortable && sortKey === col.key"
                   [class]="sortDirection === 'asc' ? 'pi pi-sort-up' : 'pi pi-sort-down'">
                </i>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let row of displayedData">
              <td *ngFor="let col of columns">
                {{ row[col.key] }}
              </td>
            </tr>
            <tr *ngIf="displayedData.length === 0">
              <td [colSpan]="columns.length" class="empty-state">
                No hay datos disponibles
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="table-footer" *ngIf="pagination && totalPages > 1">
        <div class="pagination-info">
          Mostrando {{ startIndex + 1 }} - {{ endIndex }} de {{ filteredData.length }}
        </div>
        <div class="pagination-controls">
          <button [disabled]="currentPage === 1" (click)="goToPage(currentPage - 1)">
            <i class="pi pi-chevron-left"></i>
          </button>
          <span class="page-indicator">{{ currentPage }} / {{ totalPages }}</span>
          <button [disabled]="currentPage === totalPages" (click)="goToPage(currentPage + 1)">
            <i class="pi pi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .katuq-table {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }

    .table-header {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .search-box {
      position: relative;
      max-width: 300px;
    }

    .search-box i {
      position: absolute;
      left: 0.75rem;
      top: 50%;
      transform: translateY(-50%);
      color: #9ca3af;
    }

    .search-box input {
      width: 100%;
      padding: 0.5rem 0.75rem 0.5rem 2.25rem;
      border: 1px solid #e5e7eb;
      border-radius: 0.375rem;
      font-size: 0.875rem;
    }

    .search-box input:focus {
      outline: none;
      border-color: #6366f1;
      box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    th, td {
      padding: 0.75rem 1rem;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    th {
      background: #f9fafb;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      color: #6b7280;
      white-space: nowrap;
    }

    th.sortable {
      cursor: pointer;
      user-select: none;
    }

    th.sortable:hover {
      background: #f3f4f6;
    }

    th i {
      margin-left: 0.25rem;
      font-size: 0.625rem;
    }

    td {
      font-size: 0.875rem;
      color: #374151;
    }

    tr:hover td {
      background: #f9fafb;
    }

    .empty-state {
      text-align: center;
      color: #9ca3af;
      padding: 2rem !important;
    }

    .table-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.75rem 1rem;
      border-top: 1px solid #e5e7eb;
      background: #f9fafb;
    }

    .pagination-info {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .pagination-controls {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .pagination-controls button {
      width: 2rem;
      height: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      border: 1px solid #e5e7eb;
      background: white;
      border-radius: 0.25rem;
      cursor: pointer;
    }

    .pagination-controls button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .pagination-controls button:not(:disabled):hover {
      background: #f3f4f6;
    }

    .page-indicator {
      font-size: 0.875rem;
      color: #374151;
      padding: 0 0.5rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqTableComponent implements OnChanges {
  @Input() props: KatuqTableProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  searchTerm = '';
  sortKey = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  currentPage = 1;
  pageSize = 10;

  filteredData: any[] = [];
  displayedData: any[] = [];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['props'] || changes['dataModel']) {
      this.resetState();
      this.updateData();
    }
  }

  get columns(): TableColumn[] {
    return this.resolve(this.props?.columns) || [];
  }

  get data(): any[] {
    return this.resolve(this.props?.data) || [];
  }

  get pagination(): boolean {
    const value = this.resolve(this.props?.pagination);
    return value !== false;
  }

  get searchable(): boolean {
    const value = this.resolve(this.props?.searchable);
    return value !== false;
  }

  get totalPages(): number {
    return Math.ceil(this.filteredData.length / this.pageSize);
  }

  get startIndex(): number {
    return (this.currentPage - 1) * this.pageSize;
  }

  get endIndex(): number {
    return Math.min(this.startIndex + this.pageSize, this.filteredData.length);
  }

  private resetState(): void {
    this.searchTerm = '';
    this.sortKey = '';
    this.sortDirection = 'asc';
    this.currentPage = 1;
  }

  private updateData(): void {
    let result = [...this.data];

    // Apply search
    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      result = result.filter(row =>
        Object.values(row).some(val =>
          String(val).toLowerCase().includes(term)
        )
      );
    }

    // Apply sort
    if (this.sortKey) {
      result.sort((a, b) => {
        const valA = a[this.sortKey];
        const valB = b[this.sortKey];

        let comparison = 0;
        if (valA < valB) comparison = -1;
        if (valA > valB) comparison = 1;

        return this.sortDirection === 'asc' ? comparison : -comparison;
      });
    }

    this.filteredData = result;

    // Apply pagination
    if (this.pagination) {
      this.displayedData = result.slice(this.startIndex, this.endIndex);
    } else {
      this.displayedData = result;
    }
  }

  onSearch(): void {
    this.currentPage = 1;
    this.updateData();
  }

  onSort(key: string): void {
    if (this.sortKey === key) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortKey = key;
      this.sortDirection = 'asc';
    }
    this.updateData();
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updateData();
    }
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
