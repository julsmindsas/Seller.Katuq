import { Component, OnInit, OnDestroy } from '@angular/core';
import { IntegrationUIHelperService } from './integration-ui-helper.service';
import {
  trigger,
  transition,
  style,
  animate
} from '@angular/animations';

@Component({
  selector: 'app-integration-notifications',
  template: `
    <div class="integration-notifications" *ngIf="feedbackMessages.length > 0">
      <div *ngFor="let message of feedbackMessages" 
           class="notification-item"
           [ngClass]="'notification-' + message.type"
           [@slideIn]>
        <div class="notification-content">
          <i class="notification-icon" 
             [ngClass]="getIconClass(message.type)"></i>
          <span class="notification-text">{{ message.message }}</span>
          <button class="notification-close" 
                  (click)="removeMessage(message.id)"
                  type="button">
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .integration-notifications {
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 9999;
      max-width: 400px;
    }

    .notification-item {
      margin-bottom: 10px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    }

    .notification-content {
      display: flex;
      align-items: center;
      padding: 16px;
      background: white;
      border-left: 4px solid;
    }

    .notification-success .notification-content {
      border-left-color: #28a745;
    }

    .notification-error .notification-content {
      border-left-color: #dc3545;
    }

    .notification-warning .notification-content {
      border-left-color: #ffc107;
    }

    .notification-info .notification-content {
      border-left-color: #17a2b8;
    }

    .notification-icon {
      margin-right: 12px;
      font-size: 18px;
    }

    .notification-success .notification-icon {
      color: #28a745;
    }

    .notification-error .notification-icon {
      color: #dc3545;
    }

    .notification-warning .notification-icon {
      color: #ffc107;
    }

    .notification-info .notification-icon {
      color: #17a2b8;
    }

    .notification-text {
      flex: 1;
      font-size: 14px;
      line-height: 1.4;
    }

    .notification-close {
      background: none;
      border: none;
      color: #6c757d;
      cursor: pointer;
      padding: 4px;
      margin-left: 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: rgba(0, 0, 0, 0.1);
      color: #495057;
    }

    @keyframes slideIn {
      from {
        transform: translateX(100%);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    @media (max-width: 768px) {
      .integration-notifications {
        top: 10px;
        right: 10px;
        left: 10px;
        max-width: none;
      }
    }
  `],
  animations: [
    trigger('slideIn', [
      transition(':enter', [
        style({ transform: 'translateX(100%)', opacity: 0 }),
        animate('300ms ease-out', style({ transform: 'translateX(0)', opacity: 1 }))
      ]),
      transition(':leave', [
        animate('300ms ease-in', style({ transform: 'translateX(100%)', opacity: 0 }))
      ])
    ])
  ]
})
export class IntegrationNotificationsComponent implements OnInit, OnDestroy {
  feedbackMessages: any[] = [];
  private intervalId: any;

  constructor(private uiHelper: IntegrationUIHelperService) {}

  ngOnInit() {
    // Poll for feedback messages every 2 seconds instead of every 100ms
    this.intervalId = setInterval(() => {
      this.feedbackMessages = this.uiHelper.getFeedbackMessages();
    }, 2000);
  }

  ngOnDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
    }
  }

  removeMessage(id: string) {
    this.uiHelper.removeFeedback(id);
  }

  getIconClass(type: string): string {
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
  }
} 