import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked, ChangeDetectorRef, Input } from '@angular/core';
import { ChatUsers } from '../../../shared/models/chat/chat.model';
import { ChatService } from '../../../shared/services/chat.service';

@Component({
  selector: 'app-chat',
  templateUrl: './chat.component.html',
  styleUrls: ['./chat.component.scss']
})
export class ChatComponent implements OnInit, AfterViewChecked {
  @ViewChild('chatHistoryContainer') private chatHistoryContainer: ElementRef;
  @Input() isFloating: boolean = false; // Indica si está en modo flotante
  private shouldScrollToBottom = true;
  
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

  constructor(
    private chatService: ChatService,
    private cdRef: ChangeDetectorRef
  ) {   
    this.chatService.getUsers().subscribe(users => { 
      this.searchUsers = users
      this.users = users
    })
  }

  ngOnInit() {  
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
  
  private scrollToBottom(): void {
    try {
      if (this.chatHistoryContainer && this.chatHistoryContainer.nativeElement) {
        const element = this.chatHistoryContainer.nativeElement;
        
        // Uso de scrollTo con behavior: smooth para una animación de desplazamiento suave
        element.scrollTo({
          top: element.scrollHeight,
          behavior: 'smooth'
        });
      }
    } catch(err) { 
      console.error('Error scrolling to bottom:', err);
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

  // User Chat
  public userChat(id:number =1){    
    this.chatService.chatToUser(id).subscribe(chatUser => {
      this.chatUser = chatUser;
      this.shouldScrollToBottom = true;
    });
    
    this.chatService.getChatHistory(id).subscribe(chats => {
      this.chats = chats;
      this.shouldScrollToBottom = true;
      // Forzar detección de cambios y luego scroll
      this.cdRef.detectChanges();
      setTimeout(() => this.scrollToBottom(), 100);
    });
  }
  
  // Send Message to User - mejoramos la animación y respuesta
  public sendMessage(form) {
    if(!form.value.message?.trim()){
      this.error = true
      return false
    }
    
    this.error = false;
    const message = form.value.message;
    this.chatText = '';
    
    let chat = {
      sender: this.profile.id,
      receiver: this.chatUser.id,
      receiver_name: this.chatUser.name,
      message: message,
      time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
    }
    
    // Activamos el scroll antes de que llegue la respuesta
    this.shouldScrollToBottom = true;
    
    // Enviamos el mensaje
    this.chatService.sendMessage(chat);
    
    // Actualizamos estado del chat
    this.chatUser.seen = 'online';
    this.chatUser.online = true;
    
    // Simulamos "typing" durante un tiempo
    setTimeout(() => {
      if (this.chatUser) {
        this.chatUser.typing = true;
        this.cdRef.detectChanges();
      }
      
      // Aseguramos que el scroll siga al typing indicator
      this.shouldScrollToBottom = true;
    }, 300);
    
    // Forzamos scroll después de enviar mensaje
    setTimeout(() => {
      this.cdRef.detectChanges();
      this.scrollToBottom();
    }, 100);
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
    const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 100;
    this.shouldScrollToBottom = atBottom;
  }
}
