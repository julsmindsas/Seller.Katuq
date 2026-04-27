import { Component, EventEmitter, Output } from '@angular/core';
import { FlowsService } from '../services/flows.service';

@Component({
  selector: 'app-flow-ai-assist',
  templateUrl: './flow-ai-assist.component.html',
  styleUrls: ['./flow-ai-assist.component.scss']
})
export class FlowAiAssistComponent {
  @Output() flowGenerated = new EventEmitter<any>();

  prompt = '';
  loading = false;
  error: string | null = null;
  result: any = null;
  history: { prompt: string; flow: any; source: string; confidence: string; ts: number }[] = [];

  examples = [
    'Sincronizar productos de Cereza a Shopify cada 5 minutos',
    'Cuando un pedido Shopify se cree, replicarlo a Cereza',
    'Notificar al cliente por WhatsApp cuando el pedido se despache',
    'Crear factura SIIGO automáticamente al aprobarse el pedido',
  ];

  constructor(private flowsService: FlowsService) {}

  generate(): void {
    if (!this.prompt || this.prompt.length < 5) {
      this.error = 'Mínimo 5 caracteres en el prompt';
      return;
    }
    this.loading = true;
    this.error = null;
    this.flowsService.aiGenerate(this.prompt).subscribe({
      next: (res) => {
        this.result = res;
        this.loading = false;
        if (res.flow) {
          this.history.unshift({ prompt: this.prompt, flow: res.flow, source: res.source, confidence: res.confidence, ts: Date.now() });
        }
        if (!res.flow && res.message) {
          this.error = res.message;
        }
      },
      error: (err) => { this.error = err.message; this.loading = false; }
    });
  }

  applyToCanvas(): void {
    if (this.result && this.result.flow) {
      this.flowGenerated.emit(this.result.flow);
    }
  }

  loadFromHistory(idx: number): void {
    const item = this.history[idx];
    this.prompt = item.prompt;
    this.result = { flow: item.flow, source: item.source, confidence: item.confidence };
  }

  useExample(text: string): void {
    this.prompt = text;
  }
}
