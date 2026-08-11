import { Component, OnInit } from '@angular/core';
import Swal from 'sweetalert2';
import {
  CumplimientoProveedor,
  InventarioService,
  Proveedor,
  SaldoProveedor,
} from '../../../shared/services/inventarios/inventario.service';

/**
 * Proveedores: a quién le compramos.
 *
 * La pantalla existe para que dejen de ser texto libre. Por eso lo primero que
 * muestra de cada uno no son sus datos de contacto sino cuánto se le debe: es
 * la pregunta que se hace todos los días, y la que justifica tener el maestro.
 */
@Component({
  selector: 'app-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrls: ['./proveedores.component.scss'],
})
export class ProveedoresComponent implements OnInit {
  cargando = false;
  guardando = false;
  error: string | null = null;

  proveedores: Proveedor[] = [];
  saldos: SaldoProveedor[] = [];
  cumplimientos: CumplimientoProveedor[] = [];
  totalPorFacturar = 0;

  busqueda = '';
  incluirInactivos = false;

  // Formulario
  editando: Proveedor | null = null;
  mostrarFormulario = false;
  formulario: Partial<Proveedor> = this.formularioVacio();

  constructor(private inventarioService: InventarioService) {}

  ngOnInit(): void {
    this.cargar();
  }

  formularioVacio(): Partial<Proveedor> {
    return {
      nombre: '',
      nit: '',
      contacto: '',
      telefono: '',
      correo: '',
      ciudad: '',
      diasCredito: 0,
      diasEntrega: 0,
    };
  }

  cargar(): void {
    this.cargando = true;
    this.error = null;

    this.inventarioService
      .listarProveedores({ incluirInactivos: this.incluirInactivos, busqueda: this.busqueda || undefined })
      .subscribe({
        next: (respuesta) => {
          this.proveedores = respuesta.proveedores || [];
          this.cargando = false;
        },
        error: (err) => {
          this.error = err?.error?.message || 'No se pudieron cargar los proveedores.';
          this.cargando = false;
        },
      });

    // El cumplimiento también va aparte y por la misma razón: si el cálculo
    // falla, la pantalla sigue sirviendo para administrar proveedores.
    this.inventarioService.cumplimientoProveedores().subscribe({
      next: (r) => { this.cumplimientos = r.proveedores || []; },
      error: () => { this.cumplimientos = []; },
    });

    // El saldo se pide aparte: si falla, la lista igual sirve.
    this.inventarioService.consultarSaldoProveedores().subscribe({
      next: (respuesta) => {
        this.saldos = respuesta.proveedores || [];
        this.totalPorFacturar = respuesta.total || 0;
      },
      error: () => {
        this.saldos = [];
        this.totalPorFacturar = 0;
      },
    });
  }

  /** Lo que se le debe a este proveedor, si tiene compras. */
  saldoDe(proveedor: Proveedor): SaldoProveedor | null {
    return (
      this.saldos.find((s) => s.proveedorId === proveedor.id) ||
      this.saldos.find((s) => !s.proveedorId && s.nombre === proveedor.nombre) ||
      null
    );
  }

  /** Cómo ha cumplido este proveedor, si ya se le compró. */
  cumplimientoDe(proveedor: Proveedor): CumplimientoProveedor | null {
    return (
      this.cumplimientos.find((c) => c.proveedorId === proveedor.id) ||
      this.cumplimientos.find((c) => !c.proveedorId && c.nombre === proveedor.nombre) ||
      null
    );
  }

  /**
   * Lo que se demora de verdad contra lo que prometió. Es el dato que convierte
   * los días de entrega en algo medido y no en un acuerdo de palabra.
   */
  textoEntrega(proveedor: Proveedor): string {
    const c = this.cumplimientoDe(proveedor);
    const prometido = Number(proveedor.diasEntrega) || 0;

    if (!c || c.diasPromedio === null) {
      return prometido ? `${prometido} días acordados` : 'sin medir';
    }

    const real = `${c.diasPromedio} días reales`;
    if (!prometido) return real;
    if (c.diasPromedio > prometido) return `${real} (prometió ${prometido})`;
    return `${real} · cumple`;
  }

