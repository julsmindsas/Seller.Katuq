import { Component, Input } from '@angular/core';
import { ConversationMessage } from '../../../shared/models/message.model';

@Component({
  selector: 'app-message-bubble',
  templateUrl: './message-bubble.component.html',
  styleUrls: ['./message-bubble.component.scss']
})
export class MessageBubbleComponent {
  @Input() message!: ConversationMessage;
  @Input() showTimestamp: boolean = true;

  /**
   * Get CSS class based on message type
   */
  getMessageClass(): string {
    if (this.message.type === 'user') {
      return 'user-message';
    }
    if (this.message.type === 'a2a_request' || this.message.type === 'a2a_response') {
      return 'a2a-message';
    }
    return 'agent-message';
  }

  /**
   * Get department CSS class for dynamic styling
   */
  getDepartmentClass(): string {
    return this.message.department || 'unknown';
  }

  /**
   * Get avatar initials based on speaker name
   */
  getAvatarInitials(): string {
    if (!this.message.speaker) return '?';

    const words = this.message.speaker.split(' ');
    if (words.length >= 2) {
      return words[0][0].toUpperCase() + words[1][0].toUpperCase();
    }
    return this.message.speaker.substring(0, 2).toUpperCase();
  }

  /**
   * Get avatar background color based on department
   */
  getAvatarColor(): string {
    const colors: { [key: string]: string } = {
      'sales': '#f5576c',
      'inventory': '#38f9d7',
      'logistics': '#00f2fe',
      'user': '#667eea',
      'unknown': '#6c757d'
    };
    return colors[this.message.department || 'unknown'] || colors['unknown'];
  }

  /**
   * Format timestamp for display
   */
  getFormattedTimestamp(): string {
    const date = new Date(this.message.timestamp);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }

  /**
   * Get display name for speaker
   */
  getSpeakerDisplayName(): string {
    if (this.message.speaker === 'user') {
      return 'Tú';
    }
    // Convert camelCase or snake_case to readable format
    return this.message.speaker
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Check if message is A2A communication
   */
  isA2AMessage(): boolean {
    return this.message.type === 'a2a_request' || this.message.type === 'a2a_response';
  }

  /**
   * Get target department display name for A2A messages
   */
  getTargetDepartmentName(): string {
    if (!this.message.targetDepartment) return '';
    return this.message.targetDepartment
      .replace(/([A-Z])/g, ' $1')
      .trim()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
