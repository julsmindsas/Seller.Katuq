import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ToastrService } from 'ngx-toastr';
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
    private inventarioService: InventarioService,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private router: Router
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
        const producto = this.productos.find(p => p.producto.cd === productoId);
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
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        this.toastr.error('Error al cargar las bodegas', 'Error');
      }
    });
  }

  cargarProductosBodega(bodegaId: string): void {
    this.loading = true;
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe({
      next: (productos) => {
        this.productos = productos.productos;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al cargar productos:', error);
        this.toastr.error('Error al cargar productos de la bodega', 'Error');
        this.loading = false;
      }
    });
  }

  /**
   * Cancela el traslado y vuelve al inventario
   */
  cancelar(): void {
    if (this.trasladoForm.dirty) {
      this.confirmationService.confirm({
        message: '¿Tienes cambios sin guardar. ¿Estás seguro de cancelar?',
        header: 'Confirmar cancelación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, cancelar',
        rejectLabel: 'No, continuar',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.trasladoForm.reset();
          this.productos = [];
          this.stockDisponible = 0;
          this.router.navigate(['/inventario']);
        }
      });
    } else {
      this.router.navigate(['/inventario']);
    }
  }

  /**
   * Muestra confirmación antes de realizar el traslado
   */
  confirmarTraslado(): void {
    if (this.trasladoForm.valid && !this.errorMensaje) {
      const bodegaOrigen = this.bodegas.find(b => b.idBodega === this.trasladoForm.get('bodegaOrigenId')?.value);
      const bodegaDestino = this.bodegas.find(b => b.idBodega === this.trasladoForm.get('bodegaDestinoId')?.value);
      const producto = this.productos.find(p => p.producto.cd === this.trasladoForm.get('productoId')?.value);
      const cantidad = this.trasladoForm.get('cantidad')?.value;

      this.confirmationService.confirm({
        message: `¿Confirmas el traslado de <strong>${cantidad} unidades</strong> de "<strong>${producto?.producto?.crearProducto?.titulo}</strong>" desde "<strong>${bodegaOrigen?.nombre}</strong>" hacia "<strong>${bodegaDestino?.nombre}</strong>"?`,
        header: 'Confirmar Traslado',
        icon: 'pi pi-arrow-right-arrow-left',
        acceptLabel: 'Confirmar traslado',
        rejectLabel: 'Revisar',
        acceptButtonStyleClass: 'p-button-success',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.ejecutarTraslado();
        }
      });
    } else {
      this.toastr.warning('Por favor complete todos los campos requeridos', 'Formulario incompleto');
    }
  }

  /**
   * Ejecuta el traslado después de la confirmación
   */
  private ejecutarTraslado(): void {
    this.loading = true;
    const traslado: Traslado = {
      ...this.trasladoForm.value,
      fecha: new Date(),
      estado: 'Pendiente'
    };

    this.inventarioService.realizarTraslado(traslado).subscribe({
      next: (response) => {
        this.toastr.success('Traslado realizado con éxito', 'Completado');
        this.trasladoForm.reset();
        this.productos = [];
        this.stockDisponible = 0;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error al realizar el traslado:', error);
        this.toastr.error('Error al realizar el traslado', 'Error');
        this.loading = false;
      }
    });
  }

  /**
   * @deprecated Usar confirmarTraslado() en su lugar
   */
  onSubmit(): void {
    this.confirmarTraslado();
  }
}
