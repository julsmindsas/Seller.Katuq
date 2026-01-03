/**
 * KatuqVotingPanel Component
 *
 * Displays a voting panel for multi-agent negotiation.
 */

import {
  Component,
  Input,
  ChangeDetectionStrategy
} from '@angular/core';
import { KatuqVotingPanelProps, BoundValue, resolveBoundValue } from '../models/agui-v2.model';

interface Voter {
  id: string;
  name: string;
  displayName?: string;
  department: string;
  status: 'pending' | 'thinking' | 'voted';
  vote?: 'APPROVE' | 'REJECT' | 'PENDING';
  reason?: string;
  color?: string;
}

@Component({
  selector: 'app-katuq-voting-panel',
  template: `
    <div class="katuq-voting-panel" [class]="statusClass">
      <div class="voting-header">
        <div class="voting-icon">
          <i [class]="statusIcon"></i>
        </div>
        <div class="voting-info">
          <h4>{{ statusTitle }}</h4>
          <span class="voting-round">Ronda {{ round }}</span>
        </div>
      </div>

      <div class="voting-proposal" *ngIf="proposal">
        <div class="proposal-label">Propuesta:</div>
        <div class="proposal-text">{{ proposal }}</div>
      </div>

      <div class="voting-voters">
        <div class="voter-item" *ngFor="let voter of voters"
             [class]="'status-' + voter.status"
             [class.voted-approve]="voter.vote === 'APPROVE'"
             [class.voted-reject]="voter.vote === 'REJECT'">

          <div class="voter-avatar" [style.background]="voter.color || '#6b7280'">
            {{ getInitials(voter) }}
          </div>

          <div class="voter-info">
            <span class="voter-name">{{ voter.displayName || voter.name }}</span>
            <span class="voter-dept">{{ voter.department }}</span>
          </div>

          <div class="voter-status">
            <ng-container [ngSwitch]="voter.status">
              <span *ngSwitchCase="'pending'" class="status-badge pending">
                <i class="pi pi-clock"></i> Pendiente
              </span>
              <span *ngSwitchCase="'thinking'" class="status-badge thinking">
                <i class="pi pi-spin pi-spinner"></i> Pensando...
              </span>
              <span *ngSwitchCase="'voted'" class="status-badge voted" [class]="voter.vote?.toLowerCase()">
                <i [class]="getVoteIcon(voter.vote)"></i>
                {{ getVoteText(voter.vote) }}
              </span>
            </ng-container>
          </div>
        </div>
      </div>

      <div class="voting-summary" *ngIf="hasVotes">
        <div class="summary-item approve">
          <i class="pi pi-check"></i>
          <span>{{ approveCount }}</span>
        </div>
        <div class="summary-item reject">
          <i class="pi pi-times"></i>
          <span>{{ rejectCount }}</span>
        </div>
        <div class="summary-item pending">
          <i class="pi pi-clock"></i>
          <span>{{ pendingCount }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .katuq-voting-panel {
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      overflow: hidden;
      border-top: 4px solid #6366f1;
    }

    .katuq-voting-panel.consensus {
      border-top-color: #10b981;
    }

    .katuq-voting-panel.deadlock {
      border-top-color: #ef4444;
    }

    .voting-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 1rem;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }

    .voting-icon {
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

    .consensus .voting-icon {
      background: #10b981;
    }

    .deadlock .voting-icon {
      background: #ef4444;
    }

    .voting-info h4 {
      margin: 0;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .voting-round {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .voting-proposal {
      padding: 1rem;
      background: #f0f0ff;
      border-bottom: 1px solid #e5e7eb;
    }

    .proposal-label {
      font-size: 0.75rem;
      color: #6b7280;
      margin-bottom: 0.25rem;
    }

    .proposal-text {
      font-size: 0.875rem;
      color: #374151;
    }

    .voting-voters {
      padding: 0.5rem;
    }

    .voter-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 0.5rem;
      transition: background 0.2s;
    }

    .voter-item:hover {
      background: #f9fafb;
    }

    .voter-avatar {
      width: 2.5rem;
      height: 2.5rem;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .voter-info {
      flex: 1;
      display: flex;
      flex-direction: column;
    }

    .voter-name {
      font-weight: 500;
      color: #374151;
      font-size: 0.875rem;
    }

    .voter-dept {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.25rem 0.75rem;
      border-radius: 1rem;
      font-size: 0.75rem;
      font-weight: 500;
    }

    .status-badge.pending {
      background: #f3f4f6;
      color: #6b7280;
    }

    .status-badge.thinking {
      background: #dbeafe;
      color: #1d4ed8;
    }

    .status-badge.voted.approve {
      background: #d1fae5;
      color: #059669;
    }

    .status-badge.voted.reject {
      background: #fee2e2;
      color: #dc2626;
    }

    .voting-summary {
      display: flex;
      justify-content: center;
      gap: 2rem;
      padding: 1rem;
      background: #f9fafb;
      border-top: 1px solid #e5e7eb;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
    }

    .summary-item.approve {
      color: #059669;
    }

    .summary-item.reject {
      color: #dc2626;
    }

    .summary-item.pending {
      color: #6b7280;
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class KatuqVotingPanelComponent {
  @Input() props: KatuqVotingPanelProps | null = null;
  @Input() dataModel: Record<string, any> = {};

  get proposal(): string | null {
    return this.resolve(this.props?.proposal);
  }

  get voters(): Voter[] {
    return this.resolve(this.props?.voters) || [];
  }

  get round(): number {
    return this.resolve(this.props?.round) || 1;
  }

  get status(): string {
    return this.resolve(this.props?.status) || 'voting';
  }

  get statusClass(): string {
    return this.status;
  }

  get statusIcon(): string {
    switch (this.status) {
      case 'consensus':
        return 'pi pi-check-circle';
      case 'deadlock':
        return 'pi pi-times-circle';
      default:
        return 'pi pi-users';
    }
  }

  get statusTitle(): string {
    switch (this.status) {
      case 'consensus':
        return 'Consenso Alcanzado';
      case 'deadlock':
        return 'Sin Consenso';
      default:
        return 'Votacion en Curso';
    }
  }

  get hasVotes(): boolean {
    return this.voters.some(v => v.vote);
  }

  get approveCount(): number {
    return this.voters.filter(v => v.vote === 'APPROVE').length;
  }

  get rejectCount(): number {
    return this.voters.filter(v => v.vote === 'REJECT').length;
  }

  get pendingCount(): number {
    return this.voters.filter(v => !v.vote || v.vote === 'PENDING').length;
  }

  getInitials(voter: Voter): string {
    const name = voter.displayName || voter.name || '';
    return name.charAt(0).toUpperCase();
  }

  getVoteIcon(vote?: string): string {
    return vote === 'APPROVE' ? 'pi pi-check' : 'pi pi-times';
  }

  getVoteText(vote?: string): string {
    return vote === 'APPROVE' ? 'Aprobado' : 'Rechazado';
  }

  private resolve(bound: BoundValue | undefined): any {
    if (!bound) return null;
    return resolveBoundValue(bound, this.dataModel);
  }
}
