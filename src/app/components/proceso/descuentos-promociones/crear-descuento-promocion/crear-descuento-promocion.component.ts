import { Component, OnInit, OnDestroy, Input } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { parse as flatedParse } from 'flatted';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-crear-descuento-promocion',
  templateUrl: './crear-descuento-promocion.component.html',
  styleUrls: ['./crear-descuento-promocion.component.scss']
})
export class CrearDescuentoPromocionComponent implements OnInit, OnDestroy {
  @Input() mostrarCrear: boolean = true;
  @Input() descuentoData: any;

  form: FormGroup;

  tiposDescuento = [
    { label: 'Porcentaje (%)', value: 'porcentaje' },
    { label: 'Valor fijo ($)', value: 'valor_fijo' },
    { label: 'Envío gratis', value: 'envio_gratis' }
  ];

  aplicaAOpciones = [
    { label: 'Todos los productos', value: 'todos_los_productos' },
    { label: 'Categoría específica', value: 'categoria' },
    { label: 'Producto específico', value: 'producto_especifico' }
  ];

  // ── Target de aplicación ────────────────────────────────────────────────
  categorias: { nombre: string; path: string }[] = [];   // categorías aplanadas del árbol
  productosBuscados: { cd: string; titulo: string; referencia: string }[] = [];
  productoInput$ = new Subject<string>();
  productoLoading = false;
  private productoSub?: Subscription;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    public activeModal: NgbActiveModal
  ) {
    this.form = this.fb.group({
      id: [''],
      nombre: ['', Validators.required],
      descripcion: [''],
      codigoPersonalizado: ['', Validators.required],
      tipo: ['porcentaje', Validators.required],
      valor: [0, [Validators.required, Validators.min(0)]],
      fechaInicio: ['', Validators.required],
      fechaFin: ['', Validators.required],
      limiteUsos: [null],
      aplicaA: ['todos_los_productos', Validators.required],
      activo: [true],
      // ── Campos nuevos ────────────────────────────────────────────────────
      montoMinimo: [null, [Validators.min(0)]],
      limiteUsosPorCliente: [null, [Validators.min(1)]],
      combinable: [false],
      // ── Target de aplicación (categoría / producto) ──────────────────────
      categoriaNombre: [null],
      productoId: [null],
      productoNombre: [null],
      productoReferencia: [null]
    });
  }

  ngOnInit(): void {
    this.cargarCategorias();
    this.initBusquedaProductos();

    if (this.descuentoData) {
      this.mostrarCrear = false;
      this.form.patchValue(this.descuentoData);

      // Prealimentar el ng-select de producto para que muestre el seleccionado.
      if (this.descuentoData.aplicaA === 'producto_especifico' && this.descuentoData.productoId) {
        this.productosBuscados = [{
          cd: this.descuentoData.productoId,
          titulo: this.descuentoData.productoNombre || '(producto)',
          referencia: this.descuentoData.productoReferencia || ''
        }];
      }
    }

    // Ajustar validadores según aplicaA actual, SIN limpiar valores existentes.
    this.aplicarValidadoresTarget(false);
  }

  ngOnDestroy(): void {
    this.productoSub?.unsubscribe();
  }

  get tipoSeleccionado() { return this.form.get('tipo')?.value; }
  get aplicaASeleccionado() { return this.form.get('aplicaA')?.value; }

  codigoUpper(event: any) {
    const upper = (event.target.value || '').toUpperCase();
    event.target.value = upper;
    this.form.get('codigoPersonalizado')?.setValue(upper, { emitEvent: false });
  }

  // ── Carga y aplanado de categorías (árbol → lista de nombres) ────────────
  private cargarCategorias(): void {
    this.service.getCategorias().subscribe({
      next: (r: any) => {
        try {
          const tree = flatedParse((r as any[])[0].categoria);
          this.categorias = this.aplanarCategorias(tree);
        } catch {
          this.categorias = [];
        }
      },
      error: () => { this.categorias = []; }
    });
  }

  private aplanarCategorias(nodes: any[], prefix = ''): { nombre: string; path: string }[] {
    let out: { nombre: string; path: string }[] = [];
    (nodes || []).forEach((n: any) => {
      const nombre = n?.data?.nombre;
      if (nombre) {
        const path = prefix ? `${prefix} › ${nombre}` : nombre;
        out.push({ nombre, path });
        if (n.children?.length) {
          out = out.concat(this.aplanarCategorias(n.children, path));
        }
      }
    });
    return out;
  }

  // ── Búsqueda de productos con typeahead (server-side) ────────────────────
  private initBusquedaProductos(): void {
    this.productoSub = this.productoInput$.pipe(
      debounceTime(300),
      distinctUntilChanged(),
      tap(() => (this.productoLoading = true)),
      switchMap((term) => {
        if (!term || term.trim().length < 2) {
          this.productoLoading = false;
          return of([]);
        }
        return this.service.quickSearchProducts(term.trim(), 20, 'all').pipe(
          map((res: any) => (res?.products || []).map((p: any) => ({
            cd: p.cd,
            titulo: p.crearProducto?.titulo || p.identificacion?.referencia || '(sin título)',
            referencia: p.identificacion?.referencia || ''
          }))),
          catchError(() => of([]))
        );
      }),
      tap(() => (this.productoLoading = false))
    ).subscribe((items: any[]) => {
      this.productosBuscados = items;
    });
  }

  onProductoChange(item: any): void {
    this.form.patchValue({
      productoNombre: item?.titulo || null,
      productoReferencia: item?.referencia || null
    });
  }

  // ── Cambio de "Aplica a": limpia el target no relevante y ajusta validadores ─
  onAplicaAChange(): void {
    this.aplicarValidadoresTarget(true);
  }

  private aplicarValidadoresTarget(limpiar: boolean): void {
    const val = this.form.get('aplicaA')?.value;
    const catCtrl = this.form.get('categoriaNombre');
    const prodCtrl = this.form.get('productoId');

    catCtrl?.clearValidators();
    prodCtrl?.clearValidators();

    if (val === 'categoria') {
      catCtrl?.setValidators([Validators.required]);
      if (limpiar) {
        this.form.patchValue({ productoId: null, productoNombre: null, productoReferencia: null });
      }
    } else if (val === 'producto_especifico') {
      prodCtrl?.setValidators([Validators.required]);
      if (limpiar) {
        this.form.patchValue({ categoriaNombre: null });
      }
    } else if (limpiar) {
      this.form.patchValue({
        categoriaNombre: null,
        productoId: null, productoNombre: null, productoReferencia: null
      });
    }

    catCtrl?.updateValueAndValidity();
    prodCtrl?.updateValueAndValidity();
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    this.service.createDescuentoPromocion(this.form.value).subscribe({
      next: () => {
        Swal.fire('¡Creado!', 'El descuento fue creado exitosamente.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo crear el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  editar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      Swal.fire('Error', 'Por favor complete todos los campos requeridos', 'error');
      return;
    }
    this.service.editDescuentoPromocion(this.form.value).subscribe({
      next: () => {
        Swal.fire('¡Actualizado!', 'El descuento fue actualizado.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        const msg = err?.error?.message || 'No se pudo actualizar el descuento.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }
}
