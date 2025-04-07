import { Component, OnDestroy, OnInit } from '@angular/core';
import { MaestroService } from '../../../shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { UtilsService } from '../../../shared/services/utils.service';
import { ActivatedRoute, Router } from '@angular/router';
import { InfoIndicativos } from '../../../../Mock/indicativosPais';

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

  constructor(
    private fb: FormBuilder,
    private service: MaestroService,
    private utils: UtilsService,
    private route: Router,
    private activatedRoute: ActivatedRoute,
    private infoIndicativo: InfoIndicativos
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
      empresa: ['']
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
