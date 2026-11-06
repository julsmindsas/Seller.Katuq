import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { BodegaService } from '../../../shared/services/bodegas/bodega.service';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import { InventarioService } from '../../../shared/services/inventarios/inventario.service';
import { ToastrService } from 'ngx-toastr';
import Swal from 'sweetalert2';
import { leerErrorInventario, nombrarProductosEnError } from 'src/app/shared/utils/error-inventario';
import { ConfirmationService } from 'primeng/api';
import { MovimientoInventario } from '../model/movimientoinventario';
import { Producto } from '../../../shared/models/productos/Producto';
import { TipoMovimientoInventario } from '../enums/tipos-movimiento.enum';
import { lastValueFrom } from 'rxjs';

interface ProductoRecepcion {
  id: string;
  producto: Producto;
  cantidad: number;
  /** Ticket 1522: bodega propia de la línea; vacía = la bodega del ajuste (arriba). */
  bodega?: any;
}

@Component({
  selector: 'app-recepcion-mercancia',
  templateUrl: './recepcion-mercancia.component.html',
  styleUrls: ['./recepcion-mercancia.component.scss']
})
export class RecepcionMercanciaComponent implements OnInit {
  @ViewChild('busquedaProductoInput') busquedaProductoInputEl: ElementRef;
  bodegas: any[] = [];
  productoForm: FormGroup;
  productos: ProductoRecepcion[] = [];
  productosSugeridos: any[] = [];
  busquedaInput: string = '';
  cargando: boolean = false;
  buscandoProducto: boolean = false;
  guardandoRecepcion: boolean = false;
  producto: ProductoRecepcion | null = null;
  
  // Tipos de movimiento completos
  TIPOS_MOVIMIENTO = {
    INGRESO_INVENTARIO_FISICO: 'Ingreso por inventario fisico',
    INGRESO_COMPRA: 'Ingreso por compra',
    INGRESO_PRODUCCION: 'Ingreso por Produccion',
    INGRESO_AJUSTE: 'Ingreso por Ajuste de inventario',
    INGRESO_MOVIMIENTO: 'Ingreso por movimientos entre bodegas',
    // Una devolución de cliente no es un ajuste ni una compra: tiene su propio
    // motivo en el libro (`returned`), y con eso los informes pueden restarla
    // de la demanda en vez de contarla como venta.
    INGRESO_DEVOLUCION_CLIENTE: 'Ingreso por devolucion de cliente',
    SALIDA_INVENTARIO_FISICO: 'Salida por inventario fisico',
    SALIDA_VENTA_POS: 'Salida por venta POS',
    SALIDA_VENTA_ASISTIDA: 'Salida por venta Asistida',
    SALIDA_OBSEQUIO: 'Salida por obsequio',
    SALIDA_AJUSTE: 'Salida por ajuste de inventario',
    SALIDA_ROBO: 'Salida por robo'
  };
  tiposMovimientoRecepcion: { valor: string, nombre: string }[] = [];

  
  // Variables para paginación
  pageSize = 10;
  currentPage = 1;

  constructor(
    private bodegaService: BodegaService,
    private maestroService: MaestroService,
    private inventarioService: InventarioService,
    private toastr: ToastrService,
    private confirmationService: ConfirmationService,
    private fb: FormBuilder,
    private router: Router
  ) {
    this.productoForm = this.fb.group({
      bodegaSeleccionada: ['', Validators.required],
      tipoMovimiento: ['INGRESO_COMPRA', Validators.required],
      busquedaProducto: [''],
      observaciones: [''] // Nuevo campo para observaciones
    });

    // Generar dinámicamente las opciones para el select
    this.tiposMovimientoRecepcion = Object.entries(this.TIPOS_MOVIMIENTO).map(([valor, nombre]) => ({ valor, nombre }));
  }

  // Cambiar cantidad manualmente desde input
  cambiarCantidadManual(producto: ProductoRecepcion, event: any) {
    let value = Number(event.target.value);
    if (isNaN(value) || value < 1) {
      value = 1;
    }
    producto.cantidad = value;
  }

