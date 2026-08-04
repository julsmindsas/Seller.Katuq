import { Component, Input, OnInit, EventEmitter, Output } from "@angular/core";
import { CartSingletonService } from "../../../shared/services/ventas/cart.singleton.service";
import { VentasService } from "../../../shared/services/ventas/ventas.service";
import Swal from "sweetalert2";
import { Pedido, DescuentoAplicado } from "../modelo/pedido";
import { ToastrService } from "ngx-toastr";
import { FormBuilder, FormGroup, Validators } from "@angular/forms";
import { parse as flattedParse } from "flatted";
import { NgbModal } from "@ng-bootstrap/ng-bootstrap";
import { ConfProductToCartComponent } from "../catalogo/conf-product-to-cart/conf-product-to-cart.component";

@Component({
  selector: "app-carrito",
  templateUrl: "./carrito.component.html",
  styleUrls: ["./carrito.component.scss"],
})
export class CarritoComponent implements OnInit {
  productos: any[] = [];
  cupon: string = '';
  valorDescuento: number = 0;
  porcentajeDescuento: number = 0;
  // Descuento del módulo Descuentos y Promociones actualmente aplicado.
  descuentoAplicado: DescuentoAplicado | null = null;
  aplicandoCupon: boolean = false;
  rangoPreciosActual1: any = null;
  precioproducto: number = 0;
  preciosAdiciones: number = 0;
  preciosPreferencias: number = 0;
  
  // Modal para notas de producción
  notaProduccionForm: FormGroup;
  productoSeleccionado: any = null;

  @Input()
  public pedido: Pedido;
  
  @Output() 
  notaAgregada = new EventEmitter<any>();

  constructor(
    private carsingleton: CartSingletonService,
    private service: VentasService,
    private toastrService: ToastrService,
    private formBuilder: FormBuilder,
    private modalService: NgbModal
  ) {}

