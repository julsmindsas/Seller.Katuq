import { Directive, ElementRef, Input, HostListener } from '@angular/core';

@Directive({
  selector: 'img[appImageFallback]'
})
export class ImageFallbackDirective {
  @Input() appImageFallback: string = 'assets/images/placeholders/product-not-found.svg';
  @Input() fallbackClass: string = 'image-fallback';
  
  constructor(private el: ElementRef) {}

  @HostListener('error')
  onError() {
    const element: HTMLImageElement = this.el.nativeElement;
    
    // Guardar la URL original como atributo de datos por si se necesita
    element.dataset.originalSrc = element.src;
    
    // Cambiar la fuente a la imagen de fallback
    element.src = this.appImageFallback;
    
    // Agregar clase para estilos adicionales si se proporciona
    if (this.fallbackClass) {
      element.classList.add(this.fallbackClass);
    }
    
    // Añadir título para accesibilidad
    element.setAttribute('title', 'Imagen no disponible');
    
    // Emitir evento personalizado para notificar del error
    const errorEvent = new CustomEvent('imageFallbackLoaded', { 
      bubbles: true, 
      detail: { originalSrc: element.dataset.originalSrc } 
    });
    element.dispatchEvent(errorEvent);
  }
} 