import { Component, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';

import { TranslateService } from '@ngx-translate/core';
@Component({
  selector: 'app-centro-trabajos',
  templateUrl: './centrotrabajos.component.html',
  styleUrls: ['./centrotrabajos.component.scss']
})
export class CentrotrabajosComponent implements OnInit {
  @ViewChild('modalCrearCentroTrabajo') modalCrearCentroTrabajo;
  centrosTrabajo: any[] = [];
  nuevoCentroTrabajo = '';

  constructor(private modalService: NgbModal, private centroTrabajosService: MaestroService,
    private translate: TranslateService
  ) { }
  cargando = false;
  ngOnInit(): void {
    this.obtenerCentrosTrabajo();
  }

  abrirModal() {
    this.modalService.open(this.modalCrearCentroTrabajo, {
      size: 'lg',
      scrollable: true,
      centered: true,
      ariaLabelledBy: 'modal-basic-title'

    });
  }

  obtenerCentrosTrabajo() {
    this.centroTrabajosService.getCentrosTrabajo()
      .subscribe(
        {
          next: (data: any) => {
            this.centrosTrabajo = data;
          },
          error: (error) => {
            Swal.fire(this.translate.instant('comun.error'), this.translate.instant('empresas.centrotrabajos.errorAlObtenerLosCentros'), 'error');
            console.log(error);
          }
        }
      );
  }

  agregarCentroTrabajo() {
    this.centroTrabajosService.addCentroTrabajo(this.nuevoCentroTrabajo)
      .subscribe({
        next: (data: any) => {
          if (data.msg && data.msg !== 'added') {
            Swal.fire(this.translate.instant('comun.error'), data.msg, 'error');
            return;
          }
          else {
            Swal.fire(this.translate.instant('empresas.centrotrabajos.exito'), this.translate.instant('empresas.centrotrabajos.centroDeTrabajoAgregado'), 'success');
          }
          this.obtenerCentrosTrabajo();
          this.nuevoCentroTrabajo = '';
          this.modalService.dismissAll();
        },
        error: (error) => {
          Swal.fire(this.translate.instant('comun.error'), this.translate.instant('empresas.centrotrabajos.errorAlAgregarElCentro'), 'error');
          this.nuevoCentroTrabajo = '';
          this.modalService.dismissAll();
          console.log(error);
        }
      });
  }

  eliminarCentroTrabajo(centroTrabajo: any) {
    Swal.fire({
      title: this.translate.instant('empresas.centrotrabajos.estasSeguro'),
      text: this.translate.instant('empresas.centrotrabajos.noPodrasRevertirEsto'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: this.translate.instant('empresas.centrotrabajos.siEliminar')
    }).then((result) => {
      if (result.isConfirmed) {
        this.centroTrabajosService.deleteCentroTrabajo(centroTrabajo)
          .subscribe(() => {
            this.obtenerCentrosTrabajo();
          });
      }
    });

  }


}