  ngOnInit(): void {
    // Limpiar datos fantasma al inicializar
    this.limpiarDatosFantasma();
    
    this.refreshCartWithProducts();
    
    // Inicializar formulario de notas
    this.notaProduccionForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });
  }

  refreshCartWithProducts(): void {
    this.carsingleton.productInCartChanges$.subscribe((data) => {
      this.productos = Array.isArray(data) ? [...data] : [];
      
      // Limpiar propiedades notaProduccion de productos individuales
      this.productos.forEach(producto => {
        if (producto.notaProduccion) {
          console.log('🧹 Limpiando notaProduccion obsoleta del producto:', producto.producto?.crearProducto?.titulo);
          delete producto.notaProduccion;
        }
      });
      
      // Actualizar localStorage sin las propiedades obsoletas
      localStorage.setItem('carrito', JSON.stringify(this.productos));
    });
  }

  removeThisProduct(producto: any): void {
    if (!producto) return;
    this.carsingleton.removeProduct(producto);
  }

  /**
   * Completa la configuración de una línea agregada desde un combo (D-147)
   * que quedó marcada `_requiereConfiguracionPendiente`. Reabre
   * `ConfProductToCartComponent` en modo edición (mismo patrón que
   * `cotizacion-editor.component.ts::editarCliente`, aplicado aquí a
   * `isEdit`/`configuracionCarrito`) — el resultado ACTUALIZA la línea
   * existente vía `updateProductQuantity`, no agrega un ítem duplicado.
   */
  completarConfiguracionPendiente(item: any): void {
    if (!item) return;

    const ref = this.modalService.open(ConfProductToCartComponent, {
      centered: true,
      size: "xl",
      scrollable: true,
      windowClass: "modal-fullscreen",
    });
    const inst = ref.componentInstance as ConfProductToCartComponent;
    inst.producto = item.producto;
    inst.isEdit = true;
    inst.configuracionCarrito = item;
    inst.modalRef = ref;

    ref.result.then(
      () => { /* close() no se usa en este flujo — el resultado llega por dismiss */ },
      (resultado: any) => {
        // dismissCurrentModal(ProductoCompra) → llega como "reason" del dismiss.
        if (resultado && resultado.producto) {
          this.carsingleton.updateProductQuantity({
            ...resultado,
            cartItemId: item.cartItemId,
            // Sin esto el merge de updateProductQuantity conservaría el flag
            // anterior (true), porque `resultado` no trae esta clave.
            _requiereConfiguracionPendiente: false
          });
        }
      }
    );
  }
  
  agregarNotaProduccion(producto: any): void {
    this.productoSeleccionado = producto;
    
    // Mostrar Sweet Alert con campo de texto para la nota
    Swal.fire({
      title: 'Agregar Nota de Producción',
      html: `
        <div class="text-start mb-3">
          <span class="fw-bold">${producto?.producto?.crearProducto?.titulo || 'Producto'}</span>
        </div>
        <textarea id="nota-produccion" class="form-control" placeholder="Escribe la nota de producción aquí..." rows="4"></textarea>
      `,
      showCancelButton: true,
      confirmButtonText: 'Guardar Nota',
      cancelButtonText: 'Cancelar',
      showClass: {
        popup: 'animate__animated animate__fadeInDown'
      },
      hideClass: {
        popup: 'animate__animated animate__fadeOutUp'
      },
      preConfirm: () => {
        const nota = (document.getElementById('nota-produccion') as HTMLTextAreaElement).value;
        if (!nota.trim()) {
          Swal.showValidationMessage('Por favor ingresa una nota');
          return false;
        }
        return nota;
      }
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        this.guardarNotaProduccion(producto, result.value);
      }
    });
  }
  
  guardarNotaProduccion(producto: any, nota: string): void {
    // Inicializar notasPedido si no existe
    if (!this.pedido?.notasPedido) {
      this.pedido.notasPedido = {
        notasProduccion: [],
        notasCliente: [],
        notasDespachos: [],
        notasEntregas: [],
        notasFacturacionPagos: []
      };
    }

    // Crear nota estructurada para el pedido
    const nuevaNota = {
      fecha: new Date().toISOString(),
      descripcion: nota,
      producto: producto?.producto?.crearProducto?.titulo || 'Producto',
      usuario: 'Usuario', // Se puede obtener del contexto de usuario actual
      productoId: producto?.producto?.identificacion?.referencia || ''
    };

    // Agregar a las notas de producción del pedido
    this.pedido.notasPedido.notasProduccion.push(nuevaNota);
    
    // Emitir evento de nota agregada con toda la información del pedido
    this.notaAgregada.emit({
      pedido: this.pedido,
      nuevaNota: nuevaNota,
      producto: producto
    });
    
    // Mostrar mensaje de éxito
    this.toastrService.success('Nota de producción agregada correctamente', 'Éxito');
  }

  private calculateAdicionesPrice(adiciones: any[]): number {
    if (!adiciones || !Array.isArray(adiciones)) return 0;
    return adiciones.reduce((total, adicion) => {
      const precio = adicion?.referencia?.precioTotal || 0;
      const cantidad = adicion?.cantidad || 0;
      return total + (precio * cantidad);
    }, 0);
  }

  private calculatePreferenciasPrice(preferencias: any[]): number {
    if (!preferencias || !Array.isArray(preferencias)) return 0;
    return preferencias.reduce((total, preferencia) => {
      const precio = preferencia?.precioTotalConIva || 0;
      return total + precio;
    }, 0);
  }

  getProductPriceWithScale(producto: any): number {
    if (!producto?.producto?.precio) {
      console.log('⚠️ CARRITO: Producto sin precio', producto);
      return 0;
    }

    // 🔒 Si el producto tiene precio por categoría de cliente, usar precio fijo SIN escalar por volumen
    if (producto?.producto?._precioAplicadoPorCategoria) {
      const precioFijoCategoria = Number(producto?.producto?.precio?.precioUnitarioConIva) || 0;
      return precioFijoCategoria;
    }

    const preciosVolumen = producto?.producto?.precio?.preciosVolumen ?? [];
    const precioUnitarioConIvaBase = Number(producto?.producto?.precio?.precioUnitarioConIva) || 0;
    
    console.log('💰 CARRITO - Calculando precio por cantidad:', {
      titulo: producto?.producto?.crearProducto?.titulo,
      cantidad: producto?.cantidad,
      precioBase: precioUnitarioConIvaBase,
      tienePreciosVolumen: preciosVolumen.length > 0,
      preciosVolumen: preciosVolumen
    });
    
    if (!Array.isArray(preciosVolumen) || preciosVolumen.length === 0) {
      console.log('⚠️ CARRITO: Sin precios por volumen, usando precio base:', precioUnitarioConIvaBase);
      return precioUnitarioConIvaBase;
    }

    const cantidad = Number(producto?.cantidad) || 0;
    
    // ✅ CORREGIDO: Filtrar solo rangos que tengan límites válidos definidos
    // y buscar el rango más específico que coincida con la cantidad
    const rangosValidos = preciosVolumen.filter((x: any) => {
      // Solo considerar rangos que tengan ambos límites definidos y válidos
      const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
      const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
      return tieneMinimo && tieneMaximo;
    });

    console.log('🔍 CARRITO - Rangos válidos filtrados:', rangosValidos.length, 'de', preciosVolumen.length);

    // Buscar el rango donde la cantidad esté dentro de los límites
    const rangoActual = rangosValidos.find((x: any) => {
      const min = Number(x.numeroUnidadesInicial) || 0;
      const max = Number(x.numeroUnidadesLimite) || Infinity;
      const dentroDelRango = cantidad >= min && cantidad <= max;
      
      console.log(`   Evaluando rango [${min} - ${max}]: cantidad ${cantidad} → ${dentroDelRango ? '✓ MATCH' : '✗ no match'}`);
      
      return dentroDelRango;
    });

    console.log('🎯 CARRITO - Rango encontrado para cantidad', cantidad, ':', rangoActual);

    // Intentar ambos nombres de campo por si hay inconsistencia
    const precioVolumenConIva = Number(rangoActual?.valorUnitarioPorVolumenConIVA) || 
                                Number(rangoActual?.valorUnitarioPorVolumenIva) || 0;
    
    const precioFinal = precioVolumenConIva > 0 ? precioVolumenConIva : precioUnitarioConIvaBase;
    
    console.log('✅ CARRITO - Precio final calculado:', {
      precioVolumenEncontrado: precioVolumenConIva,
      precioFinal: precioFinal,
      usandoPrecioBase: precioVolumenConIva <= 0
    });
    
    return precioFinal;
  }

  getTotalProductPriceInCart(): number {
    if (!this.productos || this.productos.length === 0) return 0;

    return this.productos.reduce((total, producto) => {
      const precioBase = Number(this.checkPriceScale(producto)) || 0;
      const precioAdiciones = Number(this.calculateAdicionesPrice(producto?.configuracion?.adiciones)) || 0;
      const precioPreferencias = Number(this.calculatePreferenciasPrice(producto?.configuracion?.preferencias)) || 0;
      const cantidad = Number(producto?.cantidad) || 0;

      const totalItem = (precioBase + precioAdiciones + precioPreferencias) * cantidad;
      return total + (isNaN(totalItem) ? 0 : totalItem);
    }, 0);
  }

  /**
   * Precio unitario CON IVA de la línea, YA NETO del descuento de línea
   * (`itemCarrito.descuentoLinea`, 0-100). El descuento se aplica multiplicando
   * el resultado final por (1-descLinea/100) sin importar la fuente del precio
   * (manual, IVA override, volumen, categoría o base) — misma composición que
   * el backend (`orderCalculationService.js::calcularTotalesPedido`): aplicar el
   * descuento antes o después del IVA es matemáticamente equivalente para un
   * único porcentaje ((1-d)×(1+r) == (1+r)×(1-d)), así que no hay riesgo de
   * doble conteo ni de perder la escala de volumen vigente (lección D-046).
   */
  checkPriceScale(itemCarrito: any): number {
    const precioBruto = this.checkPriceScaleBruto(itemCarrito);
    const descLineaFrac = this.descLineaPct(itemCarrito) / 100;
    return precioBruto * (1 - descLineaFrac);
  }

  /** % de descuento de línea (0-100), saneado. */
  descLineaPct(itemCarrito: any): number {
    const d = Number(itemCarrito?.descuentoLinea) || 0;
    return Math.min(100, Math.max(0, d));
  }

  onDescLineaChange(itemCarrito: any, value: any): void {
    if (!itemCarrito) return;
    let d = Number(value);
    if (isNaN(d) || d < 0) d = 0;
    if (d > 100) d = 100;
    itemCarrito.descuentoLinea = d;
    this.carsingleton.updateProductQuantity(itemCarrito);
  }

  private checkPriceScaleBruto(itemCarrito: any): number {
    if (!itemCarrito?.producto?.precio) return 0;
    // Si tiene precio manual override Y el producto permite precio manual, calcular base + IVA
    if (itemCarrito._precioManualOverride !== undefined && itemCarrito._precioManualOverride !== null
        && itemCarrito.producto?.procesoComercial?.permitePrecioManual === true) {
      const base = Number(itemCarrito._precioManualOverride) || 0;
      const iva = this.getIvaActual(itemCarrito);
      return base * (1 + iva / 100);
    }
    // Si tiene IVA manual override (cualquier producto), recalcular precio con nuevo porcentaje de IVA
    // Usa precioUnitarioSinIva directamente (con soporte de precios por volumen)
    // para evitar doble-IVA cuando precioUnitarioIva está en 0 pero precioUnitarioConIva ya lo incluye
    if (itemCarrito._ivaManualOverride !== undefined && itemCarrito._ivaManualOverride !== null) {
      const precio = itemCarrito?.producto?.precio;
      let precioSinIva: number;
      const preciosVolumen = precio?.preciosVolumen ?? [];
      if (itemCarrito?.producto?._precioAplicadoPorCategoria) {
        precioSinIva = Number(precio?.precioUnitarioSinIva) || 0;
      } else if (Array.isArray(preciosVolumen) && preciosVolumen.length > 0) {
        const cantidad = Number(itemCarrito?.cantidad) || 0;
        const rangosValidos = preciosVolumen.filter((pv: any) =>
          pv?.numeroUnidadesInicial !== undefined && pv?.numeroUnidadesInicial !== null &&
          pv?.numeroUnidadesLimite !== undefined && pv?.numeroUnidadesLimite !== null
        );
        const rangoActual = rangosValidos.find((pv: any) =>
          cantidad >= Number(pv.numeroUnidadesInicial) && cantidad <= Number(pv.numeroUnidadesLimite)
        );
        precioSinIva = this.tierSinIva(rangoActual, precio);
      } else {
        precioSinIva = Number(precio?.precioUnitarioSinIva) || 0;
      }
      return precioSinIva * (1 + itemCarrito._ivaManualOverride / 100);
    }
    // Feature B — precio promocional automático de catálogo (con IVA ya rebajado).
    // Precedencia: overrides manuales > precio por categoría de cliente > promoción.
    if (!itemCarrito.producto?._precioAplicadoPorCategoria && this.tienePromo(itemCarrito.producto)) {
      return Number(itemCarrito.producto.precioPromocional) || 0;
    }
    return this.getProductPriceWithScale(itemCarrito);
  }

  /**
   * Sin-IVA robusto de un tier de volumen: usa el campo almacenado y, si falta o es 0,
   * lo deriva de `valorUnitarioPorVolumenConIVA / (1 + valorIVAPorVolumen/100)`. Evita que
   * un dato legacy sin `valorUnitarioPorVolumenSinIVA` colapse al precio de 1 unidad cuando
   * se cambia el IVA de una línea con precio por volumen.
   */
  private tierSinIva(rango: any, precioFallback: any): number {
    const sinIva = Number(rango?.valorUnitarioPorVolumenSinIVA) || 0;
    if (sinIva > 0) return sinIva;
    const conIva =
      Number(rango?.valorUnitarioPorVolumenConIVA) ||
      Number(rango?.valorUnitarioPorVolumenIva) ||
      0;
    const tierIva = Number(rango?.valorIVAPorVolumen) || 0;
    if (conIva > 0) return conIva / (1 + tierIva / 100);
    return Number(precioFallback?.precioUnitarioSinIva) || 0;
  }

  /**
   * Feature B — el producto trae un precio promocional vigente (inyectado por el
   * backend del catálogo) y realmente menor que el precio estándar con IVA.
   */
  tienePromo(producto: any): boolean {
    const promo = producto?.precioPromocional;
    const base = producto?.precio?.precioUnitarioConIva;
    return typeof promo === 'number' && typeof base === 'number' && promo < base;
  }

  permitePrecioManual(itemCarrito: any): boolean {
    return itemCarrito?.producto?.procesoComercial?.permitePrecioManual === true;
  }

  onPrecioManualInput(itemCarrito: any, value: any): void {
    if (!itemCarrito) return;
    // Guardar valor temporal tal cual (permite vacío mientras escribe)
    itemCarrito._precioManualTemp = value;
    if (value !== '' && value !== null && value !== undefined) {
      itemCarrito._precioManualOverride = Number(value);
    }
  }

  onPrecioManualConfirm(itemCarrito: any): void {
    if (!itemCarrito) return;
    const temp = itemCarrito._precioManualTemp;
    // Si quedó vacío o inválido, restaurar al precio original
    if (temp === '' || temp === null || temp === undefined || isNaN(Number(temp)) || Number(temp) < 0) {
      itemCarrito._precioManualOverride = undefined;
    } else {
      itemCarrito._precioManualOverride = Number(temp);
    }
    delete itemCarrito._precioManualTemp;
    this.carsingleton.updateProductQuantity(itemCarrito);
  }

  getPrecioSinIva(itemCarrito: any): number {
    const precioConIva = this.checkPriceScale(itemCarrito);
    const porcentajeIva = this.getIvaActual(itemCarrito);
    return precioConIva / (1 + porcentajeIva / 100);
  }

  getValorIva(itemCarrito: any): number {
    const precioConIva = this.checkPriceScale(itemCarrito);
    return precioConIva - this.getPrecioSinIva(itemCarrito);
  }

  getIvaActual(itemCarrito: any): number {
    if (itemCarrito._ivaManualOverride !== undefined && itemCarrito._ivaManualOverride !== null) {
      return itemCarrito._ivaManualOverride;
    }
    return Number(itemCarrito?.producto?.precio?.precioUnitarioIva) || 0;
  }

  onIvaManualChange(itemCarrito: any, value: any): void {
    if (!itemCarrito) return;
    const iva = Number(value);
    if (isNaN(iva) || iva < 0) return;
    itemCarrito._ivaManualOverride = iva;
    this.carsingleton.updateProductQuantity(itemCarrito);
  }

  checkAditionPrice(item: any): boolean {
    if (!item?.configuracion?.adiciones) return false;
    return item.configuracion.adiciones.some(adicion => 
      adicion?.referencia?.precioTotal > 0
    );
  }

  checkPreferencePrice(item: any): boolean {
    if (!item?.configuracion?.preferencias) return false;
    return item.configuracion.preferencias.some(preferencia => 
      preferencia?.precioTotalConIva > 0
    );
  }

  getTotalProductPriceWithDescountInCart(): number {
    const total = this.getTotalProductPriceInCart();
    return total - this.valorDescuento;
  }

  menosCantidad(itemCarrito: any): void {
    if (!itemCarrito || !itemCarrito.producto?.disponibilidad) return;

    const cantidadMinima = itemCarrito.producto.disponibilidad.cantidadMinVenta || 1;
    if (itemCarrito.cantidad > cantidadMinima) {
      itemCarrito.cantidad--;
      this.updateCartAndCheckPriceScale(itemCarrito);
    }
  }

  masCantidad(itemCarrito: any): void {
    if (!itemCarrito) return;
    itemCarrito.cantidad++;
    this.updateCartAndCheckPriceScale(itemCarrito);
  }

  // Recalcular en tiempo real mientras el usuario escribe
  onCantidadInputChange(itemCarrito: any, value: any): void {
    if (!itemCarrito) return;

    // Permitir campo vacío temporalmente sin recalcular
    if (value === '' || value === null || value === undefined) {
      itemCarrito.cantidad = value;
      return;
    }

    // Dejar que el usuario termine de escribir; solo guardar el valor raw.
    // La validación contra el mínimo se hace en blur/enter (onCantidadChange).
    const cantidadNormalizada = Math.floor(Number(value));
    if (isNaN(cantidadNormalizada) || cantidadNormalizada <= 0) {
      itemCarrito.cantidad = value;
      return;
    }

    itemCarrito.cantidad = cantidadNormalizada;
  }

  onCantidadChange(itemCarrito: any): void {
    if (!itemCarrito) return;

    // Convertir a número entero
    const nuevaCantidad = parseInt(itemCarrito.cantidad);
    
    // Validar que sea un número válido
    if (isNaN(nuevaCantidad) || nuevaCantidad <= 0) {
      // Restaurar cantidad anterior o cantidad mínima
      const cantidadMinima = itemCarrito.producto?.disponibilidad?.cantidadMinVenta || 1;
      itemCarrito.cantidad = cantidadMinima;
      this.toastrService.error('Por favor ingrese una cantidad válida', 'Error');
      return;
    }

    // Validar cantidad mínima
    const cantidadMinima = itemCarrito.producto?.disponibilidad?.cantidadMinVenta || 1;
    if (nuevaCantidad < cantidadMinima) {
      itemCarrito.cantidad = cantidadMinima;
      this.toastrService.warning(
        `La cantidad mínima para este producto es ${cantidadMinima}`, 
        'Cantidad mínima'
      );
      return;
    }

    // Actualizar cantidad y aplicar lógica de precio por volumen
    itemCarrito.cantidad = nuevaCantidad;
    this.updateCartAndCheckPriceScale(itemCarrito);
  }

  private updateCartAndCheckPriceScale(itemCarrito: any): void {
    // Solo actualizar el carrito singleton, no localStorage
    this.carsingleton.updateProductQuantity(itemCarrito);

    const rangoActual = this.getCurrentPriceRange(itemCarrito);
    if (rangoActual?.numeroUnidadesInicial && 
        this.rangoPreciosActual1?.numeroUnidadesInicial !== rangoActual.numeroUnidadesInicial) {
      this.toastrService.show(
        '<p class="mb-0 mt-1">Cambio de rango de precio!</p>',
        '',
        { closeButton: true, enableHtml: true, positionClass: 'toast-bottom-right', timeOut: 1000 }
      );
      this.rangoPreciosActual1 = rangoActual;
    }
  }

  private getCurrentPriceRange(itemCarrito: any): any {
    const preciosVolumen = itemCarrito?.producto?.precio?.preciosVolumen;
    if (!Array.isArray(preciosVolumen)) return null;
    
    const cantidad = Number(itemCarrito?.cantidad) || 0;
    
    // ✅ CORREGIDO: Filtrar solo rangos con límites válidos definidos
    const rangosValidos = preciosVolumen.filter((x: any) => {
      const tieneMinimo = x?.numeroUnidadesInicial !== undefined && x?.numeroUnidadesInicial !== null;
      const tieneMaximo = x?.numeroUnidadesLimite !== undefined && x?.numeroUnidadesLimite !== null;
      return tieneMinimo && tieneMaximo;
    });
    
    return rangosValidos.find((x: any) => {
      const min = Number(x.numeroUnidadesInicial) || 0;
      const max = Number(x.numeroUnidadesLimite) || Infinity;
      return cantidad >= min && cantidad <= max;
    });
  }

  /**
   * Valida el código contra el módulo Descuentos y Promociones
   * (/v1/descuentos-promociones/aplicar-codigo) y lo aplica al carrito.
   * El resultado se guarda en this.pedido.descuentoAplicado para que el backend
   * registre la redención al crear la orden.
   */
  validarCuponYAplica(): void {
    if (!this.cupon) {
      Swal.fire({ icon: 'error', title: 'Error', text: 'Por favor ingrese un código de descuento' });
      return;
    }

    const totalCarrito = this.getTotalProductPriceInCart();
    const clienteId =
      this.pedido?.cliente?.documento ||
      this.pedido?.cliente?.correo_electronico_comprador ||
      '';

    this.aplicandoCupon = true;
    this.service.aplicarCodigoDescuento({
      codigoPersonalizado: this.cupon,
      clienteId,
      totalCarrito,
      // Un solo código a la vez en este flujo; si ya hay uno, se reemplaza.
      codigosActivos: [],
      // Líneas del carrito → el backend aplica el descuento solo a la
      // categoría/producto objetivo cuando el código es dirigido ("Aplica a").
      items: this.construirItemsCarrito(),
    }).subscribe({
      next: (res) => {
        this.aplicandoCupon = false;
        if (!res || !res.descuentoId) {
          Swal.fire({ icon: 'error', title: 'Código no válido', text: 'No se pudo aplicar el código' });
          return;
        }
        this.aplicarResultadoDescuento(res);
      },
      error: (err) => {
        this.aplicandoCupon = false;
        const msg = err?.error?.message || 'No se pudo aplicar el código';
        Swal.fire({ icon: 'error', title: 'Código no válido', text: msg });
      },
    });
  }

  /**
   * Mapea la respuesta del backend a los campos de descuento del pedido según el
   * tipo. El backend recalcula totales: usa porceDescuento si es porcentaje, o
   * totalDescuento (monto fijo) en caso contrario.
   */
  private aplicarResultadoDescuento(res: any): void {
    const monto = Number(res.montoDescuento) || 0;

    this.descuentoAplicado = {
      descuentoId: res.descuentoId,
      codigoPersonalizado: res.codigoPersonalizado || this.cupon.toUpperCase(),
      tipo: res.tipo,
      valor: Number(res.valor) || 0,
      montoDescuento: monto,
      nombre: res.nombre || '',
      clienteId:
        this.pedido?.cliente?.documento ||
        this.pedido?.cliente?.correo_electronico_comprador ||
        '',
    };

    // Persistir en el pedido para que viaje a /orders/create.
    this.pedido.descuentoAplicado = this.descuentoAplicado;
    this.pedido.cuponAplicado = this.descuentoAplicado.codigoPersonalizado;

    // Un código DIRIGIDO (categoría/producto) trae `monto` ya calculado SOLO
    // sobre la base elegible. Debe mapearse como monto fijo para que el backend
    // NO lo recalcule como porcentaje sobre todo el carrito (sobre-aplicaría).
    const esDirigido = res.aplicaA && res.aplicaA !== 'todos_los_productos';

    if (res.tipo === 'porcentaje' && !esDirigido) {
      // Porcentaje sobre todo el carrito: el backend recalcula por porcentaje.
      this.porcentajeDescuento = Number(res.valor) || 0;
      this.pedido.porceDescuento = this.porcentajeDescuento;
      this.pedido.totalDescuento = monto;
      this.valorDescuento = monto;
    } else if (res.tipo === 'envio_gratis') {
      // El descuento sobre productos es 0. G2 (spec 010): el envío gratis lleva el
      // costo de envío a cero. Se cerea aquí para el display inmediato; los setters
      // de envío (checkout/facturación) y el backend respetan el mismo flag
      // (pedido.descuentoAplicado.tipo === 'envio_gratis') sin importar el orden.
      this.porcentajeDescuento = 0;
      this.pedido.porceDescuento = 0;
      this.pedido.totalDescuento = 0;
      this.valorDescuento = 0;
      this.pedido.totalEnvio = 0;
    } else {
      // valor_fijo, o CUALQUIER código dirigido (categoría/producto): el monto
      // ya viene calculado sobre la base elegible → tratar como monto fijo.
      this.porcentajeDescuento = 0;
      this.pedido.porceDescuento = 0;
      this.pedido.totalDescuento = monto;
      this.valorDescuento = monto;
    }

    const detalle =
      res.tipo === 'envio_gratis'
        ? 'Envío gratis aplicado.'
        : `Descuento aplicado: ${monto.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })}`;
    this.toastrService.success(detalle, res.nombre || 'Código aplicado');
  }

  /**
   * Construye las líneas del carrito para el enforcement de "Aplica a" en el
   * backend: por cada ítem, su referencia, sus categorías (nombres) y el precio
   * total de la línea. Reusa el mismo cálculo de getTotalProductPriceInCart.
   */
  private construirItemsCarrito(): Array<{ productoReferencia: string; categorias: string[]; precioLinea: number; enPromocion: boolean }> {
    if (!this.productos || this.productos.length === 0) return [];
    return this.productos.map((item) => {
      const precioBase = Number(this.checkPriceScale(item)) || 0;
      const precioAdiciones = Number(this.calculateAdicionesPrice(item?.configuracion?.adiciones)) || 0;
      const precioPreferencias = Number(this.calculatePreferenciasPrice(item?.configuracion?.preferencias)) || 0;
      const cantidad = Number(item?.cantidad) || 0;
      const precioLinea = (precioBase + precioAdiciones + precioPreferencias) * cantidad;
      return {
        productoReferencia: item?.producto?.identificacion?.referencia || '',
        categorias: this.resolverCategoriasProducto(item?.producto),
        precioLinea: isNaN(precioLinea) ? 0 : precioLinea,
        // Feature B / Fase 4 (D-B2): marca las líneas ya en promoción para que el
        // backend NO acumule el código sobre ellas.
        enPromocion: this.tienePromo(item?.producto),
      };
    });
  }

  /**
   * Extrae los nombres de categoría de un producto de forma tolerante al
   * formato (string flatted, objeto ya parseado, o el shape [ref, {label}]).
   * Devuelve nombres en minúscula; [] si no se puede resolver.
   */
  private resolverCategoriasProducto(prod: any): string[] {
    const raw = prod?.categorias ?? prod?.crearProducto?.categorias;
    if (!raw) return [];
    let arbol: any = raw;
    if (typeof raw === 'string') {
      try { arbol = flattedParse(raw); } catch { try { arbol = JSON.parse(raw); } catch { return []; } }
    }
    const nombres = new Set<string>();
    const visitar = (nodo: any) => {
      if (!nodo || typeof nodo !== 'object') return;
      const n = nodo?.data?.nombre ?? nodo?.nombre ?? nodo?.label;
      if (n && typeof n === 'string') nombres.add(n.trim().toLowerCase());
      if (Array.isArray(nodo?.children)) nodo.children.forEach(visitar);
    };
    if (Array.isArray(arbol)) arbol.forEach(visitar);
    else visitar(arbol);
    return Array.from(nombres);
  }

  /** Quita el descuento aplicado y limpia los campos del pedido. */
  quitarDescuento(): void {
    this.descuentoAplicado = null;
    this.cupon = '';
    this.valorDescuento = 0;
    this.porcentajeDescuento = 0;
    if (this.pedido) {
      this.pedido.descuentoAplicado = undefined;
      this.pedido.cuponAplicado = undefined;
      this.pedido.porceDescuento = 0;
      this.pedido.totalDescuento = 0;
    }
    this.toastrService.info('Descuento removido', '');
  }
  
  // Método para mostrar las notas existentes
  mostrarNotasExistentes(producto: any): void {
    // Obtener notas del producto desde el pedido centralizado
    const notasDelProducto = this.obtenerNotasDelProducto(producto);
    
    if (!notasDelProducto || notasDelProducto.length === 0) {
      this.toastrService.info('Este producto no tiene notas de producción', 'Información');
      return;
    }
    
    let notasHtml = '';
    notasDelProducto.forEach((nota, index) => {
      const descripcion = nota.descripcion || nota.nota || '';
      const fecha = nota.fecha ? new Date(nota.fecha).toLocaleString() : '';
      
      notasHtml += `
        <div class="note-item mb-2 p-2 border-bottom">
          <div class="d-flex justify-content-between">
            <span class="note-number fw-bold">${index + 1}</span>
            <span class="note-actions">
              <button type="button" class="btn btn-sm btn-outline-danger delete-nota" data-index="${index}">
                <i class="pi pi-trash"></i>
              </button>
            </span>
          </div>
          <div class="note-content mt-1">${descripcion}</div>
          ${fecha ? `<div class="note-date text-muted"><small>${fecha}</small></div>` : ''}
        </div>
      `;
    });
    
    Swal.fire({
      title: 'Notas de Producción',
      html: `
        <div class="product-title mb-3 fw-bold">
          ${producto?.producto?.crearProducto?.titulo || 'Producto'}
        </div>
        <div class="notes-container" style="max-height: 300px; overflow-y: auto; text-align: left;">
          ${notasHtml}
        </div>
      `,
      showConfirmButton: true,
      confirmButtonText: 'Cerrar',
      width: '600px',
      didOpen: () => {
        // Agregar event listeners para los botones de eliminar
        document.querySelectorAll('.delete-nota').forEach(button => {
          button.addEventListener('click', (e) => {
            const target = e.currentTarget as HTMLElement;
            const index = parseInt(target.getAttribute('data-index') || '0');
            this.eliminarNotaProduccion(producto, index);
            Swal.close();
          });
        });
      }
    });
  }

  // Obtener notas específicas de un producto desde el pedido centralizado
  private obtenerNotasDelProducto(producto: any): any[] {
    if (!this.pedido?.notasPedido?.notasProduccion) {
      return [];
    }

    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;

    return this.pedido.notasPedido.notasProduccion.filter(nota => {
      // Filtrar por ID del producto o por título si no hay ID
      return (nota as any).productoId === productoId || 
             (nota as any).producto === productoTitulo;
    });
  }

  // Contar notas de un producto específico
  contarNotasDelProducto(producto: any): number {
    return this.obtenerNotasDelProducto(producto).length;
  }
  
  eliminarNotaProduccion(producto: any, index: number): void {
    const notasDelProducto = this.obtenerNotasDelProducto(producto);
    if (index < 0 || index >= notasDelProducto.length) return;

    // Encontrar el índice real en el array completo de notas
    const notaAEliminar = notasDelProducto[index];
    const indiceRealEnPedido = this.pedido?.notasPedido?.notasProduccion
      ? this.pedido.notasPedido.notasProduccion.findIndex(nota => nota === notaAEliminar)
      : -1;
    
    if (indiceRealEnPedido !== -1 && this.pedido?.notasPedido?.notasProduccion) {
      this.pedido.notasPedido.notasProduccion.splice(indiceRealEnPedido, 1);
    }
    
    // Emitir evento de actualización
    this.notaAgregada.emit({
      pedido: this.pedido,
      accion: 'eliminar',
      producto: producto
    });
    
    // Mostrar mensaje de éxito
    this.toastrService.success('Nota de producción eliminada correctamente', 'Éxito');
  }

  // Método para limpiar datos fantasma del localStorage
  private limpiarDatosFantasma(): void {
    console.log('🧹 Limpiando datos fantasma del carrito...');
    
    const carritoGuardado = localStorage.getItem('carrito');
    if (carritoGuardado) {
      try {
        const carrito = JSON.parse(carritoGuardado);
        if (Array.isArray(carrito)) {
          let huboLimpieza = false;
          
          // Limpiar propiedades obsoletas de cada producto
          carrito.forEach(producto => {
            if (producto.notaProduccion) {
              console.log('🧹 Removiendo notaProduccion obsoleta de:', producto.producto?.crearProducto?.titulo);
              delete producto.notaProduccion;
              huboLimpieza = true;
            }
          });
          
          // Si hubo limpieza, actualizar localStorage
          if (huboLimpieza) {
            localStorage.setItem('carrito', JSON.stringify(carrito));
            console.log('✅ Datos fantasma del carrito limpiados');
          }
        }
      } catch (error) {
        console.error('Error al limpiar datos fantasma:', error);
        // Si hay error, limpiar completamente el carrito
        localStorage.removeItem('carrito');
      }
    }
  }
}
