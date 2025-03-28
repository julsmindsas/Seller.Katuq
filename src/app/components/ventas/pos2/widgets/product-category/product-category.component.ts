import { Component } from '@angular/core';
// import { RouterModule } from '@angular/router';
// import { CarouselModule, OwlOptions } from 'ngx-owl-carousel-o';

// import { CardComponent } from '../../../../../shared/components/ui/card/card.component';
import { productCategory } from '../../../../../../assets/data/pos';
import { CarouselLibConfig, Image } from '@ks89/angular-modal-gallery';

@Component({
  selector: 'app-product-category',
  templateUrl: './product-category.component.html',
  styleUrls: ['./product-category.component.scss']
})
export class ProductCategoryComponent {

  public imagesRect: Image[];
  public productCategory = productCategory;
  public options: any = {
  }
  libConfigCarouselFixed: CarouselLibConfig;

  constructor() {

    this.libConfigCarouselFixed = {
      carouselPreviewsConfig: {
        visible: true,
        number: 6,
        width: 'auto',
        maxHeight: '100px'
      },
      carouselConfig: {
        maxWidth: '70%',
        maxHeight: '70%',
        showArrows: true,
        objectFit: 'cover',
        keyboardEnable: true,
        modalGalleryEnable: true
      }
    };

    this.imagesRect = [
      new Image(1, { img: 'assets/images/ecommerce/02.jpg' }, { img: 'assets/images/ecommerce/02.jpg' })];
      
  }

  // public options: OwlOptions = {
  //   loop: true,
  //   nav: false,
  //   dots: false,
  //   autoplay: true,
  //   autoplaySpeed: 2000,
  //   responsive: {
  //     0: {
  //       items: 2
  //     },
  //     336: {
  //       items: 3
  //     },
  //     436: {
  //       items: 4
  //     },
  //     674: {
  //       items: 5
  //     },
  //     926: {
  //       items: 6
  //     },
  //     1100: {
  //       items: 9
  //     }
  //   }
  // }
}
