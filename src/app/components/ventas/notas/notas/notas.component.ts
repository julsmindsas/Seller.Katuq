import { AfterContentInit, OnChanges, SimpleChanges, Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormArray } from '@angular/forms';
import { CartSingletonService } from '../../../../shared/services/ventas/cart.singleton.service';
import { Notas, Pedido } from '../../modelo/pedido';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-notas',
  templateUrl: './notas.component.html',
  styleUrls: ['./notas.component.scss']
})
export class NotasComponent implements OnInit, AfterContentInit, OnChanges {
  @Input() pedido: Pedido;
  @Input() carrito: any;
  @Input() isEdit: boolean = false;
  @Output() notasActualizadas = new EventEmitter<any>();

  fecha: Date
  notasProduccion: any[] = [];
  notasCliente: any[] = [];

  notasDespachos: any[] = [];
  notasEntregas: any[] = [];
  notasFacturacionPagos: any[] = [];
  notasProduccionForm: FormGroup;

  notasDespachoForm: FormGroup;
  notasEntregasForm: FormGroup;
  notasFacturacionPagosForm: FormGroup;
  bandera: boolean = true;

  notasClienteOrdenadas: Notas[] = [];
  notasDespachosOrdenadas: Notas[] = [];
  notasEntregasOrdenadas: Notas[] = [];
  notasFacturacionPagosOrdenadas: Notas[] = [];
  carritoActualizado: boolean = false;

  constructor(private singleton: CartSingletonService, private formBuilder: FormBuilder, private modalService: NgbModal) { }

