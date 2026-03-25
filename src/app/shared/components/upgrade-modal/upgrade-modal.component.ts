import { Component, EventEmitter, Input, Output } from '@angular/core';
import { SubscriptionService } from '../../services/subscription.service';

@Component({
  selector: 'app-upgrade-modal',
  templateUrl: './upgrade-modal.component.html',
  styleUrls: ['./upgrade-modal.component.scss']
})
export class UpgradeModalComponent {
  @Input() visible: boolean = false;
  @Output() visibleChange = new EventEmitter<boolean>();

  loading = false;

  constructor(private subscriptionService: SubscriptionService) {}

  confirmUpgrade(): void {
    this.loading = true;
    this.subscriptionService.upgradePlan('paid').subscribe({
      next: () => {
        this.loading = false;
        this.closeModal();
        // Recargar estado de suscripción
        this.subscriptionService.loadSubscriptionStatus().subscribe();
      },
      error: (err: any) => {
        this.loading = false;
        alert(err?.error?.message || 'Error al activar plan');
      }
    });
  }

  closeModal(): void {
    this.visible = false;
    this.visibleChange.emit(false);
  }
}
