import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ConfirmationService } from 'primeng/api';
import { ToastrService } from 'ngx-toastr';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { urlImagenAbsoluta } from '../../../shared/utils/imagen-producto';
import { Bodega } from '../../../shared/models/inventarios/bodega.model';

interface ProductoTraslado {
  productoId: string;
  titulo: string;
  imagen: string | null;
  referencia: string;
  stockDisponible: number;
  cantidad: number;
}

@Component({
  selector: 'app-traslados',
  templateUrl: './traslados.component.html',
  styleUrls: ['./traslados.component.scss']
})
export class TrasladosComponent implements OnInit {
  bodegaForm: FormGroup;
  bodegas: Bodega[] = [];
  productosOrigen: any[] = []; // Productos disponibles en bodega origen
  productosTraslado: ProductoTraslado[] = []; // Productos seleccionados para trasladar
  loading = false;
  loadingProductos = false;
  errorMensaje = '';
  busquedaProducto = '';

  constructor(
    private fb: FormBuilder,
    private inventarioService: InventarioService,
    private confirmationService: ConfirmationService,
    private toastr: ToastrService,
    private router: Router
  ) {
    this.bodegaForm = this.fb.group({
      bodegaOrigenId: ['', Validators.required],
      bodegaDestinoId: ['', Validators.required],
      observaciones: ['']
    });
  }

  ngOnInit(): void {
    this.cargarBodegas();

    this.bodegaForm.get('bodegaOrigenId')?.valueChanges.subscribe(bodegaId => {
      if (bodegaId) {
        this.cargarProductosBodega(bodegaId);
        this.productosTraslado = [];
        this.validarBodegas();
      } else {
        this.productosOrigen = [];
        this.productosTraslado = [];
      }
    });

    this.bodegaForm.get('bodegaDestinoId')?.valueChanges.subscribe(() => {
      this.validarBodegas();
    });
  }

  validarBodegas(): void {
    const origen = this.bodegaForm.get('bodegaOrigenId')?.value;
    const destino = this.bodegaForm.get('bodegaDestinoId')?.value;
    if (origen && destino && origen === destino) {
      this.errorMensaje = 'La bodega destino no puede ser la misma que la bodega origen';
      this.bodegaForm.get('bodegaDestinoId')?.setValue('');
    } else {
      this.errorMensaje = '';
    }
  }

  cargarBodegas(): void {
    this.inventarioService.getBodegas().subscribe({
      next: (bodegas) => { this.bodegas = bodegas; },
      error: () => { this.toastr.error('Error al cargar las bodegas', 'Error'); }
    });
  }

  cargarProductosBodega(bodegaId: string): void {
    this.loadingProductos = true;
    this.inventarioService.obtenerInventarioPorBodega(bodegaId).subscribe({
      next: (response) => {
        this.productosOrigen = (response.productos || []).filter((p: any) => p.cantidad > 0);
        this.loadingProductos = false;
      },
      error: () => {
        this.toastr.error('Error al cargar productos de la bodega', 'Error');
        this.loadingProductos = false;
      }
    });
  }

  // Productos filtrados por búsqueda que NO están ya en la tabla
  get productosFiltrados(): any[] {
    const idsSeleccionados = new Set(this.productosTraslado.map(p => p.productoId));
    let filtrados = this.productosOrigen.filter(p => !idsSeleccionados.has(p.producto?.cd));
    if (this.busquedaProducto.trim()) {
      const search = this.busquedaProducto.toLowerCase();
      filtrados = filtrados.filter(p =>
        (p.producto?.crearProducto?.titulo || '').toLowerCase().includes(search) ||
        (p.producto?.identificacion?.referencia || '').toLowerCase().includes(search)
      );
    }
    return filtrados;
  }

  onProductoSeleccionado(item: any): void {
    if (!item) return;
    this.agregarProducto(item);
  }

  onProductoSeleccionadoSelect(event: any): void {
    const cd = event.target.value;
    if (!cd) return;
    const item = this.productosFiltrados.find((p: any) => p.producto?.cd === cd);
    if (item) this.agregarProducto(item);
    event.target.value = '';
  }

  agregarProducto(item: any): void {
    const prod = item.producto;
    if (!prod?.cd) return;
    // Evitar duplicados
    if (this.productosTraslado.some(p => p.productoId === prod.cd)) return;

    this.productosTraslado.push({
      productoId: prod.cd,
      titulo: prod.crearProducto?.titulo || 'Sin nombre',
      imagen: urlImagenAbsoluta(prod.crearProducto?.imagenesPrincipales?.[0]?.urls),
      referencia: prod.identificacion?.referencia || '',
      stockDisponible: item.cantidad || 0,
      cantidad: 1
    });
  }

