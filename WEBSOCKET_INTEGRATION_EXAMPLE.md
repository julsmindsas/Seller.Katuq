# Ejemplo de Integración WebSocket + Genkit Streaming

## 📝 Ejemplo 1: Componente Simple de Chat

### TypeScript Component

```typescript
import { Component, OnInit, OnDestroy, ViewChild, ElementRef } from '@angular/core';
import { WebSocketService, StreamChunk, StreamComplete } from '../services/websocket.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
  id: string;
  text: string;
  isUser: boolean;
  isStreaming: boolean;
  timestamp: Date;
  metadata?: any;
}

@Component({
  selector: 'app-agent-chat',
  templateUrl: './agent-chat.component.html',
  styleUrls: ['./agent-chat.component.scss']
})
export class AgentChatComponent implements OnInit, OnDestroy {
  @ViewChild('chatContainer') chatContainer!: ElementRef;

  messages: ChatMessage[] = [];
  userInput: string = '';
  isConnected: boolean = false;
  isLoadingConnection: boolean = true;

  private destroy$ = new Subject<void>();
  private conversationId: string = '';
  private currentMessageId: string | null = null;

  constructor(private wsService: WebSocketService) {}

  ngOnInit(): void {
    this.conversationId = `conv_${Date.now()}`;

    // Obtener datos del usuario (ajustar según tu sistema de auth)
    const userId = 'user_123'; // De tu servicio de autenticación
    const companyId = 'company_456'; // De tu contexto
    const agentId = 'agent_789'; // Del agente seleccionado

    // Conectar a WebSocket
    this.wsService.connect(userId, companyId, agentId);

    // Escuchar estado de conexión
    this.wsService.getConnectionStatus()
      .pipe(takeUntil(this.destroy$))
      .subscribe(status => {
        this.isConnected = status.connected;
        this.isLoadingConnection = false;
        if (status.connected) {
          this.addSystemMessage('✅ Conectado al agente. Puedes comenzar a escribir.');
        } else {
          this.addSystemMessage('⚠️ Desconectado del agente.');
        }
      });

    // Escuchar chunks de streaming
    this.wsService.getStreamChunks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((chunk: StreamChunk) => {
        if (this.currentMessageId === chunk.messageId) {
          // Actualizar el mensaje actual con el nuevo chunk
          const messageIndex = this.messages.findIndex(m => m.id === chunk.messageId);
          if (messageIndex !== -1) {
            this.messages[messageIndex].text += chunk.chunk;
          }
          this.scrollToBottom();
        }
      });

    // Escuchar completación
    this.wsService.getStreamComplete()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result: StreamComplete) => {
        if (this.currentMessageId === result.messageId) {
          const messageIndex = this.messages.findIndex(m => m.id === result.messageId);
          if (messageIndex !== -1) {
            this.messages[messageIndex].isStreaming = false;
            this.messages[messageIndex].metadata = {
              executionTime: result.executionTime,
              totalTokens: result.totalTokens,
              toolsExecuted: result.toolsExecuted
            };
          }
          this.currentMessageId = null;
          this.scrollToBottom();
        }
      });

    // Escuchar errores
    this.wsService.getStreamErrors()
      .pipe(takeUntil(this.destroy$))
      .subscribe(error => {
        if (this.currentMessageId === error.messageId) {
          this.addErrorMessage(`❌ Error: ${error.error}`);
          this.currentMessageId = null;
        }
      });
  }

  /**
   * Enviar mensaje
   */
  sendMessage(): void {
    if (!this.userInput.trim()) {
      return;
    }

    if (!this.isConnected) {
      this.addErrorMessage('❌ No estás conectado al agente');
      return;
    }

    const messageText = this.userInput;
    this.userInput = '';

    // Agregar mensaje del usuario
    this.addUserMessage(messageText);

    // Generar ID para el mensaje del agente
    this.currentMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Agregar mensaje del agente (vacío, se llenará con streaming)
    this.addAgentMessage(this.currentMessageId);

    // Enviar al servidor
    this.wsService.sendMessage(messageText, this.conversationId, {
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Agregar mensaje del usuario
   */
  private addUserMessage(text: string): void {
    this.messages.push({
      id: uuidv4(),
      text,
      isUser: true,
      isStreaming: false,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  /**
   * Agregar mensaje del agente (para streaming)
   */
  private addAgentMessage(id: string): void {
    this.messages.push({
      id,
      text: '',
      isUser: false,
      isStreaming: true,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  /**
   * Agregar mensaje del sistema
   */
  private addSystemMessage(text: string): void {
    this.messages.push({
      id: uuidv4(),
      text,
      isUser: false,
      isStreaming: false,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  /**
   * Agregar mensaje de error
   */
  private addErrorMessage(text: string): void {
    this.messages.push({
      id: uuidv4(),
      text,
      isUser: false,
      isStreaming: false,
      timestamp: new Date()
    });
    this.scrollToBottom();
  }

  /**
   * Scroll automático al final
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatContainer) {
        this.chatContainer.nativeElement.scrollTop =
          this.chatContainer.nativeElement.scrollHeight;
      }
    }, 0);
  }

  /**
   * Limpiar al destruir
   */
  ngOnDestroy(): void {
    this.wsService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Detectar Enter para enviar
   */
  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }
}
```