  seDemoraDeMas(proveedor: Proveedor): boolean {
    const c = this.cumplimientoDe(proveedor);
    const prometido = Number(proveedor.diasEntrega) || 0;
    return !!c && c.diasPromedio !== null && prometido > 0 && c.diasPromedio > prometido;
  }

  abrirNuevo(): void {
    this.editando = null;
    this.formulario = this.formularioVacio();
    this.mostrarFormulario = true;
  }

  abrirEdicion(proveedor: Proveedor): void {
    this.editando = proveedor;
    this.formulario = { ...proveedor };
    this.mostrarFormulario = true;
  }

  cerrarFormulario(): void {
    this.mostrarFormulario = false;
    this.editando = null;
    this.formulario = this.formularioVacio();
  }

  guardar(): void {
    if (!this.formulario.nombre?.trim()) {
      Swal.fire('Falta el nombre', 'Un proveedor necesita al menos su nombre.', 'warning');
      return;
    }

    this.guardando = true;

    const peticion = this.editando
      ? this.inventarioService.actualizarProveedor(this.editando.id, this.formulario)
      : this.inventarioService.crearProveedor(this.formulario);

    peticion.subscribe({
      next: () => {
        this.guardando = false;
        this.cerrarFormulario();
        this.cargar();
        Swal.fire({
          icon: 'success',
          title: this.editando ? 'Proveedor actualizado' : 'Proveedor creado',
          timer: 1500,
          showConfirmButton: false,
        });
      },
      error: (err) => {
        this.guardando = false;
        this.manejarErrorGuardado(err);
      },
    });
  }

  /**
   * El backend distingue dos choques: mismo NIT (no se puede) y nombre parecido
   * (se avisa y se puede confirmar). Hay razones legítimas para dos proveedores
   * de nombre parecido; para el mismo NIT no.
   */
  private manejarErrorGuardado(err: any): void {
    const mensaje = err?.error?.message || 'No se pudo guardar el proveedor.';

    if (err?.error?.error === 'SUPPLIER_DUPLICATE' && err?.error?.motivo === 'nombre' && !this.editando) {
      Swal.fire({
        icon: 'warning',
        title: 'Ya existe uno parecido',
        text: `${mensaje} ¿Es otro proveedor distinto?`,
        showCancelButton: true,
        confirmButtonText: 'Sí, crear de todos modos',
        cancelButtonText: 'Cancelar',
      }).then((resultado) => {
        if (!resultado.isConfirmed) return;
        this.guardando = true;
        this.inventarioService.crearProveedor({ ...this.formulario, forzar: true }).subscribe({
          next: () => {
            this.guardando = false;
            this.cerrarFormulario();
            this.cargar();
          },
          error: (e) => {
            this.guardando = false;
            Swal.fire('Error', e?.error?.message || mensaje, 'error');
          },
        });
      });
      return;
    }

    Swal.fire('No se pudo guardar', mensaje, 'error');
  }

  desactivar(proveedor: Proveedor): void {
    Swal.fire({
      title: `¿Desactivar a ${proveedor.nombre}?`,
      text: 'Deja de aparecer al crear órdenes, pero su historial de compras se conserva.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, desactivar',
      cancelButtonText: 'Cancelar',
    }).then((resultado) => {
      if (!resultado.isConfirmed) return;
      this.inventarioService.desactivarProveedor(proveedor.id).subscribe({
        next: () => this.cargar(),
        error: (err) => Swal.fire('Error', err?.error?.message || 'No se pudo desactivar.', 'error'),
      });
    });
  }

  textoCredito(dias: number): string {
    if (!dias) return 'De contado';
    return `${dias} días`;
  }
}
