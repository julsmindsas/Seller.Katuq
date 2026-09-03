import { Component, Input, OnInit } from '@angular/core';
import { CarouselLibConfig, Image } from '@ks89/angular-modal-gallery';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { parse } from 'flatted';
import { MaestroService } from 'src/app/shared/services/maestros/maestro.service';
import Swal from 'sweetalert2';
import { forkJoin } from 'rxjs';


import { IMAGEN_PRODUCTO_POR_DEFECTO, urlImagenAbsoluta } from '../../../shared/utils/imagen-producto';
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
  /**
   * ¿Ofrecer también la edición rápida? Lo decide quien abre el modal, con el
   * mismo permiso que gobierna el menú lateral y la opción del listado.
   */
  @Input() public permiteEdicionRapida: boolean = false;
  public imagesRect: Image[]

  // Quick preview state
  currentPreviewIdx = 0;
  currentPreviewImage = '';
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
    this.getAllFilters()

    const crearProd = this.producto?.crearProducto || {};
    const images: any[] = crearProd.imagenesPrincipales || [];

    this.processedDescriptioni = ((crearProd.descripcion || '').split('\n')).map((line: string) => `- ${line}`).join('\n');
    this.processedAditionalDetails = ((crearProd.caracAdicionales || '').split('\n')).map((line: string) => `- ${line}`).join('\n');
    this.productCare = ((crearProd.cuidadoConsumo || '').split('\n')).map((line: string) => `- ${line}`).join('\n');
    this.productGuarantee = ((crearProd.garantiasProducto || '').split('\n')).map((line: string) => `- ${line}`).join('\n');
    this.productRestrictions = ((crearProd.restriccionesProducto || '').split('\n')).map((line: string) => `- ${line}`).join('\n');
    this.imagesRect = images.map((x, index) => {
      const url = urlImagenAbsoluta(x.urls) ?? IMAGEN_PRODUCTO_POR_DEFECTO;
      return new Image(index, { img: url }, { img: url });
    });

    // Quick preview image state
    this.currentPreviewImage = images.length > 0
      ? (urlImagenAbsoluta(images[0].urls) ?? IMAGEN_PRODUCTO_POR_DEFECTO)
      : 'assets/images/placeholders/product-not-found.svg';
    this.currentPreviewIdx = 0;
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
  // Los campos de texto largo (descripción, características, garantías…) se
  // guardan como HTML: los escribe el editor enriquecido y las integraciones, y
  // hay productos donde llegó un DOCUMENTO ENTERO (`<!DOCTYPE html><html><head>
  // <title>…`). Interpolados con {{ }} salían en crudo, con las etiquetas a la
  // vista. Renderizarlos directo tampoco basta: el saneador de Angular descarta
  // <head>/<title> pero CONSERVA su texto, así que el título del documento se
  // colaba como primer párrafo. Acá se recorta el envoltorio antes de pintar.
  // El texto plano se escapa y se le respetan los saltos de línea.
  htmlLimpio(valor: any): string {
    const texto = (valor ?? '').toString().trim();
    if (!texto) return '';

    const pareceHtml = /<[a-z!/][\s\S]*>/i.test(texto);
    if (!pareceHtml) {
      const escapado = texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      return escapado.replace(/\r?\n/g, '<br>');
    }

    let html = texto
      .replace(/<!DOCTYPE[^>]*>/gi, '')
      .replace(/<!--[\s\S]*?-->/g, '')
      .replace(/<head[\s\S]*?<\/head>/gi, '')   // se lleva el <title> con él
      .replace(/<\/?(?:html|body|section)[^>]*>/gi, '');

    return html.trim();
  }

  selectPreviewImage(idx: number): void {
    const images: any[] = this.producto?.crearProducto?.imagenesPrincipales || [];
    if (images[idx]) {
      this.currentPreviewIdx = idx;
      this.currentPreviewImage = urlImagenAbsoluta(images[idx].urls) ?? IMAGEN_PRODUCTO_POR_DEFECTO;
    }
  }

  getAllFilters() {
    this.empresaActual = JSON.parse(localStorage.getItem("currentCompany"));

    forkJoin([
  


      this.maestroService.consultarOcasion(),
      this.maestroService.consultarGenero(),
      this.maestroService.consultarFormaPago(),
      
    
    ]).subscribe({
      next: (results: any[]) => {
   
        console.log(results,'resultados')
        // Los maestros pueden venir null si el endpoint responde vacío; abajo se
        // filtra sobre ellos, y `null.filter` tumbaría el modal entero.
        this.ocasiones = results[0] || [];
        this.generos = results[1] || [];
        this.formasPago = results[2] || [];
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
        
        // Un producto sin género/ocasión/formas de pago (importados, productos
        // viejos, o uno recién creado en el editor) dejaba estos campos en
        // undefined y `undefined.find(...)` reventaba ACÁ, dentro del next() del
        // forkJoin: el throw no lo atrapa el error() de al lado — es para errores
        // del observable, no para excepciones síncronas del handler — así que se
        // perdía el modal completo, no solo la pestaña de Proceso Comercial.
        // `getAllFilters()` corre en ngOnInit sin condición, o sea que afectaba
        // por igual a la vista rápida del listado y a la vista previa del editor.
        const proceso = this.producto?.procesoComercial || {};
        const generosSel = Array.isArray(proceso.genero) ? proceso.genero : [];
        const ocasionesSel = Array.isArray(proceso.ocasion) ? proceso.ocasion : [];
        const pagosSel = Array.isArray(proceso.pago) ? proceso.pago : [];

        // `some` y no `find`: find devuelve el ELEMENTO, así que un id válido pero
        // falsy (0, '') hacía que la opción se descartara del listado.
        this.generosProducto = this.generos.filter((p: { id: number }) => generosSel.some((g: number) => g == p.id));
        this.ocasionesProducto = this.ocasiones.filter((p: { id: string }) => ocasionesSel.some((g: string) => g == p.id));
        this.formasPagoProducto = this.formasPago.filter((p: { id: string }) => pagosSel.some((g: string) => g == p.id));

        // `variablesForm` es un string en formato flatted. Vacío o malformado
        // hacía que parse() lanzara y se llevara el modal por delante.
        this.variablesProducto = this.parseVariables(proceso.variablesForm);
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

  private parseVariables(variablesForm: any): any[] {
    if (!variablesForm) return [];
    if (Array.isArray(variablesForm)) return variablesForm;
    try {
      const parsed = parse(variablesForm);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  configurarProducto(arg0: any) {
    throw new Error('Method not implemented.');
  }

}
