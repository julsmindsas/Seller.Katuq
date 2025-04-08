import { Component, OnInit } from '@angular/core';
import { ServiciosService } from '../shared/services/servicios.service';

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
  currentCompany: any;

  constructor(private service: ServiciosService) { }

  async ngOnInit() {
    this.currentCompany= JSON.parse(sessionStorage.getItem('currentCompany') || '{}');
    this.userActive = JSON.parse(localStorage.getItem('user') ?? '{}');
    this.service.getContacts().subscribe((data) => {
      this.clientes = data;
      this.updatePagination();
    });
  }

  updatePagination() {
    this.totalPages = Math.ceil(this.clientes.length / this.pageSize);
    const startIndex = (this.currentPage - 1) * this.pageSize;
    const endIndex = Math.min(startIndex + this.pageSize, this.clientes.length);
    this.pagedClientes = this.clientes.slice(startIndex, endIndex);
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
}