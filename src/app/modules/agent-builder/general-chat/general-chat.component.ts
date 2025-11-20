import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ElementRef,
  ChangeDetectorRef,
  ViewEncapsulation,
} from "@angular/core";
import { Subject, Subscription } from "rxjs";
import { takeUntil } from "rxjs/operators";
import { AgentService } from "../shared/services/agent.service";
import { WebSocketService } from "../shared/services/websocket.service";
import { NotificationService } from "../../../shared/services/notification.service";
import { Agent } from "../shared/models/agent.model";
import { DomSanitizer, SafeHtml } from "@angular/platform-browser";

interface ProcessStep {
  description: string;
  status: "pending" | "running" | "completed" | "failed";
  toolCall?: string;
}

interface ConversationMessage {
  id?: string;
  timestamp?: Date;
  speaker: string;
  department: string;
  message: string;
  parsedMessage?: SafeHtml; // For rendering HTML with mentions
  type: string;
  isStreaming?: boolean;
  streamingComplete?: boolean;
  metadata?: {
    steps?: ProcessStep[];
    [key: string]: any;
  };
  isProcessExpanded?: boolean;
}

@Component({
  selector: "app-general-chat",
  templateUrl: "./general-chat.component.html",
  styleUrls: ["./general-chat.component.scss"],
  encapsulation: ViewEncapsulation.None, // To style injected HTML (mentions)
})
export class GeneralChatComponent implements OnInit, OnDestroy {
  @ViewChild("chatMessages") chatMessagesContainer!: ElementRef;
  @ViewChild("messageInput") messageInput!: ElementRef<HTMLTextAreaElement>;

  // Agents State
  agents: Agent[] = [];
  groupedAgents: { [key: string]: Agent[] } = {};
  departmentKeys: string[] = [];
  selectedAgent: Agent | null = null; // null = General Manager
  isLoadingAgents: boolean = false;

  // Mentions State
  showMentionList: boolean = false;
  mentionFilter: string = "";
  filteredAgentsForMention: Agent[] = [];
  mentionCursorIndex: number = -1;

  // Messages state
  messages: ConversationMessage[] = [];
  currentTask: string = "";
  isExecuting: boolean = false;
  orchestratorsInvolved: string[] = [];

  // WebSocket state
  private currentStreamingMessageId: string | null = null;
  private wsSubscriptions: Subscription[] = [];
  isConnected: boolean = false;
  private destroy$ = new Subject<void>();

  // UI state
  showEmptyState: boolean = true;
  sidebarOpen: boolean = true;

  exampleQuestions = [
    "¿Cuánto vendimos en octubre?",
    "¿Qué productos debería impulsar?",
    "¿Cuál es el estado actual del negocio?",
    "¿Quién es mi cliente más importante?",
    "¿Qué productos tienen bajo stock?",
  ];

  constructor(
    private agentService: AgentService,
    private webSocketService: WebSocketService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef,
    private sanitizer: DomSanitizer,
  ) {}

  ngOnInit(): void {
    console.log("[GeneralChat] 🎯 Inicializando Unified Chat Hub");
    this.loadAgents();
  }

  ngOnDestroy(): void {
    console.log("[GeneralChat] 🧹 Destruyendo Unified Chat Hub");
    this.wsSubscriptions.forEach((sub) => sub.unsubscribe());
    this.destroy$.next();
    this.destroy$.complete();
    if (this.isConnected) {
      this.webSocketService.disconnect();
    }
  }

  /**
   * Cargar lista de agentes disponibles
   */
  loadAgents(): void {
    this.isLoadingAgents = true;
    this.agentService.listAgents().subscribe({
      next: (response) => {
        this.agents = response.agents || [];
        this.groupAgents();
        this.isLoadingAgents = false;
        this.cdr.markForCheck();
      },
      error: (error) => {
        console.error("Error loading agents:", error);
        this.isLoadingAgents = false;
        this.notificationService.error(
          "Error",
          "No se pudieron cargar los agentes",
        );
      },
    });
  }

  private groupAgents(): void {
    this.groupedAgents = this.agents.reduce(
      (acc, agent) => {
        const dept = agent.department || "general";
        if (!acc[dept]) {
          acc[dept] = [];
        }
        acc[dept].push(agent);
        return acc;
      },
      {} as { [key: string]: Agent[] },
    );

    // Order keys: sales, inventory, logistics, others
    const priority = ["sales", "inventory", "logistics"];
    this.departmentKeys = Object.keys(this.groupedAgents).sort((a, b) => {
      const idxA = priority.indexOf(a);
      const idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });
  }

