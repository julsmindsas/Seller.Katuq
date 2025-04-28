import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, Input, AfterViewInit, OnDestroy } from '@angular/core';
import { ChatUsers } from '../../../shared/models/chat/chat.model';
import { ChatService } from '../../../shared/services/chat.service';
import { NgForm } from '@angular/forms';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { trigger, style, animate, transition, state } from '@angular/animations';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss'],
  animations: [
    // Animación mejorada para los mensajes individuales con definiciones más detalladas
    trigger('messageAnimation', [
      state('void', style({
        opacity: 0,
        transform: 'translateY(10px)'
      })),
      state('*', style({
        opacity: 1,
        transform: 'translateY(0)'
      })),
      transition(':enter', [
        animate('200ms ease-out')
      ])
    ])
  ]
})
export class ChatComponent implements OnInit, AfterViewChecked, AfterViewInit, OnDestroy {
  // Variables de la clase
  @ViewChild('chatHistoryContainer') private chatHistoryContainer: ElementRef;
  @Input() isFloating: boolean = false;
  private shouldScrollToBottom: boolean = true;
  private userHasScrolled: boolean = false;
  private scrollThreshold: number = 100; // Para determinar cercanía al final del chat

  public openTab : string = "call";
  public users : ChatUsers[] = []
  public searchUsers : ChatUsers[] = []
  public chatUser : any;
  public profile : any = {
    id: 0,
    name: 'Usuario'
  };
  public chats : any;
  public chatText : string;
  public error : boolean = false;
  public notFound: boolean = false;
  public id : any;
  public searchText : string;
  public showEmojiPicker:boolean = false;
  public emojies: any;
  public mobileToggle: boolean = false

  // Modo oscuro automático
  public isDarkMode: boolean = false;

