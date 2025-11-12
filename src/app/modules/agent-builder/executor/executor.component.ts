import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Agent, AgentExecution } from '../shared/models/agent.model';
import { AgentService } from '../shared/services/agent.service';
import { ToolCatalogService } from '../shared/services/tool-catalog.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ConversationMessage } from '../shared/models/message.model';

@Component({
  selector: 'app-executor',
  templateUrl: './executor.component.html',
  styleUrls: ['./executor.component.scss']
})
export class ExecutorComponent implements OnInit {
  @ViewChild('chatMessages') chatMessagesContainer!: ElementRef;

  agent: Agent | null = null;
  messages: ConversationMessage[] = [];
  currentTask: string = '';
  isExecuting: boolean = false;
  executionHistory: AgentExecution[] = [];
  isLoadingAgent: boolean = false;
  isLoadingHistory: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private agentService: AgentService,
    private toolCatalogService: ToolCatalogService,
    private notificationService: NotificationService
  ) {}

  ngOnInit(): void {
    const agentId = this.route.snapshot.paramMap.get('id');
    if (agentId) {
      this.loadAgent(agentId);
      this.loadExecutionHistory(agentId);
    }
  }

  loadAgent(agentId: string): void {
    this.isLoadingAgent = true;

    this.agentService.getAgent(agentId).subscribe({
      next: (response) => {
        this.isLoadingAgent = false;
        this.agent = response.agent;
      },
      error: (error) => {
        this.isLoadingAgent = false;
        console.error('Error loading agent:', error);
        this.notificationService.error('Error', 'Error al cargar el agente');
        this.router.navigate(['/agent-builder/library']);
      }
    });
  }

  loadExecutionHistory(agentId: string): void {
    this.isLoadingHistory = true;

    this.agentService.getExecutionHistory(agentId).subscribe({
      next: (response) => {
        this.isLoadingHistory = false;
        this.executionHistory = response.executions || [];
      },
      error: (error) => {
        this.isLoadingHistory = false;
        console.error('Error loading execution history:', error);
        // Don't show error notification for history, just log it
      }
    });
  }

  executeTask(): void {
    if (!this.currentTask.trim()) {
      this.notificationService.error('Error', 'Por favor ingresa una tarea para ejecutar');
      return;
    }

    if (!this.agent || !this.agent.id) {
      this.notificationService.error('Error', 'No se pudo cargar el agente');
      return;
    }

    // 1. Add user message to chat
    this.addMessage({
      id: this.generateId(),
      timestamp: new Date(),
      speaker: 'user',
      department: 'user',
      message: this.currentTask,
      type: 'user'
    });

    // 2. Set executing state
    this.isExecuting = true;

    // Store task and clear input
    const taskToExecute = this.currentTask;
    this.currentTask = '';

    // 3. Call agent service
    this.agentService.executeAgent({
      agentId: this.agent.id,
      task: taskToExecute
    }).subscribe({
      next: (response) => {
        console.log('Agent execution response:', response);

        // 4. Process conversation from backend
        if (response.data?.conversation && Array.isArray(response.data.conversation)) {
          this.processConversation(response.data.conversation);
        }

        // 5. Add result if not already in conversation
        if (response.data?.result) {
          const resultAlreadyAdded = this.messages.some(msg =>
            msg.message === response.data.result && msg.type === 'result'
          );

          if (!resultAlreadyAdded) {
            this.addMessage({
              id: this.generateId(),
              timestamp: new Date(),
              speaker: this.agent?.agentName || 'Agent',
              department: this.agent?.department,
              message: response.data.result,
              type: 'result'
            });
          }
        }

        this.isExecuting = false;
        this.notificationService.success('Éxito', 'Tarea ejecutada exitosamente');
        this.scrollToBottom();

        // Reload execution history
        if (this.agent?.id) {
          this.loadExecutionHistory(this.agent.id);
        }
      },
      error: (error) => {
        this.isExecuting = false;
        console.error('Error executing task:', error);

        // Add error message to chat
        this.addMessage({
          id: this.generateId(),
          timestamp: new Date(),
          speaker: 'System',
          department: 'unknown',
          message: 'Error: No se pudo ejecutar la tarea. Por favor intenta nuevamente.',
          type: 'result'
        });

        this.notificationService.error('Error', 'Error al ejecutar la tarea');
        this.scrollToBottom();
      }
    });
  }

  /**
   * Process conversation array from backend
   */
  processConversation(conversationArray: any[]): void {
    conversationArray.forEach(entry => {
      // Detect type based on entry properties
      let messageType: ConversationMessage['type'] = 'agent';

      if (entry.type) {
        messageType = entry.type;
      } else if (entry.speaker === 'user') {
        messageType = 'user';
      } else if (entry.target || entry.targetDepartment) {
        messageType = 'a2a_request';
      } else if (entry.role === 'result' || entry.isResult) {
        messageType = 'result';
      }

      this.addMessage({
        id: entry.id || this.generateId(),
        timestamp: entry.timestamp ? new Date(entry.timestamp) : new Date(),
        speaker: entry.speaker || entry.agent || 'Unknown',
        department: entry.department || this.detectDepartment(entry.speaker || entry.agent),
        message: entry.message || entry.content || entry.text || '',
        type: messageType,
        targetDepartment: entry.target || entry.targetDepartment
      });
    });
  }

  /**
   * Add message to conversation
   */
  addMessage(message: ConversationMessage): void {
    this.messages.push(message);
  }

  /**
   * Clear all chat messages
   */
  clearChat(): void {
    this.messages = [];
    this.currentTask = '';
  }

  /**
   * Detect department from speaker name
   */
  private detectDepartment(speaker: string): string {
    if (!speaker) return 'unknown';

    const speakerLower = speaker.toLowerCase();

    if (speakerLower.includes('sales') || speakerLower.includes('ventas')) {
      return 'sales';
    }
    if (speakerLower.includes('inventory') || speakerLower.includes('inventario')) {
      return 'inventory';
    }
    if (speakerLower.includes('logistics') || speakerLower.includes('logistica')) {
      return 'logistics';
    }
    if (speakerLower.includes('production') || speakerLower.includes('produccion')) {
      return 'production';
    }
    if (speakerLower.includes('finance') || speakerLower.includes('finanzas')) {
      return 'finance';
    }

    return 'unknown';
  }

  /**
   * Scroll chat to bottom
   */
  private scrollToBottom(): void {
    setTimeout(() => {
      if (this.chatMessagesContainer) {
        const element = this.chatMessagesContainer.nativeElement;
        element.scrollTop = element.scrollHeight;
      }
    }, 100);
  }

  /**
   * Generate unique ID for messages
   */
  private generateId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Track by function for ngFor optimization
   */
  trackByMessageId(index: number, message: ConversationMessage): string {
    return message.id;
  }

  goBack(): void {
    this.router.navigate(['/agent-builder/library']);
  }

  getDepartmentIcon(): string {
    if (!this.agent) return 'pi pi-cog';
    return this.toolCatalogService.getDepartmentIcon(this.agent.department);
  }

  getDepartmentColor(): string {
    if (!this.agent) return '#667eea';
    return this.toolCatalogService.getDepartmentColor(this.agent.department);
  }

  getDepartmentLabel(): string {
    if (!this.agent) return '';
    const labels: Record<string, string> = {
      sales: 'Ventas',
      logistics: 'Logística',
      inventory: 'Inventario'
    };
    return labels[this.agent.department] || '';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('es-CO', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatExecutionTime(ms: number): string {
    if (ms < 1000) {
      return `${ms}ms`;
    }
    const seconds = (ms / 1000).toFixed(1);
    return `${seconds}s`;
  }
}