  ngOnInit(): void {
    this.cargarBodegas();
  }

  cargarBodegas() {
    this.cargando = true;
    this.bodegaService.getBodegas().subscribe({
      next: (bodegas) => {
        this.bodegas = bodegas;
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error al cargar bodegas:', error);
        this.toastr.error('Error al cargar las bodegas', 'Error');
        this.cargando = false;
      }
    });
  }

  // Buscar y agregar producto a la tabla
  buscarProducto() {
    const busqueda = this.busquedaInput.trim();
    if (!busqueda || busqueda.length < 3) {
      this.toastr.warning('Ingresa al menos 3 caracteres para buscar', 'Advertencia');
      return;
    }
    
    this.buscandoProducto = true;
    
    // Usar el servicio de maestros para buscar productos
    this.maestroService.getProductsBySearch(busqueda, this.pageSize, this.currentPage).subscribe({
      next: (response: any) => {
        const productos = response.products || [];

        // Solo agregar ante una coincidencia EXACTA por referencia, código de
        // barras o docId. NO tomar products[0]: el filtro del backend no tiene
        // orden de relevancia, así que el "primer resultado" es arbitrario y
        // agregaba un producto distinto al buscado (bug "sale otro producto").
        // El escáner de barras teclea el código completo → coincidencia exacta;
        // un término parcial/ambiguo no agrega nada y pide elegir del listado.
        const termino = busqueda.toLowerCase();
        const productoEncontrado = productos.find((p: any) =>
          (p.identificacion?.referencia || '').toLowerCase() === termino ||
          (p.identificacion?.codigoBarras || '').toLowerCase() === termino ||
          (p.cd || '').toLowerCase() === termino
        );

        if (productoEncontrado) {
          // Reutiliza el mismo flujo correcto del autocomplete (dedup + push).
          this.agregarProductoSeleccionado(productoEncontrado);
        } else if (productos.length === 0) {
          this.toastr.error('No se encontraron productos con ese criterio', 'Producto no encontrado');
        } else {
          this.toastr.info('Selecciona el producto del listado de sugerencias', 'Varias coincidencias');
        }
        this.buscandoProducto = false;
      },
      error: (error) => {
        console.error('Error al buscar producto:', error);
        this.toastr.error('Error al buscar el producto', 'Error');
        this.buscandoProducto = false;
      }
    });
  }

  // Incrementar cantidad de producto
  incrementarCantidad(producto: ProductoRecepcion) {
    producto.cantidad += 1;
  }

  // Decrementar cantidad de producto
  decrementarCantidad(producto: ProductoRecepcion) {
    if (producto.cantidad > 1) {
      producto.cantidad -= 1;
    } else {
      // Si la cantidad es 1 y se intenta decrementar, eliminar el producto
      this.eliminarProducto(producto);
    }
  }

  // Eliminar producto de la tabla
  eliminarProducto(producto: ProductoRecepcion) {
    const index = this.productos.findIndex(p => p.id === producto.id);
    if (index !== -1) {
      this.productos.splice(index, 1);
      this.toastr.warning('Producto eliminado de la lista', 'Removido');
    }
  }

  // Calcular el total de items
  calcularTotalItems(): number {
    return this.productos.reduce((sum, item) => sum + item.cantidad, 0);
  }

  /** Ticket 1522: bodega en la que se registra una línea (la suya o la del ajuste). */
  bodegaDe(item: ProductoRecepcion): any {
    return item.bodega || this.productoForm.get('bodegaSeleccionada')?.value || null;
  }

  /** Líneas agrupadas por bodega, en el orden en que aparecen. */
  private gruposPorBodega(): { bodega: any; items: ProductoRecepcion[] }[] {
    const grupos = new Map<string, { bodega: any; items: ProductoRecepcion[] }>();
    for (const item of this.productos) {
      const bodega = this.bodegaDe(item);
      const clave = String(bodega?.idBodega || '');
      if (!grupos.has(clave)) grupos.set(clave, { bodega, items: [] });
      grupos.get(clave)!.items.push(item);
    }
    return [...grupos.values()];
  }

