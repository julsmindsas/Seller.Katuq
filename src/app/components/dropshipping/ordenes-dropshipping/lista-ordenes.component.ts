import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-lista-ordenes',
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5>Órdenes Dropshipping</h5>
          </div>
          <div class="card-body text-center py-5">
            <i class="pi pi-list fs-1 text-muted mb-3"></i>
            <h6>Módulo en construcción</h6>
            <p class="text-muted">La gestión de órdenes estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ListaOrdenesComponent implements OnInit {
  ngOnInit(): void {}
}