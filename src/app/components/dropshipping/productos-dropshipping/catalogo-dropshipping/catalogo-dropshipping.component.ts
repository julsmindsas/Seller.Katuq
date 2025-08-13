import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-catalogo-dropshipping',
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5>Catálogo de Productos Dropshipping</h5>
          </div>
          <div class="card-body text-center py-5">
            <i class="pi pi-box fs-1 text-muted mb-3"></i>
            <h6>Módulo en construcción</h6>
            <p class="text-muted">El catálogo de productos estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class CatalogoDropshippingComponent implements OnInit {
  ngOnInit(): void {}
}