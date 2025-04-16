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
  errorMensaje: string = '';
  stockDisponible: number = 0;

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
    
    this.trasladoForm.get('bodegaOrigenId')?.valueChanges.subscribe(bodegaId => {
      if (bodegaId) {
        this.cargarProductosBodega(bodegaId);
        this.trasladoForm.get('productoId')?.setValue('');
        this.validarBodegas();
      } else {
        this.productos = [];
        this.trasladoForm.get('productoId')?.setValue('');
      }
    });

    this.trasladoForm.get('bodegaDestinoId')?.valueChanges.subscribe(() => {
      this.validarBodegas();
    });

    this.trasladoForm.get('productoId')?.valueChanges.subscribe(productoId => {
      if (productoId) {
        const producto = this.productos.find(p => p.id === productoId);
        this.stockDisponible = producto?.cantidad || 0;
        this.validarCantidad();
      } else {
        this.stockDisponible = 0;
      }
    });

    this.trasladoForm.get('cantidad')?.valueChanges.subscribe(() => {
      this.validarCantidad();
    });
  }

  validarBodegas(): void {
    const bodegaOrigen = this.trasladoForm.get('bodegaOrigenId')?.value;
    const bodegaDestino = this.trasladoForm.get('bodegaDestinoId')?.value;

    if (bodegaOrigen && bodegaDestino && bodegaOrigen === bodegaDestino) {
      this.errorMensaje = 'La bodega destino no puede ser la misma que la bodega origen';
      this.trasladoForm.get('bodegaDestinoId')?.setValue('');
    } else {
      this.errorMensaje = '';
    }
  }

  validarCantidad(): void {
    const cantidad = this.trasladoForm.get('cantidad')?.value;
    if (cantidad > this.stockDisponible) {
      this.trasladoForm.get('cantidad')?.setErrors({ stockInsuficiente: true });
    } else {
      this.trasladoForm.get('cantidad')?.setErrors(null);
    }
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
        this.productos = productos.productos;
        this.loading = false;
      },
      (error) => {
        console.error('Error al cargar productos:', error);
        this.loading = false;
      }
    );
  }

  onSubmit(): void {
    if (this.trasladoForm.valid && !this.errorMensaje) {
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