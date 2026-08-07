import { Component, OnInit, TemplateRef, ViewChild } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MetodosPagoService } from 'src/app/shared/services/ventas/metodos-pago.service';
import { CanalPago, MetodoPagoUnificado } from 'src/app/shared/util/metodo-pago.util';
import { PedidosUtilService } from 'src/app/components/ventas/service/pedidos.util.service';
import { POSPedidosUtilService } from 'src/app/components/pos/pos-service/pos-pedidos.util.service';
import Swal from 'sweetalert2';

/**
 * Pantalla única de métodos de pago (Spec 012 — enfoque B).
 * Fusiona e-commerce (`pagos`) + POS (`formaPagosPos`) en una fila por método y
 * permite activar/desactivar y ordenar cada método por canal de forma independiente,
 * crear/editar su config global e inhabilitar/rehabilitar el método completo.
 * Reemplaza a `extras/formas-pago` y `extras/pos/formas-pago`.
 */
@Component({
  selector: 'app-metodos-pago',
  templateUrl: './metodos-pago.component.html',
  styleUrls: ['./metodos-pago.component.scss'],
})
export class MetodosPagoComponent implements OnInit {
  @ViewChild('modalForm', { static: true }) modalForm!: TemplateRef<any>;

  metodos: MetodoPagoUnificado[] = [];
  filtrados: MetodoPagoUnificado[] = [];
  cargando = false;
  filtro = '';

  form: FormGroup;
  editando = false;
  metodoEditando: MetodoPagoUnificado | null = null;

  /** Opciones de clasificación (mismas del form anterior de formas de pago). */
  clasificaciones: string[] = [
    'Online',
    'Offline (Efectivo, Datafono, consignación, Transferencia, App, QR)',
    'Billeteras Virtuales',
    'Criptomonedas',
    'Pago a Credito',
    'Envío de dinero a Colombia desde cualquier lugar del mundo',
  ];