### HTML Template

```html
<div class="chat-container">
  <!-- Header -->
  <div class="chat-header">
    <h2>Chat con Agente IA</h2>
    <div class="connection-status" [ngClass]="{ connected: isConnected, disconnected: !isConnected }">
      <span class="status-indicator"></span>
      {{ isLoadingConnection ? 'Conectando...' : (isConnected ? 'Conectado' : 'Desconectado') }}
    </div>
  </div>

  <!-- Messages Container -->
  <div class="messages-container" #chatContainer>
    <div *ngFor="let message of messages" [ngClass]="['message', message.isUser ? 'user' : 'agent']">
      <!-- Mensaje del usuario -->
      <div *ngIf="message.isUser" class="message-bubble user-bubble">
        <p>{{ message.text }}</p>
        <small class="timestamp">{{ message.timestamp | date: 'HH:mm' }}</small>
      </div>

      <!-- Mensaje del agente -->
      <div *ngIf="!message.isUser" class="message-bubble agent-bubble">
        <div class="message-content">
          <p>{{ message.text }}</p>
          <span *ngIf="message.isStreaming" class="cursor-blink">▌</span>
        </div>

        <!-- Metadata -->
        <div *ngIf="message.metadata" class="message-metadata">
          <small *ngIf="message.metadata.executionTime">
            <i class="pi pi-clock"></i> {{ message.metadata.executionTime }}ms
          </small>
          <small *ngIf="message.metadata.totalTokens">
            <i class="pi pi-tag"></i> {{ message.metadata.totalTokens }} tokens
          </small>
          <small *ngIf="message.metadata.toolsExecuted">
            <i class="pi pi-wrench"></i> {{ message.metadata.toolsExecuted.join(', ') }}
          </small>
        </div>

        <!-- Indicador streaming -->
        <div *ngIf="message.isStreaming" class="streaming-indicator">
          <span class="pulse"></span> Escribiendo...
        </div>

        <small class="timestamp">{{ message.timestamp | date: 'HH:mm' }}</small>
      </div>
    </div>
  </div>

  <!-- Input Area -->
  <div class="input-area">
    <textarea
      [(ngModel)]="userInput"
      (keypress)="onKeyPress($event)"
      placeholder="Escribe tu pregunta aquí..."
      [disabled]="!isConnected || isLoadingConnection"
      rows="3"
    ></textarea>
    <button
      (click)="sendMessage()"
      [disabled]="!isConnected || isLoadingConnection || !userInput.trim()"
      class="send-btn"
    >
      <i class="pi pi-send"></i>
      Enviar
    </button>
  </div>
</div>
```

### SCSS Styles