  // Guardar los datos de recepción de mercancía
  async guardarRecepcion() {
    if (this.productoForm.invalid || this.productos.length === 0) {
      this.toastr.error('Por favor selecciona una bodega, tipo de movimiento y añade al menos un producto', 'Error');
      return;
    }

    this.guardandoRecepcion = true;
    const tipoMovimiento = this.productoForm.get('tipoMovimiento')?.value;
    const observaciones = this.productoForm.get('observaciones')?.value || '';
    const grupos = this.gruposPorBodega();

    // Ticket 1522: un mismo ajuste puede tocar varias bodegas. Se registra una vez por bodega,
    // con el mismo tipo de movimiento y la misma nota, y con una referencia común para
    // encontrarlos juntos. Cada bodega se guarda completa o no se guarda (transacción del
    // servidor); si una falla se detiene y se informa cuáles ya quedaron.
    const referencia = grupos.length > 1 ? `AJ-${Date.now().toString(36).toUpperCase()}` : '';
    const nota = referencia
      ? `${observaciones ? observaciones + ' · ' : ''}Ajuste en ${grupos.length} bodegas (ref. ${referencia})`
      : observaciones;
    const guardadas: string[] = [];

    for (const grupo of grupos) {
      const productosParaEnviar = grupo.items.map(item => ({
        productoId: item.producto.cd || item.id,
        referencia: item.producto.identificacion?.referencia || '',
        cantidad: item.cantidad,
      }));
      try {
        await lastValueFrom(this.inventarioService.ingresarProductos(grupo.bodega.idBodega, productosParaEnviar, tipoMovimiento, nota));
        guardadas.push(grupo.bodega.nombre || grupo.bodega.idBodega);
        // Lo que ya quedó guardado sale de la lista para que un reintento no lo duplique.
        this.productos = this.productos.filter(p => !grupo.items.includes(p));
      } catch (error) {
        console.error('Error al guardar recepción:', error);
        this.guardandoRecepcion = false;
        if (guardadas.length) {
          this.toastr.warning(`Ya quedó guardado en: ${guardadas.join(', ')}. Falta ${grupo.bodega.nombre || grupo.bodega.idBodega}.`, 'Guardado en parte', { timeOut: 10000 });
        }
        this.mostrarErrorRecepcion(error);
        return;
      }
    }

    this.toastr.success(
      grupos.length > 1 ? `Ajuste guardado en ${grupos.length} bodegas (ref. ${referencia})` : 'Recepción de mercancía guardada con éxito',
      'Guardado'
    );
    // Reiniciar formulario y lista de productos
    this.productoForm.reset({
      tipoMovimiento: TipoMovimientoInventario.INGRESO_COMPRA,
      observaciones: '' // Reiniciar observaciones
    });
    this.productos = [];
    this.guardandoRecepcion = false;
  }

