import { Component, OnDestroy, OnInit } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilsService } from '../../../shared/services/utils.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InfoIndicativos } from '../../../../Mock/indicativosPais';
import { ReportsService } from '../../../shared/services/dashboard/reports.service';

@Component({
  selector: 'app-crear-usuarios',
  templateUrl: './crear-usuarios.component.html',
  styleUrls: ['./crear-usuarios.component.scss']
})
export class CrearUsuariosComponent implements OnInit, OnDestroy {
  public f: FormGroup;
  private readonly passwordMinLength = 8;
  indicativos: { nombre: string; name: string; nom: string; iso2: string; iso3: string; phone_code: string; }[];
  indicativosLocales: any[];
  empresas: any[] = [];
  roles: any[] = [];
  showCompanySelect: boolean = false;
  usuarioId: string | null = null;

  // Vendedores WO de la empresa (cargados via /v1/reports/sellers/wo).
  // Si la empresa NO tiene integración worldoffice activa, el endpoint retorna []
  // y los campos del form quedan ocultos (`hasWOVendedores === false`).
  vendedoresWO: Array<{ id: number; nombre: string }> = [];
  hasWOVendedores = false;

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    private utils: UtilsService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private infoIndicativo: InfoIndicativos,
    private reportsService: ReportsService
  ) {
    this.f = fb.group({
      cd: [''],
      // Críticos — sin estos no podés crear/usar al user.
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(this.passwordMinLength)]],
      nombre: ['', [Validators.required]],
      apellido: ['', Validators.required],
      tipoIdentificacion: ['CC', Validators.required],
      identificacion: ['', [Validators.required]],
      roles: ['', Validators.required],
      // No críticos: estado + contacto.
      // `activo` siempre tiene valor (boolean), no necesita required.
      activo: [true],
      // Teléfono fijo, extensión e indicativo del fijo son opcionales — muchos
      // usuarios no tienen teléfono fijo o no aplica (vendedor móvil, etc).
      indicativoFijoLocal: ['Indicativo Area'],
      fijo: [''],
      extensionFijo: [''],
      // Celular: opcional. Si lo llenás, el indicativo país también ayuda pero
      // no se fuerza para no romper el guardado por un placeholder.
      indicativoCel: ['Indicativo País'],
      cel: [''],
      empresa: [''],
      // Mapeo vendedor WO (Harmony Lens punto 5). Opcional, solo se usa
      // cuando el rol es VENTAS/Vendedor/Asesor y la empresa tiene integración WO.
      vendedorIdWO: [null],
      vendedorNombreWO: [''],
      // Bienvenida personalizada por usuario. Solo aplica si rol != Administrador.
      // bienvenidaTipo = 'default' | 'ruta' | 'reporte' | null.
      // bienvenidaPath = ruta absoluta a la que el frontend redirige tras login.
      bienvenidaTipo: [null],
      bienvenidaPath: [null]
    });
  }

  ngOnDestroy(): void {
    localStorage.removeItem('currentUsuario');
  }

  ngOnInit(): void {
    this.indicativos = this.infoIndicativo.datos;
    this.indicativosLocales = this.infoIndicativo.indicativosLocales;

    this.cargarEmpresas();
    this.cargarRoles();

    const user = localStorage.getItem('user');
    const userCompany = user ? JSON.parse(user).company : '';
    if (userCompany === 'Julsmind') {
      this.showCompanySelect = true;
    } else {
      this.f.controls['empresa'].setValue(userCompany);
    }

    // this.usuarioId = this.activatedRoute.snapshot.paramMap.get('id');
    // if (this.usuarioId) {
    this.cargarUsuario();
    // }

    this.cargarVendedoresWO();
  }

  /**
   * Carga la lista de vendedores WO de la empresa desde el backend.
   * Si la empresa no tiene integración WO o no hay docs, el array queda vacío
   * y los campos del form se ocultan (`hasWOVendedores === false`).
   */
  cargarVendedoresWO(): void {
    this.reportsService.getSellersWO().subscribe({
      next: (list) => {
        this.vendedoresWO = list || [];
        this.hasWOVendedores = this.vendedoresWO.length > 0;
      },
      error: () => {
        this.vendedoresWO = [];
        this.hasWOVendedores = false;
      },
    });
  }

  /**
   * Cuando el admin selecciona un vendedor del datalist (escribe nombre),
   * auto-completa el id. Si escribe libre y no matchea, deja id null
   * (el admin puede setearlo manualmente o el filtro caerá al fallback por nombre).
   */
  onVendedorNombreChange(nombre: string): void {
    const match = this.vendedoresWO.find((v) => v.nombre === nombre);
    this.f.controls['vendedorIdWO'].setValue(match ? match.id : null);
  }

  // ─── Configuración avanzada de bienvenida ──────────────────────────────────
  // Modal con selector de pantalla inicial. Solo visible si rol != Administrador.

  showBienvenidaModal = false;
  bienvenidaTipoSeleccionado: 'default' | 'ruta' | 'reporte' = 'default';
  bienvenidaRutaSeleccionada: string = '';
  bienvenidaReporteSeleccionado: string = '';
  reportesGuardados: Array<{ id: string; nombre: string }> = [];

  // Catálogo curado de rutas seguras para no-admin. Excluye rutas administrativas
  // (/rol, /empresas, /usuarios). Los labels se muestran al admin en el modal.
  rutasDisponibles = [
    { path: '/welcome', label: 'Pantalla de bienvenida (Default)' },
    { path: '/pedidos', label: 'Pedidos' },
    { path: '/pos', label: 'POS — Punto de Venta' },
    { path: '/productos', label: 'Productos' },
    { path: '/inventario', label: 'Inventario' },
    { path: '/clientes', label: 'Clientes' },
    { path: '/despachos', label: 'Despachos' },
    { path: '/picking-packing/picking', label: 'Picking' },
    { path: '/picking-packing/packing', label: 'Packing' },
    { path: '/dashboards', label: 'Dashboard gerencial' },
    { path: '/dashboards/builder', label: 'Constructor de reportes' },
  ];

  get esRolAdmin(): boolean {
    const rol = String(this.f?.controls['roles']?.value || '').toLowerCase();
    return rol === 'administrador';
  }

  get bienvenidaPathActual(): string {
    return this.f?.controls['bienvenidaPath']?.value || '';
  }

  get bienvenidaLabelActual(): string {
    const tipo = this.f?.controls['bienvenidaTipo']?.value;
    const path = this.f?.controls['bienvenidaPath']?.value;
    if (!tipo || tipo === 'default' || !path) return 'Pantalla de bienvenida (Default)';
    if (tipo === 'reporte') {
      // Match contra /view/ (preferido) y /builder/ (legacy, paths viejos antes
      // del cambio a vista previa ejecutada).
      const rep = this.reportesGuardados.find((r) =>
        `/dashboards/view/${r.id}` === path || `/dashboards/builder/${r.id}` === path
      );
      if (rep) return `Reporte: ${rep.nombre}`;
      // Lazy-load: si el modal nunca se abrió, los reportes no están en cache.
      // Disparamos el fetch y mostramos placeholder mientras tanto.
      if (this.reportesGuardados.length === 0) {
        this.reportsService.list().subscribe({
          next: (list) => {
            this.reportesGuardados = (list || []).map((r: any) => ({ id: r.id, nombre: r.name || r.nombre || r.title || '(sin nombre)' }));
          },
          error: () => { },
        });
      }
      return 'Reporte guardado';
    }
    const ruta = this.rutasDisponibles.find((r) => r.path === path);
    return ruta ? ruta.label : path;
  }

  abrirBienvenidaModal(): void {
    // Cargar reportes guardados de la empresa (perezoso, solo al abrir el modal)
    if (this.reportesGuardados.length === 0) {
      this.reportsService.list().subscribe({
        next: (list) => {
          this.reportesGuardados = (list || []).map((r: any) => ({ id: r.id, nombre: r.name || r.nombre || r.title || '(sin nombre)' }));
        },
        error: () => { this.reportesGuardados = []; },
      });
    }
    // Pre-cargar el estado actual del form en el modal
    const tipoActual = this.f.controls['bienvenidaTipo'].value || 'default';
    this.bienvenidaTipoSeleccionado = tipoActual;
    const pathActual = this.f.controls['bienvenidaPath'].value || '';
    if (tipoActual === 'ruta') this.bienvenidaRutaSeleccionada = pathActual;
    if (tipoActual === 'reporte') {
      // Aceptar /view/:id (nuevo) y /builder/:id (legacy) para compat.
      const match = pathActual.match(/^\/dashboards\/(view|builder)\/(.+)$/);
      this.bienvenidaReporteSeleccionado = match ? match[2] : '';
    }
    this.showBienvenidaModal = true;
  }

  cerrarBienvenidaModal(): void {
    this.showBienvenidaModal = false;
  }

  guardarBienvenida(): void {
    let tipo: string | null = this.bienvenidaTipoSeleccionado;
    let path: string | null = null;
    if (tipo === 'default') {
      tipo = null;
      path = null;
    } else if (tipo === 'ruta') {
      path = this.bienvenidaRutaSeleccionada || null;
      if (!path) tipo = null;
    } else if (tipo === 'reporte') {
      // /view/:id es el modo "vista previa ejecutada" (no el builder editable).
      // El usuario abre el reporte directamente con sus datos filtrados, sin
      // ver la UI de drag-and-drop del constructor.
      path = this.bienvenidaReporteSeleccionado ? `/dashboards/view/${this.bienvenidaReporteSeleccionado}` : null;
      if (!path) tipo = null;
    }
    this.f.controls['bienvenidaTipo'].setValue(tipo);
    this.f.controls['bienvenidaPath'].setValue(path);
    this.showBienvenidaModal = false;
  }

  cargarEmpresas() {
    this.service.consultarEmpresas().subscribe((x: any) => {
      const datos = x;
      this.empresas = [...datos];
    });
  }

  cargarRoles() {
    this.service.getRol().subscribe((roles: any) => {
      this.roles = roles;
    });
  }

  /** True si estamos editando un usuario existente (vs creando uno nuevo) */
  get esModoEdicion(): boolean {
    return localStorage.getItem('currentUsuario') !== null;
  }

  cargarUsuario() {
    const usuario = JSON.parse(localStorage.getItem('currentUsuario') || '[]');
    if (usuario) {
      this.f.patchValue(usuario);
      this.f.controls['password'].setValue(''); // Clear password field
      // En modo edición, la contraseña es OPCIONAL: si el admin la deja vacía,
      // se mantiene la actual del Firestore. Solo se actualiza si escribe una nueva.
      this.f.controls['password'].setValidators([Validators.minLength(this.passwordMinLength)]);
      this.f.controls['password'].updateValueAndValidity();
    }
  }

  guardar() {
    if (this.f.valid) {
      if (localStorage.getItem('currentUsuario') === null) {
        const usuario = this.buildUsuarioPayload();
        this.service.createUser(usuario).subscribe((response: any) => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Usuario creado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.route.navigateByUrl('/usuarios');
        }, error => {
          this.mostrarErrorGuardado(error);
        });
      } else {
        // Modo edición: solo hashear y enviar password si el admin escribió una
        // nueva. Si la dejó vacía, NO se incluye en el payload (el backend
        // mantiene la actual de Firestore intacta).
        const usuario = this.buildUsuarioPayload();
        this.service.updateUser(usuario).subscribe((response: any) => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Usuario actualizado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.route.navigateByUrl('/usuarios');
        }, error => {
          this.mostrarErrorGuardado(error);
        });
      }
    } else {
      // Marcar todos los controls como touched para que la UI muestre los errores
      // inline. Y armar mensaje específico con los campos faltantes.
      this.f.markAllAsTouched();
      const camposFaltantes = this.getCamposInvalidos();
      Swal.fire({
        icon: 'error',
        title: 'Faltan datos para guardar',
        html: camposFaltantes.length > 0
          ? `Por favor completá:<br><strong>${camposFaltantes.join(', ')}</strong>`
          : 'Por favor verificá los datos del formulario.',
        confirmButtonText: 'Entendido'
      });
    }
  }

  /**
   * Devuelve la lista de labels en español de los controls del form que están
   * en estado inválido. Útil para mensaje específico al guardar.
   */
  private getCamposInvalidos(): string[] {
    const labels: Record<string, string> = {
      email: 'Email',
      password: 'Contraseña',
      nombre: 'Nombres',
      apellido: 'Apellidos',
      tipoIdentificacion: 'Tipo de identificación',
      identificacion: 'Identificación',
      roles: 'Rol',
    };
    const faltantes: string[] = [];
    for (const key of Object.keys(this.f.controls)) {
      const ctrl = this.f.controls[key];
      if (ctrl.invalid && labels[key]) {
        faltantes.push(labels[key]);
      }
    }
    return faltantes;
  }

  private buildUsuarioPayload(): any {
    const usuario = { ...this.f.value };
    const password = (usuario.password || '').trim();

    if (password) {
      usuario.password = this.utils.hash(password);
    } else {
      delete usuario.password;
    }

    usuario.email = (usuario.email || '').trim().toLowerCase();
    return usuario;
  }

  private mostrarErrorGuardado(error: any): void {
    const mensaje = error?.error?.message || error?.error?.msg || 'No fue posible guardar el usuario.';
    Swal.fire({
      icon: 'error',
      title: 'Error al guardar',
      text: mensaje,
      confirmButtonText: 'Entendido'
    });
  }

  public irAlListado() {
    this.route.navigateByUrl('/usuarios');
  }
}