  quitarProducto(index: number): void {
    this.productosTraslado.splice(index, 1);
  }

  cambiarCantidad(producto: ProductoTraslado, event: any): void {
    let val = Number(event.target.value);
    if (isNaN(val) || val < 1) val = 1;
    if (val > producto.stockDisponible) val = producto.stockDisponible;
    producto.cantidad = val;
  }

  get totalItems(): number {
    return this.productosTraslado.reduce((sum, p) => sum + p.cantidad, 0);
  }

  get canTraslado(): boolean {
    return this.bodegaForm.valid && !this.errorMensaje && this.productosTraslado.length > 0 && !this.loading;
  }

  confirmarTraslado(): void {
    if (!this.canTraslado) return;

    const bodegaOrigen = this.bodegas.find(b => b.idBodega === this.bodegaForm.get('bodegaOrigenId')?.value);
    const bodegaDestino = this.bodegas.find(b => b.idBodega === this.bodegaForm.get('bodegaDestinoId')?.value);

    const listaProductos = this.productosTraslado.map(p => `• ${p.titulo} — ${p.cantidad} unid.`).join('<br>');

    this.confirmationService.confirm({
      message: `
        <div class="text-start">
          <p class="mb-2"><strong>Origen:</strong> ${bodegaOrigen?.nombre}</p>
          <p class="mb-2"><strong>Destino:</strong> ${bodegaDestino?.nombre}</p>
          <p class="mb-2"><strong>Productos (${this.productosTraslado.length}):</strong></p>
          <div style="max-height: 200px; overflow-y: auto; font-size: 0.85rem;">${listaProductos}</div>
          <p class="mt-2 mb-0"><strong>Total:</strong> ${this.totalItems} unidades</p>
        </div>`,
      header: 'Confirmar Traslado',
      icon: 'pi pi-arrow-right-arrow-left',
      acceptLabel: 'Confirmar traslado',
      rejectLabel: 'Revisar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => { this.ejecutarTraslado(); }
    });
  }

  private ejecutarTraslado(): void {
    this.loading = true;
    const observaciones = this.bodegaForm.get('observaciones')?.value || '';

    // Ejecutar traslados en paralelo (cada producto es un traslado independiente)
    const traslados = this.productosTraslado.map(p => ({
      bodegaOrigenId: this.bodegaForm.get('bodegaOrigenId')?.value,
      bodegaDestinoId: this.bodegaForm.get('bodegaDestinoId')?.value,
      productoId: p.productoId,
      cantidad: p.cantidad,
      observaciones: observaciones || `Traslado masivo — ${p.titulo}`,
      fecha: new Date(),
      estado: 'Pendiente' as const
    }));

    // Enviar todos los traslados
    let completados = 0;
    let errores = 0;

    traslados.forEach(traslado => {
      this.inventarioService.realizarTraslado(traslado).subscribe({
        next: () => {
          completados++;
          if (completados + errores === traslados.length) {
            this.finalizarTraslado(completados, errores);
          }
        },
        error: () => {
          errores++;
          if (completados + errores === traslados.length) {
            this.finalizarTraslado(completados, errores);
          }
        }
      });
    });
  }

  private finalizarTraslado(completados: number, errores: number): void {
    this.loading = false;
    if (errores === 0) {
      this.toastr.success(`${completados} productos trasladados exitosamente`, 'Traslado Completado');
    } else {
      this.toastr.warning(`${completados} exitosos, ${errores} con error`, 'Traslado Parcial');
    }
    this.productosTraslado = [];
    this.cargarProductosBodega(this.bodegaForm.get('bodegaOrigenId')?.value);
  }

  cancelar(): void {
    if (this.productosTraslado.length > 0) {
      this.confirmationService.confirm({
        message: '¿Tienes productos sin trasladar. ¿Estás seguro de cancelar?',
        header: 'Confirmar cancelación',
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: 'Sí, cancelar',
        rejectLabel: 'No, continuar',
        acceptButtonStyleClass: 'p-button-danger',
        rejectButtonStyleClass: 'p-button-outlined',
        accept: () => {
          this.productosTraslado = [];
          this.router.navigate(['/inventario/inventario-catalogo']);
        }
      });
    } else {
      this.router.navigate(['/inventario/inventario-catalogo']);
    }
  }
}