  /**
   * Seleccionar un agente (o General Manager si es null)
   */
  selectAgent(agent: Agent | null): void {
    if (this.selectedAgent === agent) return;

    this.selectedAgent = agent;
    this.clearChat(); // Limpiar chat al cambiar de contexto

    // Desconectar sesión anterior si existe
    if (this.isConnected) {
      this.webSocketService.disconnect();
      this.isConnected = false;
    }

    this.cdr.markForCheck();
  }

  /**
   * Manejo de Input para Menciones
   */
  onInput(event: any): void {
    const input = event.target;
    const value = input.value;
    const cursorPosition = input.selectionStart;

    // Detectar '@' antes del cursor
    const lastAtPos = value.lastIndexOf("@", cursorPosition - 1);

    if (lastAtPos !== -1) {
      const textAfterAt = value.substring(lastAtPos + 1, cursorPosition);
      // Si hay espacios, asumimos que no es una mención activa a menos que sea el inicio
      if (!textAfterAt.includes(" ")) {
        this.showMentionList = true;
        this.mentionFilter = textAfterAt.toLowerCase();
        this.mentionCursorIndex = lastAtPos;
        this.filterAgentsForMention();
        return;
      }
    }

    this.showMentionList = false;
  }

  filterAgentsForMention(): void {
    if (!this.mentionFilter) {
      this.filteredAgentsForMention = this.agents;
    } else {
      this.filteredAgentsForMention = this.agents.filter(
        (agent) =>
          agent.agentName.toLowerCase().includes(this.mentionFilter) ||
          this.getDepartmentName(agent.department)
            .toLowerCase()
            .includes(this.mentionFilter),
      );
    }
  }

  selectMention(agent: Agent): void {
    if (this.mentionCursorIndex === -1) return;

    const currentValue = this.currentTask;
    const beforeAt = currentValue.substring(0, this.mentionCursorIndex);
    // Encontrar donde termina la palabra actual siendo escrita
    const nextSpaceIndex = currentValue.indexOf(" ", this.mentionCursorIndex);
    const afterMention =
      nextSpaceIndex !== -1 ? currentValue.substring(nextSpaceIndex) : "";

    // Insertar el nombre del agente formateado
    const mentionText = `@${agent.agentName} `;

    this.currentTask = beforeAt + mentionText + afterMention;
    this.showMentionList = false;

    // Enfocar de nuevo y poner el cursor al final de la mención
    setTimeout(() => {
      if (this.messageInput) {
        this.messageInput.nativeElement.focus();
        const newCursorPos = beforeAt.length + mentionText.length;
        this.messageInput.nativeElement.setSelectionRange(
          newCursorPos,
          newCursorPos,
        );
      }
    });
  }

  /**
   * Ejecuta la consulta del usuario
   */
  executeTask(): void {
    if (!this.currentTask.trim()) {
      this.notificationService.error(
        "Validación",
        "Por favor ingresa una consulta",
      );
      return;
    }

    this.showEmptyState = false;
    this.showMentionList = false; // Asegurar que se cierre

    // Add user message
    this.addMessage({
      id: this.generateId(),
      timestamp: new Date(),
      speaker: "Tú",
      department: "user",
      message: this.currentTask,
      type: "user",
    });

    // Setup streaming ID
    this.currentStreamingMessageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Determine speaker info
    const speakerName = this.selectedAgent
      ? this.selectedAgent.agentName
      : "General Manager";
    const department = this.selectedAgent
      ? this.selectedAgent.department
      : "general";

    // Add response placeholder
    this.addMessage({
      id: this.currentStreamingMessageId,
      timestamp: new Date(),
      speaker: speakerName,
      department: department,
      message: "",
      type: "agent",
      isStreaming: true,
      streamingComplete: false,
      metadata: {
        steps: [{
          description: 'Analizando solicitud...',
          status: 'running'
        }]
      }
    });

    this.isExecuting = true;
    const taskToExecute = this.currentTask;
    this.currentTask = "";
    this.cdr.markForCheck();
    this.scrollToBottom();

    // Defer a la siguiente iteración del ciclo de eventos para asegurar que el spinner de carga se renderice
    setTimeout(() => {
      // Connect and send
      this.connectAndSend(taskToExecute);
    }, 0);
  }

