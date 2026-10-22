import { Component, OnInit } from '@angular/core';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
import { Table } from 'primeng/table';
import Swal from 'sweetalert2';

import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-usuarios',
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.scss']
})
export class UsuariosComponent implements OnInit {
  cargando = true;
  rows = [];
  temp: any[] = [];
  userRol: any;
  userNit: any;
  NombreUsuario = '';
  Vendedor = 0;
  empresas = [];
  closeResult: string;
  isMobile = false;
  usuarios: any;
  filterValue: string = '';
  
  constructor(private service: MaestroService, private router: Router,
    private translate: TranslateService
  ) {
    this.cargarDatos()
  }
  
  cargarDatos() {
    this.cargando = true
    this.service.consultarUsuarios().subscribe((x: any) => {
      const datos = (x || []).map((usuario: any) => ({
        ...usuario,
        id: usuario.id || usuario.cd
      }));
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      this.usuarios = datos;
      localStorage.setItem('usuarios', JSON.stringify(datos)); // Guardar en localStorage
      this.cargando = false
    })
  }

  ngOnInit(): void {
    if (window.screen.width < 700) {
      this.isMobile = true;
    }
    this.service.getMetricasEquipo().subscribe({
      next: (r: any) => { this.metricasSoloPropias = !!r?.activado; this.metricasCargado = true; },
      error: () => { this.metricasCargado = false; },
    });
  }

  // ─── D-349: un solo botón para que el equipo de ventas vea solo sus métricas ───

  /** null mientras carga; true = cada vendedor ve solo lo suyo. */
  metricasSoloPropias: boolean | null = null;
  metricasCargado = false;

  /** Rol de ventas (mismo criterio que el backend, services/metricasPropias.js). */
  private esRolVentas(rol: any): boolean {
    const r = String(rol || '').toLowerCase();
    if (/administrador|director|gerente|jefe|coordinador|supervisor|lider|líder/.test(r)) return false;
    return /vendedor|seller|asesor|ventas|comercial/.test(r);
  }

  /** Usuarios de la empresa de la sesión a los que les aplica (rol de ventas). */
  get usuariosVentas(): any[] {
    let empresa = '';
    try { empresa = JSON.parse(localStorage.getItem('user') || '{}')?.company || ''; } catch (_) { }
    return (this.temp || []).filter(u =>
      this.esRolVentas(u.roles) && (!empresa || !u.empresa || u.empresa === empresa));
  }

  get metricasBotonTexto(): string {
    return this.metricasSoloPropias ? this.translate.instant('usuarios.usuarios.vendedoresSoloSusMetricas') : this.translate.instant('usuarios.usuarios.vendedoresMetricasDeTodos');
  }

  get metricasTooltip(): string {
    return this.metricasSoloPropias
      ? this.translate.instant('usuarios.usuarios.tooltipSoloPropias')
      : this.translate.instant('usuarios.usuarios.tooltipTodos');
  }

