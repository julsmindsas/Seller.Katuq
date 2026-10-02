import { Component, OnInit, OnDestroy, Input, ViewChild } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { NgSelectComponent } from '@ng-select/ng-select';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, map, catchError, tap } from 'rxjs/operators';
import Swal from 'sweetalert2';

interface ComboProductoUI {
  cd: string;
  titulo: string;
  referencia: string;
  imagen?: string | null;
  descripcion?: string | null;
  /** Precio general con IVA, solo para mostrar (el combo no guarda precio, D-147). */
  precio?: number | null;
}

@Component({
  selector: 'app-crear-combo',
  templateUrl: './crear-combo.component.html',
  styleUrls: ['./crear-combo.component.scss']
})
export class CrearComboComponent implements OnInit, OnDestroy {
  @Input() mostrarCrear: boolean = true;
  @Input() comboData: any;

  form: FormGroup;

  // ── Buscador para agregar productos (typeahead server-side) ──────────────
  // Rediseño D-341: el buscador solo agrega; lo elegido se ve en la lista de
  // abajo (imagen, nombre, referencia y precio). `imagen`, `descripcion` y
  // `precio` son solo para pintar: el payload que se guarda (armarPayload)
  // sigue siendo {productoId, referencia, nombre}.
  productosBuscados: ComboProductoUI[] = [];
  productosSeleccionados: ComboProductoUI[] = [];
  productoInput$ = new Subject<string>();
  /** El buscador: se vacía después de agregar para dejarlo listo para otro producto. */
  @ViewChild('buscador') buscador?: NgSelectComponent;
  productoLoading = false;
  cargandoSeleccionados = false;
  /** Se pidió guardar: desde ahí se muestran los avisos de lo que falta. */
  intentoGuardar = false;
  guardando = false;
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
      activo: [true]
    });
  }

  ngOnInit(): void {
    this.initBusquedaProductos();

    if (this.comboData) {
      this.mostrarCrear = false;
      this.form.patchValue(this.comboData);

      // Prealimentar con lo guardado (nombre/referencia, sin imagen/descripción
      // — el combo no las persiste) y de inmediato resolver los productos
      // completos por id para pintar imagen, descripción y precio también al
      // editar, no solo cuando se buscan de nuevo.
      const productosGuardados: ComboProductoUI[] = (this.comboData.productos || []).map((p: any) => ({
        cd: p.productoId,
        titulo: p.nombre || '(producto)',
        referencia: p.referencia || ''
      }));
      this.productosSeleccionados = productosGuardados;
      this.resolverProductosGuardados(productosGuardados.map(p => p.cd));
    }
  }

  /** Trae imagen, descripción y precio reales de los productos ya guardados en el combo. */
  private resolverProductosGuardados(ids: string[]): void {
    if (ids.length === 0) return;
    this.cargandoSeleccionados = true;
    this.service.getProductsByIds(ids).subscribe({
      next: (res: any) => {
        const items = this.mapProductos(res?.products || []);
        const porId = new Map(items.map(i => [i.cd, i]));
        // Mantiene el orden guardado; completa lo que traiga el producto.
        this.productosSeleccionados = this.productosSeleccionados.map(p => porId.get(p.cd) || p);
        this.cargandoSeleccionados = false;
      },
      error: () => { this.cargandoSeleccionados = false; }
    });
  }

  ngOnDestroy(): void {
    this.productoSub?.unsubscribe();
  }

  /** Mapea productos completos (Firestore) al shape liviano del selector. */
  private mapProductos(products: any[]): ComboProductoUI[] {
    return (products || []).map((p: any) => ({
      cd: p.cd,
      titulo: p.crearProducto?.titulo || p.identificacion?.referencia || '(sin título)',
      referencia: p.identificacion?.referencia || '',
      imagen: p.crearProducto?.imagenesPrincipales?.[0]?.urls || null,
      descripcion: p.crearProducto?.descripcion || null,
      precio: Number(p.precio?.precioUnitarioConIva) || null
    }));
  }

  /** Texto plano y recortado de la descripción (puede traer HTML — no se renderiza crudo). */
  descripcionPlana(item: ComboProductoUI, maxLen: number = 110): string {
    const texto = (item?.descripcion || '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!texto) return '';
    return texto.length > maxLen ? `${texto.slice(0, maxLen)}…` : texto;
  }

  /**
   * Resultados del buscador sin los productos que ya están en el combo. Es un
   * campo (no un getter) para que el desplegable no reciba un arreglo nuevo en
   * cada detección de cambios.
   */
  opcionesBusqueda: ComboProductoUI[] = [];

  private refrescarOpciones(): void {
    const elegidos = new Set(this.productosSeleccionados.map(p => p.cd));
    this.opcionesBusqueda = this.productosBuscados.filter(p => !elegidos.has(p.cd));
  }

  /**
   * Agrega el producto elegido en el buscador y lo deja listo para otro.
   * `clearModel()` vuelve a emitir `change` con null: ese segundo llamado no hace nada.
   */
  agregarProducto(item: ComboProductoUI | null): void {
    if (!item) return;
    if (!this.productosSeleccionados.some(p => p.cd === item.cd)) {
      this.productosSeleccionados = [...this.productosSeleccionados, item];
      this.refrescarOpciones();
    }
    this.buscador?.clearModel();
  }

  /** Quita un producto del combo. */
  quitarProducto(item: ComboProductoUI): void {
    this.productosSeleccionados = this.productosSeleccionados.filter(p => p.cd !== item.cd);
    this.refrescarOpciones();
  }

  trackProducto(_i: number, p: ComboProductoUI): string {
    return p.cd;
  }

  // ── Vista previa "Así lo ve tu cliente" ──────────────────────────────────
  get nombrePreview(): string {
    return String(this.form.get('nombre')?.value || '').trim() || 'Nombre del combo';
  }

  /** Ticket 1116: la descripción la ve el cliente bajo el nombre del combo. */
  get descripcionPreview(): string {
    return String(this.form.get('descripcion')?.value || '').trim();
  }

  /** Suma de los precios generales; el valor real sale de la lista de cada cliente al vender. */
  get totalGeneral(): number {
    return this.productosSeleccionados.reduce((acc, p) => acc + (Number(p.precio) || 0), 0);
  }

  /** ¿Se conoce el precio de todos los productos? (los recién guardados llegan sin precio hasta resolverse). */
  get todosConPrecio(): boolean {
    return this.productosSeleccionados.length > 0 && this.productosSeleccionados.every(p => Number(p.precio) > 0);
  }

  get faltaNombre(): boolean {
    return !!this.form.get('nombre')?.invalid && (this.intentoGuardar || !!this.form.get('nombre')?.touched);
  }

  get faltanProductos(): boolean {
    return this.intentoGuardar && this.productosSeleccionados.length === 0;
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
          map((res: any) => this.mapProductos(res?.products || [])),
          catchError(() => of([]))
        );
      }),
      tap(() => (this.productoLoading = false))
    ).subscribe((items: ComboProductoUI[]) => {
      this.productosBuscados = items;
      this.refrescarOpciones();
    });
  }

  guardarOEditar(): void {
    if (this.mostrarCrear) {
      this.guardar();
    } else {
      this.editar();
    }
  }

  guardar() {
    if (!this.validar()) return;
    const payload = this.armarPayload();
    this.guardando = true;
    this.service.createCombo(payload).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('¡Creado!', 'El combo quedó listo para cotizar y vender.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.message || 'No se pudo crear el combo.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  editar() {
    if (!this.validar()) return;
    const payload = this.armarPayload();
    this.guardando = true;
    this.service.editCombo(payload).subscribe({
      next: () => {
        this.guardando = false;
        Swal.fire('¡Actualizado!', 'El combo fue actualizado.', 'success')
          .then(() => this.activeModal.close('success'));
      },
      error: (err) => {
        this.guardando = false;
        const msg = err?.error?.message || 'No se pudo actualizar el combo.';
        Swal.fire('Error', msg, 'error');
      }
    });
  }

  /** Nombre y al menos un producto; si falta algo se marca en el formulario. */
  /**
   * Ticket 1114: valida solo lo obligatorio (nombre y al menos un producto) y
   * dice qué falta. Antes miraba `form.invalid`, y un límite de largo en la
   * descripción dejaba inválido un combo con su descripción ya guardada:
   * salía "Falta información" sin que faltara nada.
   */
  private validar(): boolean {
    this.intentoGuardar = true;
    this.form.markAllAsTouched();
    const faltaNombre = !String(this.form.get('nombre')?.value || '').trim();
    const faltanProductos = this.productosSeleccionados.length === 0;
    if (faltaNombre || faltanProductos) {
      const que = faltaNombre && faltanProductos
        ? 'Ponle un nombre al combo y agrega al menos un producto.'
        : faltaNombre ? 'Ponle un nombre al combo.' : 'Agrega al menos un producto al combo.';
      Swal.fire('Falta información', que, 'warning');
      return false;
    }
    return true;
  }

  // Sin campo de precio a propósito (D-147): el combo solo lleva la lista de
  // productos que lo componen — el precio siempre emerge de sumarlos en venta.
  private armarPayload(): any {
    return {
      ...this.form.value,
      productos: this.productosSeleccionados.map(p => ({
        productoId: p.cd,
        referencia: p.referencia,
        nombre: p.titulo
      }))
    };
  }
}
