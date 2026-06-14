import { Injectable } from '@angular/core';

export interface ClientTag {
  name: string;
  color: string; // 'violet' | 'green' | 'blue' | 'amber' | 'red' | 'gray'
}

const DEFAULT_TYPES = ['Minorista', 'Mayorista', 'VIP', 'Institucional'];
const TAG_COLORS = ['violet', 'green', 'blue', 'amber', 'red', 'gray'];

@Injectable({ providedIn: 'root' })
export class ClientConfigService {

  getColors(): string[] {
    return TAG_COLORS;
  }

  private companyKey(suffix: string): string {
    try {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const company = user.company || 'default';
      return `katuq_${suffix}_${company}`;
    } catch {
      return `katuq_${suffix}_default`;
    }
  }

  // ── Tipos de cliente ──────────────────────────────────────────────
  getClientTypes(): string[] {
    try {
      const saved = localStorage.getItem(this.companyKey('clientTypes'));
      return saved ? JSON.parse(saved) : [...DEFAULT_TYPES];
    } catch {
      return [...DEFAULT_TYPES];
    }
  }

  saveClientTypes(types: string[]): void {
    localStorage.setItem(this.companyKey('clientTypes'), JSON.stringify(types));
  }

  // ── Etiquetas ─────────────────────────────────────────────────────
  getClientTags(): ClientTag[] {
    try {
      const saved = localStorage.getItem(this.companyKey('clientTags'));
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  }

  saveClientTags(tags: ClientTag[]): void {
    localStorage.setItem(this.companyKey('clientTags'), JSON.stringify(tags));
  }
}