```scss
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, #6c63ff 0%, #5a54d4 100%);
  color: white;

  h2 {
    margin: 0;
    font-size: 1.5rem;
  }

  .connection-status {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 6px 12px;
    background-color: rgba(255, 255, 255, 0.2);
    border-radius: 20px;
    font-size: 0.9rem;

    .status-indicator {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background-color: #4caf50;
      animation: pulse 2s infinite;

      &.disconnected {
        background-color: #f44336;
        animation: none;
      }
    }

    &.disconnected {
      background-color: rgba(244, 67, 54, 0.2);
    }
  }
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  .message {
    display: flex;

    &.user {
      justify-content: flex-end;
    }

    &.agent {
      justify-content: flex-start;
    }

    .message-bubble {
      max-width: 70%;
      padding: 12px 16px;
      border-radius: 8px;
      animation: slideIn 0.3s ease-in-out;

      &.user-bubble {
        background-color: #2196f3;
        color: white;
        border-bottom-right-radius: 2px;

        p {
          margin: 0;
          word-wrap: break-word;
        }
      }

      &.agent-bubble {
        background-color: white;
        color: #333;
        border: 1px solid #e0e0e0;
        border-bottom-left-radius: 2px;

        p {
          margin: 0;
          word-wrap: break-word;
        }

        .cursor-blink {
          animation: blink 1s infinite;
          color: #6c63ff;
          font-weight: bold;
          margin-left: 2px;
        }
      }

      .message-metadata {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
        padding-top: 8px;
        border-top: 1px solid rgba(0, 0, 0, 0.1);
        font-size: 0.75rem;

        small {
          display: flex;
          align-items: center;
          gap: 4px;
          opacity: 0.7;

          i {
            font-size: 0.85rem;
          }
        }
      }

      .streaming-indicator {
        display: flex;
        align-items: center;
        gap: 6px;
        margin-top: 8px;
        color: #6c63ff;
        font-size: 0.85rem;

        .pulse {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background-color: #6c63ff;
          animation: pulse 1s infinite;
        }
      }

      .timestamp {
        display: block;
        margin-top: 6px;
        font-size: 0.75rem;
        opacity: 0.6;
      }
    }
  }
}

.input-area {
  display: flex;
  gap: 12px;
  padding: 16px;
  background-color: white;
  border-top: 1px solid #e0e0e0;

  textarea {
    flex: 1;
    padding: 12px;
    border: 1px solid #ddd;
    border-radius: 6px;
    resize: none;
    font-family: inherit;
    font-size: 0.95rem;

    &:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }

    &:focus {
      outline: none;
      border-color: #6c63ff;
      box-shadow: 0 0 0 2px rgba(108, 99, 255, 0.1);
    }
  }

  .send-btn {
    padding: 12px 24px;
    background-color: #6c63ff;
    color: white;
    border: none;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 600;
    display: flex;
    align-items: center;
    gap: 8px;
    transition: all 0.3s ease;

    &:hover:not(:disabled) {
      background-color: #5a54d4;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(108, 99, 255, 0.3);
    }

    &:disabled {
      background-color: #ccc;
      cursor: not-allowed;
    }

    i {
      font-size: 1.1rem;
    }
  }
}

// ============ ANIMACIONES ============

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes blink {
  0%, 49% {
    opacity: 1;
  }
  50%, 100% {
    opacity: 0;
  }
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
```

## 📝 Ejemplo 2: Integración en Executor Existente

