import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { AngularFirestore } from '@angular/fire/compat/firestore';
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
    private afs: AngularFirestore,
    public activeModal: NgbActiveModal
  ) {
    this.preciosForm = this.fb.group({});
  }

  ngOnInit(): void {
    this.cargarTiposCliente();
  }

  cargarTiposCliente() {
    this.cargando = true;

    this.service.consultarTiposCliente().subscribe({
      next: (data: any) => {
        if (Array.isArray(data)) {
          this.tiposCliente = data;
        } else if (data && Array.isArray(data.data)) {
          this.tiposCliente = data.data;
        } else if (data && data.results && Array.isArray(data.results)) {
          this.tiposCliente = data.results;
        } else if (data && typeof data === 'object') {
          const keys = Object.keys(data);
          if (keys.length > 0 && Array.isArray(data[keys[0]])) {
            this.tiposCliente = data[keys[0]];
          } else {
            this.tiposCliente = [];
          }
        } else {
          this.tiposCliente = [];
        }

        this.inicializarFormulario();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
      }
    });
  }

  inicializarFormulario() {
    const formControls: any = {};

    if (this.producto?.preciosPorTipoCliente && this.producto.preciosPorTipoCliente.length > 0) {
      const primerPrecio = this.producto.preciosPorTipoCliente[0];
      if (primerPrecio.porcentajeIva !== undefined) {
        this.porcentajeIvaSeleccionado = primerPrecio.porcentajeIva;
      }
    }

    this.tiposCliente.forEach(tipo => {
      let precioExistente = 0;

      if (this.producto?.preciosPorTipoCliente && Array.isArray(this.producto.preciosPorTipoCliente)) {
        const precioEncontrado = this.producto.preciosPorTipoCliente.find(
          (p: PrecioPorTipoCliente) => p.tipoClienteId === tipo.id
        );
        if (precioEncontrado) {
          precioExistente = precioEncontrado.precio;
        }
      }

      if (precioExistente === 0) {
        precioExistente = this.producto?.precio?.precioUnitarioSinIva ||
                         this.producto?.precio?.precioUnitarioConIva ||
                         0;
      }

      formControls[`precio_${tipo.id}`] = [precioExistente];
    });

    this.preciosForm = this.fb.group(formControls);
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

    // Guardar directo en Firestore (el backend /v1/productos/edit no persiste preciosPorTipoCliente)
    if (!this.producto.cd) {
      this.activeModal.close({ success: false, error: 'Producto sin ID' });
      return;
    }

    this.afs.collection('products').doc(this.producto.cd)
      .update({
        preciosPorTipoCliente: preciosPorTipoCliente,
        date_edit: new Date().toISOString()
      })
      .then(() => {
        this.activeModal.close({
          success: true,
          producto: productoActualizado,
          preciosPorTipoCliente: preciosPorTipoCliente
        });
      })
      .catch((error) => {
        this.activeModal.close({
          success: false,
          error: error
        });
      });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}

