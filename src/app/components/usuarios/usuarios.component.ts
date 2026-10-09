import { Component, OnInit } from '@angular/core';
import { MaestroService } from '../../shared/services/maestros/maestro.service';
import { Router } from '@angular/router';
import { Table } from 'primeng/table';
import Swal from 'sweetalert2';

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
  
  constructor(private service: MaestroService, private router: Router) {
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
    this.service.getOpttiaEnVivo().subscribe({
      next: (r: any) => {
        this.opttiaEnVivo = r?.activado !== false;
        this.opttiaGeneral = r?.general !== false;
        this.opttiaCargado = true;
      },
      error: () => { this.opttiaCargado = false; },
    });
  }

  // ─── D-386: Opttia en la pantalla "En vivo" (prendido por defecto) ───

  opttiaEnVivo = true;
  /** false = apagado para toda la plataforma desde el servidor: el botón no aplica. */
  opttiaGeneral = true;
  opttiaCargado = false;

  private get esJulsmind(): boolean {
    try { return JSON.parse(localStorage.getItem('user') || '{}')?.company === 'Julsmind'; } catch (_) { return false; }
  }

  get opttiaBotonTexto(): string {
    if (!this.opttiaGeneral) return 'Opttia en En vivo: apagado por Katuq';
    return this.opttiaEnVivo ? 'Opttia en En vivo: prendido' : 'Opttia en En vivo: apagado';
  }

  get opttiaTooltip(): string {
    if (!this.opttiaGeneral) return 'Katuq apagó a Opttia en la pantalla En vivo para todos los comercios.';
    return this.opttiaEnVivo
      ? 'Opttia analiza la operación en la pantalla En vivo y responde preguntas. Clic para apagarlo.'
      : 'Opttia no analiza ni responde en la pantalla En vivo. Clic para prenderlo.';
  }

  cambiarOpttiaEnVivo(): void {
    if (!this.opttiaCargado || !this.opttiaGeneral) return;
    const nuevo = !this.opttiaEnVivo;
    const katuq = this.esJulsmind
      ? '<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">También aplica a la vista "Katuq en vivo" (todos los comercios).</p>'
      : '';
    Swal.fire({
      title: nuevo ? '¿Prender a Opttia en En vivo?' : '¿Apagar a Opttia en En vivo?',
      html: (nuevo
        ? 'Opttia vuelve a analizar la operación en la pantalla <b>En vivo</b> (un resumen cada 15 a 30 minutos) y a responder preguntas.'
        : 'Opttia deja de analizar y de responder en la pantalla <b>En vivo</b>. Las cifras, la escena y los eventos siguen igual.') + katuq,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: nuevo ? 'Sí, prender' : 'Sí, apagar',
      cancelButtonText: 'Cancelar',
    }).then((r) => {
      if (!r.isConfirmed) return;
      this.service.saveOpttiaEnVivo(nuevo).subscribe({
        next: () => {
          this.opttiaEnVivo = nuevo;
          Swal.fire({
            icon: 'success',
            title: nuevo ? 'Opttia quedó prendido en En vivo' : 'Opttia quedó apagado en En vivo',
            text: nuevo
              ? 'Las pantallas En vivo lo muestran al recargarse.'
              : 'Las pantallas abiertas dejan de pedirle análisis en menos de un minuto; al recargarse, Opttia desaparece.',
            confirmButtonText: 'Entendido',
          });
        },
        error: (e) => Swal.fire('Error', e?.error?.message || 'No fue posible guardar el cambio.', 'error'),
      });
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
    return this.metricasSoloPropias ? 'Vendedores: solo sus métricas' : 'Vendedores: métricas de todos';
  }

  get metricasTooltip(): string {
    return this.metricasSoloPropias
      ? 'Cada vendedor ve en la bienvenida y en Dashboards solo sus ventas, despachos y tareas. Clic para cambiarlo.'
      : 'Los vendedores ven en la bienvenida y en Dashboards las cifras de toda la empresa. Clic para cambiarlo.';
  }

  cambiarMetricasEquipo(): void {
    if (!this.metricasCargado) return;
    const nuevo = !this.metricasSoloPropias;
    const ventas = this.usuariosVentas;
    const lista = ventas.length
      ? '<ul style="text-align:left;max-height:160px;overflow:auto;margin:8px 0 0;">' + ventas.map(u =>
          `<li>${this.escapar([u.nombre, u.apellido].filter(Boolean).join(' ') || u.email)} <small style="color:#6b7280;">(${this.escapar(u.roles)})</small></li>`).join('') + '</ul>'
      : '<p style="color:#6b7280;margin:8px 0 0;">Hoy no hay usuarios con rol de ventas. Les aplicará a los que se creen.</p>';

    Swal.fire({
      title: nuevo ? '¿Cada vendedor verá solo sus métricas?' : '¿Los vendedores verán las métricas de todos?',
      html: (nuevo
        ? 'En la pantalla de bienvenida y en Dashboards, cada usuario con rol de ventas verá <b>solo sus ventas, sus despachos y sus tareas del CRM</b>. No verá las de sus compañeros.'
        : 'En la pantalla de bienvenida y en Dashboards, los usuarios con rol de ventas volverán a ver <b>las cifras de toda la empresa</b>.')
        + `<p style="margin:12px 0 0;"><b>Les aplica a ${ventas.length} ${ventas.length === 1 ? 'usuario' : 'usuarios'}:</b></p>` + lista
        + '<p style="color:#6b7280;margin:12px 0 0;font-size:13px;">Administradores, gerentes, supervisores y demás roles siguen viendo todo.</p>',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, cambiar',
      cancelButtonText: 'Cancelar',
    }).then(r => {
      if (!r.isConfirmed) return;
      this.service.saveMetricasEquipo(nuevo).subscribe({
        next: () => {
          this.metricasSoloPropias = nuevo;
          Swal.fire({
            icon: 'success',
            title: nuevo ? 'Cada vendedor verá solo sus métricas' : 'Los vendedores verán las métricas de todos',
            text: 'Las cifras cambian de inmediato. Los títulos de la bienvenida ("Mis ventas de hoy"…) se actualizan cuando vuelvan a iniciar sesión.',
            confirmButtonText: 'Entendido',
          });
        },
        error: (e) => Swal.fire('Error', e?.error?.message || 'No fue posible guardar el cambio.', 'error'),
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
        'Error',
        'No fue posible identificar el usuario a eliminar.',
        'error'
      );
      return;
    }

    Swal.fire({
      title: `¿Está seguro de eliminar el usuario ${usuario.nombre}?`,
      text: "Esta acción no se puede deshacer.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        // Llamar al servicio para eliminar el usuario.
        this.service.eliminarUsuario(usuarioId).subscribe(response => {
          Swal.fire(
            'Eliminado',
            'El usuario ha sido eliminado exitosamente.',
            'success'
          );
          // Actualizar los arreglos de usuarios
          this.temp = this.temp.filter(u => (u.cd || u.id) !== usuarioId);
          this.usuarios = this.usuarios.filter(u => (u.cd || u.id) !== usuarioId);
        }, error => {
          Swal.fire(
            'Error',
            'Hubo un problema al eliminar el usuario.',
            'error'
          );
          console.error('Error eliminando el usuario', error);
        });
      }
    });
  }
}