  /**
   * Muestra el error real devuelto por el backend. Si el motivo es que el
   * producto está marcado como no-inventariable, el toast es clickeable y
   * lleva al editor de productos para reconfigurarlo.
   */
  private mostrarErrorRecepcion(error: any): void {

    // El backend usa dos redacciones para el mismo caso y solo una nombra el
    // producto; `leerErrorInventario` entiende ambas. Cuando no viene el id,
    // el culpable es el único producto de la línea que se intentó guardar.
    const leido = leerErrorInventario(error);
    if (leido.esNoInventariable) {
      const productoId = leido.productoId;
      const item = productoId
        ? this.productos.find(p => p.producto?.cd === productoId || p.id === productoId)
        : (this.productos.length === 1 ? this.productos[0] : undefined);
      const nombre =
        item?.producto?.crearProducto?.titulo ||
        item?.producto?.identificacion?.referencia ||
        productoId;

      Swal.fire({
        icon: 'warning',
        title: 'Este producto no lleva inventario',
        html:
          `<p><strong>${nombre}</strong> está marcado como <strong>no inventariable</strong>, ` +
          `así que no admite ingresos ni retiros de stock.</p>` +
          `<p class="text-muted mb-0">Para que lleve stock, cámbialo en la ficha del producto. ` +
          `Si solo quieres asociarlo a una bodega, usa «Agregar a bodega».</p>`,
        showCancelButton: true,
        confirmButtonText: 'Abrir ficha del producto',
        cancelButtonText: 'Entendido',
        confirmButtonColor: '#5F3FE0',
      }).then((r) => {
        if (r.isConfirmed) this.abrirEditorProducto(item?.producto);
      });
      return;
    }

    // Cualquier otro error: el motivo del backend, con su instrucción debajo.
    // Ticket 1071: el producto por su referencia y nombre, no por su id interno.
    const { html: motivo, nombrados } = nombrarProductosEnError(
      leido.motivo,
      this.productos.map(p => ({
        id: p.producto?.cd || p.id,
        nombre: [p.producto?.identificacion?.referencia, p.producto?.crearProducto?.titulo]
          .filter(Boolean).join(' · ') || p.producto?.cd || p.id,
      })),
    );
    // Las validaciones y la escritura van en una sola transacción: si un producto falla, no entra ninguno.
    const nadaGuardado = nombrados.length > 0 && this.productos.length > 1
      ? `<p class="text-muted mb-0">No se guardó ningún producto de la lista. Corrige o quita ese producto y vuelve a guardar.</p>`
      : '';
    Swal.fire({
      icon: 'error',
      title: 'No se guardó la recepción',
      html: leido.motivo
        ? `<p>${motivo}</p>` +
          (leido.sugerencia ? `<p class="text-muted mb-0">${leido.sugerencia}</p>` : '') +
          nadaGuardado
        : 'No se pudo guardar la recepción de mercancía.',
      confirmButtonColor: '#5F3FE0',
    });
  }

  /**
   * Abre el editor de productos con el producto cargado (mismo flujo que
   * usa `productos.component.ts → editarProducto`).
   */
  private abrirEditorProducto(producto: Producto | undefined): void {
    if (producto) {
      sessionStorage.setItem('infoForms', JSON.stringify(producto));
    } else {
      sessionStorage.removeItem('infoForms');
    }
    this.router.navigateByUrl('productos/crearProductos');
  }

