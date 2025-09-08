import { Directive, Input, ElementRef, Renderer2, OnChanges, SimpleChanges } from '@angular/core';

/**
 * Directive to ensure safe table styles for PrimeNG tables
 * Prevents NG0901 error by ensuring valid style objects
 */
@Directive({
  selector: 'p-table[tableStyle]'
})
export class SafeTableStyleDirective implements OnChanges {
  @Input() tableStyle: any;

  constructor(
    private el: ElementRef,
    private renderer: Renderer2
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['tableStyle']) {
      const style = this.tableStyle;
      
      // Ensure we have a valid object
      if (style && typeof style === 'object' && !Array.isArray(style)) {
        // Style is valid, no action needed
        return;
      }
      
      // If style is invalid, set a default
      if (!style || typeof style !== 'object' || Array.isArray(style)) {
        // Remove any invalid styles
        const table = this.el.nativeElement.querySelector('.p-datatable-table');
        if (table) {
          // Clear any problematic styles
          this.renderer.setAttribute(table, 'style', '');
        }
      }
    }
  }
}