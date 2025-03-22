import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { TreeNode } from 'primeng/api';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import { ChangeDetectorRef } from '@angular/core';
import { parse, stringify, toJSON, fromJSON } from 'flatted';

@Component({
  selector: 'app-list',
  templateUrl: './list.component.html',
  styleUrls: ['./list.component.scss']
})
export class ListComponent implements OnInit, OnChanges {



  files1: TreeNode[];

  files2: TreeNode[];

  cols: any[];
  // data: { data: { name: string; size: string; type: string; }; children: ({ data: { name: string; size: string; type: string; }; children: { data: { name: string; size: string; type: string; }; }[]; } | { data: { name: string; size: string; type: string; }; children?: undefined; })[]; }[];
  data: TreeNode[]
  categoriaPorEmpresa: { empresa: string; categoria: string; };

  constructor(private nodeService: MaestroService, private cdr: ChangeDetectorRef) { }


  create() {
    if (this.data.length == 0) {
      this.data = [
        {
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": 1, "activo": true },
          "children": [
          ]
        }
      ]
    }
    else {
      this.data.push(
        {
          "data": { "nombre": "Nueva categoria ", "imagen": "", "posicion": this.data.length +1, "activo": true },
          "children": [
          ]
        }
      )

    }
    this.data = [...this.data];
  }

  ngOnInit() {
    this.data = [
    ];
    this.obtenerCategorias();
    this.categoriaPorEmpresa = {
      empresa: 'prueba',
      categoria: ""
    };

    this.cols = [
      { field: 'name', header: 'Name' },
      { field: 'size', header: 'Size' },
      { field: 'type', header: 'Type' }
    ];
    this.data = [...this.data];
    this.cargando = false;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['data']) {
      this.data = [...changes['data'].currentValue];
    }
  }

  addChild(node: TreeNode) {
    //Aqui podria ir la logica para agregar un hijo a la categoria seleccionada
    if (node.children == undefined) {
      node.children = [];
    }
    const hijo = Object.assign({}, { "data": { "nombre": "Nueva categoria ", "imagen":"", "posicion": node.children.length, "activo": true } });
    node.children.push(hijo);
    this.cdr.detectChanges();
    this.cdr.markForCheck();
    this.data = [...this.data];
  }

  cargando = true;
  deleteChild(node) {
    //Aqui podria ir la logica para eliminar un hijo seleccionado
    if (node.parent == null) {
      const index = this.data.indexOf(node);
      this.data.splice(index, 1);
    }
    else if (node.children == undefined) {
      const index = node.parent.children.indexOf(node);
      node.parent.children.splice(index, 1);
    }
    else {
      const index = node.children.indexOf(node);
      node.children.splice(index, 1);
    }

    this.data = [...this.data];

    this.cdr.detectChanges();
    this.cdr.markForCheck();
  }

  guardar() {
    this.categoriaPorEmpresa.categoria = stringify(this.data);
    this.nodeService.createCategorias(this.categoriaPorEmpresa).subscribe(     
      (r: any) => {
      console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r", r)
      console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r.categorias", parse(r.categorias.categoria))
    });
  }

  obtenerCategorias() {
    this.nodeService.getCategorias().subscribe((r: any) => {
      if ((r as any[]).length > 0) {
        this.categoriaPorEmpresa = r[0];
        this.data = parse(this.categoriaPorEmpresa.categoria);
        this.data = [...this.data];
      }
      console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r", r)
    });
  }
}