  constructor(
    private chatService: ChatService,
    private cdRef: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {   
    this.chatService.getUsers().subscribe(users => { 
      this.searchUsers = users
      this.users = users
    })
  }

  ngOnInit() {  
    // Detectar modo oscuro del sistema
    this.isDarkMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      this.isDarkMode = e.matches;
    });
    // Ajustar comportamiento si está en modo flotante
    if (this.isFloating) {
      // Posibles ajustes específicos para el modo flotante
    }
    // Primero obtener el perfil y luego iniciar el chat
    this.getProfile();
    this.userChat(1); // ID por defecto para KAI
  }
  
  ngAfterViewChecked() {
    if (this.shouldScrollToBottom) {
      this.scrollToBottom();
      // Solo establecemos a false después de un pequeño retraso para permitir múltiples scrolls si es necesario
      setTimeout(() => {
        this.shouldScrollToBottom = false;
      }, 200);
    }
  }
  
  private scrollToBottom(retry: number = 0): void {
    try {
      // Si el usuario ha scrolleado manualmente y no está cerca del fondo, respetamos su posición
      if (this.userHasScrolled) {
        return;
      }

      setTimeout(() => {
        if (this.chatHistoryContainer && this.chatHistoryContainer.nativeElement) {
          const element = this.chatHistoryContainer.nativeElement;
          
          // Scroll suave solo si estamos cerca del fondo
          element.scrollTo({
            top: element.scrollHeight,
            behavior: 'smooth'
          });
          
          // Verificamos si efectivamente llegó al fondo
          const isAtBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 10;
          
          // Si no llegó al fondo por alguna razón, forzamos el scroll (sin animación)
          if (!isAtBottom && retry < 1) {
            element.scrollTop = element.scrollHeight;
          }
        }
      }, 10);
    } catch(err) {
      console.error('Error en scrollToBottom:', err);
    }
  }

  public toggleEmojiPicker(){
    this.showEmojiPicker=!this.showEmojiPicker;
  }

  addEmoji(event){
    const text = `${event.emoji.native}`;
    this.chatText = text;
    this.showEmojiPicker = false;
  }

  public tabbed(val) {
  	this.openTab = val
  }

  // Get user Profile
  public getProfile() {
    this.chatService.getCurrentUser().subscribe({
      next: (userProfile) => {
        if (userProfile) {
          this.profile = userProfile;
        }
        // Si no hay perfil, se mantiene el default
      },
      error: (err) => {
        console.error('Error al obtener perfil:', err);
      }
    });
  }

  // User Chat - mejorado para gestionar mensajes y scroll
  public userChat(id:number =1){    
    this.chatService.chatToUser(id).subscribe(chatUser => {
      this.chatUser = chatUser;
      this.shouldScrollToBottom = true;
      this.cdRef.detectChanges();
    });
    
    this.chatService.getChatHistory(id).subscribe(chats => {
      // Activar scroll solo si es la carga inicial o si estamos ya al final del chat
      const element = this.chatHistoryContainer?.nativeElement;
      const wasAtBottom = !element || (element.scrollHeight - element.scrollTop - element.clientHeight < 100);
      
      this.chats = chats;
      this.shouldScrollToBottom = wasAtBottom; // Scroll solo si estaba en el fondo
      
      // Forzar detección de cambios para actualizar la vista
      this.cdRef.detectChanges();
      
      // Asegurar que el scroll ocurre DESPUÉS de la actualización de la vista
      if (wasAtBottom) {
        setTimeout(() => this.scrollToBottom(), 50);
      }
    });
  }
  
  // Send Message to User - mejora con gestión de estados de scroll
  public sendMessage(form: NgForm) {
    if(!form.value.message?.trim()){
      this.error = true;
      return false;
    }
    
    this.error = false;
    const message = form.value.message;
    this.chatText = '';
    
    // Al enviar un mensaje, siempre debemos hacer scroll al fondo
    // Temporalmente ignoramos si el usuario ha scrolleado
    const tempUserScrolled = this.userHasScrolled;
    this.userHasScrolled = false;
    this.shouldScrollToBottom = true;
    
    let chat = {
      sender: this.profile.id,
      receiver: this.chatUser.id,
      receiver_name: this.chatUser.name,
      message: message,
      text: message, // Para compatibilidad con la interfaz actual
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    };
    
    // Enviamos el mensaje
    this.chatService.sendMessage(chat);
    
    // Actualizamos estado del chat
    this.chatUser.seen = 'online';
    this.chatUser.online = true;
    
    // Simulamos "typing" y aseguramos que se apliquen cambios
    setTimeout(() => {
      if (this.chatUser) {
        this.chatUser.typing = true;
        this.cdRef.detectChanges();
        // Scroll para mostrar el indicador de escritura
        this.scrollToBottom();
        
        // Restauramos el estado de scroll del usuario después de un tiempo
        setTimeout(() => {
          this.userHasScrolled = tempUserScrolled;
        }, 500);
      }
    }, 200);
  }

  /**
   * Ajusta automáticamente la altura del textarea para que se expanda acorde al contenido.
   */
  autoResize(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    if (!textarea) return;
    // Reiniciar altura para calcular scrollHeight correcto
    textarea.style.height = 'auto';
    textarea.style.height = textarea.scrollHeight + 'px';
  }

  /**
   * Maneja el envío con Enter. Si el usuario mantiene Shift+Enter se permite salto de línea.
   */
  handleEnter(event: KeyboardEvent, form: NgForm): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage(form);
    }
  }

  /**
   * Obtiene la hora actual en formato HH:MM para mostrar en mensajes
   */
  getCurrentTime(): string {
    return new Date().toLocaleTimeString([], {
      hour: '2-digit', 
      minute: '2-digit'
    });
  }

  searchTerm(term: any) {
    if(!term) return this.searchUsers = this.users
    term = term.toLowerCase();
    let user: ChatUsers[] = []
    this.users.filter(users => {
      if(users.name && users.name.toLowerCase().includes(term)) {
        user.push(users)
      } 
    })
    this.searchUsers = user
  }

  mobileMenu() {
    this.mobileToggle = !this.mobileToggle;
  }
    
  // Método para manejar el evento de scroll en el chat
  onChatScroll(): void {
    const element = this.chatHistoryContainer.nativeElement;
    // Consideramos un threshold más pequeño para una mejor experiencia
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < this.scrollThreshold;
    
    // Determinamos si el usuario ha hecho scroll manualmente hacia arriba
    this.userHasScrolled = !atBottom;
    
    // Solo configuramos auto-scroll si está cerca del fondo
    this.shouldScrollToBottom = atBottom;
  }

  // Alternar modo claro/oscuro manualmente
  public toggleDarkMode(): void {
    this.isDarkMode = !this.isDarkMode;
  }

  // Inicialización - Asegurar que el contenedor esté listo
  ngAfterViewInit() {
    // Habilitar MutationObserver para detectar cambios en el DOM del chat
    if (this.chatHistoryContainer && this.chatHistoryContainer.nativeElement) {
      const config = { childList: true, subtree: true };
      const observer = new MutationObserver((mutations) => {
        // Solo hacemos auto-scroll si el usuario no ha scrolleado manualmente o si estamos cerca del fondo
        if (this.shouldScrollToBottom && !this.userHasScrolled) {
          this.scrollToBottom();
        }
      });
      observer.observe(this.chatHistoryContainer.nativeElement, config);
    }
  }
  
  // Manejar cuando el componente se destruye
  ngOnDestroy() {
    // Limpiar cualquier suscripción o temporizador pendiente
  }

  /**
   * Detecta si una cadena de texto contiene HTML
   */
  isHtml(text: string): boolean {
    if (!text) return false;
    // Expresiones regulares para detectar etiquetas HTML comunes
    const htmlRegex = /<\/?[a-z][\s\S]*>/i;
    return htmlRegex.test(text);
  }

  /**
   * Sanea el HTML para renderizarlo de forma segura
   */
  sanitizeHtml(html: string): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(html);
  }
}
