import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';

export interface MappingField {
  katuqField: string;
  katuqLabel: string;
  sourceColumn: string;
  confidence: number;
  reasoning: string;
  isRequired: boolean;
  isManuallyAdjusted: boolean;
  severity: 'success' | 'warning' | 'danger';
  icon: string;
}

@Component({
  selector: 'app-column-mapping-card',
  templateUrl: './column-mapping-card.component.html',
  styleUrls: ['./column-mapping-card.component.scss']
})
export class ColumnMappingCardComponent implements OnInit {
  @Input() field: MappingField;
  @Input() availableColumns: { label: string; value: string }[] = [];
  @Input() disabled = false;

  @Output() mappingChanged = new EventEmitter<{ katuqField: string; sourceColumn: string }>();

  isReasoningExpanded = false;

  constructor() {}

  ngOnInit(): void {
    // Initialize component
  }

  /**
   * Handles dropdown change
   */
  onColumnChange(newColumn: string): void {
    if (newColumn && newColumn !== this.field.sourceColumn) {
      this.mappingChanged.emit({
        katuqField: this.field.katuqField,
        sourceColumn: newColumn
      });
    }
  }

  /**
   * Toggles reasoning section
   */
  toggleReasoning(): void {
    this.isReasoningExpanded = !this.isReasoningExpanded;
  }

  /**
   * Gets confidence badge class
   */
  getConfidenceBadgeClass(): string {
    if (this.field.confidence >= 90) return 'confidence-high';
    if (this.field.confidence >= 70) return 'confidence-medium';
    return 'confidence-low';
  }

  /**
   * Gets confidence level text
   */
  getConfidenceLevel(): string {
    if (this.field.confidence >= 90) return 'Alta';
    if (this.field.confidence >= 70) return 'Media';
    return 'Baja';
  }

  /**
   * Gets card border class based on state
   */
  getCardBorderClass(): string {
    const classes = [];

    if (this.field.isRequired) {
      classes.push('border-required');
    }

    if (this.field.isManuallyAdjusted) {
      classes.push('border-adjusted');
    }

    return classes.join(' ');
  }

  /**
   * Gets confidence icon
   */
  getConfidenceIcon(): string {
    if (this.field.confidence >= 90) return 'pi-check-circle';
    if (this.field.confidence >= 70) return 'pi-exclamation-circle';
    return 'pi-times-circle';
  }
}
