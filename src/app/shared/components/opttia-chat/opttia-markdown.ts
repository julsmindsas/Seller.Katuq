import * as MarkdownIt from 'markdown-it';

// No HTML from the model, embedded images or automatic remote resource loads.
// Angular additionally sanitizes the resulting string at the innerHTML binding.
const parser = new MarkdownIt({ html: false, breaks: true, linkify: false });
parser.disable('image');

export function renderOpttiaMarkdown(content: string): string {
  return parser.render(content || '');
}
