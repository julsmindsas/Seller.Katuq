import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';
import { Traslado } from '../../../shared/models/inventarios/traslado.model';

@Component({
  selector: 'app-traslados',
  templateUrl: './traslados.component.html',
  styleUrls: ['./traslados.component.scss']
})
export class TrasladosComponent implements OnInit {
  trasladoForm: FormGroup;
  bodegas: Bodega[] = [];
  productos: any[] = [];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private inventarioService: InventarioService
  ) {
    this.trasladoForm = this.fb.group({
      bodegaOrigenId: ['', Validators.required],
      bodegaDestinoId: ['', Validators.required],
      productoId: ['', Validators.required],
      cantidad: [0, [Validators.required, Validators.min(1)]],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.cargarBodegas();
    
    // Suscribirse a cambios en la bodega de origen
    this.trasladoForm.get('bodegaOrigenId')?.valueChanges.subscribe(bodegaId => {
      if (bodegaId) {
        this.cargarProductosBodega(bodegaId);
        // Limpiar el producto seleccionado cuando cambia la bodega
        this.trasladoForm.get('productoId')?.setValue('');
      } else {
        this.productos = [];
        this.trasladoForm.get('productoId')?.setValue('');
      }
    });
  }

  cargarBodegas(): void {
    this.inventarioService.getBodegas().subscribe(
      (bodegas) => {
        this.bodegas = bodegas;
      },
      (error) => {
        console.error('Error al cargar bodegas:', error);
      }
    );
  }

  cargarProductosBodega(bodegaId: string): void {
    this.loading = true;
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe(
      (productos) => {
        this.productos = productos;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar productos:', error);
        this.loading = false;
      }
    );
  }

  onSubmit(): void {
    if (this.trasladoForm.valid) {
      this.loading = true;
      const traslado: Traslado = {
        ...this.trasladoForm.value,
        fecha: new Date(),
        estado: 'Pendiente'
      };

      this.inventarioService.realizarTraslado(traslado).subscribe(
        (response) => {
          console.log('Traslado realizado con éxito:', response);
          this.trasladoForm.reset();
          this.loading = false;
        },
        (error) => {
          console.error('Error al realizar el traslado:', error);
          this.loading = false;
        }
      );
    }
  }
} 