  // Manejar evento keydown para agregar producto al presionar Enter
  onKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      this.buscarProducto();
      // Limpiar el input y hacer focus después de un breve instante para asegurar que la búsqueda se procese
      // y el DOM se actualice si es necesario antes de re-enfocar.
      setTimeout(() => {
        this.busquedaInput = '';
        if (this.busquedaProductoInputEl) {
          this.busquedaProductoInputEl.nativeElement.focus();
        }
      }, 0);
      event.preventDefault();
    }
  }

  /**
   * Busca sugerencias de productos para el autocompletado
   */
  buscarProductosSugerencias(event: any): void {
    const query = event.query?.trim();
    if (!query || query.length < 2) {
      this.productosSugeridos = [];
      return;
    }

    this.maestroService.getProductsBySearch(query, 10, 1).subscribe({
      next: (response: any) => {
        this.productosSugeridos = response.products || [];
      },
      error: (error) => {
        console.error('Error al buscar sugerencias:', error);
        this.productosSugeridos = [];
      }
    });
  }

  /**
   * Agrega un producto seleccionado del autocompletado
   */
  agregarProductoSeleccionado(producto: any): void {
    if (!producto) return;

    // Verificar si el producto ya existe en la tabla
    const productoExistente = this.productos.find(p =>
      p.producto.identificacion?.referencia === producto.identificacion?.referencia
    );

    if (productoExistente) {
      productoExistente.cantidad += 1;
      this.toastr.info('Cantidad de producto actualizada', 'Producto actualizado');
    } else {
      const nuevoProducto: ProductoRecepcion = {
        id: producto.cd || Math.random().toString(36).substring(2, 9),
        producto: producto,
        cantidad: 1
      };
      this.productos.push(nuevoProducto);
      this.toastr.success('Producto agregado correctamente', 'Éxito');
    }

    // Limpiar el campo de búsqueda
    this.busquedaInput = '';
  }

  /**
   * Obtiene la etiqueta del tipo de movimiento seleccionado
   */
  getTipoMovimientoLabel(): string {
    const tipoSeleccionado = this.productoForm.get('tipoMovimiento')?.value;
    const tipo = this.tiposMovimientoRecepcion.find(t => t.valor === tipoSeleccionado);
    return tipo?.nombre || 'No seleccionado';
  }

  /**
   * Obtiene el icono correspondiente al tipo de movimiento
   */
  getIconoTipoMovimiento(valor: string): string {
    const iconos: { [key: string]: string } = {
      'INGRESO_INVENTARIO_FISICO': 'pi pi-list',
      'INGRESO_COMPRA': 'pi pi-shopping-cart',
      'INGRESO_PRODUCCION': 'pi pi-cog',
      'INGRESO_AJUSTE': 'pi pi-sliders-h',
      'INGRESO_MOVIMIENTO': 'pi pi-arrow-right-arrow-left',
      'SALIDA_INVENTARIO_FISICO': 'pi pi-list',
      'SALIDA_VENTA_POS': 'pi pi-calculator',
      'SALIDA_VENTA_ASISTIDA': 'pi pi-user',
      'SALIDA_OBSEQUIO': 'pi pi-gift',
      'SALIDA_AJUSTE': 'pi pi-sliders-h',
      'SALIDA_ROBO': 'pi pi-exclamation-triangle'
    };
    return iconos[valor] || 'pi pi-box';
  }

  /**
   * Limpia la lista de productos
   */
  limpiarLista(): void {
    if (this.productos.length === 0) {
      this.toastr.info('La lista ya está vacía', 'Información');
      return;
    }

    this.confirmationService.confirm({
      message: `¿Estás seguro de eliminar <strong>${this.productos.length} productos</strong> de la lista?`,
      header: 'Confirmar limpieza',
      icon: 'pi pi-trash',
      acceptLabel: 'Sí, limpiar',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.productos = [];
        this.toastr.warning('Lista de productos limpiada', 'Lista vacía');
      }
    });
  }

  /**
   * Muestra confirmación antes de guardar la recepción
   */
  confirmarGuardado(): void {
    if (this.productoForm.invalid || this.productos.length === 0) {
      this.toastr.error('Por favor selecciona una bodega, tipo de movimiento y añade al menos un producto', 'Error');
      return;
    }

    const bodega = this.productoForm.get('bodegaSeleccionada')?.value;
    const tipoLabel = this.getTipoMovimientoLabel();
    const totalProductos = this.productos.length;
    const totalUnidades = this.calcularTotalItems();
    const escapar = (t: any) => String(t ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' } as any)[c]);
    const grupos = this.gruposPorBodega();
    const lineaBodegas = grupos.length > 1
      ? `<p class="mb-2"><strong>Bodegas:</strong> ${grupos.map(g => `${escapar(g.bodega?.nombre)} (${g.items.length})`).join(' · ')}</p>`
      : `<p class="mb-2"><strong>Bodega:</strong> ${escapar(bodega?.nombre) || 'No especificada'}</p>`;

    this.confirmationService.confirm({
      message: `
        <div class="text-start">
          ${lineaBodegas}
          <p class="mb-2"><strong>Tipo:</strong> ${tipoLabel}</p>
          <p class="mb-2"><strong>Productos:</strong> ${totalProductos}</p>
          <p class="mb-0"><strong>Total unidades:</strong> ${totalUnidades}</p>
        </div>
      `,
      header: 'Confirmar Ajuste de Inventario',
      icon: 'pi pi-check-circle',
      acceptLabel: 'Confirmar',
      rejectLabel: 'Revisar',
      acceptButtonStyleClass: 'p-button-success',
      rejectButtonStyleClass: 'p-button-outlined',
      accept: () => {
        this.guardarRecepcion();
      }
    });
  }
}