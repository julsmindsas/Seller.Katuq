import { Component, OnInit } from '@angular/core';
import { Route, Router } from '@angular/router';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { TableColumn } from '@swimlane/ngx-datatable';
@Component({
  selector: 'app-listahorarios',
  templateUrl: 'listahorarios.component.html',
  styleUrls: ['listahorarios.component.scss']
})
export class ListahorariosComponent implements OnInit {
  icons: any;

  items: any = [];
  constructor(private router: Router, private service: MaestroService) {
  }
  cargando = true;
  columns: TableColumn[] = [
    { name: 'Posuación' },
    { name: 'Nombre' },
    { name: 'Hora de Inicio' },
    { name: 'Hora de Fin' },
    { name: 'Color del Horario' },
    { name: 'Activo' },
    { name: 'Acciones' }
  ];

  onEdit(row) {
    // Handle edit event here
  }

  onDelete(row) {
    // Handle delete event here
  }


  ngOnInit(): void {
    this.service.getHorarioEntregas().subscribe((r: any) => {
      this.items = (r as any[]).sort((a, b) => {
        const nameA = parseInt(a.posicion); // ignore upper and lowercase
        const nameB = parseInt(b.posicion); // ignore upper and lowercase
        if (nameA < nameB) {
          return -1;
        }
        if (nameA > nameB) {
          return 1;
        }

        // names must be equal
        return 0;
      });
      this.cargando = false;
    })
  }



  create() {
    this.router.navigateByUrl("/horarioEntrega/crear")
    // clear the items array
  }

}
