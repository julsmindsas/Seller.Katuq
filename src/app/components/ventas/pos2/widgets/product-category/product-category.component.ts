import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { CarouselModule } from 'primeng/carousel';
// import { CarouselLibConfig, Image } from '@ks89/angular-modal-gallery';
import { MaestroService } from '../../../../../shared/services/maestros/maestro.service';
import { parse, stringify, toJSON, fromJSON } from 'flatted';

@Component({
  selector: 'app-product-category',
  templateUrl: './product-category.component.html',
  styleUrls: ['./product-category.component.scss']
})
export class ProductCategoryComponent {
  public imagesRect: any[] = [];
  
  responsiveOptions = [
    {
        breakpoint: '1400px',
        numVisible: 6,
        numScroll: 1
    },
    {
        breakpoint: '1199px',
        numVisible: 6,
        numScroll: 1
    },
    {
        breakpoint: '767px',
        numVisible: 4,
        numScroll: 1
    },
    {
        breakpoint: '575px',
        numVisible: 2,
        numScroll: 1
    }
]

  constructor(
    private maestroService: MaestroService
  ) {
    // this.libConfigCarouselFixed = {
    //   carouselPreviewsConfig: {
    //     visible: true,
    //     number: 5,
    //     width: 'auto',
    //     maxHeight: '200px'
    //   },
    //   carouselConfig: {
    //     maxWidth: '70%',
    //     maxHeight: '70%',
    //     showArrows: true,
    //     keyboardEnable: true,
    //     modalGalleryEnable: true,
    //     objectFit: 'contains'
    //   }
    // };

    this.obtenerCategorias();
  }

  obtenerCategorias() {
    this.maestroService.getCategorias().subscribe((r: any) => {
      if ((r as any[]).length > 0) {
        const categoriaPorEmpresa = r[0];
        let data = parse(categoriaPorEmpresa.categoria);
        data = [...data]

        this.imagesRect = data.map((element: any, index: number) => {
          const imagen = element.data.imagen === '' ? 'assets/images/favicon.png' : element.data.imagen;
          return {
            id: index + 1,
            image: imagen,
            title: element.data.nombre,
            cantidad: 1
          };
        });
      }
      console.log("🚀 ~ file: list.component.ts:140 ~ ListComponent ~ this.nodeService.createCategorias ~ r", r)
    });
  }


}
