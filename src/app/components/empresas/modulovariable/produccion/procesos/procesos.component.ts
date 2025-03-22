import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { TreeNode } from 'primeng/api';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { ProcesoConCentroTrabajo } from '../../../model/produccion/procesoconcentrotrabajo';
import Swal from 'sweetalert2';
import { parse, stringify } from 'flatted';
@Component({
  selector: 'app-procesos',
  templateUrl: './procesos.component.html',
  styleUrls: ['./procesos.component.scss']
})
export class ProcesosComponent implements OnInit {

  @ViewChild('editDeleteModal') modal: ElementRef;
  @ViewChild('myModal') mymodal: ElementRef;
  editProcesoNuevo: boolean = false;
  constructor(private modalService: NgbModal, private maestroservice: MaestroService, private chr: ChangeDetectorRef) {
    this.centrosTrabajoSource = [];
    this.procesoNuevo = {
      nombre: '',
      centrosTrabajo: []
    }
    this.primerNodo = {
      label: 'Produccion',
      type: 'proceso',
      expanded: true,
      data: null,
      children: []
    }
    this.procesosConCentrosTrabajos = [this.primerNodo];
    this.procesoAGuardar = {
      cd: '',
      tipoProceso: 'produccion',
      procesos: ''
    }
  }
  procesosConCentrosTrabajos: TreeNode<ProcesoConCentroTrabajo>[];
  primerNodo: TreeNode<ProcesoConCentroTrabajo>;
  nuevoProceso: TreeNode<ProcesoConCentroTrabajo>;
  centrosTrabajoSource: any[];
  procesoNuevo: ProcesoConCentroTrabajo
  selectedNode: TreeNode<ProcesoConCentroTrabajo>;

  procesoAGuardar: {
    cd: string,
    tipoProceso: string,
    procesos: string
  }


  ngOnInit(): void {
    this.getAllProcesos();
  }

  private getCentrosTrabajo() {
    const contextGeneral = this;

    this.maestroservice.getCentrosTrabajo().subscribe({
      next(value: any) {
        console.log(value);
        contextGeneral.centrosTrabajoSource = value as any[];
        // se quitan los centros de trabajo que aun no estan asignados a un proceso
        const procesos = contextGeneral.procesosConCentrosTrabajos[0].children;
        for (let index = 0; index < procesos.length; index++) {
          const proceso = procesos[index];
          const centrosTrabajo = proceso.data.centrosTrabajo;
          for (let index = 0; index < centrosTrabajo.length; index++) {
            const centroTrabajo = centrosTrabajo[index];
            const indexCentro = contextGeneral.centrosTrabajoSource.findIndex((centro) => centro.cd === centroTrabajo.cd);
            if (indexCentro !== -1) {
              contextGeneral.centrosTrabajoSource.splice(indexCentro, 1);
            }

            // if (contextGeneral.centrosTrabajoSource.length === 0) {
            //   Swal.fire('Error', 'No hay centros de trabajo disponibles', 'error');
            //   contextGeneral.modalService.dismissAll();
            //   return;
            // }
          }
        }
        contextGeneral.chr.detectChanges();
      },
      error(err) {
        Swal.fire('Error', 'Error al obtener los centros de trabajo', 'error');
        console.log(err);
      },
    });
  }

  private getAllProcesos() {
    const context = this;
    this.maestroservice.getProcesos().subscribe({
      next(value: any) {
        if ((value as any[]).length > 0) {
          const primerProceso = value[0];
          context.procesoAGuardar.cd = primerProceso.cd;
          const procesosProduccion = parse(primerProceso.procesos);
          context.procesosConCentrosTrabajos = procesosProduccion as TreeNode<ProcesoConCentroTrabajo>[];
          context.procesosConCentrosTrabajos = [...context.procesosConCentrosTrabajos];
          context.chr.detectChanges();
        }
      },
      error(err) {
        Swal.fire('Error', 'Error al obtener los procesos', 'error');
        console.log(err);
      },
    });
  }

