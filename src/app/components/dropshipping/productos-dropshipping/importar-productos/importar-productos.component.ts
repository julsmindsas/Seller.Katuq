import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-importar-productos',
  template: `
    <div class="grid">
      <div class="col-12">
        <div class="card">
          <div class="card-header">
            <h5>Importar Productos</h5>
          </div>
          <div class="card-body text-center py-5">
            <i class="pi pi-upload fs-1 text-muted mb-3"></i>
            <h6>Módulo en construcción</h6>
            <p class="text-muted">La importación de productos estará disponible próximamente</p>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ImportarProductosComponent implements OnInit {
  ngOnInit(): void {}
}