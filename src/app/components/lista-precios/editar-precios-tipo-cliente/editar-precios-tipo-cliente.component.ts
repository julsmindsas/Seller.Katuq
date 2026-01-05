import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Producto, PrecioPorTipoCliente } from 'src/app/shared/models/productos/Producto';

@Component({
  selector: 'app-editar-precios-tipo-cliente',
  templateUrl: './editar-precios-tipo-cliente.component.html',
  styleUrls: ['./editar-precios-tipo-cliente.component.scss']
})
export class EditarPreciosTipoClienteComponent implements OnInit {
  @Input() producto: Producto;

  preciosForm: FormGroup;
  tiposCliente: any[] = [];
  cargando = false;

  // Configuración de IVA
  porcentajesIva = [
    { value: 19, label: '19%' },
    { value: 8, label: '8%' },
    { value: 5, label: '5%' },
    { value: 0, label: '0% (Exento)' }
  ];
  porcentajeIvaSeleccionado: number = 19;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.preciosForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.cargarTiposCliente();
  }

  cargarTiposCliente() {
    this.cargando = true;
    console.log('Cargando tipos de cliente...');
    
    // Cargar TODOS los tipos de cliente directamente (no solo activos)
    this.service.consultarTiposCliente().subscribe({
      next: (data: any) => {
        console.log('Respuesta completa del endpoint:', data);
        console.log('Tipo de dato:', typeof data);
        console.log('Es array?', Array.isArray(data));
        
        // Procesar la respuesta
        if (Array.isArray(data)) {
          this.tiposCliente = data;
        } else if (data && Array.isArray(data.data)) {
          this.tiposCliente = data.data;
        } else if (data && data.results && Array.isArray(data.results)) {
          this.tiposCliente = data.results;
        } else if (data && typeof data === 'object') {
          // Si es un objeto, intentar extraer un array
          const keys = Object.keys(data);
          if (keys.length > 0 && Array.isArray(data[keys[0]])) {
            this.tiposCliente = data[keys[0]];
          } else {
            this.tiposCliente = [];
          }
        } else {
          this.tiposCliente = [];
        }
        
        console.log('Tipos de cliente procesados:', this.tiposCliente);
        console.log('Cantidad de tipos de cliente:', this.tiposCliente.length);
        
        // Mostrar cada tipo en consola
        this.tiposCliente.forEach((tipo, index) => {
          console.log(`Tipo ${index + 1}:`, tipo);
        });
        
        this.inicializarFormulario();
        this.cargando = false;
      },
      error: (error) => {
        console.error('Error cargando tipos de cliente:', error);
        console.error('Error completo:', JSON.stringify(error, null, 2));
        this.cargando = false;
      }
    });
  }

  inicializarFormulario() {
    console.log('Inicializando formulario con', this.tiposCliente.length, 'tipos de cliente');
    const formControls: any = {};

    // Cargar el IVA existente del producto o del primer precio configurado
    if (this.producto?.preciosPorTipoCliente && this.producto.preciosPorTipoCliente.length > 0) {
      const primerPrecio = this.producto.preciosPorTipoCliente[0];
      if (primerPrecio.porcentajeIva !== undefined) {
        this.porcentajeIvaSeleccionado = primerPrecio.porcentajeIva;
      }
    }

    this.tiposCliente.forEach(tipo => {
      // Buscar precio existente en la lista de preciosPorTipoCliente
      let precioExistente = 0;

      if (this.producto?.preciosPorTipoCliente && Array.isArray(this.producto.preciosPorTipoCliente)) {
        const precioEncontrado = this.producto.preciosPorTipoCliente.find(
          (p: PrecioPorTipoCliente) => p.tipoClienteId === tipo.id
        );
        if (precioEncontrado) {
          // Usar el precio sin IVA
          precioExistente = precioEncontrado.precio;
        }
      }

      // Si no hay precio específico, usar precio base del producto (sin IVA)
      if (precioExistente === 0) {
        precioExistente = this.producto?.precio?.precioUnitarioSinIva ||
                         this.producto?.precio?.precioUnitarioConIva ||
                         0;
      }

      formControls[`precio_${tipo.id}`] = [precioExistente];
      console.log(`Tipo: ${tipo.descripcion || tipo.nombre} (${tipo.id}), Precio inicial: ${precioExistente}`);
    });

    this.preciosForm = this.fb.group(formControls);
    console.log('Formulario inicializado:', this.preciosForm.value);
    console.log('IVA seleccionado:', this.porcentajeIvaSeleccionado);
  }

  // Métodos para cálculo de IVA
  calcularIva(tipoId: string): void {
    // Este método se llama cuando cambia el precio para forzar actualización de la vista
  }

  calcularValorIva(tipoId: string): number {
    const precio = this.preciosForm.get(`precio_${tipoId}`)?.value || 0;
    return precio * (this.porcentajeIvaSeleccionado / 100);
  }

  calcularPrecioConIva(tipoId: string): number {
    const precio = this.preciosForm.get(`precio_${tipoId}`)?.value || 0;
    const valorIva = precio * (this.porcentajeIvaSeleccionado / 100);
    return precio + valorIva;
  }

  onIvaChange(): void {
    // Forzar recálculo de todos los precios cuando cambia el IVA
    console.log('IVA cambiado a:', this.porcentajeIvaSeleccionado);
  }

  obtenerPrecio(tipoId: string): number {
    const control = this.preciosForm.get(`precio_${tipoId}`);
    return control ? control.value : 0;
  }

  guardar() {
    if (this.preciosForm.invalid) {
      return;
    }

    // Crear lista de precios por tipo de cliente con IVA
    const preciosPorTipoCliente: PrecioPorTipoCliente[] = [];

    this.tiposCliente.forEach(tipo => {
      const precioSinIva = this.preciosForm.get(`precio_${tipo.id}`)?.value;
      if (precioSinIva && precioSinIva > 0) {
        const valorIva = precioSinIva * (this.porcentajeIvaSeleccionado / 100);
        const precioConIva = precioSinIva + valorIva;

        preciosPorTipoCliente.push({
          tipoClienteId: tipo.id,
          tipoClienteNombre: tipo.descripcion || tipo.nombre,
          precio: parseFloat(precioSinIva), // Precio sin IVA
          porcentajeIva: this.porcentajeIvaSeleccionado,
          valorIva: Math.round(valorIva),
          precioConIva: Math.round(precioConIva),
          activo: true
        });
      }
    });

    console.log('Precios por tipo de cliente configurados:', preciosPorTipoCliente);

    // Actualizar el objeto del producto con la nueva propiedad
    const productoActualizado = {
      ...this.producto,
      preciosPorTipoCliente: preciosPorTipoCliente,
      date_edit: new Date().toISOString()
    };

    console.log('Producto actualizado:', productoActualizado);

    // Guardar el producto actualizado usando el método de edición
    this.service.editProductByReference(productoActualizado).subscribe({
      next: (response) => {
        console.log('Producto actualizado exitosamente:', response);
        this.activeModal.close({
          success: true,
          producto: productoActualizado,
          preciosPorTipoCliente: preciosPorTipoCliente
        });
      },
      error: (error) => {
        console.error('Error al actualizar producto:', error);
        this.activeModal.close({
          success: false,
          error: error
        });
      }
    });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}