  constructor(
    private service: MetodosPagoService,
    private fb: FormBuilder,
    private modalService: NgbModal,
    private pedidosUtil: PedidosUtilService,
    private posPedidosUtil: POSPedidosUtilService,
  ) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      online: [this.clasificaciones[1], Validators.required],
      integracion: ['No', Validators.required],
      descripcionCorreoElectronico: [''],
      recordatorioCobro: [''],
      // Solo relevantes al CREAR:
      dispEcommerce: [true],
      posEcommerce: [''],
      dispPos: [true],
      posPos: [''],
    });
  }

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando = true;
    this.service.getMetodosUnificados().subscribe({
      next: (m) => {
        this.metodos = m;
        this.aplicarFiltro();
        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        Swal.fire('Error', 'No se pudieron cargar los métodos de pago', 'error');
      },
    });
  }

  aplicarFiltro(): void {
    const q = this.filtro.trim().toLowerCase();
    this.filtrados = !q
      ? [...this.metodos]
      : this.metodos.filter(
          (m) =>
            m.nombre.toLowerCase().includes(q) ||
            (m.online || '').toLowerCase().includes(q),
        );
  }

  /** Activa/desactiva un método en un canal. Recarga al terminar. */
  toggleCanal(metodo: MetodoPagoUnificado, canal: CanalPago): void {
    const nuevo = !metodo[canal].disponible;
    this.cargando = true;
    this.service.setDisponibilidad(metodo, canal, nuevo).subscribe({
      next: () => this.trasMutacion(),
      error: (e) => this.manejarError(e, metodo, canal),
    });
  }

  /** Guarda la posición (orden) de un método en un canal donde ya existe. */
  guardarPosicion(metodo: MetodoPagoUnificado, canal: CanalPago, valor: string): void {
    const posicion = Number(valor);
    if (!Number.isFinite(posicion)) return;
    this.service.setPosicion(metodo, canal, posicion).subscribe({
      next: () => {
        metodo[canal].posicion = posicion;
        this.invalidarCachesVenta();
      },
      error: () => Swal.fire('Error', 'No se pudo actualizar la posición', 'error'),
    });
  }

  // --- Crear / editar config global (modal) ------------------------------

  abrirCrear(): void {
    this.editando = false;
    this.metodoEditando = null;
    this.form.reset({
      nombre: '',
      online: this.clasificaciones[1],
      integracion: 'No',
      descripcionCorreoElectronico: '',
      recordatorioCobro: '',
      dispEcommerce: true,
      posEcommerce: '',
      dispPos: true,
      posPos: '',
    });
    this.modalService.open(this.modalForm, { size: 'lg', centered: true });
  }

  abrirEditar(metodo: MetodoPagoUnificado): void {
    this.editando = true;
    this.metodoEditando = metodo;
    this.form.reset({
      nombre: metodo.nombre,
      online: metodo.online || this.clasificaciones[1],
      integracion: metodo.integracion || 'No',
      descripcionCorreoElectronico: metodo.descripcionCorreoElectronico || '',
      recordatorioCobro: metodo.recordatorioCobro || '',
      dispEcommerce: metodo.ecommerce.disponible,
      posEcommerce: metodo.ecommerce.posicion ?? '',
      dispPos: metodo.pos.disponible,
      posPos: metodo.pos.posicion ?? '',
    });
    this.modalService.open(this.modalForm, { size: 'lg', centered: true });
  }

  guardarModal(modal: any): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.value;

    if (this.editando && this.metodoEditando) {
      // Edita la config global; disponibilidad/posición se manejan en la tabla.
      this.cargando = true;
      this.service
        .guardarConfigGlobal(this.metodoEditando, {
          nombre: v.nombre,
          online: v.online,
          integracion: v.integracion,
          descripcionCorreoElectronico: v.descripcionCorreoElectronico,
          recordatorioCobro: v.recordatorioCobro,
        })
        .subscribe({
          next: () => {
            modal.close();
            this.trasMutacion();
          },
          error: (e) => this.manejarError(e),
        });
      return;
    }

    // Crear: al menos un canal.
    if (!v.dispEcommerce && !v.dispPos) {
      Swal.fire('Falta canal', 'Selecciona al menos un canal (E-commerce o POS).', 'warning');
      return;
    }
    const canales: { ecommerce?: { posicion?: number }; pos?: { posicion?: number } } = {};
    if (v.dispEcommerce) canales.ecommerce = { posicion: this.numOrUndef(v.posEcommerce) };
    if (v.dispPos) canales.pos = { posicion: this.numOrUndef(v.posPos) };

    this.cargando = true;
    this.service
      .crearMetodo(
        {
          nombre: v.nombre,
          online: v.online,
          integracion: v.integracion,
          descripcionCorreoElectronico: v.descripcionCorreoElectronico,
          recordatorioCobro: v.recordatorioCobro,
        },
        canales,
      )
      .subscribe({
        next: () => {
          modal.close();
          this.trasMutacion();
        },
        error: (e) => this.manejarError(e),
      });
  }

  // --- Inhabilitar / rehabilitar (T-09) ----------------------------------

  /** true si el método existe pero no está disponible en ningún canal. */
  estaInhabilitado(m: MetodoPagoUnificado): boolean {
    const existe = m.ecommerce.existe || m.pos.existe;
    const disponible = m.ecommerce.disponible || m.pos.disponible;
    return existe && !disponible;
  }

  inhabilitar(metodo: MetodoPagoUnificado): void {
    Swal.fire({
      title: '¿Inhabilitar método?',
      text: `"${metodo.nombre}" dejará de estar disponible en todos los canales. Se conserva el historial.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Inhabilitar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.cargando = true;
      this.service.inhabilitarMetodo(metodo).subscribe({
        next: () => this.trasMutacion(),
        error: (e) => this.manejarError(e),
      });
    });
  }

  rehabilitar(metodo: MetodoPagoUnificado): void {
    this.cargando = true;
    this.service.rehabilitarMetodo(metodo).subscribe({
      next: () => this.trasMutacion(),
      error: (e) => this.manejarError(e),
    });
  }

  /** Borrado físico (solo disponible cuando el método ya está inhabilitado). */
  eliminarDefinitivo(metodo: MetodoPagoUnificado): void {
    Swal.fire({
      title: '¿Eliminar definitivamente?',
      text: `Se borrará "${metodo.nombre}" de forma permanente. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      confirmButtonText: 'Eliminar definitivamente',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.cargando = true;
      this.service.eliminarDefinitivo(metodo).subscribe({
        next: () => this.trasMutacion(),
        error: (e) => {
          this.cargando = false;
          if (e && e.status === 409) {
            Swal.fire(
              'No se puede borrar',
              'El método debe estar inhabilitado antes de eliminarlo.',
              'warning',
            );
          } else {
            Swal.fire('Error', 'No se pudo eliminar el método', 'error');
          }
        },
      });
    });
  }

  // --- helpers -----------------------------------------------------------

  etiquetaCanal(canal: CanalPago): string {
    return canal === 'ecommerce' ? 'E-commerce' : 'POS';
  }

  trackByClave(_i: number, m: MetodoPagoUnificado): string {
    return m.clave;
  }

  /** Recarga la lista admin y refresca las cachés de venta (checkout + POS). */
  private trasMutacion(): void {
    this.cargarDatos();
    this.invalidarCachesVenta();
  }

  /**
   * Invalida la caché en memoria de formas de pago que usan el checkout (e-commerce)
   * y el POS, para que reflejen los cambios sin recargar la página (T-11).
   */
  private invalidarCachesVenta(): void {
    this.pedidosUtil.refrescarFormasPago();
    this.posPedidosUtil.refrescarFormasPago();
  }

  private numOrUndef(v: any): number | undefined {
    const n = Number(v);
    return v === '' || v === null || v === undefined || !Number.isFinite(n) ? undefined : n;
  }

  private manejarError(e: any, metodo?: MetodoPagoUnificado, canal?: CanalPago): void {
    this.cargando = false;
    if (e && e.status === 409) {
      const donde = canal ? ` en ${this.etiquetaCanal(canal)}` : '';
      const nombre = metodo ? metodo.nombre : this.form.value.nombre;
      Swal.fire('Nombre duplicado', `Ya existe un método "${nombre}"${donde}.`, 'warning');
    } else {
      Swal.fire('Error', 'No se pudo completar la operación', 'error');
    }
  }
}
