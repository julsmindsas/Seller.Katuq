import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';

@Component({
  selector: 'app-editar-precios-tipo-cliente',
  templateUrl: './editar-precios-tipo-cliente.component.html',
  styleUrls: ['./editar-precios-tipo-cliente.component.scss']
})
export class EditarPreciosTipoClienteComponent implements OnInit {
  @Input() producto: any;
  
  preciosForm: FormGroup;
  tiposCliente: any[] = [];
  cargando = false;

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
    
    this.tiposCliente.forEach(tipo => {
      // Buscar precio existente en la lista de preciosPorTipoCliente
      let precioExistente = 0;
      
      if (this.producto?.preciosPorTipoCliente && Array.isArray(this.producto.preciosPorTipoCliente)) {
        const precioEncontrado = this.producto.preciosPorTipoCliente.find(
          (p: any) => p.tipoClienteId === tipo.id
        );
        if (precioEncontrado) {
          precioExistente = precioEncontrado.precio;
        }
      }
      
      // Si no hay precio específico, usar precio base del producto
      if (precioExistente === 0) {
        precioExistente = this.producto?.precio?.precio || 0;
      }
      
      formControls[`precio_${tipo.id}`] = [precioExistente];
      console.log(`Tipo: ${tipo.nombre} (${tipo.id}), Precio inicial: ${precioExistente}`);
    });

    this.preciosForm = this.fb.group(formControls);
    console.log('Formulario inicializado:', this.preciosForm.value);
  }

  obtenerPrecio(tipoId: string): number {
    const control = this.preciosForm.get(`precio_${tipoId}`);
    return control ? control.value : 0;
  }

  guardar() {
    if (this.preciosForm.invalid) {
      return;
    }

    // Crear lista de precios por tipo de cliente
    const preciosPorTipoCliente: any[] = [];
    
    this.tiposCliente.forEach(tipo => {
      const precio = this.preciosForm.get(`precio_${tipo.id}`)?.value;
      if (precio && precio > 0) {
        preciosPorTipoCliente.push({
          tipoClienteId: tipo.id,
          tipoClienteNombre: tipo.nombre,
          precio: parseFloat(precio),
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

