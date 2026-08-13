import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
} from "@angular/core";
import { environment } from "../../../../../../environments/environment";

interface KapsoTemplate {
  id: string;
  name: string;
  language: string;
  category: string;
  status: string;
  bodyText: string;
  variables: number[];
  /** [fase 2] Título en español para gente no técnica (el backend lo trae). */
  titulo?: string;
  descripcion?: string;
}

/**
 * Modal "Iniciar nueva conversación" — fuera de ventana 24h.
 *
 * Lista templates APPROVED del WABA del comercio, deja elegir uno, llenar las
 * variables {{1}}, {{2}}... y envía el template a un número arbitrario.
 *
 * Fetch directo (sin servicio) para evitar el bug del HMR singleton.
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

    const headers = this._authHeaders();
    const phoneNorm = this._normalizePhone(this.phone);

    // Fix: apuntaba a http://localhost:3300 hardcodeado — roto en producción.
    fetch(`${environment.urlApi}/v1/whatsapp/start-conversation`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        phone: phoneNorm,
        templateName: t.name,
        languageCode: t.language,
        variables: this.variableValues.slice(0, t.variables.length),
      }),
    })
      .then((r) => r.json().then((body) => ({ ok: r.ok, body })))
      .then(({ ok, body }) => {
        this.sending = false;
        if (!ok) {
          this.errorMsg =
            (body && body.message) || "No se pudo enviar el mensaje.";
          return;
        }
        this.successMsg = `Mensaje enviado a +${phoneNorm}. Saldo: $${(
          body.balanceAfter || 0
        ).toLocaleString("es-CO")}.`;
        this.sent.emit({ phone: phoneNorm, templateName: t.name });
        setTimeout(() => this.onCancel(), 1500);
      })
      .catch((err) => {
        this.sending = false;
        this.errorMsg = err.message || "Error de red al enviar.";
      });
  }

  private fetchTemplates(): void {
    this.loadingTemplates = true;
    this.templates = [];
    const headers = this._authHeaders();
    fetch(`${environment.urlApi}/v1/whatsapp/kapso-templates`, { headers })
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((resp: any) => {
        this.templates = resp.items || [];
        this.loadingTemplates = false;
      })
      .catch((err) => {
        this.loadingTemplates = false;
        this.errorMsg =
          "No se pudieron cargar las plantillas. Verifica config Kapso del comercio.";
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

  private _authHeaders(): HeadersInit {
    const userStr = localStorage.getItem("user") || "{}";
    let token = "", company = "", nit = "", email = "", authCode = "";
    try {
      const u = JSON.parse(userStr);
      token = u.token || "";
      company = u.company || "";
      nit = u.nit || "";
      email = u.email || "";
      authCode = u.authorizationCode || "";
    } catch {}
    return {
      "Authorization": "Bearer " + token,
      "company": company,
      "user": nit,
      "usage-code": authCode,
      "email": email,
      "Content-Type": "application/json",
      "Accept": "application/json",
    };
  }

  /** Acepta +57 300, 57300..., 0300... — devuelve solo dígitos sin '+'. */
  private _normalizePhone(raw: string): string {
    const digits = String(raw || "").replace(/\D/g, "");
    return digits;
  }
}
