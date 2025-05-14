import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { Router } from '@angular/router';
import { PickingPackingService } from '../../../shared/services/picking-packig/picking-packing.service';
import { PackingResponse } from '../models/packing.model';

@Component({
  selector: 'app-packing-list',
  templateUrl: './packing-list.component.html',
  styleUrls: ['./packing-list.component.scss']
})
export class PackingListComponent implements OnInit {
  packingList: PackingResponse[] = [];
  filtroForm: FormGroup;
  loading = false;
  
  constructor(
    private packingService: PickingPackingService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.filtroForm = this.fb.group({
      ordenId: [''],
      estado: [''],
      fechaDesde: [null],
      fechaHasta: [null]
    });
  }

  ngOnInit(): void {
    this.cargarPackings();
  }

  cargarPackings(): void {
    this.loading = true;
    // Aquí normalmente harías una llamada para obtener todos los packings
    // Como no tenemos un endpoint específico, podríamos implementar esto cuando esté disponible
    this.loading = false;
  }

  verDetalle(packing: PackingResponse): void {
    this.router.navigate(['/picking-packing/packing', packing._id]);
  }

  iniciarNuevoPacking(): void {
    this.router.navigate(['/picking-packing/packing/nuevo']);
  }

  aplicarFiltros(): void {
    this.cargarPackings();
  }

  limpiarFiltros(): void {
    this.filtroForm.reset();
    this.cargarPackings();
  }
} 