```typescript
// En executor.component.ts
export class ExecutorComponent implements OnInit, OnDestroy {
  // ... propiedades existentes ...

  currentStreamingMessageId: string | null = null;

  constructor(
    // ... inyecciones existentes ...
    private webSocketService: WebSocketService
  ) {}

  ngOnInit(): void {
    // ... código existente ...

    // Agregar suscripción a streaming
    this.subscribeToWebSocketStreaming();
  }

  /**
   * Suscribirse a eventos de WebSocket streaming
   */
  private subscribeToWebSocketStreaming(): void {
    // Chunks de streaming
    this.webSocketService.getStreamChunks()
      .pipe(takeUntil(this.destroy$))
      .subscribe((chunk) => {
        if (this.currentStreamingMessageId === chunk.messageId) {
          // Actualizar el mensaje actual
          const messageIndex = this.messages.findIndex(
            m => m.id === chunk.messageId
          );
          if (messageIndex !== -1) {
            this.messages[messageIndex].message += chunk.chunk;
            this.scrollToBottom();
          }
        }
      });

    // Completación
    this.webSocketService.getStreamComplete()
      .pipe(takeUntil(this.destroy$))
      .subscribe((result) => {
        if (this.currentStreamingMessageId === result.messageId) {
          const messageIndex = this.messages.findIndex(
            m => m.id === result.messageId
          );
          if (messageIndex !== -1) {
            this.messages[messageIndex].message = result.fullMessage;
            this.messages[messageIndex].streamingComplete = true;
            this.messages[messageIndex].isStreaming = false;
            this.messages[messageIndex].metadata = {
              executionTime: result.executionTime,
              totalTokens: result.totalTokens,
              toolsExecuted: result.toolsExecuted
            };
          }
          this.currentStreamingMessageId = null;
          this.scrollToBottom();
        }
      });

    // Errores
    this.webSocketService.getStreamErrors()
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        if (this.currentStreamingMessageId === error.messageId) {
          this.messages.push({
            id: this.generateId(),
            timestamp: new Date(),
            speaker: 'System',
            message: `❌ Error: ${error.error}`,
            type: 'error'
          });
          this.currentStreamingMessageId = null;
          this.scrollToBottom();
        }
      });
  }

  /**
   * Ejecutar tarea con WebSocket streaming
   */
  executeTask(): void {
    if (!this.currentTask.trim()) {
      this.notificationService.error('Error', 'Ingresa una tarea');
      return;
    }

    if (!this.agent?.id) {
      this.notificationService.error('Error', 'Agente no cargado');
      return;
    }

    // Conectar WebSocket
    const userId = this.authService.currentUser.id;
    const companyId = this.authService.currentCompany.id;
    this.webSocketService.connect(userId, companyId, this.agent.id);

    // Generar ID para el mensaje
    this.currentStreamingMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Agregar mensaje del usuario
    this.messages.push({
      id: this.generateId(),
      timestamp: new Date(),
      speaker: 'user',
      message: this.currentTask,
      type: 'user'
    });

    // Agregar mensaje del agente (vacío, se llenará con streaming)
    this.messages.push({
      id: this.currentStreamingMessageId,
      timestamp: new Date(),
      speaker: this.agent.agentName || 'Agent',
      message: '',
      type: 'agent',
      isStreaming: true,
      streamingComplete: false
    });

    const taskToExecute = this.currentTask;
    this.currentTask = '';
    this.isExecuting = true;

    // Enviar mensaje al agente
    this.webSocketService.sendMessage(
      taskToExecute,
      `conv_${this.agent.id}_${Date.now()}`,
      {
        agentId: this.agent.id,
        department: this.agent.department
      }
    );

    this.scrollToBottom();
  }
}
```

## 🧪 Testing

```typescript
describe('WebSocket Chat Integration', () => {
  let component: AgentChatComponent;
  let fixture: ComponentFixture<AgentChatComponent>;
  let wsService: WebSocketService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AgentChatComponent],
      providers: [WebSocketService]
    }).compileComponents();

    fixture = TestBed.createComponent(AgentChatComponent);
    component = fixture.componentInstance;
    wsService = TestBed.inject(WebSocketService);
    fixture.detectChanges();
  });

  it('should initialize and connect', (done) => {
    spyOn(wsService, 'connect');
    component.ngOnInit();
    expect(wsService.connect).toHaveBeenCalled();
    done();
  });

  it('should send message', () => {
    component.userInput = 'Test message';
    component.isConnected = true;
    spyOn(wsService, 'sendMessage');

    component.sendMessage();

    expect(wsService.sendMessage).toHaveBeenCalledWith(
      'Test message',
      jasmine.any(String),
      jasmine.any(Object)
    );
    expect(component.userInput).toBe('');
  });

  it('should handle streaming chunks', (done) => {
    const chunk = {
      messageId: 'test_msg',
      chunk: 'Hello ',
      timestamp: new Date().toISOString(),
      isComplete: false,
      index: 0
    };

    component.currentMessageId = 'test_msg';
    component.messages.push({
      id: 'test_msg',
      text: '',
      isUser: false,
      isStreaming: true,
      timestamp: new Date()
    });

    wsService.getStreamChunks = () =>
      of(chunk);

    component.ngOnInit();
    setTimeout(() => {
      expect(component.messages[0].text).toBe('Hello ');
      done();
    }, 100);
  });
});
```

## 🚀 Deployment Checklist

- [ ] Backend WebSocket server correctamente configurado
- [ ] Frontend WebSocket service inyectado en componentes
- [ ] CORS configurado para permitir WebSocket
- [ ] Firestore configurado para guardar conversaciones
- [ ] Genkit configurado con API key
- [ ] Testing E2E realizado
- [ ] Logs configurados para debugging
- [ ] Documentación actualizada
- [ ] Variables de entorno configuradas
- [ ] Deployment a producción
