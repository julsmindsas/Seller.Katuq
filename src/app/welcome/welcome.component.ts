import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../shared/services/servicios.service';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';

@Component({
  selector: 'app-welcome',
  templateUrl: './welcome.component.html',
  styleUrls: ['./welcome.component.scss']
})
export class WelcomeComponent implements OnInit {
  shortcuts: any[] = JSON.parse(localStorage.getItem('authorizedMenuItems') || '[]');
  loading: boolean = false;
  public huella: string;
  public huellaEmpresa;
  empresa = '';
  imagenEmpresa = '';
  nit = '';
  esCart = false;
  public datos: any;
  contentDataURL;
  public userActive: any;
  
  // Variables para paginación
  clientes: any[] = [];
  pagedClientes: any[] = [];
  currentPage: number = 1;
  pageSize: number = 10; // Número de items por página
  totalPages: number = 1;
  totalItems: number = 0;
  public currentCompany: any;

  // Variables para búsqueda y ordenamiento
  searchTerm: string = '';
  searchField: string = 'all';
  filterStatus: string = '';
  filteredClientes: any[] = [];
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';
  isFiltered: boolean = false;
  showAdvancedFilters: boolean = false;
  private searchDebounce = new Subject<string>();

  // Variable para el cliente seleccionado en el modal
  selectedClient: any = null;

  constructor(
    private service: ServiciosService,
    private modalService: NgbModal
  ) {
    // Setup debounce for search input
    this.searchDebounce.pipe(
      debounceTime(300), // Wait for 300ms pause in events
      distinctUntilChanged()
    ).subscribe(() => {
      this.filterClients();
    });
  }

  async ngOnInit() {
    this.currentCompany= JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');
    this.loading = true;
    this.service.getContacts().subscribe((data) => {
      this.clientes = data;
      this.filteredClientes = [...this.clientes];
      this.totalItems = this.filteredClientes.length;
      this.updatePagination();
      this.loading = false;
    }, error => {
      console.error('Error fetching contacts:', error);
      this.loading = false;
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.filteredClientes.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.filteredClientes.length);
    this.pagedClientes = this.filteredClientes.slice(startIndex, endIndex);
  }

  previousPage() {
    if (this.currentPage > 1) {
      this.currentPage--;
      this.updatePagination();
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
      this.updatePagination();
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPageNumbers(): number[] {
    const pages: number[] = [];
    const maxPagesToShow = 5; // Máximo de números de página a mostrar
    
    if (this.totalPages <= maxPagesToShow) {
      for (let i = 1; i <= this.totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage: number;
      let endPage: number;
      
      if (this.currentPage <= 3) {
        startPage = 1;
        endPage = maxPagesToShow;
      } else if (this.currentPage + 2 >= this.totalPages) {
        startPage = this.totalPages - maxPagesToShow + 1;
        endPage = this.totalPages;
      } else {
        startPage = this.currentPage - 2;
        endPage = this.currentPage + 2;
      }
      
      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }
    }
    
    return pages;
  }

  // Method to show visible pages for improved pagination
  getVisiblePages(): number[] {
    const visiblePages = [];
    if (this.totalPages <= 7) {
      // If there are 7 or fewer pages, show all
      for (let i = 1; i <= this.totalPages; i++) {
        visiblePages.push(i);
      }
    } else {
      // Always show first page
      visiblePages.push(1);
      
      // If current page is close to the start
      if (this.currentPage <= 4) {
        for (let i = 2; i <= 5; i++) {
          visiblePages.push(i);
        }
        visiblePages.push(-1); // Ellipsis
        visiblePages.push(this.totalPages);
      }
      // If current page is close to the end
      else if (this.currentPage >= this.totalPages - 3) {
        visiblePages.push(-1); // Ellipsis
        for (let i = this.totalPages - 4; i < this.totalPages; i++) {
          visiblePages.push(i);
        }
        visiblePages.push(this.totalPages);
      }
      // If current page is in the middle
      else {
        visiblePages.push(-1); // Ellipsis
        for (let i = this.currentPage - 1; i <= this.currentPage + 1; i++) {
          visiblePages.push(i);
        }
        visiblePages.push(-1); // Ellipsis
        visiblePages.push(this.totalPages);
      }
    }
    return visiblePages;
  }

  // Method to filter clients based on search term
  filterClients() {
    // Start with all clients
    let results = [...this.clientes];
    
    // Apply search term filter if present
    if (this.searchTerm?.trim()) {
      const searchTermLower = this.searchTerm.toLowerCase().trim();
      
      // Filter based on selected field or all fields
      if (this.searchField === 'all') {
        results = results.filter(cliente => 
          cliente.nombre?.toLowerCase().includes(searchTermLower) ||
          cliente.cedula?.toLowerCase().includes(searchTermLower) ||
          cliente.telefono?.toLowerCase().includes(searchTermLower) ||
          cliente.direccion?.toLowerCase().includes(searchTermLower) ||
          cliente.observaciones?.toLowerCase().includes(searchTermLower)
        );
      } else {
        // Filter by specific field
        results = results.filter(cliente => 
          cliente[this.searchField]?.toLowerCase().includes(searchTermLower)
        );
      }
    }
    
    // Apply status filter if selected
    if (this.filterStatus) {
      results = results.filter(cliente => cliente.status === this.filterStatus);
    }
    
    // Update filtered results
    this.filteredClientes = results;
    this.isFiltered = this.searchTerm?.trim() !== '' || this.filterStatus !== '';
    
    // Reset to first page and update pagination
    this.totalItems = this.filteredClientes.length;
    this.currentPage = 1;
    this.updatePagination();
  }

  // Method to clear search
  clearSearch() {
    this.searchTerm = '';
    this.filterClients();
  }
  
  // Method to reset all filters
  resetFilters() {
    this.searchTerm = '';
    this.searchField = 'all';
    this.filterStatus = '';
    this.filteredClientes = [...this.clientes];
    this.isFiltered = false;
    this.totalItems = this.filteredClientes.length;
    this.currentPage = 1;
    this.updatePagination();
  }
  
  // Method to toggle advanced filters visibility
  toggleAdvancedFilters() {
    this.showAdvancedFilters = !this.showAdvancedFilters;
  }
  
  // Method to apply sorting
  applySorting() {
    if (!this.sortColumn) {
      return;
    }
    
    this.filteredClientes = [...this.filteredClientes].sort((a, b) => {
      const aValue = a[this.sortColumn] || '';
      const bValue = b[this.sortColumn] || '';
      
      if (this.sortDirection === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });
    
    this.updatePagination();
  }

  // Method for handling search input with debounce
  onSearchInput() {
    this.searchDebounce.next(this.searchTerm);
  }

  // Method to sort the table by column
  sortBy(column: string) {
    if (this.sortColumn === column) {
      // Toggle sort direction
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }

    this.filteredClientes = [...this.filteredClientes].sort((a, b) => {
      const aValue = a[column] || '';
      const bValue = b[column] || '';
      
      if (this.sortDirection === 'asc') {
        return aValue.toString().localeCompare(bValue.toString());
      } else {
        return bValue.toString().localeCompare(aValue.toString());
      }
    });

    this.updatePagination();
  }

  // Method to handle page size change
  onPageSizeChange() {
    this.currentPage = 1; // Reset to first page when changing page size
    this.updatePagination();
  }

  // Method to show client message in modal
  showMessage(cliente: any, messageModal: any) {
    this.selectedClient = cliente;
    this.modalService.open(messageModal, {
      centered: true,
      backdrop: 'static',
      size: 'md'
    });
  }
  
  // Helper for pagination display
  get Math() {
    return Math;
  }
}