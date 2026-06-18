import { Component, OnInit } from "@angular/core";
import { ActivatedRoute } from "@angular/router";

/**
 * Shell del inbox de WhatsApp — layout Master-Detail responsive (spec 009 UI).
 *
 * Desktop (>=1024px): lista (35%) + detalle (65%).
 * Mobile (<1024px):  solo lista, o solo detalle si hay `selectedPhoneHash`.
 *
 * El componente mantiene el estado de selección y lo propaga a la lista y al
 * detalle por @Input/@Output, sin tocar el `WhatsappInboxService` directamente.
 */
@Component({
  selector: "app-whatsapp-inbox-shell",
  templateUrl: "./whatsapp-inbox-shell.component.html",
  styleUrls: ["./whatsapp-inbox-shell.component.scss"],
})
export class WhatsappInboxShellComponent implements OnInit {
  /** Hash del teléfono del hilo seleccionado (deep-link o click en lista). */
  selectedPhoneHash: string | null = null;

  constructor(private readonly route: ActivatedRoute) {}

  ngOnInit(): void {
    // Deep-link: `/whatsapp-inbox/inbox/:phoneHash`.
    this.route.paramMap.subscribe((params) => {
      const hash = params.get("phoneHash");
      if (hash) {
        this.selectedPhoneHash = hash;
      }
    });
  }

  onThreadSelected(phoneHash: string): void {
    this.selectedPhoneHash = phoneHash;
  }

  /** Mobile: volver al listado cuando el usuario cierra el detalle. */
  onBackToList(): void {
    this.selectedPhoneHash = null;
  }
}