  cambiarMetricasEquipo(): void {
    if (!this.metricasCargado) return;
    const nuevo = !this.metricasSoloPropias;
    const ventas = this.usuariosVentas;
    const lista = ventas.length
      ? '<ul style="text-align:left;max-height:160px;overflow:auto;margin:8px 0 0;">' + ventas.map(u =>
          `<li>${this.escapar([u.nombre, u.apellido].filter(Boolean).join(' ') || u.email)} <small style="color:#6b7280;">(${this.escapar(u.roles)})</small></li>`).join('') + '</ul>'
      : `<p style="color:#6b7280;margin:8px 0 0;">${this.translate.instant('usuarios.usuarios.hoyNoHayUsuariosDeVentas')}</p>`;

    Swal.fire({
      title: nuevo ? this.translate.instant('usuarios.usuarios.cadaVendedorVeraSoloSus') : this.translate.instant('usuarios.usuarios.losVendedoresVeranLasMetricas'),
      html: (nuevo
        ? this.translate.instant('usuarios.usuarios.metricasSoloPropiasAviso')
        : this.translate.instant('usuarios.usuarios.metricasEquipoAviso'))
        + `<p style="margin:12px 0 0;">${ventas.length === 1 ? this.translate.instant('usuarios.usuarios.lesAplicaAUnUsuario') : this.translate.instant('usuarios.usuarios.lesAplicaAUsuarios', {n: ventas.length})}</p>` + lista
        + `<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">${this.translate.instant('usuarios.usuarios.otrosRolesSiguenViendoTodo')}</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: this.translate.instant('usuarios.usuarios.siCambiar'),
      cancelButtonText: this.translate.instant('comun.cancelar'),
    }).then(r => {
      if (!r.isConfirmed) return;
      this.service.saveMetricasEquipo(nuevo).subscribe({
        next: () => {
          this.metricasSoloPropias = nuevo;
          Swal.fire({
            icon: 'success',
            title: nuevo ? this.translate.instant('usuarios.usuarios.cadaVendedorVeraSoloSus2') : this.translate.instant('usuarios.usuarios.losVendedoresVeranLasMetricas2'),
            text: this.translate.instant('usuarios.usuarios.lasCifrasCambianDeInmediato'),
            confirmButtonText: this.translate.instant('comun.entendido'),
          });
        },
        error: (e) => Swal.fire(this.translate.instant('comun.error'), e?.error?.message || this.translate.instant('usuarios.usuarios.noFuePosibleGuardarEl'), 'error'),
      });
    });
  }

  private escapar(v: any): string {
    return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' } as any)[c]);
  }
  
  crearUsuario() {
    this.router.navigateByUrl('usuarios/crearUsuario');
  };

  updateFilter(event: any) {
    this.filterValue = event.target.value.toLowerCase();
    // Aplicamos el filtro a los datos localmente
    if (this.filterValue) {
      this.usuarios = this.temp.filter(usuario => 
        this.contieneBusqueda(usuario.identificacion, this.filterValue) || 
        this.contieneBusqueda(usuario.nombre, this.filterValue) || 
        this.contieneBusqueda(usuario.apellido, this.filterValue) || 
        this.contieneBusqueda(usuario.email, this.filterValue) ||
        this.contieneBusqueda(usuario.empresa, this.filterValue)
      );
    } else {
      this.usuarios = [...this.temp];
    }
  }
  
  // Método auxiliar para verificar si un campo contiene el texto de búsqueda
  contieneBusqueda(campo: any, busqueda: string): boolean {
    if (!campo) return false;
    return campo.toString().toLowerCase().includes(busqueda);
  }

  editar(row) {
    this.router.navigateByUrl('usuarios/editarUsuario/' + row.id);
  }

  editarUsuario(usuario: any) {
    localStorage.setItem('currentUsuario', JSON.stringify(usuario));
    this.router.navigate(['usuarios/crearUsuario']);
  }
  
  eliminarUsuario(usuario: any) {
    const usuarioId = usuario?.cd || usuario?.id;
    if (!usuarioId) {
      Swal.fire(
        this.translate.instant('comun.error'),
        this.translate.instant('usuarios.usuarios.noFuePosibleIdentificarEl'),
        'error'
      );
      return;
    }

    Swal.fire({
      title: this.translate.instant('usuarios.usuarios.estaSeguroDeEliminarUsuario', {nombre: usuario.nombre}),
      text: this.translate.instant('usuarios.usuarios.estaAccionNoSePuede'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translate.instant('usuarios.usuarios.siEliminar'),
      cancelButtonText: this.translate.instant('comun.cancelar')
    }).then((result) => {
      if (result.isConfirmed) {
        // Llamar al servicio para eliminar el usuario.
        this.service.eliminarUsuario(usuarioId).subscribe(response => {
          Swal.fire(
            this.translate.instant('usuarios.usuarios.eliminado'),
            this.translate.instant('usuarios.usuarios.elUsuarioHaSidoEliminado'),
            'success'
          );
          // Actualizar los arreglos de usuarios
          this.temp = this.temp.filter(u => (u.cd || u.id) !== usuarioId);
          this.usuarios = this.usuarios.filter(u => (u.cd || u.id) !== usuarioId);
        }, error => {
          Swal.fire(
            this.translate.instant('comun.error'),
            this.translate.instant('usuarios.usuarios.huboUnProblemaAlEliminar'),
            'error'
          );
          console.error('Error eliminando el usuario', error);
        });
      }
    });
  }
}
