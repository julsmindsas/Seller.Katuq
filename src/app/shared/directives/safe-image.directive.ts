import { Directive, ElementRef, Input, OnInit, OnChanges, SimpleChanges, HostListener, Output, EventEmitter } from '@angular/core';
import { ImageProxyService } from '../services/image-proxy.service';

@Directive({
  selector: 'img[appSafeImage]'
})
export class SafeImageDirective implements OnInit, OnChanges {
  @Input() appSafeImage: string = ''; // URL original de la imagen
  @Input() fallbackImage: string = 'assets/images/placeholders/product-not-found.svg'; // Imagen de respaldo
  @Output() imageLoaded = new EventEmitter<void>();
  @Output() imageLoadError = new EventEmitter<string>();

  private hasError = false;
  private isLoading = true;

  constructor(
    private el: ElementRef<HTMLImageElement>,
    private imageProxyService: ImageProxyService
  ) {}

  ngOnInit(): void {
    this.setupImage();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['appSafeImage']) {
      this.hasError = false;
      this.isLoading = true;
      this.setupImage();
    }
  }

  @HostListener('error')
  onError(): void {
    if (!this.hasError) {
      this.hasError = true;
      this.isLoading = false;
      const originalSrc = this.el.nativeElement.src;
      console.warn(`Error al cargar imagen: ${originalSrc}`);
      
      // Asegurarse de que la imagen de fallback sea accesible
      this.el.nativeElement.src = this.fallbackImage;
      this.el.nativeElement.removeAttribute('crossOrigin');
      this.el.nativeElement.classList.add('image-fallback');
      this.imageLoadError.emit(originalSrc);
    }
  }

  @HostListener('load')
  onLoad(): void {
    if (!this.hasError) {
      this.isLoading = false;
      this.el.nativeElement.classList.remove('image-loading');
      this.el.nativeElement.classList.add('image-loaded');
      this.imageLoaded.emit();
    }
  }

  private setupImage(): void {
    const img = this.el.nativeElement;
    
    // Inicializar el estado de la imagen
    img.classList.add('image-loading');
    img.classList.remove('image-loaded', 'image-fallback');
    
    // Si no hay URL o es undefined/null, usar imagen de respaldo
    if (!this.appSafeImage) {
      img.src = this.fallbackImage;
      img.removeAttribute('crossOrigin');
      return;
    }
    
    // Para URLs de datos o rutas relativas, usarlas directamente
    if (this.appSafeImage.startsWith('data:') || 
        this.appSafeImage.startsWith('/') || 
        this.appSafeImage.startsWith('./') ||
        this.appSafeImage.startsWith('../')) {
      img.src = this.appSafeImage;
      img.removeAttribute('crossOrigin');
      return;
    }
    
    try {
      // Para URLs externas, configurar crossOrigin solo si es necesario
      if (this.isExternalUrl(this.appSafeImage)) {
        img.crossOrigin = 'anonymous';
      } else {
        // Para URLs del mismo origen, no necesitamos crossOrigin
        img.removeAttribute('crossOrigin');
      }
      
      // Usar la URL directamente para simplificar
      img.src = this.appSafeImage;
    } catch (error) {
      console.error('Error al configurar la imagen:', error);
      img.src = this.fallbackImage;
    }
  }

  private isExternalUrl(url: string): boolean {
    if (!url) return false;
    
    // Si es base64 o ruta relativa, no es externa
    if (url.startsWith('data:') || 
        url.startsWith('/') || 
        url.startsWith('./') ||
        url.startsWith('../')) {
      return false;
    }
    
    try {
      // Intentar crear un objeto URL para comprobar si es válida
      const urlObj = new URL(url, window.location.href);
      return urlObj.origin !== window.location.origin;
    } catch (e) {
      // Si no es una URL válida, probablemente sea relativa
      return false;
    }
  }
} 