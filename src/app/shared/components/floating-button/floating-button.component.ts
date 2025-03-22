import { Component, HostListener, ElementRef, OnInit } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';

@Component({
  selector: 'app-floating-button',
  templateUrl: './floating-button.component.html',
  styleUrls: ['./floating-button.component.scss']
})
export class FloatingButtonComponent implements OnInit {
  public chatFormVisible: boolean = false;
  // La posición ya no se usa en ngStyle, pero mantenemos la variable para cuando se reactive
  public position = { bottom: 20, right: 20 };
  
  // Comentados temporalmente mientras se perfecciona la funcionalidad de arrastrar
  /*
  private dragging = false;
  private prevMouse = { x: 0, y: 0 };
  private windowSize = { width: 0, height: 0 };
  private buttonSize = { width: 60, height: 60 };
  */

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    // Comentado temporalmente
    /*
    this.updateWindowSize();
    this.ensureButtonIsVisible();
    */
  }

  // Comentado temporalmente
  /*
  @HostListener('window:resize', ['$event'])
  onResize(event: Event) {
    this.updateWindowSize();
    this.ensureButtonIsVisible();
  }

  private updateWindowSize() {
    this.windowSize = {
      width: window.innerWidth,
      height: window.innerHeight
    };
  }

  private ensureButtonIsVisible() {
    // Ajustar si está fuera de la ventana
    if (this.position.right < 0) {
      this.position.right = 0;
    }
    
    if (this.position.right > this.windowSize.width - this.buttonSize.width) {
      this.position.right = this.windowSize.width - this.buttonSize.width;
    }
    
    if (this.position.bottom < 0) {
      this.position.bottom = 0;
    }
    
    if (this.position.bottom > this.windowSize.height - this.buttonSize.height) {
      this.position.bottom = this.windowSize.height - this.buttonSize.height;
    }
  }
  */

  toggleChatForm() {
    this.chatFormVisible = !this.chatFormVisible;
  }

  // Comentado temporalmente
  /*
  onMouseDown(event: MouseEvent) {
    this.dragging = true;
    this.prevMouse.x = event.clientX;
    this.prevMouse.y = event.clientY;
    event.preventDefault();
  }

  @HostListener('window:mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.dragging) {
      const dx = event.clientX - this.prevMouse.x;
      const dy = event.clientY - this.prevMouse.y;
      this.prevMouse.x = event.clientX;
      this.prevMouse.y = event.clientY;
      
      // Actualizar posición
      this.position.bottom -= dy;
      this.position.right -= dx;
      
      // Comprobar límites
      this.ensureButtonIsVisible();
    }
  }

  @HostListener('window:mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.dragging = false;
  }
  */
}
