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
            <i class="fa fa-times"></i>
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

    /* Avisos con el aspecto Katuq (D-131): tarjeta blanca, ícono en azulejo del
       par semántico fuerte/fondo suave, sin border-left de acento. */
    .notification-item {
      margin-bottom: 10px;
      border-radius: 16px;
      box-shadow: 0 18px 40px -18px rgba(95, 63, 224, .35);
      overflow: hidden;
      animation: slideIn 0.3s ease-out;
    }

    .notification-content {
      display: flex;
      align-items: center;
      padding: 14px 16px;
      background: #fff;
      border: 1px solid #ececf4;
      border-radius: 16px;
      color: #211F3A;
    }

    .notification-icon {
      display: grid;
      place-items: center;
      width: 36px;
      height: 36px;
      flex-shrink: 0;
      margin-right: 12px;
      border-radius: 11px;
      font-size: 16px;
      background: #efe9ff;
      color: #5F3FE0;
    }

    .notification-success .notification-icon {
      background: #E6F7EE;
      color: #1E874B;
    }

    .notification-error .notification-icon {
      background: #FDECEC;
      color: #D64545;
    }

    .notification-warning .notification-icon {
      background: #FFF1DF;
      color: #D9820A;
    }

    .notification-info .notification-icon {
      background: #E7F1FF;
      color: #1E6FD9;
    }

    .notification-text {
      flex: 1;
      font-size: 13.5px;
      line-height: 1.45;
      color: #211F3A;
    }

    .notification-close {
      background: #f5f4fa;
      border: 1px solid #ececf4;
      color: #5b5878;
      cursor: pointer;
      width: 30px;
      height: 30px;
      padding: 0;
      margin-left: 8px;
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .notification-close:hover {
      background: #FDECEC;
      border-color: #f3c9c9;
      color: #D64545;
    }

    .notification-close:focus-visible {
      outline: 3px solid #7C5CFF !important;
      outline-offset: 2px;
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
      success: 'fa fa-check-circle',
      error: 'fa fa-exclamation-circle',
      warning: 'fa fa-exclamation-triangle',
      info: 'fa fa-info-circle'
    };
    return icons[type] || 'fa fa-info-circle';
  }
} 