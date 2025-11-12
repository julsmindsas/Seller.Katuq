export interface ConversationMessage {
  id: string;
  timestamp: Date;
  speaker: string;           // 'user', 'salesOrchestrator', 'inventoryOrchestrator', etc.
  department?: string;       // 'sales', 'logistics', 'inventory', 'user'
  message: string;
  type: 'user' | 'agent' | 'orchestrator' | 'a2a_request' | 'a2a_response' | 'result';
  targetDepartment?: string; // Para type='a2a_request'
}
