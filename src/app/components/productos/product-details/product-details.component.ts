import { Component, Input, OnInit } from '@angular/core';
import { CarouselLibConfig, Image } from '@ks89/angular-modal-gallery';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { parse } from 'flatted';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';


@Component({
  selector: 'app-product-details',
  templateUrl: './product-details.component.html',
  styleUrls: ['./product-details.component.scss']
})

export class ProductDetailsComponent implements OnInit {

  active = 1;
  active1=1;
  @Input() public producto: any;
  @Input() public isView: boolean = false;
  @Input() public fromProductCreate: boolean = false;
  public imagesRect: Image[]
  empresaActual: any;
  formaEntrega: any;
  tiempoEntrega: any;
  
  ocasiones: any;
  generos: any;
  formasPago: any;
  categorias: any;
  generosProducto: any;
  ocasionesProducto: any;
  variablesProducto: any;
  
  libConfigCarouselFixed: CarouselLibConfig;
  processedDescriptioni: any;
  processedAditionalDetails: any;
  productCare: any;
  productGuarantee: any;
  productRestrictions: any;
  formasPagoProducto: any;
  activeids = [];

  // [
  //   new Image(0, { img: 'assets/images/ecommerce/04.jpg' }, { img: 'assets/images/ecommerce/03.jpg' }),
  //   new Image(1, { img: 'assets/images/ecommerce/02.jpg' }, { img: 'assets/images/ecommerce/02.jpg' }),
  //   new Image(2, { img: 'assets/images/ecommerce/03.jpg' }, { img: 'assets/images/ecommerce/03.jpg' }),
  //   new Image(3, { img: 'assets/images/ecommerce/04.jpg' }, { img: 'assets/images/ecommerce/04.jpg' })]

  constructor(public activeModal: NgbActiveModal, private maestroService:MaestroService) {
    for (let index = 0; index < 9; index++) {
      const element = 'ngb-panel-'+ index.toString();
      this.activeids.push(element);      
    }
  }

  ngOnInit() {
    console.log(this.fromProductCreate,'Valor de la BANDERA')
    this.getAllFilters()
    
    console.log(this.producto)
    this.processedDescriptioni=((this.producto.crearProducto.descripcion.split('\n')).map(line => `- ${line}`)).join('\n')
    this.processedAditionalDetails=((this.producto.crearProducto.caracAdicionales.split('\n')).map(line => `- ${line}`)).join('\n')
    this.productCare=((this.producto.crearProducto.cuidadoConsumo.split('\n')).map(line => `- ${line}`)).join('\n')
    this.productGuarantee=((this.producto.crearProducto.garantiasProducto.split('\n')).map(line => `- ${line}`)).join('\n')
    this.productRestrictions=((this.producto.crearProducto.restriccionesProducto.split('\n')).map(line => `- ${line}`)).join('\n')
    this.imagesRect = this.producto.crearProducto.imagenesPrincipales.map((x, index) => new Image(index, { img: x.urls }, { img: x.urls }));
    if(this.fromProductCreate){
      this.libConfigCarouselFixed = {
        carouselPreviewsConfig: {
          visible: true,
          number: 5,
          width: 'auto',
          maxHeight: '100px'
        },
        carouselConfig: {
          maxWidth: '100%',
          maxHeight: '100%',
          showArrows: true,
          objectFit: 'cover',
          keyboardEnable: true,
          modalGalleryEnable: true
        }
      };
    }else{
      this.libConfigCarouselFixed = {
        carouselPreviewsConfig: {
          visible: true,
          number: 5,
          width: 'auto',
          maxHeight: '100px'
        },
        carouselConfig: {
          maxWidth: '100%',
          maxHeight: '100%',
          showArrows: true,
          objectFit: 'cover',
          keyboardEnable: true,
          modalGalleryEnable: true
        }
      };
    }
  
  }
  getAllFilters() {
    this.empresaActual = JSON.parse(sessionStorage.getItem("currentCompany"));

    forkJoin([
  


      this.maestroService.consultarOcasion(),
      this.maestroService.consultarGenero(),
      this.maestroService.consultarFormaPago(),
      
    
    ]).subscribe({
      next: (results: any[]) => {
   
        console.log(results,'resultados')
        this.ocasiones = results[0];
        this.generos = results[1];
        this.formasPago = results[2];
        // this.categorias = parse((results[6] as any[])[0].categoria).map(p => {
        //   return {
        //     label: p.data.nombre,
        //     data: p.data,
        //     children: p.children.map(sub => {
        //       return {
        //         label: sub.data.nombre,
        //         data: sub.data,
        //         children: sub.children ? sub.children.map(sub2 => {
        //           return {
        //             label: sub2.data.nombre,
        //             data: sub2.data,
        //             children: sub2.children ? sub2.children.map(sub2 => {
        //               return {

        //               }
        //             }) : null
        //           }
        //         }) : null
        //       }
        //     })
        //   }
        // });
        
    this.generosProducto = this.generos.filter((p: { id: number }) => this.producto.procesoComercial.genero.find((g: number) => g == p.id));
    this.ocasionesProducto = this.ocasiones.filter((p: { id: string }) => this.producto.procesoComercial.ocasion.find((g: string) => g == p.id));
    this.formasPagoProducto=this.formasPago.filter((p: { id: string })=> this.producto.procesoComercial.pago.find((g: string) => g == p.id));
    this.variablesProducto = parse(this.producto.procesoComercial.variablesForm);
       
      },
      error: (error) => {
        Swal.fire({
          title: 'Error!',
          text: 'Error al cargar los datos' + error,
          icon: 'error',
          confirmButtonText: 'Aceptar'
        });
      }
    });
  }

  configurarProducto(arg0: any) {
    throw new Error('Method not implemented.');
  }

}