  ngAfterContentInit(): void {
    if (!this.isEdit) {
      // Solo inicializar notasPedido si no existe, preservando notas existentes
      if (this.pedido) { // Asegurarse que el pedido exista
        if (!this.pedido.notasPedido) {
          this.pedido.notasPedido = {
            notasProduccion: [],
            notasCliente: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: []
          };
        } else {
          // Asegurar que todas las categorías existan
          if (!this.pedido.notasPedido.notasProduccion) {
            this.pedido.notasPedido.notasProduccion = [];
          }
          if (!this.pedido.notasPedido.notasCliente) {
            this.pedido.notasPedido.notasCliente = [];
          }
          if (!this.pedido.notasPedido.notasDespachos) {
            this.pedido.notasPedido.notasDespachos = [];
          }
          if (!this.pedido.notasPedido.notasEntregas) {
            this.pedido.notasPedido.notasEntregas = [];
          }
          if (!this.pedido.notasPedido.notasFacturacionPagos) {
            this.pedido.notasPedido.notasFacturacionPagos = [];
          }
        }
        
        // Solo limpiar notas de producción dentro del carrito si no hay notas centralizadas
        if (this.pedido.carrito && this.pedido.carrito.length > 0) {
          this.pedido.carrito.forEach(prod => {
            if (prod.notaProduccion) {
              delete prod.notaProduccion;
            }
          });
        }
      }
      
      // Limpiar las propiedades locales solo si no hay notas existentes
      if (this.pedido?.notasPedido?.notasDespachos?.length > 0) {
        this.notasDespachosOrdenadas = [...this.pedido.notasPedido.notasDespachos].sort((a, b) =>
          new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
      } else { 
        this.notasDespachosOrdenadas = []; 
      }

      if (this.pedido?.notasPedido?.notasEntregas?.length > 0) {
        this.notasEntregasOrdenadas = [...this.pedido.notasPedido.notasEntregas].sort((a, b) =>
          new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
      } else { 
        this.notasEntregasOrdenadas = []; 
      }

      if (this.pedido?.notasPedido?.notasFacturacionPagos?.length > 0) {
        this.notasFacturacionPagosOrdenadas = [...this.pedido.notasPedido.notasFacturacionPagos].sort((a, b) =>
          new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
      } else { 
        this.notasFacturacionPagosOrdenadas = []; 
      }

      // Asignar las notas existentes a las variables locales
      this.notasProduccion = this.pedido?.notasPedido?.notasProduccion || [];
      this.notasDespachos = this.pedido?.notasPedido?.notasDespachos || [];
      this.notasEntregas = this.pedido?.notasPedido?.notasEntregas || [];
      this.notasFacturacionPagos = this.pedido?.notasPedido?.notasFacturacionPagos || [];

    } else { // Modo Edición (isEdit = true)
      if (this.pedido) { // Solo proceder si el pedido existe
        // Si notasPedido no existe en el pedido (aunque en modo edición debería existir), inicializarlo.
        if (!this.pedido.notasPedido) {
          this.pedido.notasPedido = {
            notasProduccion: [],
            notasCliente: [],
            notasDespachos: [],
            notasEntregas: [],
            notasFacturacionPagos: []
          };
        }

        // Cargar y ordenar notas existentes del pedido

        if (this.pedido.notasPedido?.notasDespachos?.length > 0) {
          this.notasDespachosOrdenadas = [...this.pedido.notasPedido.notasDespachos].sort((a, b) =>
            new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
        } else { this.notasDespachosOrdenadas = []; }

        if (this.pedido.notasPedido?.notasEntregas?.length > 0) {
          this.notasEntregasOrdenadas = [...this.pedido.notasPedido.notasEntregas].sort((a, b) =>
            new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
        } else { this.notasEntregasOrdenadas = []; }

        if (this.pedido.notasPedido?.notasFacturacionPagos?.length > 0) {
          this.notasFacturacionPagosOrdenadas = [...this.pedido.notasPedido.notasFacturacionPagos].sort((a, b) =>
            new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
        } else { this.notasFacturacionPagosOrdenadas = []; }

        // Asignar a variables locales si estamos en modo edición
        // Estas variables se usan en el template para mostrar las notas de forma no editable o para otros propósitos.
        this.notasProduccion = this.pedido.notasPedido.notasProduccion || [];
        this.notasDespachos = this.pedido.notasPedido.notasDespachos || [];
        this.notasEntregas = this.pedido.notasPedido.notasEntregas || [];
        this.notasFacturacionPagos = this.pedido.notasPedido.notasFacturacionPagos || [];
        
      } else {
        // Si this.pedido es undefined, asegurar que las propiedades locales estén vacías
        this.notasDespachosOrdenadas = [];
        this.notasEntregasOrdenadas = [];
        this.notasFacturacionPagosOrdenadas = [];
        this.notasProduccion = [];
        this.notasDespachos = [];
        this.notasEntregas = [];
        this.notasFacturacionPagos = [];
      }
    }

    this.initFormularios(); // initFormularios construirá los forms basados en el estado ahora limpio/cargado de this.pedido
  }

  ngOnInit(): void {
    this.fecha = new Date();
    
    // Limpiar datos fantasma al inicializar
    this.limpiarDatosFantasmaNotas();
    
    this.initFormularios();

    // Suscribirse a cambios en el carrito
    this.singleton.productInCartChanges$.subscribe(() => {
      if (!this.carritoActualizado) {
        this.llenarFormulario();
        this.carritoActualizado = false;
      }
    });
  }

  initFormularios(): void {
    // Inicializar formularios
    this.notasDespachoForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });
    this.notasEntregasForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });
    this.notasFacturacionPagosForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });

    // Inicializar formulario de producción
    if (this.pedido && this.pedido.carrito && this.pedido.carrito.length > 0) {
      this.notasProduccionForm = this.formBuilder.group({
        productos: this.formBuilder.array([])
      });
      this.llenarFormulario();
    }
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.carrito || changes.pedido) {
      // Si cambia el pedido o el carrito, actualizar las notas pero preservar las existentes
      if (this.pedido?.notasPedido?.notasProduccion) {
        // Ordenar las notas de producción por fecha (más recientes primero)
        this.pedido.notasPedido.notasProduccion = [...this.pedido.notasPedido.notasProduccion].sort((a, b) => {
          const fechaA = a.fecha ? new Date(a.fecha) : new Date();
          const fechaB = b.fecha ? new Date(b.fecha) : new Date();
          return fechaB.getTime() - fechaA.getTime();
        });
      }

      // Refrescar el carrito y actualizar el formulario solo si es necesario
      this.singleton.refreshCart().subscribe((data: any) => {
        if (data) {
          // Limpiar datos fantasma del carrito antes de procesarlo
          let carritoLimpio = Array.isArray(data) ? data.map(prod => {
            const prodLimpio = { ...prod };
            // Eliminar propiedades obsoletas
            if (prodLimpio.notaProduccion) {
              delete prodLimpio.notaProduccion;
            }
            return prodLimpio;
          }) : data;
          
          // Asignar el carrito limpio al pedido solo si es diferente
          if (this.pedido) {
            const carritoAnterior = JSON.stringify(this.pedido.carrito || []);
            const carritoNuevo = JSON.stringify(carritoLimpio);
            
            if (carritoAnterior !== carritoNuevo) {
              this.pedido.carrito = carritoLimpio;
              
              // Solo reinicializar el formulario si el carrito cambió realmente
              this.initFormularios();
            }
          }
        }
      });
    }
  }

  llenarFormulario() {
    if (!this.notasProduccionForm || !this.pedido?.carrito?.length) {
      return;
    }

    const productos = this.notasProduccionForm.get('productos') as FormArray;
    productos.clear();

    this.pedido.carrito.forEach((prod, index) => {
      // Obtener las notas existentes para este producto desde la fuente centralizada
      const notasDelProducto = this.obtenerNotasDelProducto(prod);
      
      // Crear FormArray para las notas de este producto
      const notasArray = this.formBuilder.array(
        notasDelProducto.map(nota => this.formBuilder.control(nota.descripcion || nota.nota || ''))
      );

      // Añadir al FormArray principal con el identificador del producto
      productos.push(this.formBuilder.group({
        notas: notasArray,
        productoId: [prod.producto?.identificacion?.referencia || ''],
        titulo: [prod.producto?.crearProducto?.titulo || 'Producto sin nombre']
      }));
    });
  }

  get notasFormArray() {
    return this.notasProduccionForm?.get('productos') as FormArray;
  }

  agregarNota(productoIndex: number) {
    if (!this.notasFormArray) return;

    const notasArray = this.notasFormArray.at(productoIndex).get('notas') as FormArray;
    if (notasArray) {
      notasArray.push(this.formBuilder.control(''));
    }
  }

  eliminarNota(productoIndex: number, notaIndex: number, tipo: string) {
    if (tipo === 'produccion') {
      if (!this.notasFormArray) return;

      const notasArray = this.notasFormArray.at(productoIndex).get('notas') as FormArray;
      if (notasArray) {
        notasArray.removeAt(notaIndex);
      }
    } else {
      switch (tipo) {

        case 'despachos':
          if (this.pedido?.notasPedido?.notasDespachos) {
            this.pedido.notasPedido.notasDespachos.splice(notaIndex, 1);
          }
          break;
        case 'entregas':
          if (this.pedido?.notasPedido?.notasEntregas) {
            this.pedido.notasPedido.notasEntregas.splice(notaIndex, 1);
          }
          break;
        case 'facturacionPagos':
          if (this.pedido?.notasPedido?.notasFacturacionPagos) {
            this.pedido.notasPedido.notasFacturacionPagos.splice(notaIndex, 1);
          }
          break;
      }
      
      // Para cualquier tipo que no sea producción, emitir el evento
      if (tipo !== 'produccion') {
        // Emitir evento al componente padre
        this.notasActualizadas.emit({
          carrito: this.pedido.carrito,
          notasPedido: this.pedido.notasPedido,
          pedidoCompleto: this.pedido
        });
      }
    }
  }

  guardarNotas() {
    if (!this.notasFormArray) {
      return;
    }
    
    this.carritoActualizado = true;
    const notasActualizadas = this.notasFormArray.value;
    
    if (this.pedido?.carrito) {
      // Inicializar notasPedido si no existe, preservando notas existentes
      if (!this.pedido.notasPedido) {
        this.pedido.notasPedido = {
          notasProduccion: [],
          notasCliente: [],
          notasDespachos: [],
          notasEntregas: [],
          notasFacturacionPagos: []
        };
      } else {
        // Asegurar que la categoría de producción existe
        if (!this.pedido.notasPedido.notasProduccion) {
          this.pedido.notasPedido.notasProduccion = [];
        }
      }

      // Limpiar solo las notas que vienen del formulario (mantener las demás)
      this.pedido.notasPedido.notasProduccion = this.pedido.notasPedido.notasProduccion.filter(nota => 
        !(nota as any).fromFormulario
      );
      
      // Agregar las nuevas notas del formulario
      let notasAgregadas = 0;
      notasActualizadas.forEach((producto, pIndex) => {
        if (producto.notas && producto.notas.length > 0) {
          const tituloProducto = this.pedido?.carrito?.[pIndex]?.producto?.crearProducto?.titulo;
          const productoId = this.pedido?.carrito?.[pIndex]?.producto?.identificacion?.referencia;
          
          producto.notas.forEach((textoNota: string) => {
            if (textoNota && textoNota.trim() !== '') {
              this.pedido.notasPedido.notasProduccion.push({
                fecha: new Date().toISOString(),
                descripcion: textoNota,
                producto: tituloProducto || 'Producto',
                usuario: 'Usuario',
                productoId: productoId || '',
                fromFormulario: true
              } as any);
              notasAgregadas++;
            }
          });
        }
      });
        
      // Emitir el pedido completo actualizado con todas las notas preservadas
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
   
      // Limpiar correctamente el formulario
      this.limpiarFormularioMantenendoNotas();

      Swal.fire({
        icon: 'success',
        title: 'Notas Guardadas Con Éxito',
        text: `Se han guardado ${notasAgregadas} notas de producción para los productos`,
        confirmButtonText: 'Aceptar'
      });
    }
  }



  onSubmitDespachos() {
    const notaDespachos = this.notasDespachoForm.value;
    notaDespachos.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasDespachos) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasDespachos = [];
      }
    }

    if (this.pedido?.notasPedido?.notasDespachos) {
      this.pedido.notasPedido.notasDespachos.unshift(notaDespachos);
      
      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
    }
    this.notasDespachoForm.reset();
  }

  onSubmitEntregas() {
    const notaEntrega = this.notasEntregasForm.value;
    notaEntrega.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasEntregas) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasEntregas = [];
      }
    }

    if (this.pedido?.notasPedido?.notasEntregas) {
      this.pedido.notasPedido.notasEntregas.unshift(notaEntrega);
      
      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
    }
    this.notasEntregasForm.reset();
  }

  onSubmitFacturacionPagos() {
    const notaFacturacionPagos = this.notasFacturacionPagosForm.value;
    notaFacturacionPagos.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasFacturacionPagos) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasFacturacionPagos = [];
      }
    }

    if (this.pedido?.notasPedido?.notasFacturacionPagos) {
      this.pedido.notasPedido.notasFacturacionPagos.unshift(notaFacturacionPagos);
      
      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
    }
    this.notasFacturacionPagosForm.reset();
  }



  // Método para limpiar el formulario sin perder las notas ya guardadas
  private limpiarFormularioMantenendoNotas(): void {
    if (!this.notasProduccionForm || !this.pedido?.carrito?.length) {
      this.initFormularios();
      return;
    }

    const productos = this.notasProduccionForm.get('productos') as FormArray;
    productos.clear();

    // Recrear el formulario con campos vacíos pero manteniendo la estructura
    this.pedido.carrito.forEach((prod) => {
      // Crear FormArray vacío para las notas de este producto
      const notasArray = this.formBuilder.array([]);

      // Añadir al FormArray principal con la información del producto
      productos.push(this.formBuilder.group({
        notas: notasArray,
        productoId: [prod.producto?.identificacion?.referencia || ''],
        titulo: [prod.producto?.crearProducto?.titulo || 'Producto sin nombre']
      }));
    });
  }

  // Obtener notas específicas de un producto desde la fuente centralizada
  private obtenerNotasDelProducto(producto: any): any[] {
    if (!this.pedido?.notasPedido?.notasProduccion) {
      return [];
    }

    const productoId = producto?.producto?.identificacion?.referencia;
    const productoTitulo = producto?.producto?.crearProducto?.titulo;

    const notasEncontradas = this.pedido.notasPedido.notasProduccion.filter(nota => {
      // Filtrar por ID del producto o por título si no hay ID
      return (nota as any).productoId === productoId || 
             (nota as any).producto === productoTitulo;
    });
    
    return notasEncontradas;
  }

  // Método para limpiar datos fantasma de sessionStorage y localStorage
  private limpiarDatosFantasmaNotas(): void {
    // Limpiar sessionStorage si tiene datos corruptos
    try {
      const pedidoTemporal = sessionStorage.getItem('pedidoTemporal');
      if (pedidoTemporal) {
        const pedido = JSON.parse(pedidoTemporal);
        if (pedido && pedido.carrito && Array.isArray(pedido.carrito)) {
          let huboLimpieza = false;
          
          // Limpiar propiedades obsoletas del carrito en sessionStorage
          pedido.carrito.forEach((producto: any) => {
            if (producto.notaProduccion) {
              delete producto.notaProduccion;
              huboLimpieza = true;
            }
          });
          
          if (huboLimpieza) {
            sessionStorage.setItem('pedidoTemporal', JSON.stringify(pedido));
          }
        }
      }
    } catch (error) {
      sessionStorage.removeItem('pedidoTemporal');
    }
  }

  // Agregar métodos auxiliares para usar en la plantilla
  getFechaFormateada(nota: any): string {
    if (nota.fecha) {
      return nota.fecha;
    } else if (nota.hasOwnProperty('fecha')) {
      return nota.fecha;
    }
    return new Date().toISOString();
  }

  getProductoNombre(nota: any): string {
    if (nota.hasOwnProperty('producto')) {
      return nota.producto || 'General';
    }
    return 'General';
  }

  getDescripcionNota(nota: any): string {
    if (nota.hasOwnProperty('descripcion')) {
      return nota.descripcion;
    } else if (nota.hasOwnProperty('nota')) {
      return nota.nota;
    }
    return 'Sin descripción';
  }
}
