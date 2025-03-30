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

  public imagesRect: Image[] = [];
  public productCategory = productCategory;
  public options: any = {
  }
  libConfigCarouselFixed: CarouselLibConfig;

  constructor() {

    this.libConfigCarouselFixed = {
      carouselPreviewsConfig: {
        visible: true,
        number: 5,
        width: 'auto',
        maxHeight: '200px'
      },
      carouselConfig: {
        maxWidth: '70%',
        maxHeight: '70%',
        showArrows: true,
        keyboardEnable: true,
        modalGalleryEnable: true,
        objectFit: 'none'
      }
    };

    for (let index = 0; index < productCategory.length; index++) {
      const element = productCategory[index];

      const item: Image = {
        id: index + 1,
        modal: { img: element.category_image },
        plain: { img: element.category_image }
      }

      this.imagesRect.push(item);
    }

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
