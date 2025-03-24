import { Component, HostListener, ElementRef, OnInit, Output, EventEmitter } from '@angular/core';
import { AuthService } from '../../services/firebase/auth.service';

@Component({
  selector: 'app-floating-button',
  templateUrl: './floating-button.component.html',
  styleUrls: ['./floating-button.component.scss']
})
export class FloatingButtonComponent implements OnInit {
  public chatFormVisible: boolean = false;
  public chatMinimized: boolean = false;
  public hasUnreadMessages: boolean = false;
  public position = { bottom: 20, right: 20 };
  
  // Guardar el último estado de la conversación
  private conversationState: any = null;

  constructor(
    public authService: AuthService,
    private elementRef: ElementRef
  ) {}

  ngOnInit() {
    // Recuperar estado guardado si existe
    const savedState = sessionStorage.getItem('chatState');
    if (savedState) {
      try {
        const parsedState = JSON.parse(savedState);
        this.chatMinimized = parsedState.minimized || false;
        this.hasUnreadMessages = parsedState.hasUnread || false;
        this.conversationState = parsedState.conversation || null;
        
        // Si había una conversación en curso, mostrar el chat como minimizado
        if (this.conversationState && Object.keys(this.conversationState).length > 0) {
          this.chatFormVisible = true;
          this.chatMinimized = true;
        }
      } catch (e) {
        console.error("Error parsing saved chat state:", e);
      }
    }
  }

  toggleChatForm(event?: MouseEvent) {
    if (event) event.stopPropagation();
    
    if (this.chatMinimized) {
      // Si está minimizado, solo maximizar
      this.chatMinimized = false;
      this.hasUnreadMessages = false;
    } else {
      // Si no está minimizado, mostrar/ocultar
      this.chatFormVisible = !this.chatFormVisible;
      if (this.chatFormVisible) {
        this.chatMinimized = false;
      }
    }
    
    // Actualizar estado en sessionStorage
    this.saveChatState();
  }
  
  minimizeChat(event: MouseEvent) {
    event.stopPropagation();
    this.chatMinimized = true;
    // No cerramos el chat, solo lo minimizamos
    this.saveChatState();
  }
  
  maximizeChat(event: MouseEvent) {
    event.stopPropagation();
    this.chatMinimized = false;
    this.hasUnreadMessages = false;
    this.saveChatState();
  }
  
  closeChat(event: MouseEvent) {
    event.stopPropagation();
    this.chatFormVisible = false;
    this.chatMinimized = false;
    this.conversationState = null;
    sessionStorage.removeItem('chatState');
  }
  
  // Método para llamar cuando se recibe un nuevo mensaje y el chat está minimizado
  onNewMessage(message: any) {
    if (this.chatMinimized) {
      this.hasUnreadMessages = true;
      this.saveChatState();
    }
  }
  
  // Método para guardar la conversación actual
  saveConversation(conversation: any) {
    this.conversationState = conversation;
    this.saveChatState();
  }
  
  private saveChatState() {
    const state = {
      minimized: this.chatMinimized,
      hasUnread: this.hasUnreadMessages,
      conversation: this.conversationState
    };
    sessionStorage.setItem('chatState', JSON.stringify(state));
  }
}
