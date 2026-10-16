import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";

import { KapsoTemplate, WhatsappInboxService } from "../../whatsapp-inbox.service";

/**
 * Modal "Iniciar nueva conversación" — fuera de ventana 24h.
 *
 * Lista templates APPROVED del WABA del comercio, deja elegir uno, llenar las
 * variables {{1}}, {{2}}... y envía el template a un número arbitrario.
 *
 * Todo por `WhatsappInboxService` (BaseService + interceptor): el `fetch`
 * directo de antes salía sin la sesión y el servidor respondía 401 (D-437).
 */
@Component({
  selector: "app-whatsapp-new-conversation-dialog",
  templateUrl: "./new-conversation-dialog.component.html",
  styleUrls: ["./new-conversation-dialog.component.scss"],
})
export class WhatsappNewConversationDialogComponent implements OnChanges {
  @Input() visible = false;
  @Output() closed = new EventEmitter<void>();
  @Output() sent = new EventEmitter<{ phone: string; templateName: string }>();

  loadingTemplates = false;
  sending = false;
  templates: KapsoTemplate[] = [];

  phone = "";
  selectedTemplateName = "";
  variableValues: string[] = [];
  errorMsg = "";
  successMsg = "";

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["visible"] && this.visible) {
      this.resetState();
      this.fetchTemplates();
    }
  }

  get selectedTemplate(): KapsoTemplate | null {
    return (
      this.templates.find((t) => t.name === this.selectedTemplateName) || null
    );
  }

  get previewText(): string {
    const t = this.selectedTemplate;
    if (!t) return "";
    return (t.bodyText || "").replace(/\{\{\s*(\d+)\s*\}\}/g, (_, n) => {
      const idx = parseInt(n, 10) - 1;
      const v = this.variableValues[idx];
      return v ? v : `{{${n}}}`;
    });
  }

  get canSend(): boolean {
    if (!this.phone || !this.selectedTemplateName) return false;
    if (this.sending) return false;
    const t = this.selectedTemplate;
    if (!t) return false;
    if (t.variables.length === 0) return true;
    return t.variables.every((_, i) => (this.variableValues[i] || "").trim().length > 0);
  }

  onTemplateChange(): void {
    this.errorMsg = "";
    this.successMsg = "";
    const t = this.selectedTemplate;
    this.variableValues = t ? new Array(t.variables.length).fill("") : [];
  }

  onCancel(): void {
    this.closed.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains("ncd-backdrop")) {
      this.onCancel();
    }
  }

  onSend(): void {
    if (!this.canSend) return;
    const t = this.selectedTemplate;
    if (!t) return;

    this.sending = true;
    this.errorMsg = "";
    this.successMsg = "";

    const phoneNorm = this._normalizePhone(this.phone);

    this.inbox
      .startConversation({
        phone: phoneNorm,
        templateName: t.name,
        languageCode: t.language,
        variables: this.variableValues.slice(0, t.variables.length),
      })
      .subscribe({
        next: (body) => {
          this.sending = false;
          this.successMsg = `Mensaje enviado a +${phoneNorm}. Saldo: $${(
            body?.balanceAfter || 0
          ).toLocaleString("es-CO")}.`;
          this.sent.emit({ phone: phoneNorm, templateName: t.name });
          setTimeout(() => this.onCancel(), 1500);
        },
        error: (err: any) => {
          this.sending = false;
          this.errorMsg =
            err?.error?.message ||
            (err?.status ? "No se pudo enviar el mensaje." : "Error de red al enviar.");
        },
      });
  }

  private fetchTemplates(): void {
    this.loadingTemplates = true;
    this.templates = [];
    // Solo mensajes para escribirle a un cliente: las plantillas del
    // SISTEMA (pedido creado, despachado...) las envía Katuq solo y
    // ofrecerlas acá era confuso — la gente las mandaba a mano.
    this.inbox.getKapsoTemplates().subscribe({
      next: (templates) => {
        this.templates = templates;
        this.loadingTemplates = false;
      },
      error: () => {
        this.loadingTemplates = false;
        this.errorMsg =
          "No se pudieron cargar las plantillas. Verifica config Kapso del comercio.";
      },
    });
  }

  private resetState(): void {
    this.phone = "";
    this.selectedTemplateName = "";
    this.variableValues = [];
    this.errorMsg = "";
    this.successMsg = "";
    this.sending = false;
  }

  /** Acepta +57 300, 57300..., 0300... — devuelve solo dígitos sin '+'. */
  private _normalizePhone(raw: string): string {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits;
  }
}