  /**
   * Conectar WebSocket y enviar mensaje
   */
  private connectAndSend(message: string): void {
    const userData = this.getUserData();
    const userId = userData.uid || "anonymous";
    const companyId = userData.company || "unknown";

    // Determine agentId for connection
    // If selectedAgent is null, use 'general_manager'
    // If selectedAgent is set, use its ID
    const targetAgentId = this.selectedAgent
      ? this.selectedAgent.id
      : "general_manager";

    console.log(`[GeneralChat] 🔗 Conectando WebSocket para: ${targetAgentId}`);

    // Si ya estamos conectados al agente correcto, enviar directo
    if (
      this.isConnected &&
      this.webSocketService.getCurrentAgentId() === targetAgentId
    ) {
      this.sendMessage(message, userId, companyId, targetAgentId);
      return;
    }

    // Si no, conectar primero
    this.webSocketService.connect(userId, companyId, targetAgentId);

    // Suscribirse al estado de conexión (solo una vez)
    if (this.wsSubscriptions.length === 0) {
      const connectionSub = this.webSocketService
        .getConnectionStatus()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (status) => {
            this.isConnected = status.connected;
            if (
              status.connected &&
              this.isExecuting &&
              this.currentStreamingMessageId
            ) {
              // Setup streaming subs if not already done
              this.setupWebSocketSubscriptions();
              // Send the pending message
              this.sendMessage(
                message,
                userId,
                companyId,
                targetAgentId || "general_manager",
              );
            }
          },
          error: (error) => {
            console.error("[GeneralChat] ❌ Connection error:", error);
            this.handleExecutionError("Error de conexión WebSocket");
          },
        });
      this.wsSubscriptions.push(connectionSub);
    }
  }

  private sendMessage(
    message: string,
    userId: string,
    companyId: string,
    agentId: string,
  ): void {
    this.webSocketService.sendMessage(
      message,
      this.currentStreamingMessageId!, // Conversation ID same as message ID for simplicity in this context
      {
        company: companyId,
        userId: userId,
        isGeneralManager: !this.selectedAgent,
        agentId: agentId,
      },
      this.currentStreamingMessageId!,
    );
  }

  private setupWebSocketSubscriptions(): void {
    // Evitar duplicar suscripciones
    if (this.wsSubscriptions.length > 1) return;

    // Chunk subscription
    const chunkSub = this.webSocketService
      .getStreamChunks()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (chunkData) => {
          if (this.currentStreamingMessageId === chunkData.messageId) {
            const messageIndex = this.messages.findIndex(
              (m) => m.id === chunkData.messageId,
            );
            if (messageIndex !== -1) {
              this.messages[messageIndex].message += chunkData.chunk;
              // Update parsed message for mentions
              this.messages[messageIndex].parsedMessage = this.parseMentions(
                this.messages[messageIndex].message,
              );
              this.cdr.markForCheck();
              this.scrollToBottom();
            }
          }
        },
      });

    // Complete subscription
    const completeSub = this.webSocketService
      .getStreamComplete()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (completeData) => {
          if (this.currentStreamingMessageId === completeData.messageId) {
            const messageIndex = this.messages.findIndex(
              (m) => m.id === completeData.messageId,
            );
            if (messageIndex !== -1) {
              this.messages[messageIndex].message = completeData.fullMessage;
              this.messages[messageIndex].parsedMessage = this.parseMentions(
                completeData.fullMessage,
              );
              this.messages[messageIndex].streamingComplete = true;
              this.messages[messageIndex].isStreaming = false;

              if (completeData.metadata?.orchestratorsInvolved) {
                this.orchestratorsInvolved =
                  completeData.metadata.orchestratorsInvolved;
              }
            }
            this.currentStreamingMessageId = null;
            this.isExecuting = false;
            this.notificationService.success("Éxito", "Respuesta completada");
            this.cdr.markForCheck();
            this.scrollToBottom();
          }
        },
      });

    // Error subscription
    const errorSub = this.webSocketService
      .getStreamErrors()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (errorData) => {
          if (this.currentStreamingMessageId === errorData.messageId) {
            this.handleExecutionError(errorData.error);
          }
        },
      });

    // Agent Response subscription (Sub-agentes)
    const agentResponseSub = this.webSocketService
      .getAgentResponses()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response) => {
          // Agregar mensaje del sub-agente al chat
          this.addMessage({
            id: response.id || this.generateId(),
            timestamp: new Date(response.timestamp),
            speaker: response.speaker,
            department: response.department,
            message: response.message,
            type: "agent", // Lo mostramos como un mensaje de agente normal
            isStreaming: false,
            streamingComplete: true,
          });
          this.scrollToBottom();
        },
      });

    // Thinking Process Events Subscription
    const agentEventsSub = this.webSocketService.getAgentEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
          // Find current streaming message
          const msgIndex = this.messages.findIndex(
            (m) => m.id === this.currentStreamingMessageId,
          );
          if (msgIndex !== -1) {
            const msg = this.messages[msgIndex];

            // Initialize metadata.steps if not exists
            if (!msg.metadata) msg.metadata = {};
            if (!msg.metadata.steps) msg.metadata.steps = [];

            // Map events to steps
            let stepDescription = "";
            let stepStatus: "pending" | "running" | "completed" | "failed" =
              "running";
            let toolCall = "";

            switch (event.type) {
              case "sub_agent_call":
                // If it's the call initiation (usually from orchestrator)
                if (event.speaker === "orchestrator") {
                  stepDescription = `Consultando agente: ${event.metadata?.agentName || "Sub-agente"}`;
                  stepStatus = "running";
                } else {
                  // It's the result
                  stepDescription = `Respuesta recibida de ${event.speaker}`;
                  stepStatus = "completed";
                }
                break;

              case "a2a_request":
                stepDescription = `Coordinando con ${this.getDepartmentName(event.metadata?.targetDepartment) || "otro departamento"}...`;
                stepStatus = "running";
                break;

              case "a2a_response":
                stepDescription = `Información recibida de ${this.getDepartmentName(event.department)}`;
                stepStatus = "completed";
                break;

              case "orchestrator_thinking":
                // Pensamientos internos del orquestador
                stepDescription = `🧠 ${event.message || "Razonando..."}`;
                stepStatus = "completed"; // Los pensamientos son instantáneos/log
                break;

              case "tool_call":
                // Uso de herramientas
                const toolName = event.metadata?.toolName || "Herramienta";
                stepDescription = `🛠️ Ejecutando: ${toolName}`;
                toolCall = toolName;
                stepStatus = "running"; // Las tools toman tiempo
                break;

              case "error":
                stepDescription = `Error en ${event.speaker}: ${event.metadata?.error || event.message}`;
                stepStatus = "failed";
                // Don't treat as fatal error for the whole chat, just a failed step
                break;

              case "final_result":
                // Update final message text immediately if available
                if (event.message) {
                  msg.message = event.message;
                  // Update parsed message
                  msg.parsedMessage = this.parseMentions(event.message);
                  msg.streamingComplete = true; // Optimistic complete
                }
                // Mark the last running step as completed if any
                if (msg.metadata.steps && msg.metadata.steps.length > 0) {
                  const lastStep =
                    msg.metadata.steps[msg.metadata.steps.length - 1];
                  if (lastStep.status === "running") {
                    lastStep.status = "completed";
                  }
                }
                return; // Don't add as a step
            }

            if (stepDescription) {
              // Si estamos agregando pasos nuevos, asegurarnos de que el panel esté expandido
              // para que el usuario vea "hasta el peo" en tiempo real
              if (msg.isStreaming && !msg.isProcessExpanded) {
                msg.isProcessExpanded = true;
              }

              // Add new step
              msg.metadata.steps.push({
                description: stepDescription,
                status: stepStatus,
                toolCall: toolCall,
              });

              // Mark previous running steps as completed if needed
              // (Simple logic: if we add a new step, previous running ones might be done)
              // ideally we would match IDs but for now linear is fine
              if (msg.metadata.steps.length > 1) {
                const prev = msg.metadata.steps[msg.metadata.steps.length - 2];
                if (prev.status === "running") prev.status = "completed";
              }

              this.cdr.markForCheck();
              this.scrollToBottom();
            }
          }
        }
      });

    this.wsSubscriptions.push(
      chunkSub,
      completeSub,
      errorSub,
      agentResponseSub,
      agentEventsSub
    );
  }

  private handleExecutionError(errorMessage: string): void {
    const messageIndex = this.messages.findIndex(
      (m) => m.id === this.currentStreamingMessageId,
    );
    if (messageIndex !== -1) {
      this.messages[messageIndex].message = `❌ Error: ${errorMessage}`;
      this.messages[messageIndex].parsedMessage =
        this.sanitizer.bypassSecurityTrustHtml(`❌ Error: ${errorMessage}`);
      this.messages[messageIndex].isStreaming = false;
      this.messages[messageIndex].streamingComplete = true;
      this.messages[messageIndex].type = "error";
    }
    this.currentStreamingMessageId = null;
    this.isExecuting = false;
    this.notificationService.error("Error", errorMessage);
    this.cdr.markForCheck();
    this.scrollToBottom();
  }

  private addMessage(message: ConversationMessage): void {
    // Initial parse
    message.parsedMessage = this.parseMentions(message.message);
    this.messages.push(message);
    this.cdr.markForCheck();
  }

  /**
   * Parsea el texto buscando Markdown básico y menciones
   */
  private parseMentions(text: string): SafeHtml {
    if (!text) return "";

    // 1. Escape HTML (basic) to prevent injection, but allow our own tags later
    let parsed = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");

    // 2. Code Blocks (```code```)
    parsed = parsed.replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>");

    // 3. Inline Code (`code`)
    parsed = parsed.replace(/`([^`]+)`/g, "<code>$1</code>");

    // 4. Bold (**text**)
    parsed = parsed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");

    // 5. Mentions (@Name)
    const mentionRegex = /@(\w+)/g;
    parsed = parsed.replace(mentionRegex, (match, name) => {
      const agent = this.agents.find(
        (a) => a.agentName.toLowerCase() === name.toLowerCase(),
      );
      const deptClass = agent ? agent.department : "unknown";
      return `<span class="mention-chip ${deptClass}">@${name}</span>`;
    });

    // 6. Newlines to <br> (but not inside <pre>)
    // Simple approach: split by <pre>, process outside parts, join back
    const parts = parsed.split(/(<pre>[\s\S]*?<\/pre>)/g);
    parsed = parts
      .map((part) => {
        if (part.startsWith("<pre>")) return part;
        return part.replace(/\n/g, "<br>");
      })
      .join("");

    return this.sanitizer.bypassSecurityTrustHtml(parsed);
  }

  clearChat(): void {
    this.messages = [];
    this.orchestratorsInvolved = [];
    this.showEmptyState = true;
    this.cdr.markForCheck();
  }

  useExampleQuestion(question: string): void {
    this.currentTask = question;
    this.executeTask();
  }

  toggleSidebar(): void {
    this.sidebarOpen = !this.sidebarOpen;
  }

  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesContainer) {
        const element = this.chatMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 50);
  }

  private getUserData(): any {
    try {
      const userData = localStorage.getItem("user");
      return userData ? JSON.parse(userData) : {};
    } catch (error) {
      return {};
    }
  }

  // Helpers for UI
  getDepartmentName(department: string): string {
    const names: { [key: string]: string } = {
      sales: "Ventas",
      inventory: "Inventario",
      logistics: "Logística",
      general: "General Manager",
      user: "Tú",
    };
    return names[department] || department;
  }

  getDepartmentIcon(department: string): string {
    if (!department) return "pi-briefcase";
    const dept = department.toLowerCase();
    const icons: { [key: string]: string } = {
      sales: "pi-shopping-cart",
      ventas: "pi-shopping-cart",
      inventory: "pi-box",
      inventario: "pi-box",
      logistics: "pi-truck",
      logistica: "pi-truck",
      logística: "pi-truck",
      general: "pi-sparkles",
      user: "pi-user",
    };
    return icons[dept] || "pi-briefcase";
  }

  getDepartmentColor(department: string): string {
    if (!department) return "#999";
    const dept = department.toLowerCase();
    const colors: { [key: string]: string } = {
      sales: "#f093fb",
      ventas: "#f093fb",
      inventory: "#43e97b",
      inventario: "#43e97b",
      logistics: "#4facfe",
      logistica: "#4facfe",
      logística: "#4facfe",
      general: "#4285f4", // Google Blue
      user: "#9c27b0",
    };
    return colors[dept] || "#999";
  }

  getThemeColor(): string {
    if (this.selectedAgent) {
      return this.getDepartmentColor(this.selectedAgent.department);
    }
    return "#1a73e8"; // Default Google Blue for General Manager
  }
}
