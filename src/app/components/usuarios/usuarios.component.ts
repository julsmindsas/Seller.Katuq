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
      const datos = x
      this.temp = [...datos];
      this.cargando = false;
      this.rows = datos;
      this.usuarios = datos;
      localStorage.setItem('usuarios', JSON.stringify(datos)); // Guardar en localStorage
      console.log(this.rows)
      this.cargando = false
    })
  }

  ngOnInit(): void {
    if (window.screen.width < 700) {
      this.isMobile = true;
    }
    console.log(this.rows)
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
        this.service.eliminarUsuario(usuario.id).subscribe(response => {
          Swal.fire(
            'Eliminado',
            'El usuario ha sido eliminado exitosamente.',
            'success'
          );
          // Actualizar los arreglos de usuarios
          this.temp = this.temp.filter(u => u.id !== usuario.id);
          this.usuarios = this.usuarios.filter(u => u.id !== usuario.id);
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
