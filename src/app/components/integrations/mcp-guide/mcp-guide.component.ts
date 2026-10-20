import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, Input, OnDestroy } from '@angular/core';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { MCP_SERVER_URL } from '../mcp-guides';
import type { McpGuide } from '../mcp-guides';

@Component({
  selector: 'app-mcp-guide',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './mcp-guide.component.html',
  styleUrls: ['./mcp-guide.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class McpGuideComponent implements OnDestroy {
  @Input() guide: McpGuide;
  readonly serverUrl = MCP_SERVER_URL;
  copyMessage = '';
  copying = false;
  private destroyed = false;

  constructor(public activeModal: NgbActiveModal, private cdr: ChangeDetectorRef) {}

  ngOnDestroy(): void {
    this.destroyed = true;
  }

  copyAddress(): Promise<void> {
    if (this.copying) return Promise.resolve();
    this.copying = true;
    const manual = 'No pudimos copiarla. Selecciona la dirección y cópiala manualmente.';
    const finish = (message: string): void => {
      this.copyMessage = message;
      this.copying = false;
      if (!this.destroyed) this.cdr.detectChanges();
    };
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      return navigator.clipboard.writeText(this.serverUrl).then(
        () => finish('Dirección copiada.'),
        () => finish(manual),
      );
    } catch (_) {
      finish(manual);
      return Promise.resolve();
    }
  }
}
