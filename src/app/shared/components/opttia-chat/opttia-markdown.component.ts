import { Component, Input, OnChanges, ViewEncapsulation } from '@angular/core';
import { renderOpttiaMarkdown } from './opttia-markdown';

@Component({
  selector: 'app-opttia-markdown',
  template: '<div class="opttia-markdown-content" [innerHTML]="html"></div>',
  styleUrls: ['./opttia-markdown.component.scss'],
  // Dynamic HTML has no Angular scope attributes; all styles use our selector.
  encapsulation: ViewEncapsulation.None
})
export class OpttiaMarkdownComponent implements OnChanges {
  @Input() content = '';
  html = '';

  ngOnChanges(): void {
    this.html = renderOpttiaMarkdown(this.content);
  }
}
