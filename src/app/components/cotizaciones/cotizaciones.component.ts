import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';

import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { VentasService } from '../../shared/services/ventas/ventas.service';
import { CotizacionesService } from './cotizaciones.service';
import { ToastrService } from 'ngx-toastr';

import { Producto } from '../../shared/models/productos/Producto';
import { Cliente } from '../ventas/modelo/pedido';

import Swal from 'sweetalert2';
import * as jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { Observable, of, firstValueFrom, Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { PosCheckoutService } from '../../shared/services/ventas/pos-checkout.service';

// Enumeraciones según la API
export enum EstadoCotizacion {
  Borrador = "Borrador",
  Enviada = "Enviada", 
  Aprobada = "Aprobada",
  Rechazada = "Rechazada",
  Expirada = "Expirada",
  Convertida = "Convertida"
}

export interface CotizacionItem {
  producto: any;                         // Producto completo
  cantidad: number;
  precio: number;                        // Para compatibilidad con código existente
  precioOriginal: number;                // Para compatibilidad con código existente
  subtotal: number;                      // Para compatibilidad con código existente
  descuento?: number;                    // Porcentaje de descuento (según API)
  configuracion?: any;                   // Configuraciones específicas
  notaProduccion?: string[];             // Notas de producción
  descuentoVolumen?: {                   // Para compatibilidad con código existente
    aplicado: boolean;
    porcentaje: number;
    ahorro: number;
    rangoInicial: number;
    rangoFinal: number;
  };
}

export interface Cotizacion {
  id?: string;                           // ID generado automáticamente
  nroCotizacion?: string;                // Número consecutivo (COT-2024-000001)
  numero?: string;                       // Alias para nroCotizacion (compatibilidad)
  fechaCreacion?: string;                // ISO DateTime
  fechaVencimiento?: string;             // ISO DateTime
  fecha: string;                         // Para compatibilidad con código existente
  company?: string;                      // Empresa propietaria
  
  // Cliente
  cliente?: any;
  
  // Items cotizados
  items: CotizacionItem[];
  
  // Estados
  estadoCotizacion?: 'Borrador' | 'Enviada' | 'Aprobada' | 'Rechazada' | 'Expirada' | 'Convertida';
  estado: 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida';  // Para compatibilidad
  
  // Totales financieros
  subtotal: number;
  totalImpuesto?: number;
  impuestos: number;                     // Alias para totalImpuesto
  totalDescuento?: number;
  descuento: number;                     // Alias para totalDescuento
  total: number;
  
  // Metadatos
  asesorAsignado?: any;
  validezDias?: number;                  // Días de validez (default: 30)
  validez: string;                       // Para compatibilidad con código existente
  observaciones?: string;
  
  // Conversión a pedido
  convertidaAPedido?: boolean;
  pedidoGenerado?: string;               // ID del pedido creado
  
  // Campos de auditoría
  date_edit?: string;
  user_edit?: string;
}

@Component({
  selector: 'app-cotizaciones',
  templateUrl: './cotizaciones.component.html',
  styleUrls: ['./cotizaciones.component.scss']
})
export class CotizacionesComponent implements OnInit, OnDestroy {

  @ViewChild('buscarPor') buscarPor!: ElementRef;
  @ViewChild('documentoBusqueda') documentoBusqueda!: ElementRef;
  @ViewChild('cotizacionPDF') cotizacionPDF!: ElementRef;

  public isLoading: boolean = false;
  public currentStep: number = 1;
  public totalSteps: number = 1;
  public isEditing: boolean = false;

  public clienteForm!: FormGroup;
  public cotizacionForm!: FormGroup;

  public cliente: any = null;
  public clienteEncontrado: boolean = false;
  public bloqueado: boolean = false;

  public productos: any[] = [];
  public productosFiltrados: any[] = [];
  public categorias: any[] = [];
  public searchTerm: string = '';
  public selectedCategory: string = '';

  // Paginación del API
  public currentPage: number = 1;
  public pageSize: number = 50; // Cargar más productos por página
  public totalItems: number = 0;
  public totalPages: number = 0;
  public hasNextPage: boolean = false;
  public hasPreviousPage: boolean = false;
  public isLoadingMore: boolean = false;

  // Paginación de la vista
  public currentViewPage: number = 1;
  public itemsPerViewPage: number = 12; // Productos por página en la vista
  public totalViewPages: number = 0;
  public productosPaginados: any[] = [];

  // Variables para fechas
  public fechaActual: number = Date.now();
  public fechaHoy: string = new Date().toISOString().split('T')[0];

  public items: CotizacionItem[] = [];
  public subtotal: number = 0;
  public impuestos: number = 0;
  public descuento: number = 0;
  public total: number = 0;

  public porcentajeImpuesto: number = 19;
  public porcentajeDescuento: number = 0;

  public cotizacion: Cotizacion = {
    fecha: new Date().toISOString().split('T')[0],
    cliente: null,
    items: [],
    subtotal: 0,
    impuestos: 0,
    descuento: 0,
    total: 0,
    validez: '30',
    estado: 'borrador'
  };

  public listView: boolean = false;
  public col: string = '3';

  public empresaActual: any;

  // Subject para manejar la búsqueda con debounce
  private searchSubject = new Subject<string>();

  // Variables para el envío de correo
  emailForm: FormGroup;
  enviandoCorreo = false;

  constructor(
    private formBuilder: FormBuilder,
    private maestroService: MaestroService,
    private ventasService: VentasService,
    private cotizacionesService: CotizacionesService,
    private toastrService: ToastrService,
    private route: ActivatedRoute,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private posCheckoutService: PosCheckoutService,
    private modalService: NgbModal
  ) {
    this.initForms();
    this.setupSearchSubscription();
    this.inicializarFormularios();
  }

  ngOnInit(): void {
    this.inicializar();

    // Suscribirse a cambios de cliente desde la sección compacta POS
    this.posCheckoutService.customer$.subscribe((customer) => {
      if (customer) {
        this.cliente = customer;
        this.clienteEncontrado = true;
        
        // Actualizar la cotización con los datos del cliente
        this.cotizacion.cliente = customer;
        
        console.log('Cliente seleccionado:', customer);
        console.log('Email del cliente:', customer.correo_electronico_comprador || customer.correo_electronico);
      }
    });
  }

  /**
   * Inicializa el componente en el orden correcto
   */
  private async inicializar(): Promise<void> {
    try {
      // Primero cargar los datos base (productos, categorías, empresa)
      await this.cargarDatos();
      
      // Verificar si hay datos de cotización duplicada
      this.verificarCotizacionDuplicada();
      
      // Luego verificar si estamos en modo edición y cargar la cotización
      this.verificarModoEdicion();
      
    } catch (error) {
      console.error('Error en inicialización:', error);
      this.toastrService.error('Error al inicializar el componente');
    }
  }

  /**
   * Verifica si hay datos de cotización duplicada en el state
   */
  private verificarCotizacionDuplicada(): void {
    const navigation = this.router.getCurrentNavigation();
    if (navigation?.extras?.state?.cotizacionDuplicada) {
      const cotizacionDuplicada = navigation.extras.state.cotizacionDuplicada;
      this.cargarCotizacionDuplicada(cotizacionDuplicada);
    }
  }

  /**
   * Carga los datos de una cotización duplicada
   */
  private cargarCotizacionDuplicada(cotizacionData: any): void {
    // Asignar los datos de la cotización duplicada
    this.cotizacion = {
      ...cotizacionData,
      fecha: new Date().toISOString().split('T')[0],
      estado: 'borrador',
      estadoCotizacion: 'Borrador'
    };

    // Asignar el cliente
    if (cotizacionData.cliente) {
      this.cliente = cotizacionData.cliente;
      this.clienteEncontrado = true;
      
      // Parchear el formulario de cliente
      this.clienteForm.patchValue({
        tipo_documento: cotizacionData.cliente.tipo_documento_comprador || 'CC-NIT',
        documento: cotizacionData.cliente.documento || '',
        nombres_completos: cotizacionData.cliente.nombres_completos || '',
        numero_celular: cotizacionData.cliente.numero_celular_comprador || cotizacionData.cliente.numero_celular || '',
        correo_electronico: cotizacionData.cliente.correo_electronico_comprador || cotizacionData.cliente.correo_electronico || '',
        direccion: cotizacionData.cliente.direccion || '',
        ciudad: cotizacionData.cliente.ciudad || '',
        departamento: cotizacionData.cliente.departamento || '',
        pais: cotizacionData.cliente.pais || 'Colombia'
      });
    }

    // Asignar los items
    if (cotizacionData.items && cotizacionData.items.length > 0) {
      this.items = cotizacionData.items.map((item: any) => ({
        ...item,
        id: `item-${Date.now()}-${Math.random()}`
      }));
    }

    // Parchear el formulario de cotización
    this.cotizacionForm.patchValue({
      validez: cotizacionData.validez || '30',
      observaciones: cotizacionData.observaciones || '',
      porcentajeDescuento: this.porcentajeDescuento
    });

    // Recalcular totales
    this.calcularTotales();
    
    this.toastrService.success('Cotización duplicada cargada correctamente');
  }

  ngOnDestroy(): void {
    // Completar el subject para evitar memory leaks
    this.searchSubject.complete();
  }

  /**
   * Configura la suscripción para búsqueda con debounce
   */
  private setupSearchSubscription(): void {
    this.searchSubject.pipe(
      debounceTime(300), // Espera 300ms después de que el usuario deje de escribir
      distinctUntilChanged() // Solo procesa si el valor cambió
    ).subscribe(searchTerm => {
      this.searchTerm = searchTerm;
      this.ejecutarFiltrado();
    });
  }

  private initForms(): void {
    this.clienteForm = this.formBuilder.group({
      tipo_documento: ['CC-NIT', Validators.required],
      documento: ['', Validators.required],
      nombres_completos: ['', Validators.required],
      numero_celular: ['', [Validators.required, Validators.pattern(/^[0-9]{10}$/)]],
      correo_electronico: ['', [Validators.required, Validators.email]],
      direccion: [''],
      ciudad: [''],
      departamento: [''],
      pais: ['Colombia']
    });

    this.cotizacionForm = this.formBuilder.group({
      validez: ['30', Validators.required],
      observaciones: [''],
      porcentajeDescuento: [0, [Validators.min(0), Validators.max(100)]]
    });
  }

  private async cargarDatos(): Promise<void> {
    // Limpiar datos previos
    this.resetData();

    try {
      this.isLoading = true;
      
      // Cargar datos reales de la empresa desde sessionStorage
      this.cargarDatosEmpresa();
      
      await this.cargarProductos();
      await this.cargarCategorias();
      
    } catch (error) {
      console.error('Error cargando datos:', error);
      this.toastrService.error('Error al cargar los datos iniciales');
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Carga los datos de la empresa desde sessionStorage
   */
  private cargarDatosEmpresa(): void {
    const empresaStr = sessionStorage.getItem('currentCompany');
    if (empresaStr) {
      try {
        const empresa = JSON.parse(empresaStr);
        this.empresaActual = {
          id: empresa._id || empresa.id,
          nombre: empresa.nombre || empresa.nomComercial || 'Mi Empresa',
          nomComercial: empresa.nomComercial || empresa.nombre || 'Mi Empresa',
          direccion: empresa.direccion || empresa.direccionCompleta || 'Dirección de la empresa',
          telefono: empresa.telefono || empresa.fijo || empresa.celular || '123-456-7890',
          email: empresa.email || empresa.emailContactoGeneral || 'empresa@ejemplo.com',
          logo: empresa.logo || 'assets/images/logo/Katuq/katuq_dark.svg',
          nit: empresa.nit || '',
          ciudad: empresa.ciudad || '',
          pais: empresa.pais || ''
        };
      } catch (error) {
        console.error('Error al parsear datos de empresa:', error);
        this.empresaActual = {
          id: '1',
          nombre: 'Mi Empresa',
          nomComercial: 'Mi Empresa',
          direccion: 'Dirección de la empresa',
          telefono: '123-456-7890',
          email: 'empresa@ejemplo.com',
          logo: 'assets/images/logo/Katuq/katuq_dark.svg'
        };
      }
    } else {
      // Valores por defecto si no hay empresa en sessionStorage
      this.empresaActual = {
        id: '1',
        nombre: 'Mi Empresa',
        nomComercial: 'Mi Empresa',
        direccion: 'Dirección de la empresa',
        telefono: '123-456-7890',
        email: 'empresa@ejemplo.com',
        logo: 'assets/images/logo/Katuq/katuq_dark.svg'
      };
    }
  }

  private async verificarModoEdicion(): Promise<void> {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.isEditing = true;
      await this.cargarCotizacion(id);
      
      // Verificar si se debe generar PDF automáticamente
      const action = this.route.snapshot.queryParamMap.get('action');
      if (action === 'pdf') {
        setTimeout(() => {
          this.generarPDF();
        }, 1000); // Esperar a que se cargue completamente
      }
    }
  }

  private async cargarProductos(): Promise<void> {
    try {
      // Cargar solo las primeras páginas para empezar
      await this.cargarProductosPaginados(1);
      
      // Si estamos en modo edición, cargar todos los productos para asegurar que 
      // los productos de la cotización estén disponibles
      if (this.isEditing) {
        console.log('Modo edición detectado, cargando todos los productos...');
        await this.cargarTodasLasPaginas();
      } else {
        // En modo creación, cargar algunas páginas adicionales para tener más productos disponibles
        if (this.totalPages > 1) {
          const paginasACargar = Math.min(5, this.totalPages); // Cargar máximo 5 páginas
          const promesas: Promise<void>[] = [];
          
          for (let page = 2; page <= paginasACargar; page++) {
            promesas.push(this.cargarProductosPaginados(page));
          }
          
          await Promise.all(promesas);
        }
      }
      
      // Ejecutar filtrado inicial
      this.ejecutarFiltrado();
      
      console.log('🛍️ Productos cargados:', this.productos.length);
      console.log('📦 Ejemplo de producto:', this.productos[0]);
    } catch (error) {
      console.error('Error cargando productos:', error);
      this.toastrService.error('Error al cargar los productos');
    }
  }

  private async cargarProductosPaginados(page: number): Promise<void> {
    try {
      this.isLoadingMore = true;
      const response: any = await firstValueFrom(
        this.maestroService.getAllProductsPagination(this.pageSize, page)
      );

      if (response && response.products) {
        // En la primera página, inicializar el array
        if (page === 1) {
          this.productos = response.products;
        } else {
          // En páginas siguientes, agregar al array existente
          this.productos = [...this.productos, ...response.products];
        }

        // Actualizar información de paginación
        if (response.pagination) {
          this.totalItems = response.pagination.totalItems;
          this.totalPages = response.pagination.totalPages;
          this.hasNextPage = response.pagination.hasNextPage;
          this.hasPreviousPage = response.pagination.hasPreviousPage;
          this.currentPage = response.pagination.currentPage;
        }

        this.productosFiltrados = [...this.productos];
      }
    } catch (error) {
      console.error('Error cargando productos paginados:', error);
      throw error;
    } finally {
      this.isLoadingMore = false;
    }
  }

  private async cargarTodasLasPaginas(): Promise<void> {
    try {
      console.log(`Cargando todas las páginas (${this.totalPages} páginas)...`);
      
      // Cargar hasta 5 páginas simultáneamente para no sobrecargar el servidor
      const batchSize = 5;
      const promesas: Promise<void>[] = [];
      
      for (let page = 2; page <= Math.min(this.totalPages, batchSize + 1); page++) {
        promesas.push(this.cargarProductosPaginados(page));
      }
      
      await Promise.all(promesas);
      
      // Si hay más páginas, cargar el resto en lotes
      if (this.totalPages > batchSize + 1) {
        for (let startPage = batchSize + 2; startPage <= this.totalPages; startPage += batchSize) {
          const endPage = Math.min(startPage + batchSize - 1, this.totalPages);
          const batchPromesas: Promise<void>[] = [];
          
          for (let page = startPage; page <= endPage; page++) {
            batchPromesas.push(this.cargarProductosPaginados(page));
          }
          
          await Promise.all(batchPromesas);
          console.log(`Cargado lote de páginas ${startPage}-${endPage}`);
        }
      }
      
      console.log(`✅ Todas las páginas cargadas. Total productos: ${this.productos.length}`);
    } catch (error) {
      console.error('Error cargando todas las páginas:', error);
      // No lanzar error para no interrumpir el flujo
    }
  }

  private async cargarCategorias(): Promise<void> {
    try {
      const categoriasSet = new Set<string>();
      this.productos.forEach((p: any) => {
        // Extraer categoría correctamente del producto según la estructura real
        let categoria: string | null = null;
        
        // Intentar parsear categorias si es string JSON
        if (typeof p.categorias === 'string') {
          try {
            const categoriasArray = JSON.parse(p.categorias);
            if (Array.isArray(categoriasArray) && categoriasArray.length > 1) {
              categoria = categoriasArray[1]; // El segundo elemento suele ser el nombre
            }
          } catch (e) {
            // Si no se puede parsear, usar como string
            categoria = p.categorias;
          }
        } else if (p.categorias?.nombre) {
          categoria = p.categorias.nombre;
        } else if (p.categoria?.nombre) {
          categoria = p.categoria.nombre;
        } else if (p.categoria) {
          categoria = p.categoria;
        }
        
        if (categoria && typeof categoria === 'string' && categoria.trim() !== '') {
          categoriasSet.add(categoria.trim());
        }
      });
      
      this.categorias = Array.from(categoriasSet).map((nombre) => ({ nombre }));
      console.log('📂 Categorías cargadas:', this.categorias.length);
    } catch (error) {
      console.error('Error cargando categorías:', error);
    }
  }

  public async buscarCliente(): Promise<void> {
    const tipoBusqueda = this.buscarPor.nativeElement.value;
    const termino = this.documentoBusqueda.nativeElement.value.trim();

    if (!termino) {
      this.toastrService.warning('Ingrese un término de búsqueda');
      return;
    }

    try {
      this.isLoading = true;
      
      console.log('Buscando cliente:', tipoBusqueda, termino);
      
      this.clienteEncontrado = false;
      this.cliente = null;
      this.limpiarFormularioCliente();
      this.router.navigate(['/ventas/clientes']);
      
    } catch (error) {
      console.error('Error buscando cliente:', error);
      this.toastrService.error('Error al buscar el cliente');
      this.clienteEncontrado = false;
      this.cliente = null;
    } finally {
      this.isLoading = false;
    }
  }

  private llenarFormularioCliente(): void {
    if (this.cliente) {
      this.clienteForm.patchValue({
        tipo_documento: this.cliente.tipo_documento || 'CC-NIT',
        documento: this.cliente.documento,
        nombres_completos: this.cliente.nombres_completos,
        numero_celular: this.cliente.numero_celular,
        correo_electronico: this.cliente.correo_electronico,
        direccion: this.cliente.direccion || '',
        ciudad: this.cliente.ciudad || '',
        departamento: this.cliente.departamento || '',
        pais: this.cliente.pais || 'Colombia'
      });
    }
  }

  private limpiarFormularioCliente(): void {
    this.clienteForm.reset({
      tipo_documento: 'CC-NIT',
      pais: 'Colombia'
    });
  }

  public async guardarCliente(): Promise<void> {
    if (!this.clienteForm.valid) {
      this.toastrService.warning('Complete todos los campos requeridos');
      return;
    }

    try {
      this.isLoading = true;
      const datosCliente = this.clienteForm.value;

      console.log('Guardando cliente:', datosCliente);
      
      this.cliente = { ...datosCliente, id: Date.now().toString() };
      this.clienteEncontrado = true;
      this.cotizacion.cliente = this.cliente;
      this.toastrService.success('Cliente guardado correctamente');
      
    } catch (error) {
      console.error('Error guardando cliente:', error);
      this.toastrService.error('Error al guardar el cliente');
    } finally {
      this.isLoading = false;
    }
  }

  public filtrarProductos(): void {
    // Usar el subject para búsqueda con debounce cuando es por texto
    this.searchSubject.next(this.searchTerm);
  }

  /**
   * Ejecuta el filtrado real de productos
   */
  private ejecutarFiltrado(): void {
    this.productosFiltrados = this.productos.filter(producto => {
      // Extraer nombre correctamente del producto según la estructura real
      const nombre = producto.crearProducto?.titulo || 
                    producto.identificacion?.referencia || 
                    producto.nombre || 
                    '';
      
      // Extraer código/ID correctamente del producto
      const codigo = producto.identificacion?.referencia || 
                    producto.cd || 
                    producto.id || 
                    '';
      
      const matchesSearch = !this.searchTerm || 
        nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        codigo.toLowerCase().includes(this.searchTerm.toLowerCase());
      
      // Extraer categoría correctamente del producto
      let categoria = '';
      if (typeof producto.categorias === 'string') {
        try {
          const categoriasArray = JSON.parse(producto.categorias);
          if (Array.isArray(categoriasArray) && categoriasArray.length > 1) {
            categoria = categoriasArray[1];
          }
        } catch (e) {
          categoria = producto.categorias;
        }
      } else if (producto.categorias?.nombre) {
        categoria = producto.categorias.nombre;
      } else if (producto.categoria?.nombre) {
        categoria = producto.categoria.nombre;
      } else if (producto.categoria) {
        categoria = producto.categoria;
      }
      
      const matchesCategory = !this.selectedCategory || 
        categoria === this.selectedCategory;

      return matchesSearch && matchesCategory;
    });

    // Actualizar paginación de la vista
    this.actualizarPaginacionVista();
  }

  /**
   * Actualiza la paginación de la vista
   */
  private actualizarPaginacionVista(): void {
    this.totalViewPages = Math.ceil(this.productosFiltrados.length / this.itemsPerViewPage);
    
    // Asegurar que la página actual esté dentro del rango
    if (this.currentViewPage > this.totalViewPages) {
      this.currentViewPage = 1;
    }
    
    // Calcular productos de la página actual
    const startIndex = (this.currentViewPage - 1) * this.itemsPerViewPage;
    const endIndex = startIndex + this.itemsPerViewPage;
    this.productosPaginados = this.productosFiltrados.slice(startIndex, endIndex);
  }

  /**
   * Cambiar página de la vista
   */
  public cambiarPaginaVista(pagina: number): void {
    if (pagina >= 1 && pagina <= this.totalViewPages) {
      this.currentViewPage = pagina;
      this.actualizarPaginacionVista();
    }
  }

  /**
   * Ir a la página anterior
   */
  public paginaAnterior(): void {
    if (this.currentViewPage > 1) {
      this.cambiarPaginaVista(this.currentViewPage - 1);
    }
  }

  /**
   * Ir a la página siguiente
   */
  public paginaSiguiente(): void {
    if (this.currentViewPage < this.totalViewPages) {
      this.cambiarPaginaVista(this.currentViewPage + 1);
    }
  }

  /**
   * Filtrar por categoría (sin debounce)
   */
  public filtrarPorCategoria(): void {
    this.ejecutarFiltrado();
  }

  /**
   * Limpiar búsqueda
   */
  public limpiarBusqueda(): void {
    this.searchTerm = '';
    this.ejecutarFiltrado();
  }

  public agregarProducto(producto: any): void {
    const existingItem = this.items.find(item => item.producto.cd === producto.cd);
    
    if (existingItem) {
      existingItem.cantidad += 1;
      this.actualizarPrecioConVolumen(existingItem);
    } else {
      // Extraer precio original del producto
      const precioOriginal = producto.precio?.precioUnitarioConIva || 
                           producto.precio?.precioUnitario || 
                           producto.precio || 
                           0;
      
      const nuevoItem: CotizacionItem = {
        producto: producto,
        cantidad: 1,
        precio: precioOriginal,
        precioOriginal: precioOriginal,
        subtotal: precioOriginal
      };
      
      this.actualizarPrecioConVolumen(nuevoItem);
      this.items.push(nuevoItem);
    }

    this.calcularTotales();
    
    // Usar el nombre del producto correctamente según la estructura real
    const nombreProducto = producto.crearProducto?.titulo || 
                          producto.identificacion?.referencia || 
                          producto.nombre || 
                          'Producto';
    
    this.toastrService.success(`${nombreProducto} agregado a la cotización`);
  }

  public actualizarCantidad(index: number, nuevaCantidad: number): void {
    if (nuevaCantidad <= 0) {
      this.eliminarItem(index);
      return;
    }

    this.items[index].cantidad = nuevaCantidad;
    this.actualizarPrecioConVolumen(this.items[index]);
    this.calcularTotales();
  }

  /**
   * Actualiza el precio del item considerando descuentos por volumen
   */
  private actualizarPrecioConVolumen(item: CotizacionItem): void {
    const producto = item.producto;
    const cantidad = item.cantidad;
    
    // Resetear descuento
    item.descuentoVolumen = {
      aplicado: false,
      porcentaje: 0,
      ahorro: 0,
      rangoInicial: 0,
      rangoFinal: 0
    };

    // Verificar si el producto tiene precios por volumen
    if (producto.precio?.preciosVolumen && producto.precio.preciosVolumen.length > 0) {
      const rangoActual = producto.precio.preciosVolumen.find((rango: any) =>
        cantidad >= rango.numeroUnidadesInicial && cantidad <= rango.numeroUnidadesLimite
      );

      if (rangoActual) {
        // Aplicar precio por volumen
        const precioConVolumen = rangoActual.valorUnitarioPorVolumenConIVA || rangoActual.valorUnitarioPorVolumenSinIVA || item.precioOriginal;
        const ahorroUnitario = item.precioOriginal - precioConVolumen;
        const ahorroTotal = ahorroUnitario * cantidad;
        const porcentajeDescuento = ((ahorroUnitario / item.precioOriginal) * 100);

        item.precio = precioConVolumen;
        item.subtotal = precioConVolumen * cantidad;
        item.descuentoVolumen = {
          aplicado: true,
          porcentaje: porcentajeDescuento,
          ahorro: ahorroTotal,
          rangoInicial: rangoActual.numeroUnidadesInicial,
          rangoFinal: rangoActual.numeroUnidadesLimite
        };
      } else {
        // Usar precio original
        item.precio = item.precioOriginal;
        item.subtotal = item.precioOriginal * cantidad;
      }
    } else {
      // No hay precios por volumen, usar precio original
      item.precio = item.precioOriginal;
      item.subtotal = item.precioOriginal * cantidad;
    }
  }

  /**
   * Obtiene información de descuentos disponibles para un producto
   */
  public obtenerDescuentosDisponibles(producto: any): any[] {
    if (!producto.precio?.preciosVolumen || producto.precio.preciosVolumen.length === 0) {
      return [];
    }

    return producto.precio.preciosVolumen.map((rango: any) => ({
      rangoInicial: rango.numeroUnidadesInicial,
      rangoFinal: rango.numeroUnidadesLimite,
      precioUnitario: rango.valorUnitarioPorVolumenConIVA || rango.valorUnitarioPorVolumenSinIVA,
      ahorroPorUnidad: (producto.precio?.precioUnitarioConIva || 0) - (rango.valorUnitarioPorVolumenConIVA || rango.valorUnitarioPorVolumenSinIVA || 0),
      porcentajeDescuento: (((producto.precio?.precioUnitarioConIva || 0) - (rango.valorUnitarioPorVolumenConIVA || rango.valorUnitarioPorVolumenSinIVA || 0)) / (producto.precio?.precioUnitarioConIva || 1)) * 100
    })).filter(desc => desc.ahorroPorUnidad > 0);
  }

  public eliminarItem(index: number): void {
    this.items.splice(index, 1);
    this.calcularTotales();
  }

  public calcularTotales(): void {
    this.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
    
    this.descuento = (this.subtotal * this.porcentajeDescuento) / 100;
    const subtotalConDescuento = this.subtotal - this.descuento;
    
    this.impuestos = (subtotalConDescuento * this.porcentajeImpuesto) / 100;
    this.total = subtotalConDescuento + this.impuestos;

    this.cotizacion.subtotal = this.subtotal;
    this.cotizacion.descuento = this.descuento;
    this.cotizacion.impuestos = this.impuestos;
    this.cotizacion.total = this.total;
    this.cotizacion.items = [...this.items];
  }

  /**
   * Obtiene el ahorro total por descuentos de volumen
   */
  public obtenerAhorroTotalVolumen(): number {
    return this.items.reduce((total, item) => {
      return total + (item.descuentoVolumen?.ahorro || 0);
    }, 0);
  }

  /**
   * Obtiene el subtotal sin descuentos de volumen (precio original)
   */
  public obtenerSubtotalSinDescuentosVolumen(): number {
    return this.items.reduce((total, item) => {
      return total + (item.precioOriginal * item.cantidad);
    }, 0);
  }

  public actualizarDescuento(): void {
    this.porcentajeDescuento = this.cotizacionForm.get('porcentajeDescuento')?.value || 0;
    this.calcularTotales();
  }

  public async guardarCotizacion(): Promise<void> {
    if (!this.cliente) {
      this.toastrService.error('Debe seleccionar un cliente');
      return;
    }

    if (this.items.length === 0) {
      this.toastrService.error('Debe agregar al menos un producto');
      return;
    }

    try {
      this.isLoading = true;
      
      // Actualizar datos de la cotización antes de guardar
      this.calcularTotales();
      
      // Preparar datos según el formato de la API
      const fechaVencimiento = new Date();
      fechaVencimiento.setDate(fechaVencimiento.getDate() + (parseInt(this.cotizacionForm.get('validez')?.value) || 30));
      
      // Obtener datos del usuario y empresa desde sessionStorage
      const userData = JSON.parse(sessionStorage.getItem('user') || '{}');
      const empresaData = JSON.parse(sessionStorage.getItem('empresa') || '{}');
      
      const cotizacionData = {
        cliente: {
          correo_electronico_comprador: this.cliente.correo_electronico_comprador || this.cliente.correo_electronico || '',
          nombres_completos: this.cliente.nombres_completos || '',
          apellidos_completos: this.cliente.apellidos_completos || '',
          documento: this.cliente.documento || '',
          tipo_documento_comprador: this.cliente.tipo_documento_comprador || 'CC',
          numero_celular_comprador: this.cliente.numero_celular_comprador || this.cliente.numero_celular || '',
          indicativo_celular_comprador: this.cliente.indicativo_celular_comprador || '+57',
          direccion: this.cliente.direccion || '',
          ciudad: this.cliente.ciudad || '',
          departamento: this.cliente.departamento || '',
          pais: this.cliente.pais || 'Colombia'
        },
        items: this.items.map(item => ({
          producto: item.producto,
          cantidad: item.cantidad,
          descuento: item.descuentoVolumen?.porcentaje || 0,
          configuracion: item.producto.configuracion || null,
          notaProduccion: []
        })),
        fechaVencimiento: fechaVencimiento.toISOString(),
        validezDias: parseInt(this.cotizacionForm.get('validez')?.value) || 30,
        formaDePago: 'Contado', // Por defecto, se puede hacer configurable
        observaciones: this.cotizacionForm.get('observaciones')?.value || '',
        asesorAsignado: userData.email ? {
          email: userData.email,
          name: userData.name || userData.nombres_completos || 'Asesor',
          nit: empresaData.nit || ''
        } : null
      };
      
      console.log('Datos a enviar a la API:', cotizacionData);
      
      let response;
      
      // Determinar si es creación o edición
      if (this.cotizacion.id && this.cotizacion.id !== `temp-${Date.now()}`) {
        // Es una edición
        const editData = {
          id: this.cotizacion.id,
          ...cotizacionData
        };
        response = await firstValueFrom(this.cotizacionesService.editarCotizacion(editData));
        console.log('Cotización editada:', response);
      } else {
        // Es una creación
        response = await firstValueFrom(this.cotizacionesService.crearCotizacion(cotizacionData));
        console.log('Cotización creada:', response);
      }
      
      if (response && response.success !== false) {
        // Asignar el ID y número devuelto por el backend
        if (response.data && response.data.id) {
          this.cotizacion.id = response.data.id;
          this.cotizacion.numero = response.data.nroCotizacion;
        } else if (response.id) {
          this.cotizacion.id = response.id;
          this.cotizacion.numero = response.nroCotizacion;
        } else if (!this.cotizacion.id) {
          // Si no hay ID del backend, generar uno temporal
          this.cotizacion.id = `temp-${Date.now()}`;
          this.cotizacion.numero = `COT-${Date.now()}`;
        }
        
        // Actualizar estado y otros campos
        this.cotizacion.estado = 'borrador';
        this.cotizacion.observaciones = cotizacionData.observaciones;
        this.cotizacion.validez = cotizacionData.validezDias.toString();
        this.cotizacion.cliente = this.cliente;
        
        console.log('Cotización guardada:', this.cotizacion);
        
        // Mostrar mensaje apropiado
        const mensaje = this.route.snapshot.paramMap.get('id') ? 'Cotización actualizada correctamente' : 'Cotización guardada correctamente';
        this.toastrService.success(mensaje);
        
        // Si es una nueva cotización, redirigir a edición para mantener el estado
        if (!this.route.snapshot.paramMap.get('id') && this.cotizacion.id) {
          this.router.navigate(['/cotizaciones/editar', this.cotizacion.id], { replaceUrl: true });
        }
        
      } else {
        throw new Error(response.message || 'Error al guardar la cotización');
      }
      
    } catch (error) {
      console.error('Error guardando cotización:', error);
      
      // En caso de error, asignar un ID temporal para permitir el envío por correo
      if (!this.cotizacion.id) {
        this.cotizacion.id = `temp-${Date.now()}`;
        this.cotizacion.numero = `COT-${Date.now()}`;
        this.toastrService.warning('Cotización guardada localmente. Algunas funciones pueden estar limitadas.');
      } else {
        this.toastrService.error('Error al guardar la cotización');
      }
    } finally {
      this.isLoading = false;
    }
  }

  public async generarPDF(): Promise<void> {
    try {
      this.isLoading = true;
      
      const element = this.cotizacionPDF.nativeElement;
      
      // Validar que el elemento existe
      if (!element) {
        throw new Error('Elemento PDF no encontrado');
      }
      
      // Hacer visible temporalmente el elemento para html2canvas
      const wasHidden = element.classList.contains('d-none');
      if (wasHidden) {
        element.classList.remove('d-none');
        element.style.position = 'absolute';
        element.style.left = '-9999px';
        element.style.top = '0';
      }
      
      // Esperar un momento para que el DOM se actualice
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Elemento para PDF:', element);
      console.log('Dimensiones del elemento:', element.offsetWidth, 'x', element.offsetHeight);
      
      // Configuración simplificada sin manejo de imágenes externas
      const canvas = await html2canvas(element, {
        scale: 1,
        logging: true,
        backgroundColor: '#ffffff',
        allowTaint: false,
        useCORS: false,
        width: element.scrollWidth || 800,
        height: element.scrollHeight || 1000
      });
      
      // Restaurar el estado original del elemento
      if (wasHidden) {
        element.classList.add('d-none');
        element.style.position = '';
        element.style.left = '';
        element.style.top = '';
      }
      
      console.log('Canvas generado:', canvas);
      console.log('Dimensiones del canvas:', canvas.width, 'x', canvas.height);
      
      // Validar que el canvas tiene contenido
      if (canvas.width === 0 || canvas.height === 0) {
        throw new Error('Canvas vacío - revisar contenido del elemento');
      }
      
      const imgData = canvas.toDataURL('image/png', 0.8);
      console.log('Datos de imagen generados, tamaño:', imgData.length);
      
      // Validar que los datos de imagen son válidos
      if (!imgData || imgData === 'data:,' || imgData.length < 100) {
        throw new Error('Datos de imagen inválidos');
      }
      
      const pdf = new jsPDF.jsPDF();
      const imgWidth = 210;
      const pageHeight = 295;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      
      let position = 0;
      
      console.log('Agregando imagen al PDF...');
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
      
      while (heightLeft >= 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }
      
      const nombreArchivo = `cotizacion-${this.cotizacion.numero || 'COT-' + this.fechaActual}.pdf`;
      pdf.save(nombreArchivo);
      this.toastrService.success('PDF generado correctamente');
      
    } catch (error) {
      console.error('Error detallado generando PDF:', error);
      this.toastrService.error(`Error al generar el PDF: ${error.message}`);
    } finally {
      this.isLoading = false;
    }
  }



  private async cargarCotizacion(id: string): Promise<void> {
    try {
      this.isLoading = true;
      console.log('Cargando cotización:', id);
      
      // Obtener la cotización desde el servicio
      const response = await firstValueFrom(this.cotizacionesService.obtenerCotizacion(id));
      
      if (response && response.success !== false) {
        const cotizacionData = response.data || response;
        
        console.log('Datos de cotización recibidos:', cotizacionData);
        
        // Mapear los datos de la cotización al objeto local
        this.cotizacion = {
          id: cotizacionData.id || cotizacionData._id,
          nroCotizacion: cotizacionData.nroCotizacion || cotizacionData.numero,
          numero: cotizacionData.nroCotizacion || cotizacionData.numero,
          fechaCreacion: cotizacionData.fechaCreacion,
          fechaVencimiento: cotizacionData.fechaVencimiento,
          fecha: cotizacionData.fechaCreacion ? new Date(cotizacionData.fechaCreacion).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          company: cotizacionData.company,
          cliente: cotizacionData.cliente,
          items: cotizacionData.items || [],
          estadoCotizacion: cotizacionData.estadoCotizacion,
          estado: this.mapearEstadoAPI(cotizacionData.estadoCotizacion),
          subtotal: cotizacionData.subtotal || 0,
          totalImpuesto: cotizacionData.totalImpuesto || 0,
          impuestos: cotizacionData.totalImpuesto || 0,
          totalDescuento: cotizacionData.totalDescuento || 0,
          descuento: cotizacionData.totalDescuento || 0,
          total: cotizacionData.total || 0,
          asesorAsignado: cotizacionData.asesorAsignado,
          validezDias: cotizacionData.validezDias || 30,
          validez: (cotizacionData.validezDias || 30).toString(),
          observaciones: cotizacionData.observaciones || '',
          convertidaAPedido: cotizacionData.convertidaAPedido || false,
          pedidoGenerado: cotizacionData.pedidoGenerado,
          date_edit: cotizacionData.date_edit,
          user_edit: cotizacionData.user_edit
        };
        
        // Asignar el cliente
        if (cotizacionData.cliente) {
          this.cliente = cotizacionData.cliente;
          this.clienteEncontrado = true;
          
          // Parchear el formulario de cliente
          this.clienteForm.patchValue({
            tipo_documento: cotizacionData.cliente.tipo_documento_comprador || 'CC-NIT',
            documento: cotizacionData.cliente.documento || '',
            nombres_completos: cotizacionData.cliente.nombres_completos || '',
            numero_celular: cotizacionData.cliente.numero_celular_comprador || cotizacionData.cliente.numero_celular || '',
            correo_electronico: cotizacionData.cliente.correo_electronico_comprador || cotizacionData.cliente.correo_electronico || '',
            direccion: cotizacionData.cliente.direccion || '',
            ciudad: cotizacionData.cliente.ciudad || '',
            departamento: cotizacionData.cliente.departamento || '',
            pais: cotizacionData.cliente.pais || 'Colombia'
          });
        }
        
        // Asignar los items
        if (cotizacionData.items && cotizacionData.items.length > 0) {
          console.log('Procesando items de cotización:', cotizacionData.items.length);
          console.log('Productos disponibles en catálogo:', this.productos.length);
          
          this.items = [];
          
          for (const item of cotizacionData.items) {
            let producto = item.producto;
            
            // Si el producto no tiene todos los datos, buscarlo en el catálogo
            if (!producto || !producto.precio || !producto.identificacion) {
              const productoEncontrado = this.productos.find(p => 
                p.identificacion?.referencia === item.producto?.identificacion?.referencia ||
                p.identificacion?.codigoBarras === item.producto?.identificacion?.codigoBarras ||
                p.cd === item.producto?.cd
              );
              
              if (productoEncontrado) {
                producto = productoEncontrado;
                console.log('Producto encontrado en catálogo:', producto);
              } else {
                console.warn('Producto no encontrado en catálogo, buscando específicamente...');
                // Buscar específicamente el producto
                const referencia = item.producto?.identificacion?.referencia || item.producto?.cd;
                if (referencia) {
                  const productoBuscado = await this.buscarProductoEspecifico(referencia);
                  if (productoBuscado) {
                    producto = productoBuscado;
                    console.log('Producto encontrado mediante búsqueda específica:', producto);
                  } else {
                    console.warn('Producto no encontrado ni en catálogo ni mediante búsqueda:', item.producto);
                    // Usar los datos del item tal como vienen
                    producto = item.producto;
                  }
                } else {
                  console.warn('No se pudo obtener referencia del producto:', item.producto);
                  // Usar los datos del item tal como vienen
                  producto = item.producto;
                }
              }
            }
            
            const precioBase = item.precio || producto?.precio?.valorUnitario || 0;
            const itemCotizacion = {
              id: item.id || `item-${Date.now()}-${Math.random()}`,
              producto: producto,
              cantidad: item.cantidad || 1,
              precio: precioBase,
              precioOriginal: precioBase,
              subtotal: item.subtotal || (item.cantidad * precioBase),
              descuentoVolumen: item.descuentoVolumen || null,
              configuracion: item.configuracion || null,
              notaProduccion: item.notaProduccion || []
            };
            
            // Aplicar descuentos por volumen si existen
            if (producto?.precio?.preciosVolumen?.length > 0) {
              this.actualizarPrecioConVolumen(itemCotizacion);
            }
            
            this.items.push(itemCotizacion);
          }
          
          console.log('Items procesados:', this.items);
        }
        
        // Parchear el formulario de cotización
        this.cotizacionForm.patchValue({
          validez: this.cotizacion.validez,
          observaciones: this.cotizacion.observaciones || '',
          porcentajeDescuento: this.porcentajeDescuento
        });
        
        // Parchear el formulario de email si existe cliente
        if (this.cliente && this.cliente.correo_electronico_comprador) {
          this.emailForm.patchValue({
            email: this.cliente.correo_electronico_comprador || this.cliente.correo_electronico || '',
            asunto: `Cotización ${this.cotizacion.numero || 'N/A'} - Katuq`,
            mensaje: `Estimado/a ${this.cliente.nombres_completos || 'cliente'},\n\nAdjunto encontrará la cotización ${this.cotizacion.numero || 'solicitada'}.\n\nGracias por su interés en nuestros productos.\n\nSaludos cordiales,\nEquipo Katuq`
          });
        }
        
        // Recalcular totales
        this.calcularTotales();
        
        // Actualizar la vista
        this.cdr.detectChanges();
        
        console.log('Cotización cargada exitosamente:', this.cotizacion);
        this.toastrService.success('Cotización cargada correctamente');
        
      } else {
        throw new Error(response.message || 'No se pudo cargar la cotización');
      }
      
    } catch (error) {
      console.error('Error cargando cotización:', error);
      this.toastrService.error('Error al cargar la cotización');
      // Redirigir a la lista si hay error
      this.router.navigate(['/cotizaciones/lista']);
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Mapea el estado de la API al estado local para compatibilidad
   */
  private mapearEstadoAPI(estadoAPI: string): 'borrador' | 'enviada' | 'aceptada' | 'rechazada' | 'vencida' {
    switch (estadoAPI) {
      case 'Borrador':
        return 'borrador';
      case 'Enviada':
        return 'enviada';
      case 'Aprobada':
        return 'aceptada';
      case 'Rechazada':
        return 'rechazada';
      case 'Expirada':
        return 'vencida';
      case 'Convertida':
        return 'aceptada'; // Tratamos las convertidas como aceptadas
      default:
        return 'borrador';
    }
  }

  public toggleListView(): void {
    this.listView = !this.listView;
  }

  public cambiarColumnas(columnas: string): void {
    this.col = columnas;
  }

  public formatearPrecio(precio: number): string {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(precio);
  }

  public formatearFecha(fecha: string): string {
    return new Date(fecha).toLocaleDateString('es-CO');
  }

  /**
   * Navega a crear una nueva cotización
   */
  public nuevaCotizacion(): void {
    this.router.navigate(['/cotizaciones/crear']);
  }

  /**
   * Limpia por completo el estado del componente para asegurar que al entrar
   * nuevamente a la pantalla no queden datos residuales de sesiones previas.
   */
  private resetData(): void {
    // Limpiar datos de productos y categorías
    this.productos = [];
    this.productosFiltrados = [];
    this.categorias = [];
    this.searchTerm = '';
    this.selectedCategory = '';

    // Limpiar datos de paginación del API
    this.currentPage = 1;
    this.totalItems = 0;
    this.totalPages = 0;
    this.hasNextPage = false;
    this.hasPreviousPage = false;
    this.isLoadingMore = false;

    // Limpiar datos de paginación de la vista
    this.currentViewPage = 1;
    this.totalViewPages = 0;
    this.productosPaginados = [];
    
    // Solo limpiar datos de cotización si no estamos editando
    if (!this.isEditing) {
      this.cliente = null;
      this.clienteEncontrado = false;
      this.bloqueado = false;
      this.items = [];
      this.cotizacion = {
        fecha: new Date().toISOString().split('T')[0],
        cliente: null,
        items: [],
        subtotal: 0,
        impuestos: 0,
        descuento: 0,
        total: 0,
        validez: '30',
        estado: 'borrador'
      };
      this.calcularTotales();
    }

    this.subtotal = 0;
    this.impuestos = 0;
    this.descuento = 0;
    this.total = 0;
    this.porcentajeDescuento = 0;

    this.cotizacion = {
      fecha: new Date().toISOString().split('T')[0],
      cliente: null,
      items: [],
      subtotal: 0,
      impuestos: 0,
      descuento: 0,
      total: 0,
      validez: '30',
      estado: 'borrador',
    };

    // Reiniciar formularios
    this.initForms();

    // Limpiar datos del flujo POS en caso de existir
    if (this.posCheckoutService?.resetCheckout) {
      this.posCheckoutService.resetCheckout();
    }
  }

  private inicializarFormularios(): void {
    this.cotizacionForm = this.formBuilder.group({
      cliente: this.formBuilder.group({
        nombre: ['', [Validators.required]],
        email: ['', [Validators.required, Validators.email]],
        telefono: [''],
        empresa: [''],
        documento: ['']
      }),
      fechaVencimiento: ['', [Validators.required]],
      observaciones: [''],
      descuentoAdicional: [0, [Validators.min(0), Validators.max(100)]]
    });

    // Formulario para envío de correo
    this.emailForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      asunto: ['Cotización - Katuq', [Validators.required]],
      mensaje: ['Adjunto encontrará la cotización solicitada.\n\nGracias por su interés en nuestros productos.']
    });
  }

  /**
   * Abre el modal para enviar cotización por correo
   */
  async abrirModalEnviarCorreo(content: any): Promise<void> {
    // Si la cotización no tiene ID, intentar guardarla primero
    if (!this.cotizacion || !this.cotizacion.id) {
      const result = await Swal.fire({
        icon: 'question',
        title: 'Guardar cotización',
        text: 'La cotización debe guardarse antes de enviarla por correo. ¿Desea guardarla ahora?',
        showCancelButton: true,
        confirmButtonText: 'Sí, guardar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#28a745'
      });

      if (result.isConfirmed) {
        await this.guardarCotizacion();
        
        // Verificar si se guardó correctamente
        if (!this.cotizacion.id) {
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'No se pudo guardar la cotización. Inténtelo nuevamente.'
          });
          return;
        }
      } else {
        return;
      }
    }

    // Pre-llenar el email del cliente si existe
    const emailCliente = this.cotizacion.cliente?.correo_electronico_comprador || 
                         this.cotizacion.cliente?.correo_electronico ||
                         this.cliente?.correo_electronico_comprador ||
                         this.cliente?.correo_electronico;
    
    if (emailCliente) {
      this.emailForm.patchValue({
        email: emailCliente
      });
    } else {
      // Mostrar advertencia si el cliente no tiene email
      Swal.fire({
        icon: 'warning',
        title: 'Email no encontrado',
        text: 'El cliente seleccionado no tiene un email registrado. Por favor, ingrese manualmente el email de destino.',
        confirmButtonText: 'Entendido'
      });
    }

    // Pre-llenar el asunto con información de la cotización
    const nombreCliente = this.cotizacion.cliente?.nombres_completos || 
                          this.cliente?.nombres_completos ||
                          this.cotizacion.cliente?.nombre ||
                          'Cliente';
    
    const asuntoPersonalizado = `Cotización ${this.cotizacion.nroCotizacion || this.cotizacion.numero || ''} - ${nombreCliente}`;
    this.emailForm.patchValue({
      asunto: asuntoPersonalizado
    });

    this.modalService.open(content, { 
      size: 'md',
      backdrop: 'static',
      keyboard: false
    });
  }

  /**
   * Envía la cotización por correo electrónico
   */
  enviarCotizacionPorCorreo(): void {
    if (!this.emailForm.valid || !this.cotizacion?.id) {
      return;
    }

    this.enviandoCorreo = true;
    const emailData = this.emailForm.value;

    this.cotizacionesService.enviarCotizacionEmail(this.cotizacion.id, emailData.email).subscribe({
      next: (response) => {
        this.enviandoCorreo = false;
        
        if (response.success !== false) {
          Swal.fire({
            icon: 'success',
            title: 'Correo enviado',
            text: `La cotización ha sido enviada exitosamente a ${emailData.email}`,
            timer: 3000,
            showConfirmButton: false
          });

          // Cerrar modal
          this.modalService.dismissAll();
          
          // Limpiar formulario
          this.emailForm.reset();
          this.emailForm.patchValue({
            asunto: 'Cotización - Katuq',
            mensaje: 'Adjunto encontrará la cotización solicitada.\n\nGracias por su interés en nuestros productos.'
          });
        } else {
          throw new Error(response.message || 'Error al enviar correo');
        }
      },
      error: (error) => {
        this.enviandoCorreo = false;
        console.error('Error al enviar correo:', error);
        
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se pudo enviar el correo electrónico. Por favor, inténtelo nuevamente.',
          confirmButtonText: 'Entendido'
        });
      }
    });
  }

  /**
   * Cancela el envío de correo y cierra el modal
   */
  cancelarEnvioCorreo(): void {
    this.modalService.dismissAll();
    this.emailForm.reset();
    this.emailForm.patchValue({
      asunto: 'Cotización - Katuq',
      mensaje: 'Adjunto encontrará la cotización solicitada.\n\nGracias por su interés en nuestros productos.'
    });
  }

  /**
   * Busca un producto específico por ID o referencia
   */
  private async buscarProductoEspecifico(referenciaProducto: string): Promise<any> {
    try {
      // Intentar buscar el producto por referencia en el servicio
      const response: any = await firstValueFrom(
        this.maestroService.getProductsBySearch(referenciaProducto, 10, 1)
      );
      
      if (response && response.products && response.products.length > 0) {
        // Buscar el producto que coincida exactamente con la referencia
        const productoEncontrado = response.products.find((p: any) => 
          p.identificacion?.referencia === referenciaProducto ||
          p.cd === referenciaProducto
        );
        
        return productoEncontrado || response.products[0];
      }
      
      return null;
    } catch (error) {
      console.error('Error buscando producto específico:', error);
      return null;
    }
  }
}
