import { Component, OnInit, Input } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Producto, PrecioPorTipoCliente } from 'src/app/shared/models/productos/Producto';
import Swal from 'sweetalert2';

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
  guardando = false;

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

    // El IVA se hereda, en orden, del precio ya configurado y luego del producto.
    // Arrancar siempre en 19% le ponía IVA a los exentos con solo abrir y guardar.
    // Se compara con Number.isFinite: el 0 de un exento es válido, no "vacío".
    const ivaGuardado = Number(this.producto?.preciosPorTipoCliente?.[0]?.porcentajeIva);
    const ivaProducto = parseFloat(this.producto?.precio?.precioUnitarioIva);

    if (Number.isFinite(ivaGuardado) && ivaGuardado >= 0) {
      this.porcentajeIvaSeleccionado = ivaGuardado;
    } else if (Number.isFinite(ivaProducto) && ivaProducto >= 0) {
      this.porcentajeIvaSeleccionado = ivaProducto;
    }

    // Un IVA que no esté en la lista fija (ej. 10%) se agrega para no perderlo
    // al abrir el modal: sin esto el dropdown lo dejaría sin opción seleccionada.
    if (!this.porcentajesIva.some(o => o.value === this.porcentajeIvaSeleccionado)) {
      this.porcentajesIva = [...this.porcentajesIva, {
        value: this.porcentajeIvaSeleccionado,
        label: `${this.porcentajeIvaSeleccionado}%`
      }].sort((a, b) => b.value - a.value);
    }

    this.tiposCliente.forEach(tipo => {
      const guardado = Array.isArray(this.producto?.preciosPorTipoCliente)
        ? this.producto.preciosPorTipoCliente.find((p: PrecioPorTipoCliente) => p.tipoClienteId === tipo.id)
        : undefined;

      const precio = Number(guardado?.precio);

      // Los tipos SIN precio quedan vacíos, no precargados con el precio base.
      // El precargado hacía que abrir el modal para tocar UN tipo y guardar
      // creara precios para TODOS los tipos con el valor base: así terminaron
      // "prueba 2" y "orueba" de ALM-1825 en el mismo $82.110 (69.000 + 19%).
      // El precio base sigue visible arriba como referencia.
      formControls[`precio_${tipo.id}`] = [Number.isFinite(precio) && precio > 0 ? precio : null];
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

  async guardar() {
    if (this.preciosForm.invalid) {
      return;
    }

    // Un campo vacío significa "quitar ese precio" (D-168), así que guardar sin
    // tocar nada BORRA lo que hubiera. Pasó de verdad: ALM-1385 perdió los precios
    // recién importados porque el modal se abrió sin ellos y se guardó igual.
    const tiposQueSePierden = (this.producto?.preciosPorTipoCliente || []).filter((p: PrecioPorTipoCliente) => {
      if (!(Number(p?.precio) > 0)) return false;
      const enForm = Number(this.preciosForm.get(`precio_${p.tipoClienteId}`)?.value);
      return !(Number.isFinite(enForm) && enForm > 0);
    });

    if (tiposQueSePierden.length > 0) {
      // El nombre se resuelve contra el catálogo y no se toma del producto: los
      // datos ya guardados traen la DESCRIPCIÓN en `tipoClienteNombre` (un
      // párrafo), que en este aviso tapaba el precio.
      const nombres = tiposQueSePierden
        .map((p: PrecioPorTipoCliente) => {
          const tipo = this.tiposCliente.find(t => t?.id === p.tipoClienteId);
          const nombre = tipo?.nombre || tipo?.descripcion || p.tipoClienteNombre;
          return `${nombre}: $${Number(p.precio).toLocaleString('es-CO')}`;
        })
        .join('<br>');
      const { isConfirmed } = await Swal.fire({
        title: '¿Quitar estos precios?',
        html: `<p>Estos tipos de cliente tienen precio hoy y quedaron vacíos, así que se van a <strong>borrar</strong>:</p>
               <p class="text-danger"><strong>${nombres}</strong></p>
               <p class="text-muted mb-0"><small>Si solo querías mirar, cancela y cierra el modal sin guardar.</small></p>`,
        icon: 'warning',
        showCancelButton: true,
        cancelButtonText: 'Cancelar',
        confirmButtonText: 'Sí, quitarlos',
        confirmButtonColor: '#d33',
        focusCancel: true
      });
      if (!isConfirmed) return;
    }

    // Crear lista de precios por tipo de cliente con IVA
    const preciosPorTipoCliente: PrecioPorTipoCliente[] = [];

    // Se envían TODOS los tipos, también los que quedaron en 0 o vacíos.
    // Antes se omitían (`if (precio && precio > 0)`) y, como el backend hace
    // merge por tipoClienteId, omitir un tipo significaba "no lo toques": poner
    // un precio en 0 no borraba nada, quedaba el valor anterior. Ahora un 0
    // viaja explícitamente y el backend lo interpreta como quitar ese precio.
    this.tiposCliente.forEach(tipo => {
      const valor = Number(this.preciosForm.get(`precio_${tipo.id}`)?.value);
      const tienePrecio = Number.isFinite(valor) && valor > 0;

      if (!tienePrecio) {
        preciosPorTipoCliente.push({
          tipoClienteId: tipo.id,
          tipoClienteNombre: tipo.nombre || tipo.descripcion,
          precio: 0
        } as PrecioPorTipoCliente);
        return;
      }

      const valorIva = valor * (this.porcentajeIvaSeleccionado / 100);
      preciosPorTipoCliente.push({
        tipoClienteId: tipo.id,
        tipoClienteNombre: tipo.nombre || tipo.descripcion,
        precio: valor, // Precio sin IVA
        porcentajeIva: this.porcentajeIvaSeleccionado,
        valorIva: Math.round(valorIva),
        precioConIva: Math.round(valor + valorIva),
        activo: true
      });
    });

    // Persistir vía backend (Admin SDK) en lugar de escribir directo a Firestore desde el
    // navegador: la escritura de cliente fallaba en silencio si las reglas bloqueaban
    // `products`. El backend hace merge por tipoClienteId (no pisa otros tipos).
    if (!this.producto.cd) {
      this.activeModal.close({ success: false, error: 'Producto sin ID' });
      return;
    }

    this.guardando = true;
    this.service.guardarPreciosTipoCliente(this.producto.cd, preciosPorTipoCliente).subscribe({
      next: (resp: any) => {
        this.guardando = false;
        const merged = resp?.data?.preciosPorTipoCliente || preciosPorTipoCliente;
        this.activeModal.close({
          success: true,
          producto: { ...this.producto, preciosPorTipoCliente: merged, date_edit: new Date().toISOString() },
          preciosPorTipoCliente: merged
        });
      },
      error: (err) => {
        this.guardando = false;
        this.activeModal.close({
          success: false,
          error: err?.error?.error || err?.message || 'Error al guardar los precios'
        });
      }
    });
  }

  cancelar() {
    this.activeModal.dismiss();
  }
}

