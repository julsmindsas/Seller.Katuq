/**
 * KatuqConfirmation Component
 *
 * Displays a confirmation dialog for HITL (Human-in-the-Loop) interactions.
 */

import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef
} from '@angular/core';
import { KatuqConfirmationProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

interface ConfirmationAction {
  label: string;
  actionName: string;
  variant?: 'primary' | 'secondary' | 'danger';
}

@Component({
  selector: 'app-katuq-confirmation',
  template: `
    <div class="katuq-confirmation" [class.expired]="isExpired">
      <div class="confirmation-header">
        <div class="confirmation-icon">
          <i class="pi pi-question-circle"></i>
        </div>
        <h4>{{ title }}</h4>
      </div>

      <div class="confirmation-body">
        <p class="confirmation-message">{{ message }}</p>
        <p class="confirmation-details" *ngIf="details">{{ details }}</p>

        <div class="confirmation-timer" *ngIf="timeout && !isExpired">
          <div class="timer-bar">
            <div class="timer-progress" [style.width.%]="timerProgress"></div>
          </div>
          <span class="timer-text">{{ formatTimeRemaining() }}</span>
        </div>
      </div>

      <div class="confirmation-actions" *ngIf="!isExpired">
        <button *ngFor="let action of actions"
                [class]="'btn-' + (action.variant || 'secondary')"
                (click)="onAction(action)">
          {{ action.label }}
        </button>
      </div>

      <div class="confirmation-expired" *ngIf="isExpired">
        <i class="pi pi-clock"></i>
        <span>Esta confirmacion ha expirado</span>
      </div>
    </div>
  `,
  styles: [`
    .katuq-confirmation {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      border: 2px solid #6366f1;
    }

    .katuq-confirmation.expired {
      border-color: #d1d5db;
      opacity: 0.7;
    }

    .confirmation-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f0f0ff;
      border-bottom: 1px solid #e5e7eb;
    }

    .confirmation-icon {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      background: #6366f1;
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.25rem;
    }

    .confirmation-header h4 {
      margin: 0;
      font-size: 1rem;
      font-weight: 600;
      color: #374151;
    }

    .confirmation-body {
      padding: 1rem;
    }

    .confirmation-message {
      margin: 0 0 0.5rem;
      color: #374151;
      font-size: 0.9375rem;
    }

    .confirmation-details {
      margin: 0;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .confirmation-timer {
      margin-top: 1rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .timer-bar {
      flex: 1;
      height: 4px;
      background: #e5e7eb;
      border-radius: 2px;
      overflow: hidden;
    }

    .timer-progress {
      height: 100%;
      background: linear-gradient(90deg, #6366f1, #8b5cf6);
      transition: width 1s linear;
    }

    .timer-text {
      font-size: 0.75rem;
      color: #6b7280;
      min-width: 3rem;
    }

    .confirmation-actions {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .confirmation-actions button {
      flex: 1;
      padding: 0.75rem 1rem;
      border-radius: 0.375rem;
      border: none;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.875rem;
      transition: all 0.2s;
    }

    .btn-primary {
      background: #6366f1;
      color: white;
    }

    .btn-primary:hover {
      background: #4f46e5;
    }

    .btn-secondary {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #d1d5db;
    }

    .btn-danger {
      background: #ef4444;
      color: white;
    }

    .btn-danger:hover {
      background: #dc2626;
    }

    .confirmation-expired {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #f3f4f6;
      color: #6b7280;
      font-size: 0.875rem;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqConfirmationComponent implements OnInit, OnDestroy {
  @Input() props: KatuqConfirmationProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  @Output() confirmationResponse = new EventEmitter<{
    action: string;
    decision: string;
    comment?: string;
  }>();

  isExpired = false;
  timerProgress = 100;
  private timerInterval: any;
  private startTime: number = 0;

  constructor(private cdr: ChangeDetectorRef) {}

  ngOnInit(): void {
    this.startTimer();
  }

  ngOnDestroy(): void {
    this.clearTimer();
  }

  get title(): string {
    return this.resolve(this.props?.title) || 'Confirmacion Requerida';
  }

  get message(): string {
    return this.resolve(this.props?.message) || '';
  }

  get details(): string | null {
    return this.resolve(this.props?.details);
  }

  get timeout(): number {
    return this.resolve(this.props?.timeout) || 300;
  }

  get actions(): ConfirmationAction[] {
    const resolved = this.resolve(this.props?.actions);
    if (Array.isArray(resolved)) {
      return resolved;
    }
    // Default actions
    return [
      { label: 'Aprobar', actionName: 'approve', variant: 'primary' },
      { label: 'Rechazar', actionName: 'reject', variant: 'danger' }
    ];
  }

  private startTimer(): void {
    if (!this.timeout || this.timeout <= 0) return;

    this.startTime = Date.now();
    const endTime = this.startTime + (this.timeout * 1000);

    this.timerInterval = setInterval(() => {
      const now = Date.now();
      const remaining = endTime - now;

      if (remaining <= 0) {
        this.isExpired = true;
        this.timerProgress = 0;
        this.clearTimer();
      } else {
        this.timerProgress = (remaining / (this.timeout * 1000)) * 100;
      }

      this.cdr.markForCheck();
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  formatTimeRemaining(): string {
    const elapsed = Date.now() - this.startTime;
    const remaining = Math.max(0, (this.timeout * 1000) - elapsed);
    const seconds = Math.ceil(remaining / 1000);

    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }

    return `${seconds}s`;
  }

  onAction(action: ConfirmationAction): void {
    this.clearTimer();

    let decision = 'approve';
    if (action.actionName.includes('reject')) decision = 'reject';
    if (action.actionName.includes('modify')) decision = 'modify';

    this.confirmationResponse.emit({
      action: action.actionName,
      decision
    });
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
