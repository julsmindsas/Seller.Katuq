import { Component, OnDestroy, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilsService } from '../../../shared/services/utils.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InfoIndicativos } from '../../../../Mock/indicativosPais';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-crear-usuarios',
  templateUrl: './crear-usuarios.component.html',
  styleUrls: ['./crear-usuarios.component.scss']
})
export class CrearUsuariosComponent implements OnInit, OnDestroy {
  public f: FormGroup;
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
    private http: HttpClient
  ) {
    this.f = fb.group({
      cd: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required],
      nombre: ['', [Validators.required]],
      apellido: ['', Validators.required],
      tipoIdentificacion: ['CC', Validators.required],
      identificacion: ['', [Validators.required]],
      activo: [true, Validators.required],
      roles: ['', Validators.required],
      indicativoFijoLocal: ['Indicativo Area', Validators.required],
      fijo: ['', Validators.required],
      extensionFijo: ['', Validators.required],
      indicativoCel: ['Indicativo País', Validators.required],
      cel: ['', Validators.required],
      empresa: [''],
      // Mapeo vendedor WO (Harmony Lens punto 5). Opcional, solo se usa
      // cuando el rol es VENTAS/Vendedor/Asesor y la empresa tiene integración WO.
      vendedorIdWO: [null],
      vendedorNombreWO: ['']
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
    this.http.get<Array<{ id: number; nombre: string }>>(environment.urlApi + '/v1/reports/sellers/wo').subscribe({
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

  cargarUsuario() {
    const usuario = JSON.parse(localStorage.getItem('currentUsuario') || '[]');
    if (usuario) {
      this.f.patchValue(usuario);
      this.f.controls['password'].setValue(''); // Clear password field
    }
  }

  guardar() {
    if (this.f.valid) {
      if (localStorage.getItem('currentUsuario') === null) {
        const usuario = this.f.value;
        this.service.createUser(usuario).subscribe((response: any) => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Usuario creado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.route.navigateByUrl('/usuarios');
        });
      } else {
        this.f.controls['password'].setValue(this.utils.hash(this.f.controls['password'].value));
        const usuario = this.f.value;
        this.service.updateUser(usuario).subscribe((response: any) => {
          Swal.fire({
            title: 'Guardado!',
            text: 'Usuario actualizado con éxito',
            icon: 'success',
            confirmButtonText: 'Ok'
          });
          this.route.navigateByUrl('/usuarios');
        });
      }
    } else {
      Swal.fire({
        icon: 'error',
        title: 'Falta algún dato requerido, por favor verifique',
        showConfirmButton: false,
        timer: 1500
      });
    }
  }

  public irAlListado() {
    this.route.navigateByUrl('/usuarios');
  }
}
