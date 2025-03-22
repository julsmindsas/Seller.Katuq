import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { TableColumn } from '@swimlane/ngx-datatable';
import { MaestroService } from '../../../shared/services/maestros/maestro.service'
import Swal from 'sweetalert2';

@Component({
  selector: 'app-listatiempos',
  templateUrl: './listatiempos.component.html',
  styleUrls: ['./listatiempos.component.scss']
})
export class ListaTiemposComponent implements OnInit {
  icons: any;

  items: any = [];
  constructor(private router: Router, private service: MaestroService) {
  }
  cargando = true;
  columns: TableColumn[] = [
    { name: 'Nombre Interno' },
    { name: 'Nombre externo' },
    { name: 'Dias minimos' },
    { name: 'Forma de entrega' },
    { name: 'Ciudades' },
    { name: 'Activo' },
    { name: 'Acciones' }
  ];

  editar(row) {
    // Handle edit event here
    sessionStorage.setItem("tiempoEntregaEdit", JSON.stringify(row));
    this.router.navigateByUrl("/tiempoentrega/create")
  }

  onDelete(row) {
    // Handle delete event here
  }


  ngOnInit(): void {
    this.service.getTiempoEntrega().subscribe((r: any) => {
      this.items = (r as any[]);
      this.cargando = false;
    })
  }



  create() {
    this.router.navigateByUrl("/tiempoentrega/create")
    // clear the items array
  }

  eliminarFila(row) {
    Swal.fire({
      title: '¿Está seguro de eliminar tiempo de entrega?',
      text: 'Esta acción no se puede revertir',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Si, eliminar',
      cancelButtonText: 'No, cancelar',
      reverseButtons: true
    }).then((result) => {
      if (result.isConfirmed) {
        this.service.deleteTipoDeEntrega(row).subscribe(r => {
          this.items = this.items.filter((p: any) => p !== row);
        })
      }
    });

  }

}
