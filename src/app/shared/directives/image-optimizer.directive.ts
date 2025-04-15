import { Directive, ElementRef, Input, OnInit, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appImageOptimizer]',
  standalone: true
})
export class ImageOptimizerDirective implements OnInit {
  @Input() quality: number = 0.7; // Calidad por defecto 70%
  @Input() width: number = 0; // Ancho deseado (0 = mantener proporción)
  @Input() height: number = 0; // Alto deseado (0 = mantener proporción)
  @Input() lazy: boolean = true; // Carga perezosa por defecto

  private originalSrc: string = '';

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnInit() {
    const img = this.el.nativeElement as HTMLImageElement;
    this.originalSrc = img.src;

    if (this.lazy) {
      this.renderer.setAttribute(img, 'loading', 'lazy');
    }

    // Crear una imagen temporal para el procesamiento
    const tempImg = new Image();
    tempImg.crossOrigin = 'anonymous';
    tempImg.onload = () => {
      this.optimizeImage(tempImg);
    };
    tempImg.src = this.originalSrc;
  }

  private optimizeImage(img: HTMLImageElement) {
    const canvas = document.createElement('canvas');
    let width = img.width;
    let height = img.height;

    // Ajustar dimensiones si se especifican
    if (this.width > 0 && this.height > 0) {
      width = this.width;
      height = this.height;
    } else if (this.width > 0) {
      const ratio = this.width / img.width;
      width = this.width;
      height = img.height * ratio;
    } else if (this.height > 0) {
      const ratio = this.height / img.height;
      height = this.height;
      width = img.width * ratio;
    }

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dibujar la imagen optimizada
    ctx.drawImage(img, 0, 0, width, height);

    // Convertir a formato WebP si el navegador lo soporta
    const mimeType = this.supportsWebP() ? 'image/webp' : 'image/jpeg';
    
    // Obtener la imagen optimizada
    const optimizedSrc = canvas.toDataURL(mimeType, this.quality);

    // Aplicar la imagen optimizada
    this.renderer.setAttribute(this.el.nativeElement, 'src', optimizedSrc);
  }

  private supportsWebP(): boolean {
    const elem = document.createElement('canvas');
    if (!!(elem.getContext && elem.getContext('2d'))) {
      return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
  }
} 