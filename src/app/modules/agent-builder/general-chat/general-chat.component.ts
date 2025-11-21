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
  participatingAgents: Set<string> = new Set(); // Track active agents in current session

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
    // REMOVED: We will create messages dynamically based on events to simulate a group chat
    /*
    this.addMessage({
      id: this.currentStreamingMessageId,
      ...
    });
    */
   
    // Show a temporary "Typing..." or "Processing" indicator if needed, 
    // but for now we'll let the first event create the first bubble.
    // actually, let's add a small system message "Iniciando proceso..." to give immediate feedback
    this.addMessage({
        id: `sys_${Date.now()}`,
        timestamp: new Date(),
        speaker: 'System',
        department: 'system',
        message: 'Iniciando orquestación...',
        type: 'system'
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
            let messageIndex = this.messages.findIndex(
              (m) => m.id === chunkData.messageId,
            );
            
            // If final response bubble doesn't exist yet, create it now
            if (messageIndex === -1) {
                 const speakerName = this.selectedAgent ? this.selectedAgent.agentName : "General Manager";
                 const department = this.selectedAgent ? this.selectedAgent.department : "general";
                 
                 // Use addMessage but ensure it's at the end (which it does by default)
                 this.addMessage({
                    id: this.currentStreamingMessageId,
                    timestamp: new Date(),
                    speaker: speakerName,
                    department: department,
                    message: "", // Start empty
                    type: "agent",
                    isStreaming: true,
                    streamingComplete: false
                 });
                 messageIndex = this.messages.findIndex(m => m.id === this.currentStreamingMessageId);
            }

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
          // Ensure agent is in participating list
          if (response.speaker) this.participatingAgents.add(response.speaker);

          const newMessage: ConversationMessage = {
            id: response.id || this.generateId(),
            timestamp: new Date(response.timestamp),
            speaker: response.speaker,
            department: response.department,
            message: response.message,
            type: "agent",
            isStreaming: false,
            streamingComplete: true,
          };

          // Insert BEFORE final message if exists, to maintain order
          const finalMsgIndex = this.messages.findIndex(m => m.id === this.currentStreamingMessageId);
          
          if (finalMsgIndex !== -1) {
              this.messages.splice(finalMsgIndex, 0, newMessage);
              newMessage.parsedMessage = this.parseMentions(newMessage.message);
              this.cdr.markForCheck();
          } else {
              this.addMessage(newMessage);
          }
          this.scrollToBottom();
        },
      });

    // Thinking Process Events Subscription
    const agentEventsSub = this.webSocketService.getAgentEvents()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (event) => {
            // Transform events into distinct chat messages for Group Chat effect
            const getOrchestratorName = () => this.selectedAgent ? this.selectedAgent.agentName : "General Manager";
            const getOrchestratorDept = () => this.selectedAgent ? this.selectedAgent.department : "general";

            let newMessage: ConversationMessage | null = null;

            switch (event.type) {
              case "sub_agent_call":
                if (event.speaker === "orchestrator") {
                  // Track agent as participating
                  const agentName = event.metadata?.agentName;
                  if (agentName) this.participatingAgents.add(agentName);

                  newMessage = {
                      id: `evt_${Date.now()}_${Math.random()}`,
                      timestamp: new Date(),
                      speaker: getOrchestratorName(),
                      department: getOrchestratorDept(),
                      message: `Consultando a @${agentName || "Agente"}...`,
                      type: 'agent'
                  };
                }
                break;

              case "a2a_request":
                newMessage = {
                    id: `evt_${Date.now()}_${Math.random()}`,
                    timestamp: new Date(),
                    speaker: getOrchestratorName(),
                    department: getOrchestratorDept(),
                    message: `Coordinando con el departamento de ${this.getDepartmentName(event.metadata?.targetDepartment)}...`,
                    type: 'agent'
                };
                break;

              case "orchestrator_thinking":
                newMessage = {
                    id: `think_${Date.now()}`,
                    timestamp: new Date(),
                    speaker: 'System',
                    department: 'system',
                    message: `🧠 ${event.message || "Analizando..."}`,
                    type: 'system'
                };
                break;

              case "tool_call":
                newMessage = {
                    id: `tool_${Date.now()}`,
                    timestamp: new Date(),
                    speaker: 'System',
                    department: 'system',
                    message: `🛠️ Ejecutando herramienta: ${event.metadata?.toolName || "Herramienta"}`,
                    type: 'system'
                };
                break;

              case "error":
                newMessage = {
                    id: `err_${Date.now()}`,
                    timestamp: new Date(),
                    speaker: event.speaker || 'System',
                    department: 'system',
                    message: `❌ Error: ${event.metadata?.error || event.message}`,
                    type: 'system'
                };
                break;

               case "final_result":
                   // Usually handled by stream, but if direct:
                   if (event.message && !this.messages.find(m => m.id === this.currentStreamingMessageId)) {
                         newMessage = {
                            id: this.currentStreamingMessageId || `fin_${Date.now()}`,
                            timestamp: new Date(),
                            speaker: getOrchestratorName(),
                            department: getOrchestratorDept(),
                            message: event.message,
                            type: 'agent',
                            streamingComplete: true
                         };
                   }
                   break;
            }
            
            if (newMessage) {
                // Logic to insert BEFORE the final response bubble if it exists (to keep Summary at bottom)
                // But wait, if we insert before, the Final Response bubble stays at the bottom, 
                // so the order becomes: [User, Event, Final]. This is what we want.
                
                const finalMsgIndex = this.messages.findIndex(m => m.id === this.currentStreamingMessageId);
                
                if (finalMsgIndex !== -1) {
                    // Insert before the final streaming message
                    this.messages.splice(finalMsgIndex, 0, newMessage);
                    // Parse mentions for the new message
                    newMessage.parsedMessage = this.parseMentions(newMessage.message);
                    this.cdr.markForCheck();
                } else {
                    // Just add to end
                    this.addMessage(newMessage);
                }
                
                this.scrollToBottom();
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

    // 5. Mentions (@Name) with Smart Handling for Departments
    const mentionRegex = /@([\w\s]+?)(?=\s|$|[.,;:])/g; // Capture until space or punctuation
    parsed = parsed.replace(mentionRegex, (match, name) => {
      const cleanName = name.trim();
      
      // Try to find specific agent
      const agent = this.agents.find(
        (a) => a.agentName.toLowerCase() === cleanName.toLowerCase(),
      );

      // If agent found, use its department
      if (agent) {
        const deptClass = agent.department || "general";
        return `<span class="mention-chip ${deptClass}">@${cleanName}</span>`;
      }

      // If not found, check if it's a known department/role
      const knownDepartments = ['sales', 'ventas', 'inventory', 'inventario', 'logistics', 'logistica', 'general', 'manager'];
      const lowerName = cleanName.toLowerCase();
      
      if (knownDepartments.includes(lowerName) || knownDepartments.some(d => lowerName.includes(d))) {
          // Map common names to department classes
          let deptClass = "general";
          if (lowerName.includes('sale') || lowerName.includes('venta')) deptClass = "sales";
          else if (lowerName.includes('invent')) deptClass = "inventory";
          else if (lowerName.includes('logist')) deptClass = "logistics";
          
          return `<span class="mention-chip ${deptClass}">@${cleanName}</span>`;
      }

      // Fallback for unknown mentions
      return `<span class="mention-chip unknown">@${cleanName}</span>`;
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
    this.participatingAgents.clear();
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

  getSuggestedActions(): string[] {
      // In a real app, this would come from the AI or be heuristics-based
      if (this.currentTask.toLowerCase().includes('stock') || this.currentTask.toLowerCase().includes('inventario')) {
          return ['📉 Ver productos con bajo stock', '📦 Crear orden de reposición', '📊 Analizar rotación'];
      }
      if (this.currentTask.toLowerCase().includes('venta') || this.currentTask.toLowerCase().includes('pedidos')) {
          return ['💰 Ver reporte de ingresos', '🏆 Top clientes del mes', '📈 Proyección de cierre'];
      }
      return ['📊 Ver dashboard completo', '📄 Exportar reporte PDF', '📧 Enviar resumen por correo'];
  }

  useSuggestion(suggestion: string) {
      this.currentTask = suggestion;
      this.executeTask();
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

  getAgentBySpeakerName(name: string): Agent | undefined {
      return this.agents.find(a => a.agentName === name);
  }

  getParticipatingAgentsList(): Agent[] {
      return Array.from(this.participatingAgents)
          .map(name => this.getAgentBySpeakerName(name))
          .filter(a => !!a) as Agent[];
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

  getDepartmentBgColor(department: string): string {
    const color = this.getDepartmentColor(department);
    // Convert hex to rgba with low opacity for background
    if (color.startsWith('#')) {
        let c = color.substring(1);
        if (c.length === 3) c = c.split('').map(char => char + char).join('');
        const r = parseInt(c.substring(0, 2), 16);
        const g = parseInt(c.substring(2, 4), 16);
        const b = parseInt(c.substring(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, 0.08)`; // 8% opacity
    }
    return 'transparent';
  }

  getThemeColor(): string {
    if (this.selectedAgent) {
      return this.getDepartmentColor(this.selectedAgent.department);
    }
    return "#1a73e8"; // Default Google Blue for General Manager
  }
}
