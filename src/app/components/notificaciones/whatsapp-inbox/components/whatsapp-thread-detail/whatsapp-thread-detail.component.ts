import {
  AfterViewChecked,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { forkJoin } from "rxjs";

import { WhatsappInboxService } from "../../whatsapp-inbox.service";
import {
  ContactProfile,
  WhatsappMessage,
} from "../../models/whatsapp-thread.model";

/**
 * Detalle del hilo (panel derecho del shell).
 *
 * Responsabilidades:
 *  - Cargar mensajes + perfil del contacto cada vez que cambia `phoneHash`.
 *  - Render tipo chat (burbujas izquierda/derecha).
 *  - Auto-scroll al último mensaje al renderizar.
 *  - Marcar el hilo como visto (botón explícito + onLoad).
 *  - Toggle del panel de contacto (renderizado al lado, no modal).
 */
@Component({
  selector: "app-whatsapp-thread-detail",
  templateUrl: "./whatsapp-thread-detail.component.html",
  styleUrls: ["./whatsapp-thread-detail.component.scss"],
})
export class WhatsappThreadDetailComponent
  implements OnChanges, AfterViewChecked
{
  @Input() phoneHash: string | null = null;

  /** Emitido cuando el usuario quiere volver a la lista (mobile). */
  @Output() backToList = new EventEmitter<void>();

  @ViewChild("messagesContainer") messagesContainer?: ElementRef<HTMLElement>;

  messages: WhatsappMessage[] = [];
  profile: ContactProfile | null = null;
  loading = false;
  contactPanelOpen = false;

  /** Flag para correr el auto-scroll una sola vez tras un load. */
  private needsScroll = false;

  constructor(private readonly inbox: WhatsappInboxService) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes["phoneHash"]) {
      this.contactPanelOpen = false;
      this.loadAll();
    }
  }

  ngAfterViewChecked(): void {
    if (this.needsScroll && this.messagesContainer) {
      const el = this.messagesContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
      this.needsScroll = false;
    }
  }

  toggleContactPanel(): void {
    this.contactPanelOpen = !this.contactPanelOpen;
  }

  markAsRead(): void {
    if (!this.phoneHash) {
      return;
    }
    this.inbox.markThreadViewed(this.phoneHash).subscribe({
      error: () => undefined,
    });
  }

  onBack(): void {
    this.backToList.emit();
  }

  get headerName(): string {
    if (!this.profile) {
      return "";
    }
    return (
      this.profile.clienteNombre ||
      this.profile.profileName ||
      "Contacto sin nombre"
    );
  }

  trackById(_: number, msg: WhatsappMessage): string {
    return msg.id;
  }

  /** Etiqueta del placeholder de media. */
  mediaLabel(msg: WhatsappMessage): string {
    switch (msg.type) {
      case "image":
        return "[imagen]";
      case "audio":
        return "[audio]";
      case "document":
        return "[documento]";
      case "sticker":
        return "[sticker]";
      default:
        return "[adjunto]";
    }
  }

  private loadAll(): void {
    if (!this.phoneHash) {
      this.messages = [];
      this.profile = null;
      return;
    }
    this.loading = true;
    const hash = this.phoneHash;
    forkJoin({
      messages: this.inbox.getMessages(hash),
      profile: this.inbox.getContactProfile(hash),
    }).subscribe({
      next: ({ messages, profile }) => {
        this.messages = messages.items;
        this.profile = profile;
        this.loading = false;
        this.needsScroll = true;
        // Best-effort: marcar visto automáticamente al abrir.
        this.inbox
          .markThreadViewed(hash)
          .subscribe({ error: () => undefined });
      },
      error: () => {
        this.messages = [];
        this.profile = null;
        this.loading = false;
      },
    });
  }
}
