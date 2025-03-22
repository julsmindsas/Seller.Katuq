import { Component, OnInit,ViewChildren,QueryList } from '@angular/core';
import { NgbdSortableHeader, SortEvent } from 'src/app/shared/directives/NgbdSortableHeader';
import { Observable } from 'rxjs';
import { TableService } from 'src/app/shared/services/table.service';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
@Component({
  selector: 'app-maestros',
  templateUrl: './maestros.component.html',
  styleUrls: ['./maestros.component.scss']
})
export class MaestrosComponent implements OnInit {
  public selected = [];

  public tableItem$;
  public searchText;
  total$: Observable<number>;
  companies: any;

  constructor(public serviceTable: TableService,public service: MaestroService) {
    
    this.total$ = serviceTable.total$;
    

   }
  @ViewChildren(NgbdSortableHeader) headers: QueryList<NgbdSortableHeader>;
  ngOnInit(): void {
    this.tableItem$=this.service.consultarEmpresas().subscribe((x: any) => {
      this.companies=x

      return x
    })
    console.log("selected", this.tableItem$);
    this.serviceTable.setUserData(this.tableItem$)
  }
  onSort({ column, direction }: SortEvent) {
    // resetting other headers
    this.headers.forEach((header) => {
      if (header.sortable !== column) {
        header.direction = '';
      }
    });

    this.serviceTable.sortColumn = column;
    this.serviceTable.sortDirection = direction;

  }
  public onSelect(selected) {
    this.serviceTable.deleteSingleData(selected);
  }

}