  createProcessAndCentroTrabajo() {
    if (this.procesoNuevo.nombre === '') {
      Swal.fire('Error', 'El nombre del proceso es requerido', 'error');
      return;
    }

    if (this.procesoNuevo.centrosTrabajo.length === 0) {
      Swal.fire('Error', 'Debe seleccionar al menos un centro de trabajo', 'error');
      return;
    }

    //valida si el nombre ya existe
    const procesos = this.procesosConCentrosTrabajos[0].children;
    if (!this.editProcesoNuevo) {
      for (let index = 0; index < procesos.length; index++) {
        const proceso = procesos[index];
        if (proceso.label === this.procesoNuevo.nombre) {
          Swal.fire('Error', 'El nombre del proceso ya existe', 'error');
          return;
        }
      }
    }
    this.nuevoProceso = {
      label: this.procesoNuevo.nombre,
      type: 'proceso',
      expanded: true,
      data: this.procesoNuevo,
      children: []
    }

    console.log(this.nuevoProceso);
    if (this.procesosConCentrosTrabajos.length === 1) {
      this.primerNodo = this.procesosConCentrosTrabajos[0];
    }
    if (!this.editProcesoNuevo) {
      this.primerNodo.children.push(this.nuevoProceso);
    }
    else {
      const index = this.primerNodo.children.indexOf(this.selectedNode);
      this.primerNodo.children[index] = this.nuevoProceso;
    }

    const contextGeneral = this;
    let procesosConCentrosTrabajos = stringify(this.procesosConCentrosTrabajos);
    this.procesoAGuardar.procesos = procesosConCentrosTrabajos;

    if (this.procesoAGuardar.cd === '') {
      this.maestroservice.createProcesoProduccion(this.procesoAGuardar).subscribe({
        next(value: any) {
          console.log(value);
          contextGeneral.procesoNuevo = {
            nombre: '',
            centrosTrabajo: []
          }
          contextGeneral.procesosConCentrosTrabajos = [...contextGeneral.procesosConCentrosTrabajos];
          Swal.fire('Proceso creado', 'Proceso creado correctamente', 'success');
          contextGeneral.modalService.dismissAll();
          contextGeneral.getAllProcesos();
          contextGeneral.chr.detectChanges();
        },
        error(err) {
          Swal.fire('Error', 'Error al crear el proceso', 'error');
          contextGeneral.chr.detectChanges();
          console.log(err);
        },
      });
    }
    else {
      this.maestroservice.editProcesoProduccion(this.procesoAGuardar).subscribe({
        next(value: any) {
          console.log(value);
          contextGeneral.procesoNuevo = {
            nombre: '',
            centrosTrabajo: []
          }
          contextGeneral.procesosConCentrosTrabajos = [...contextGeneral.procesosConCentrosTrabajos];
          Swal.fire('Proceso editado', 'Proceso editado correctamente', 'success');
          contextGeneral.modalService.dismissAll();
          contextGeneral.chr.detectChanges();
        },
        error(err) {
          contextGeneral.chr.detectChanges();
          Swal.fire('Error', 'Error al crear el proceso', 'error');
          console.log(err);
        },
      });
    }

  }

  open(content) {
    this.getCentrosTrabajo();
    this.modalService.open(content, {
      size: 'xl',
      centered: true,
      fullscreen: true,
      backdrop: 'static'
    });
  }

  onNodeSelect(event) {
    console.log(event);
    if (event.node.label !== 'Produccion') {
      this.selectedNode = event.node;

      this.modalService.open(this.modal, {
        size: 'xs',
        centered: true,
        backdrop: 'static'
      });
    }
  }

  deleteProcess() {
    Swal.fire({
      title: '¿Está seguro de eliminar el proceso?',
      text: "No podrá revertir esta acción!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33',
      confirmButtonText: 'Eliminar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.deleteSelectedNode();
      }
    })

  }


  private deleteSelectedNode() {
    console.log(this.selectedNode);
    const procesoProduccion = this.procesosConCentrosTrabajos[0];
    const index = procesoProduccion.children.indexOf(this.selectedNode);
    procesoProduccion.children.splice(index, 1);
    this.procesosConCentrosTrabajos = [...this.procesosConCentrosTrabajos];
    const contextGeneral = this;
    let procesosConCentrosTrabajos = stringify(this.procesosConCentrosTrabajos);
    this.procesoAGuardar.procesos = procesosConCentrosTrabajos;
    this.maestroservice.editProcesoProduccion(this.procesoAGuardar).subscribe({
      next(value: any) {
        console.log(value);
        Swal.fire('Proceso eliminado', 'Proceso eliminado correctamente', 'success');
        contextGeneral.modalService.dismissAll();
        contextGeneral.chr.detectChanges();
      },
      error(err) {
        Swal.fire('Error', 'Error al eliminar el proceso', 'error');
        console.log(err);
      },
    });
  }

  editProcess() {
    this.getCentrosTrabajo();
    console.log(this.selectedNode);
    this.procesoNuevo = this.selectedNode.data;
    this.editProcesoNuevo = true;
    this.modalService.open(this.mymodal, {
      size: 'xl',
      centered: true,
      fullscreen: true,
      backdrop: 'static'
    });
  }

  cerrarModal() {
    this.procesoNuevo = {
      nombre: '',
      centrosTrabajo: []
    }
    this.editProcesoNuevo = false;
    this.nuevoProceso = {
      label: '',
      type: 'proceso',
      expanded: true,
      data: null,
      children: []
    }

    this.modalService.dismissAll();
  }
}
