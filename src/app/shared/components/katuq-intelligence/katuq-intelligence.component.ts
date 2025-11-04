// import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
// import Swal from 'sweetalert2';
// import { KatuqintelligenceService } from '../../services/katuqintelligence/katuqintelligence.service';


// @Component({
//   selector: 'app-katuqintelligence',
//   templateUrl: './katuq-intelligence.component.html',
//   styleUrls: ['./katuq-intelligence.component.scss']
// })
// export class KatuqIntelligenceComponent implements OnInit {

//   @Input() katuqIntelligencePrompt: string;
//   @Input() titleInput: string;
//   @Input() objectToText: any;
//   @Input() textToSwalHeader: string;
//   @Input() textToQuiestionSwal: string;
//   @Output() katuqIntelligenceResponse = new EventEmitter();

//   constructor(private katuqIntelligenceService: KatuqintelligenceService) { }

//   ngOnInit(): void {
//   }

//   IA(): void {
//     Swal.fire({
//       title: 'K.A.I.',
//       text: this.textToQuiestionSwal,
//       icon: 'question',
//       showCancelButton: true,
//       confirmButtonText: 'Enviar',
//       cancelButtonText: 'Cancelar'
//     }).then((result) => {
//       if (result.isConfirmed) {
//         Swal.fire({
//           title: 'K.A.I Procesando...',
//           text: this.textToSwalHeader,
//           allowOutsideClick: false,
//           didOpen: () => {
//             Swal.showLoading();
//           }
//         });

//         const promptIA = {
//           "prompt": this.katuqIntelligencePrompt,
//           "isGenerateImage": false
//         };

//         this.katuqIntelligenceService.invokeKatuqIntelligence(promptIA).subscribe({
//           next: (response: any) => {
//             console.log(response);
//             const objToText = {
//               respuesta: response,
//               objectToText: this.objectToText || null
//             };
//             this.katuqIntelligenceResponse.emit(objToText);
//             Swal.fire(
//               'Éxito',
//               'K.A.I ha finalizado exitosamente.',
//               'success'
//             );
//           },
//           error: (error) => {
//             console.error(error);
//             Swal.fire(
//               'Error',
//               `Request failed: ${error.error}`,
//               'error'
//             );
//           }
//         });
//       }
//     });
//   }
// }
import { Component, Input, OnInit, Output, EventEmitter } from '@angular/core';
import Swal from 'sweetalert2';
import { KatuqintelligenceService } from '../../services/katuqintelligence/katuqintelligence.service';
import { SubscriptionService } from '../../services/subscription.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-katuqintelligence',
  templateUrl: './katuq-intelligence.component.html',
  styleUrls: ['./katuq-intelligence.component.scss']
})
export class KatuqIntelligenceComponent implements OnInit {

  @Input() katuqIntelligencePrompt: string;
  @Input() photoToAnalize: string;
  @Input() isAnalizeImageForPrompt: boolean;
  @Input() isGenerateImage: boolean;

  @Input() titleInput: string;
  @Input() objectToText: any;
  @Input() textToSwalHeader: string;
  @Input() textToQuiestionSwal: string;
  @Input() buttonStyle: string = "circle";

  @Output() katuqIntelligenceResponse = new EventEmitter();

  // Observable para mostrar uso disponible
  usageInfo$: Observable<{ remaining: number; limit: number; isPremium: boolean }>;

  private katuqIntelligenceService: KatuqintelligenceService;

  constructor(
    katuqIntelligenceService: KatuqintelligenceService,
    private subscriptionService: SubscriptionService
  ) {
    this.katuqIntelligenceService = katuqIntelligenceService;
  }

  ngOnInit(): void {
    // Suscribirse a cambios de uso de productos IA
    this.usageInfo$ = this.subscriptionService.usage$.pipe(
      map(usage => {
        if (!usage) {
          return { remaining: 0, limit: 0, isPremium: false };
        }
        const productsUsage = usage.ai.products;
        return {
          remaining: productsUsage.remaining,
          limit: productsUsage.limit,
          isPremium: productsUsage.limit === -1
        };
      })
    );
  }

  IA(): void {
    Swal.fire({
      title: 'K.A.I.',
      text: this.textToQuiestionSwal,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Enviar',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.processIARequest();
      }
    });
  }



  private processIARequest(): void {
    const promptIA = {
      "prompt": this.katuqIntelligencePrompt,
      "isGenerateImage": this.isGenerateImage || false,
      "isAnalizeImageForPrompt": this.isAnalizeImageForPrompt || false,
      "photoToAnalize": this.photoToAnalize || ''
    };


    this.katuqIntelligenceService.invokeKatuqIntelligence(promptIA).subscribe({
      next: (response: any) => {
        console.log('respuesta', response);


        const objToText = {
          respuesta: response,
          objectToText: this.objectToText || null
        };
        this.katuqIntelligenceResponse.emit(objToText);
        Swal.fire(
          'Éxito',
          'K.A.I ha finalizado exitosamente.',
          'success'
        );
      },
      error: (error) => {
        console.error(error);
        Swal.fire(
          'Error',
          `Request failed: ${error.error}`,
          'error'
        );
      }
    });
  }




}

