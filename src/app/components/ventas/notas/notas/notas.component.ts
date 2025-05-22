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
  notasClienteForm: FormGroup;
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
      // Limpiar todas las notas si no estamos en modo edición (creando algo nuevo)
      if (this.pedido) { // Asegurarse que el pedido exista
        this.pedido.notasPedido = {
          notasProduccion: [],
          notasCliente: [],
          notasDespachos: [],
          notasEntregas: [],
          notasFacturacionPagos: []
        };
        // Limpiar también las notas de producción dentro de cada item del carrito
        if (this.pedido.carrito && this.pedido.carrito.length > 0) {
          this.pedido.carrito.forEach(prod => {
            prod.notaProduccion = [];
          });
        }
      }
      // Limpiar las propiedades locales usadas para mostrar/ordenar
      this.notasClienteOrdenadas = [];
      this.notasDespachosOrdenadas = [];
      this.notasEntregasOrdenadas = [];
      this.notasFacturacionPagosOrdenadas = [];
      // Limpiar las propiedades locales que podrían haber sido cargadas si isEdit hubiera sido true
      this.notasProduccion = [];
      this.notasCliente = [];
      this.notasDespachos = [];
      this.notasEntregas = [];
      this.notasFacturacionPagos = [];

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
        if (this.pedido.notasPedido?.notasCliente?.length > 0) {
          this.notasClienteOrdenadas = [...this.pedido.notasPedido.notasCliente].sort((a, b) =>
            new Date(b.fecha || new Date()).getTime() - new Date(a.fecha || new Date()).getTime());
        } else { this.notasClienteOrdenadas = []; }

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
        this.notasCliente = this.pedido.notasPedido.notasCliente || [];
        this.notasDespachos = this.pedido.notasPedido.notasDespachos || [];
        this.notasEntregas = this.pedido.notasPedido.notasEntregas || [];
        this.notasFacturacionPagos = this.pedido.notasPedido.notasFacturacionPagos || [];
        
      } else {
        // Si this.pedido es undefined, asegurar que las propiedades locales estén vacías
        this.notasClienteOrdenadas = [];
        this.notasDespachosOrdenadas = [];
        this.notasEntregasOrdenadas = [];
        this.notasFacturacionPagosOrdenadas = [];
        this.notasProduccion = [];
        this.notasCliente = [];
        this.notasDespachos = [];
        this.notasEntregas = [];
        this.notasFacturacionPagos = [];
      }
    }

    this.initFormularios(); // initFormularios construirá los forms basados en el estado ahora limpio/cargado de this.pedido
  }

  ngOnInit(): void {
    this.fecha = new Date();
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
    this.notasClienteForm = this.formBuilder.group({
      nota: ['', Validators.required]
    });

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
      // Si cambia el pedido o el carrito, actualizar las notas
      if (this.pedido?.notasPedido?.notasProduccion) {
        // Ordenar las notas de producción por fecha (más recientes primero)
        this.pedido.notasPedido.notasProduccion = [...this.pedido.notasPedido.notasProduccion].sort((a, b) => {
          const fechaA = a.fecha ? new Date(a.fecha) : new Date();
          const fechaB = b.fecha ? new Date(b.fecha) : new Date();
          return fechaB.getTime() - fechaA.getTime();
        });
      }

      // Refrescar el carrito y actualizar el formulario
      this.singleton.refreshCart().subscribe((data: any) => {
        if (data) {
          let carritoParaFormulario = data;
          if (!this.isEdit && Array.isArray(data)) {
            // Si NO estamos editando y 'data' es un array (el carrito)
            // limpiamos las notaProduccion de cada producto antes de pasarlo al formulario.
            carritoParaFormulario = data.map(prod => {
              // Clonar el producto para no modificar el original en el singleton directamente aquí,
              // aunque el singleton podría devolver una copia ya.
              // Lo importante es que el 'notaProduccion' para el formulario esté limpio.
              return {
                ...prod,
                notaProduccion: [] // Limpiar notas de producción para el formulario
              };
            });
          }
          // Asignar el carrito (potencialmente limpio de notas de prod.) al pedido del componente
          if (this.pedido) { // Asegurarse de que this.pedido exista antes de asignarle el carrito
            this.pedido.carrito = carritoParaFormulario;
          } else {
            // Si this.pedido es undefined, esto podría indicar un problema de ciclo de vida o de inicialización.
            // Por ahora, al menos evitamos un error, pero esto debería revisarse si ocurre.
            console.warn('NotasComponent: this.pedido es undefined en ngOnChanges al intentar asignar carrito.');
            // Podríamos crear un pedido básico aquí si fuera necesario, o manejarlo según la lógica de negocio.
          }
          
          // Reinicializar el formulario con los datos actualizados (ahora limpios si !isEdit)
          this.initFormularios();
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

    this.pedido.carrito.forEach(prod => {
      // Si no existe notaProduccion, inicializarlo como array vacío
      if (!prod.notaProduccion) {
        prod.notaProduccion = [];
      }

      // Crear FormArray para las notas de este producto
      const notasArray = this.formBuilder.array(
        prod.notaProduccion.map(nota => this.formBuilder.control(nota))
      );

      // Añadir al FormArray principal con el identificador del producto
      productos.push(this.formBuilder.group({
        notas: notasArray,
        productoId: [prod.producto?.identificacion?.referencia || ''],
        titulo: [prod.producto?.crearProducto?.titulo || 'Producto sin nombre']
      }));
    });

    // Verificar si hay notas generales de producción en el pedido
    if (this.pedido && this.pedido.notasPedido && this.pedido.notasPedido.notasProduccion &&
      this.pedido.notasPedido.notasProduccion.length > 0) {
      // Las notas ya están en el pedido
      console.log('Notas de producción encontradas en el pedido:', this.pedido.notasPedido.notasProduccion);
    }
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
        case 'cliente':
          if (this.pedido?.notasPedido?.notasCliente) {
            this.pedido.notasPedido.notasCliente.splice(notaIndex, 1);
          }
          break;
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
      
      // Para cualquier tipo que no sea producción, guardar y emitir el evento
      if (tipo !== 'produccion') {
        // Guardar en sessionStorage
        this.guardarPedidoEnSessionStorage();
        
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
    if (!this.notasFormArray) return;
    
    this.carritoActualizado = true;
    const notasActualizadas = this.notasFormArray.value;
    
    // Asignar las notas a cada producto en el carrito
    if (this.pedido?.carrito) {
      // Preservar las notas generales de producción (las que vienen del carrito)
      const notasGenerales = this.pedido.notasPedido?.notasProduccion?.filter(nota => 
        // Filtrar solo las notas que tienen estructura de nota general
        // Usando casting porque la interfaz Notas no tiene estas propiedades
        (nota as any).descripcion && ((nota as any).producto || (nota as any).usuario)
      ) || [];
      
      // Actualizar las notas en cada producto del carrito
      this.pedido.carrito.forEach((producto, index) => {
        if (index < notasActualizadas.length) {
          producto.notaProduccion = notasActualizadas[index].notas;
        }
      });
      
      // Actualizar las notas de producción en el pedido, combinando las generales con las del formulario
      if (this.pedido?.notasPedido) {
        // Convertir las notas del formulario al formato adecuado para notasProduccion
        const notasDelFormulario: any[] = [];
        
        // Recorrer los productos y sus notas
        notasActualizadas.forEach((producto, pIndex) => {
          if (producto.notas && producto.notas.length > 0) {
            // Para cada nota del producto, crear una entrada de nota estructurada
            producto.notas.forEach((textoNota: string) => {
              if (textoNota && textoNota.trim() !== '') {
                const tituloProducto = this.pedido?.carrito?.[pIndex]?.producto?.crearProducto?.titulo;
                notasDelFormulario.push({
                  fecha: new Date().toISOString(),
                  descripcion: textoNota,
                  producto: tituloProducto || 'Producto',
                  usuario: 'Usuario' // O tomar el usuario de donde corresponda
                });
              }
            });
          }
        });
        
        // Combinar ambas colecciones de notas
        this.pedido.notasPedido.notasProduccion = [...notasGenerales, ...notasDelFormulario];
        
        // Guardar el pedido completo en sessionStorage para persistencia entre pasos
        try {
          // Crear una copia limpia del pedido para evitar referencias circulares
          const pedidoGuardado = JSON.parse(JSON.stringify(this.pedido));
          sessionStorage.setItem('pedidoTemporal', JSON.stringify(pedidoGuardado));
        } catch (error) {
          console.error('Error al guardar el pedido en sessionStorage:', error);
        }
      }
      
      // Actualizar el localStorage y notificar cambios
      localStorage.setItem('carrito', JSON.stringify(this.pedido.carrito));
      
      // Emitir el pedido completo, no solo el carrito, para asegurar que se comuniquen las notas
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
      
      // Actualizar el cart singleton para mantener sincronizados todos los componentes
      this.singleton.refreshCart();
   
      this.notasFormArray.reset();

      Swal.fire({
        icon: 'success',
        title: 'Notas Guardadas Con Éxito',
        text: 'Se han guardado con éxito las notas de producción para los productos',
        confirmButtonText: 'Aceptar'
      });
    }
  }

  onSubmitCliente() {
    const nota = this.notasClienteForm.value;
    nota.fecha = new Date();

    if (!this.pedido?.notasPedido?.notasCliente) {
      if (this.pedido?.notasPedido) {
        this.pedido.notasPedido.notasCliente = [];
      }
    }

    if (this.pedido?.notasPedido?.notasCliente) {
      this.pedido.notasPedido.notasCliente.unshift(nota);
      
      // Guardar en sessionStorage
      this.guardarPedidoEnSessionStorage();
      
      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
    }
    this.notasClienteForm.reset();
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
      
      // Guardar en sessionStorage
      this.guardarPedidoEnSessionStorage();
      
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
      
      // Guardar en sessionStorage
      this.guardarPedidoEnSessionStorage();
      
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
      
      // Guardar en sessionStorage
      this.guardarPedidoEnSessionStorage();
      
      // Emitir evento al componente padre
      this.notasActualizadas.emit({
        carrito: this.pedido.carrito,
        notasPedido: this.pedido.notasPedido,
        pedidoCompleto: this.pedido
      });
    }
    this.notasFacturacionPagosForm.reset();
  }

  // Método auxiliar para guardar en sessionStorage
  private guardarPedidoEnSessionStorage(): void {
    try {
      // Crear una copia limpia del pedido para evitar referencias circulares
      const pedidoGuardado = JSON.parse(JSON.stringify(this.pedido));
      sessionStorage.setItem('pedidoTemporal', JSON.stringify(pedidoGuardado));
    } catch (error) {
      console.error('Error al guardar el pedido en sessionStorage:', error);
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
